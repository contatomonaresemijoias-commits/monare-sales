-- =============================================================
-- Migração: substituir enum app_role pelos novos papéis
-- admin -> administrador, vendedora/parceira -> revendedora, adiciona b2b
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Dropar todas as políticas que dependem do tipo app_role
--    (via private.has_role, public.has_role, ou comparação direta)
-- ---------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Admin gerencia perfis"           ON public.profiles;
DROP POLICY IF EXISTS "Admin remove perfis"             ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê o próprio perfil"    ON public.profiles;

-- user_roles
DROP POLICY IF EXISTS "Admin gerencia papéis"          ON public.user_roles;
DROP POLICY IF EXISTS "Usuário vê os próprios papéis"  ON public.user_roles;

-- parceiras
DROP POLICY IF EXISTS "Admin gerencia parceiras"        ON public.parceiras;

-- produtos
DROP POLICY IF EXISTS "Admin gerencia produtos"         ON public.produtos;

-- estoque_parceiras
DROP POLICY IF EXISTS "Admin gerencia mostruários"              ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Admins gerenciam todos os mostruários"   ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Parceira vê o próprio mostruário; admin vê tudo" ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Parceiras veem o próprio mostruário"     ON public.estoque_parceiras;

-- vendas
DROP POLICY IF EXISTS "Admins gerenciam vendas"                             ON public.vendas;
DROP POLICY IF EXISTS "Admin gerencia vendas"                               ON public.vendas;
DROP POLICY IF EXISTS "Parceira registra venda do próprio mostruário"       ON public.vendas;
DROP POLICY IF EXISTS "Parceiras registram vendas do próprio mostruário"    ON public.vendas;
DROP POLICY IF EXISTS "Parceira vê as próprias vendas"                      ON public.vendas;

-- ciclos_mostruario
DROP POLICY IF EXISTS "Admin gerencia ciclos"          ON public.ciclos_mostruario;
DROP POLICY IF EXISTS "Parceira vê os próprios ciclos" ON public.ciclos_mostruario;

-- estoque_geral
DROP POLICY IF EXISTS "Admin gerencia estoque geral"   ON public.estoque_geral;

-- clientes (usa comparação direta com enum)
DROP POLICY IF EXISTS "clientes_admin_all"             ON public.clientes;

-- categorias (usa comparação direta com enum)
DROP POLICY IF EXISTS "categorias_admin_all"           ON public.categorias;

-- ---------------------------------------------------------------
-- 2. Dropar funções que referenciam app_role
-- ---------------------------------------------------------------

DROP FUNCTION IF EXISTS private.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- ---------------------------------------------------------------
-- 3. Converter coluna para text, migrar dados, recriar enum
-- ---------------------------------------------------------------

ALTER TABLE user_roles ALTER COLUMN role TYPE text;

UPDATE user_roles SET role = 'administrador' WHERE role = 'admin';
UPDATE user_roles SET role = 'revendedora'   WHERE role IN ('vendedora', 'parceira');

DROP TYPE IF EXISTS app_role;

CREATE TYPE app_role AS ENUM ('administrador', 'revendedora', 'b2b');

ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING role::app_role;

-- ---------------------------------------------------------------
-- 4. Recriar funções com o novo enum
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Atualizar fechar_ciclo para usar novo papel
CREATE OR REPLACE FUNCTION public.fechar_ciclo(_parceira_id uuid, _observacao text DEFAULT NULL)
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
  WHERE parceira_id = _parceira_id AND fechado_em IS NULL LIMIT 1;

  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para esta parceira';
  END IF;

  SELECT COALESCE(SUM(valor_venda),0), COALESCE(SUM(comissao_valor),0)
    INTO v_total_v, v_total_c
  FROM public.vendas WHERE ciclo_id = v_ciclo_id;

  UPDATE public.ciclos_mostruario
  SET fechado_em = now(), total_vendas = v_total_v, total_comissao = v_total_c,
      observacao = COALESCE(_observacao, observacao)
  WHERE id = v_ciclo_id;

  INSERT INTO public.ciclos_mostruario (parceira_id) VALUES (_parceira_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;

-- ---------------------------------------------------------------
-- 5. Recriar todas as políticas com 'administrador'
-- ---------------------------------------------------------------

-- profiles
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

-- user_roles
CREATE POLICY "Admin gerencia papéis"
  ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Usuário vê os próprios papéis"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

-- parceiras
CREATE POLICY "Admin gerencia parceiras"
  ON public.parceiras FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

-- produtos
CREATE POLICY "Admin gerencia produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

-- estoque_parceiras
CREATE POLICY "Admins gerenciam todos os mostruários"
  ON public.estoque_parceiras FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Parceiras veem o próprio mostruário"
  ON public.estoque_parceiras FOR SELECT TO authenticated
  USING (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'administrador'::app_role));

-- vendas
CREATE POLICY "Admins gerenciam vendas"
  ON public.vendas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Parceiras registram vendas do próprio mostruário"
  ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Parceira vê as próprias vendas"
  ON public.vendas FOR SELECT TO authenticated
  USING (parceira_id = public.current_parceira_id() OR private.has_role(auth.uid(), 'administrador'::app_role));

-- ciclos_mostruario
CREATE POLICY "Admin gerencia ciclos"
  ON public.ciclos_mostruario FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Parceira vê os próprios ciclos"
  ON public.ciclos_mostruario FOR SELECT TO authenticated
  USING (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'administrador'::app_role));

-- estoque_geral
CREATE POLICY "Admin gerencia estoque geral"
  ON public.estoque_geral FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));

-- clientes
CREATE POLICY "clientes_admin_all"
  ON public.clientes FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
  );

-- categorias
CREATE POLICY "categorias_admin_all"
  ON public.categorias FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
  );
