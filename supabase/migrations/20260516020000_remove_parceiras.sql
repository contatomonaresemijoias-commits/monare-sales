-- =============================================================
-- Remove parceiras table — ligar tudo diretamente ao user_id
-- =============================================================

-- 1. Drop all dependent policies
DROP POLICY IF EXISTS "Admin gerencia perfis"                       ON public.profiles;
DROP POLICY IF EXISTS "Admin remove perfis"                         ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil"           ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê o próprio perfil"                 ON public.profiles;
DROP POLICY IF EXISTS "Admin gerencia papéis"                       ON public.user_roles;
DROP POLICY IF EXISTS "Usuário vê os próprios papéis"               ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia parceiras"                    ON public.parceiras;
DROP POLICY IF EXISTS "Parceiras são públicas para leitura"         ON public.parceiras;
DROP POLICY IF EXISTS "Admin gerencia produtos"                     ON public.produtos;
DROP POLICY IF EXISTS "Produtos são públicos para leitura"          ON public.produtos;
DROP POLICY IF EXISTS "Admins gerenciam todos os mostruários"       ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Parceiras veem o próprio mostruário"         ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Admins gerenciam vendas"                     ON public.vendas;
DROP POLICY IF EXISTS "Usuário registra própria venda"              ON public.vendas;
DROP POLICY IF EXISTS "Parceiras registram vendas do próprio mostruário" ON public.vendas;
DROP POLICY IF EXISTS "Parceira vê as próprias vendas"              ON public.vendas;
DROP POLICY IF EXISTS "Vendas seguem públicas para consulta de garantia" ON public.vendas;
DROP POLICY IF EXISTS "Admin gerencia ciclos"                       ON public.ciclos_mostruario;
DROP POLICY IF EXISTS "Parceira vê os próprios ciclos"              ON public.ciclos_mostruario;
DROP POLICY IF EXISTS "Admin gerencia estoque geral"                ON public.estoque_geral;
DROP POLICY IF EXISTS "clientes_admin_all"                          ON public.clientes;
DROP POLICY IF EXISTS "categorias_admin_all"                        ON public.categorias;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS trg_abrir_ciclo          ON public.parceiras;
DROP TRIGGER IF EXISTS trg_preencher_venda       ON public.vendas;
DROP TRIGGER IF EXISTS trg_preencher_dados_venda ON public.vendas;

-- 3. Drop functions that depend on old structure
DROP FUNCTION IF EXISTS public.abrir_ciclo_para_parceira();
DROP FUNCTION IF EXISTS private.current_parceira_id();
DROP FUNCTION IF EXISTS public.current_parceira_id();
DROP FUNCTION IF EXISTS public.fechar_ciclo(uuid, text);
DROP FUNCTION IF EXISTS public.saldo_ciclo_aberto(uuid);
DROP FUNCTION IF EXISTS public.preencher_dados_venda();

-- 4. Add user_id to tables that had parceira_id
ALTER TABLE public.estoque_parceiras ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ciclos_mostruario  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vendas             ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clientes           ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Fill user_id from profiles via parceira_id
UPDATE public.estoque_parceiras ep
  SET user_id = p.user_id FROM public.profiles p WHERE p.parceira_id = ep.parceira_id;

UPDATE public.ciclos_mostruario c
  SET user_id = p.user_id FROM public.profiles p WHERE p.parceira_id = c.parceira_id;

UPDATE public.vendas v
  SET user_id = p.user_id FROM public.profiles p WHERE p.parceira_id = v.parceira_id;

UPDATE public.clientes cl
  SET user_id = p.user_id FROM public.profiles p WHERE p.parceira_id = cl.parceira_id;

-- 6. Drop old FK columns
ALTER TABLE public.estoque_parceiras DROP COLUMN parceira_id;
ALTER TABLE public.ciclos_mostruario DROP COLUMN parceira_id;
ALTER TABLE public.vendas            DROP COLUMN parceira_id;
ALTER TABLE public.clientes          DROP COLUMN parceira_id;
ALTER TABLE public.profiles          DROP COLUMN parceira_id;

