-- =============================================================
-- BLOQUEIO DE USUÁRIAS INATIVAS
-- =============================================================
-- Antes desta migration, profiles.ativo era apenas cosmético: servia
-- para filtrar listas na interface, mas nenhuma policy de RLS nem o
-- Auth olhavam para ele. Uma revendedora/B2B desativada continuava
-- logando e enxergando/gravando os próprios dados normalmente.
--
-- Aqui o flag passa a valer no banco (camada autoritativa):
--   1. private.is_active() como helper;
--   2. todas as policies de dados exigem usuária ativa;
--   3. as funções SECURITY DEFINER (que ignoram RLS) também checam;
--   4. authenticated perde o direito de escrever a coluna `ativo`
--      (senão a própria usuária desativada se reativaria via API).
--
-- Perfil sem linha em profiles é tratado como ATIVO, para não trancar
-- ninguém para fora por dado faltante: só `ativo = false` explícito bloqueia.
-- =============================================================


-- -------------------------------------------------------------
-- 1) Helper
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ativo FROM public.profiles WHERE user_id = _user_id),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_active(UUID) TO authenticated;

-- Admin efetivo = tem o papel E está ativa. Evita repetir o AND em toda policy.
CREATE OR REPLACE FUNCTION private.is_admin_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'administrador'::public.app_role)
     AND private.is_active(_user_id);
$$;

GRANT EXECUTE ON FUNCTION private.is_admin_ativo(UUID) TO authenticated;


-- -------------------------------------------------------------
-- 2) Policies
-- -------------------------------------------------------------
-- Policies permissivas são combinadas com OR: basta uma liberar para o
-- acesso passar. Por isso TODAS as policies de cada tabela precisam do
-- filtro de usuária ativa.

-- categorias / produtos: leitura pública continua aberta (catálogo).
DROP POLICY IF EXISTS "categorias_admin_all" ON public.categorias;
CREATE POLICY "categorias_admin_all" ON public.categorias
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));

DROP POLICY IF EXISTS "produtos_admin_all" ON public.produtos;
CREATE POLICY "produtos_admin_all" ON public.produtos
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- profiles: o SELECT do próprio perfil continua liberado mesmo inativa —
-- é assim que o front descobre que a conta foi desativada e desloga.
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  )
  WITH CHECK (
    (auth.uid() = user_id AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin_ativo(auth.uid())
    OR (auth.uid() = user_id AND private.is_active(auth.uid()))
  );

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (private.is_admin_ativo(auth.uid()));


-- user_roles: leitura dos próprios papéis continua (o front precisa dela
-- para montar a sessão); a gestão exige admin ativa.
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- estoque
DROP POLICY IF EXISTS "estoque_select" ON public.estoque;
CREATE POLICY "estoque_select" ON public.estoque
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "estoque_admin_all" ON public.estoque;
CREATE POLICY "estoque_admin_all" ON public.estoque
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- estoque_geral
DROP POLICY IF EXISTS "estoque_geral_admin_all" ON public.estoque_geral;
CREATE POLICY "estoque_geral_admin_all" ON public.estoque_geral
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- ciclos_mostruario
DROP POLICY IF EXISTS "ciclos_select" ON public.ciclos_mostruario;
CREATE POLICY "ciclos_select" ON public.ciclos_mostruario
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "ciclos_admin_all" ON public.ciclos_mostruario;
CREATE POLICY "ciclos_admin_all" ON public.ciclos_mostruario
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- clientes
DROP POLICY IF EXISTS "clientes_acesso" ON public.clientes;
CREATE POLICY "clientes_acesso" ON public.clientes
  FOR ALL TO authenticated
  USING (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  )
  WITH CHECK (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "clientes_auth_insert" ON public.clientes;
CREATE POLICY "clientes_auth_insert" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND private.is_active(auth.uid()));

DROP POLICY IF EXISTS "clientes_dono_ou_admin_select" ON public.clientes;
CREATE POLICY "clientes_dono_ou_admin_select" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    private.is_admin_ativo(auth.uid())
    OR (
      private.is_active(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.vendas
        WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
        LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS "clientes_dono_ou_admin_update" ON public.clientes;
CREATE POLICY "clientes_dono_ou_admin_update" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    private.is_admin_ativo(auth.uid())
    OR (
      private.is_active(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.vendas
        WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    private.is_admin_ativo(auth.uid())
    OR (
      private.is_active(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.vendas
        WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
        LIMIT 1
      )
    )
  );


-- candidatas_revenda (fluxo público entra pela edge function/service role)
DROP POLICY IF EXISTS "candidatas_admin_select" ON public.candidatas_revenda;
CREATE POLICY "candidatas_admin_select" ON public.candidatas_revenda
  FOR SELECT TO authenticated
  USING (private.is_admin_ativo(auth.uid()));

DROP POLICY IF EXISTS "candidatas_admin_update" ON public.candidatas_revenda;
CREATE POLICY "candidatas_admin_update" ON public.candidatas_revenda
  FOR UPDATE TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- vendas
DROP POLICY IF EXISTS "vendas_select" ON public.vendas;
CREATE POLICY "vendas_select" ON public.vendas
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "vendas_insert" ON public.vendas;
CREATE POLICY "vendas_insert" ON public.vendas
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
  );

DROP POLICY IF EXISTS "vendas_admin_all" ON public.vendas;
CREATE POLICY "vendas_admin_all" ON public.vendas
  FOR ALL TO authenticated
  USING (private.is_admin_ativo(auth.uid()))
  WITH CHECK (private.is_admin_ativo(auth.uid()));


-- -------------------------------------------------------------
-- 3) Funções SECURITY DEFINER (ignoram RLS — precisam checar na mão)
-- -------------------------------------------------------------

-- saldo_ciclo_aberto: além do bloqueio de inativa, passa a exigir que a
-- chamadora seja a dona do ciclo ou admin. Antes qualquer autenticada podia
-- ler o faturamento/comissão de qualquer outra usuária passando o _user_id.
CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id UUID)
RETURNS TABLE (
  ciclo_id            UUID,
  aberto_em           TIMESTAMPTZ,
  total_vendas        NUMERIC,
  total_comissao      NUMERIC,
  comissao_percentual NUMERIC,
  qtd_vendas          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF NOT private.is_active(auth.uid()) THEN
    RAISE EXCEPTION 'Conta desativada';
  END IF;

  IF auth.uid() <> _user_id AND NOT private.is_admin_ativo(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado ao saldo de outra usuária';
  END IF;

  SELECT ur.role::TEXT INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    c.aberto_em,
    COALESCE(SUM(v.valor_venda), 0)::NUMERIC AS total_vendas,
    round(
      COALESCE(SUM(v.valor_venda), 0) *
      private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0)) / 100.0,
      2
    )::NUMERIC AS total_comissao,
    private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0))::NUMERIC AS comissao_percentual,
    COUNT(v.id)::BIGINT AS qtd_vendas
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
END;
$$;


