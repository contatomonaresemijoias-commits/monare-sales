-- =============================================================
-- PAINEL DE RH — permissões do papel 'rh'
-- =============================================================
-- O painel /admin acumulava dois trabalhos diferentes: a operação
-- comercial (estoque, vendas, produtos, comissão) e a gestão de pessoas
-- (captação de candidatas, contratação, ativação/inativação). A segunda
-- parte sai para o painel /rh, acessível a 'administrador' e ao novo
-- papel 'rh'.
--
-- Regra central pedida pelo negócio: RH mexe em revendedora e B2B, mas
-- NUNCA em quem é do próprio time de gestão. Uma RH não pode excluir,
-- desativar, renomear ou trocar a senha de outra RH nem de um admin —
-- senão duas pessoas de RH poderiam se derrubar mutuamente.
--
-- Onde cada barreira mora:
--   * RLS (aqui)                → leitura/escrita direta pelo navegador;
--   * edge function             → criar/excluir conta, senha e `ativo`,
--     admin-manage-users          que rodam com service_role e ignoram RLS;
--   * grants de coluna          → `ativo` continua fora do alcance de
--     (20260730120000)            qualquer authenticated, inclusive RH.
-- =============================================================


-- -------------------------------------------------------------
-- 1) Helpers
-- -------------------------------------------------------------
-- Espelha private.is_admin_ativo: ter o papel não basta, a conta também
-- precisa estar ativa (senão desativar uma RH não tiraria o acesso dela).
CREATE OR REPLACE FUNCTION private.is_rh_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'rh'::public.app_role)
     AND private.is_active(_user_id);
$$;

GRANT EXECUTE ON FUNCTION private.is_rh_ativo(UUID) TO authenticated;


-- Quem pode trabalhar com pessoas: admin ou RH, ambos ativos.
CREATE OR REPLACE FUNCTION private.gerencia_pessoas(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_admin_ativo(_user_id) OR private.is_rh_ativo(_user_id);
$$;

GRANT EXECUTE ON FUNCTION private.gerencia_pessoas(UUID) TO authenticated;


-- Alvo protegido = quem é do time de gestão (admin ou RH). Esta função
-- fala sobre o ALVO da ação, não sobre quem age. É o que impede o RH de
-- alcançar os próprios pares.
CREATE OR REPLACE FUNCTION private.papel_protegido(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('administrador'::public.app_role, 'rh'::public.app_role)
  );
$$;

GRANT EXECUTE ON FUNCTION private.papel_protegido(UUID) TO authenticated;


-- -------------------------------------------------------------
-- 2) candidatas_revenda — captação passa a ser trabalho de RH
-- -------------------------------------------------------------
-- Os nomes antigos diziam "admin"; o conjunto de quem entra mudou, então
-- os nomes mudam junto para o `pg_policies` não mentir sobre a regra.
DROP POLICY IF EXISTS "candidatas_admin_select" ON public.candidatas_revenda;
DROP POLICY IF EXISTS "candidatas_admin_update" ON public.candidatas_revenda;

CREATE POLICY "candidatas_gestao_select" ON public.candidatas_revenda
  FOR SELECT TO authenticated
  USING (private.gerencia_pessoas(auth.uid()));

CREATE POLICY "candidatas_gestao_update" ON public.candidatas_revenda
  FOR UPDATE TO authenticated
  USING (private.gerencia_pessoas(auth.uid()))
  WITH CHECK (private.gerencia_pessoas(auth.uid()));


-- -------------------------------------------------------------
-- 3) Colunas de contratação
-- -------------------------------------------------------------
-- Liga a candidata à conta criada para ela. ON DELETE SET NULL: se a
-- conta for excluída, a ficha da candidatura continua valendo como
-- histórico de captação, só perde o vínculo.
ALTER TABLE public.candidatas_revenda
  ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contratada_em TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS candidatas_user_id_unique
  ON public.candidatas_revenda(user_id) WHERE user_id IS NOT NULL;


-- -------------------------------------------------------------
-- 4) profiles — RH lê todo mundo, escreve só em quem não é da gestão
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR private.is_admin_ativo(auth.uid())
    OR private.is_rh_ativo(auth.uid())
  );

-- A RH edita nome/telefone de revendedora e B2B (as colunas que o grant
-- de 20260730120000 deixou acessíveis; `ativo` continua barrado no nível
-- de coluna para todo authenticated). O próprio perfil dela ela edita
-- pelo primeiro ramo — o que ela não alcança é o perfil dos pares.
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
    OR (private.is_rh_ativo(auth.uid()) AND NOT private.papel_protegido(user_id))
  )
  WITH CHECK (
    (auth.uid() = user_id AND private.is_active(auth.uid()))
    OR private.is_admin_ativo(auth.uid())
    OR (private.is_rh_ativo(auth.uid()) AND NOT private.papel_protegido(user_id))
  );

-- INSERT e DELETE de profiles continuam só com admin: criar e excluir
-- conta é sempre pela edge function, que valida o papel de quem chamou.


-- -------------------------------------------------------------
-- 5) user_roles — RH lê, nunca escreve
-- -------------------------------------------------------------
-- A leitura é o que permite a interface saber quem é revendedora e quem
-- é da gestão. A escrita fica de fora de propósito: com INSERT em
-- user_roles, uma RH se promoveria a administrador em uma linha.
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR private.is_admin_ativo(auth.uid())
    OR private.is_rh_ativo(auth.uid())
  );


-- -------------------------------------------------------------
-- 6) Rede de segurança
-- -------------------------------------------------------------
-- Confere que nenhuma policy de ESCRITA em user_roles alcança o RH e que
-- `ativo` continua sem grant para authenticated. São as duas formas de a
-- separação virar fumaça sem ninguém notar.
DO $$
DECLARE
  v_policies TEXT;
  v_ativo    INT;
BEGIN
  SELECT string_agg(format('%s (%s)', policyname, cmd), ', ')
    INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename  = 'user_roles'
    AND cmd <> 'SELECT'
    AND (qual LIKE '%is_rh_ativo%' OR with_check LIKE '%is_rh_ativo%'
         OR qual LIKE '%gerencia_pessoas%' OR with_check LIKE '%gerencia_pessoas%');

  IF v_policies IS NOT NULL THEN
    RAISE EXCEPTION 'RH alcança escrita em user_roles e poderia se promover: %', v_policies;
  END IF;

  SELECT count(*) INTO v_ativo
  FROM information_schema.column_privileges
  WHERE table_schema  = 'public'
    AND table_name    = 'profiles'
    AND column_name   = 'ativo'
    AND grantee       = 'authenticated'
    AND privilege_type = 'UPDATE';

  IF v_ativo > 0 THEN
    RAISE EXCEPTION 'authenticated recuperou UPDATE em profiles.ativo — usuária desativada se reativaria sozinha';
  END IF;
END;
$$;
