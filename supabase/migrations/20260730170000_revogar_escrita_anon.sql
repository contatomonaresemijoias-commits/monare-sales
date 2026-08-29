-- =============================================================
-- REVOGA ESCRITA DO PAPEL anon NAS TABELAS DE DADOS
-- =============================================================
-- O Supabase concede por padrão `GRANT ALL ON ALL TABLES IN SCHEMA public
-- TO anon, authenticated`, deixando o RLS como única barreira. Hoje isso
-- não é explorável — não existe nenhuma policy de INSERT/UPDATE/DELETE
-- para anon —, mas é frágil: basta alguém criar uma policy permissiva
-- `TO public` (que inclui anon) para um fluxo público qualquer e a escrita
-- anônima abre em silêncio, sem ninguém perceber.
--
-- O caso concreto que motivou isto: anon tinha UPDATE em profiles.ativo,
-- exatamente a coluna que 20260730120000 tirou de authenticated para
-- impedir que uma usuária desativada se reativasse sozinha.
--
-- SELECT continua liberado: o catálogo (produtos/categorias) e a página
-- pública de certificado leem como anon.
--
-- O único fluxo público que grava é o cadastro de revendedora, e ele entra
-- pela Edge Function reseller-registration com service_role, que não usa
-- estes grants.
--
-- Observação: tabelas criadas no futuro voltam a receber o grant padrão do
-- Supabase. Se aparecer tabela nova com dado sensível, repetir o REVOKE.
-- =============================================================

REVOKE INSERT, UPDATE, DELETE ON public.profiles           FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles         FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.vendas             FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.estoque            FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.estoque_geral      FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ciclos_mostruario  FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.clientes           FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.produtos           FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.categorias         FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.candidatas_revenda FROM anon;


-- -------------------------------------------------------------
-- Rede de segurança
-- -------------------------------------------------------------
-- 1) Se existir alguma policy de escrita alcançável por anon, o REVOKE
--    acima pode estar derrubando um fluxo real: aborta para revisar.
-- 2) service_role e authenticated não podem ter sido afetados.
DO $$
DECLARE
  v_policies TEXT;
  v_service  INT;
  v_auth     INT;
BEGIN
  SELECT string_agg(format('%s.%s (%s)', tablename, policyname, cmd), ', ')
    INTO v_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd <> 'SELECT'
    AND ('anon' = ANY(roles) OR 'public' = ANY(roles));

  IF v_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Existe policy de escrita alcançável por anon: %', v_policies;
  END IF;

  SELECT count(*) INTO v_service
  FROM information_schema.table_privileges
  WHERE table_schema = 'public' AND grantee = 'service_role'
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');

  IF v_service = 0 THEN
    RAISE EXCEPTION 'service_role ficou sem escrita — as edge functions quebrariam';
  END IF;

  SELECT count(*) INTO v_auth
  FROM information_schema.table_privileges
  WHERE table_schema = 'public' AND grantee = 'authenticated'
    AND table_name = 'vendas' AND privilege_type = 'INSERT';

  IF v_auth = 0 THEN
    RAISE EXCEPTION 'authenticated perdeu INSERT em vendas — revendedoras não venderiam';
  END IF;
END;
$$;