-- fechar_ciclo / recolher_maleta: admin precisa estar ativa.
CREATE OR REPLACE FUNCTION public.fechar_ciclo(_user_id UUID, _observacao TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo_id UUID;
  v_role     TEXT;
  v_total_v  NUMERIC(12,2);
  v_pct      NUMERIC(5,2);
  v_total_c  NUMERIC(12,2);
  v_novo     UUID;
BEGIN
  IF NOT private.is_admin_ativo(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem fechar ciclos';
  END IF;

  SELECT id INTO v_ciclo_id
  FROM public.ciclos_mostruario
  WHERE user_id = _user_id AND fechado_em IS NULL
  LIMIT 1;

  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para este usuário';
  END IF;

  SELECT ur.role::TEXT INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  SELECT COALESCE(SUM(valor_venda), 0) INTO v_total_v
  FROM public.vendas WHERE ciclo_id = v_ciclo_id;

  v_pct     := private.comissao_pct(v_role, v_total_v);
  v_total_c := round(v_total_v * v_pct / 100.0, 2);

  UPDATE public.ciclos_mostruario
  SET
    fechado_em     = now(),
    total_vendas   = v_total_v,
    total_comissao = v_total_c,
    observacao     = COALESCE(_observacao, observacao)
  WHERE id = v_ciclo_id;

  UPDATE public.estoque
  SET quantidade = 0, updated_at = now()
  WHERE user_id = _user_id AND quantidade > 0;

  INSERT INTO public.ciclos_mostruario (user_id) VALUES (_user_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;


CREATE OR REPLACE FUNCTION public.recolher_maleta(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin_ativo(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores ativos podem recolher maletas';
  END IF;

  -- Remove os itens (em vez de zerar) para não deixar linha morta no
  -- mostruário — comportamento definido em 20260611135124.
  DELETE FROM public.estoque
  WHERE user_id = _user_id;
END;
$$;


-- -------------------------------------------------------------
-- 4) Coluna `ativo` fora do alcance de quem não é service_role
-- -------------------------------------------------------------
-- profiles_update libera a linha inteira para a própria dona. Sem isto,
-- qualquer usuária poderia dar UPDATE em profiles.ativo e se reativar
-- sozinha. Escrita de `ativo` fica só com a edge function (service_role).
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (display_name, telefone, updated_at) ON public.profiles TO authenticated;