-- 7. Rename estoque_parceiras → estoque
ALTER TABLE public.estoque_parceiras RENAME TO estoque;

-- 8. Update unique index on ciclos
DROP INDEX IF EXISTS ciclos_um_aberto_por_parceira;
CREATE UNIQUE INDEX ciclos_um_aberto_por_usuario
  ON public.ciclos_mostruario (user_id) WHERE fechado_em IS NULL;

-- 9. Drop parceiras table
DROP TABLE public.parceiras;

-- 10. Recreate functions

CREATE OR REPLACE FUNCTION public.abrir_ciclo_para_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ciclos_mostruario (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abrir_ciclo ON public.profiles;
CREATE TRIGGER trg_abrir_ciclo
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.abrir_ciclo_para_usuario();

CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
  v_pct  numeric(5,2);
BEGIN
  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = NEW.user_id
  LIMIT 1;

  IF v_role = 'b2b' THEN
    v_pct := 20.00;
  ELSIF NEW.valor_venda IS NULL OR NEW.valor_venda < 400 THEN
    v_pct := 0.00;
  ELSIF NEW.valor_venda <= 499.99  THEN v_pct := 20.00;
  ELSIF NEW.valor_venda <= 1999.99 THEN v_pct := 30.00;
  ELSIF NEW.valor_venda <= 3999.99 THEN v_pct := 35.00;
  ELSIF NEW.valor_venda <= 8999.99 THEN v_pct := 40.00;
  ELSIF NEW.valor_venda <= 18999.99 THEN v_pct := 45.00;
  ELSE v_pct := 50.00;
  END IF;

  NEW.comissao_percentual := v_pct;
  IF NEW.valor_venda IS NOT NULL AND NEW.comissao_valor IS NULL THEN
    NEW.comissao_valor := round(NEW.valor_venda * v_pct / 100.0, 2);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preencher_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.preencher_dados_venda();

CREATE OR REPLACE FUNCTION public.fechar_ciclo(_user_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ciclo_id uuid;
  v_total_v  numeric(12,2);
  v_total_c  numeric(12,2);
  v_novo     uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem fechar ciclos';
  END IF;
  SELECT id INTO v_ciclo_id FROM public.ciclos_mostruario
    WHERE user_id = _user_id AND fechado_em IS NULL LIMIT 1;
  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para este usuário';
  END IF;
  SELECT COALESCE(SUM(valor_venda),0), COALESCE(SUM(comissao_valor),0)
    INTO v_total_v, v_total_c FROM public.vendas WHERE ciclo_id = v_ciclo_id;
  UPDATE public.ciclos_mostruario
    SET fechado_em = now(), total_vendas = v_total_v, total_comissao = v_total_c,
        observacao = COALESCE(_observacao, observacao)
    WHERE id = v_ciclo_id;
  INSERT INTO public.ciclos_mostruario (user_id) VALUES (_user_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;

CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id uuid)
RETURNS TABLE(ciclo_id uuid, aberto_em timestamptz, total_vendas numeric, total_comissao numeric, qtd_vendas bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.aberto_em,
    COALESCE(SUM(v.valor_venda),0)::numeric,
    COALESCE(SUM(v.comissao_valor),0)::numeric,
    COUNT(v.id)::bigint
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
$$;

-- 11. Recreate RLS policies

CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role) OR auth.uid() = user_id);

CREATE POLICY "Admin remove perfis"
  ON public.profiles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê o próprio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admin gerencia papéis"
  ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê os próprios papéis"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admin gerencia produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Produtos são públicos para leitura"
  ON public.produtos FOR SELECT TO public USING (true);

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia estoque"
  ON public.estoque FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê o próprio estoque"
  ON public.estoque FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins gerenciam vendas"
  ON public.vendas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário registra própria venda"
  ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê as próprias vendas"
  ON public.vendas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admin gerencia ciclos"
  ON public.ciclos_mostruario FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê os próprios ciclos"
  ON public.ciclos_mostruario FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admin gerencia estoque geral"
  ON public.estoque_geral FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "clientes_acesso"
  ON public.clientes FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "categorias_admin_all"
  ON public.categorias FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'));
