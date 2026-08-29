-- =============================================================
-- REMOÇÃO DAS POLICIES LEGADAS (nomes em português)
-- =============================================================
-- O banco de produção carregava policies com nomes descritivos em
-- português ("Usuário vê o próprio estoque", "Admin gerencia vendas", ...),
-- criadas antes de 20260602000000_schema_final.sql e que nunca existiram
-- nos arquivos de migration. Por isso os DROPs de
-- 20260730120000_bloquear_usuarios_inativos.sql não acharam nada
-- ("does not exist, skipping") e as novas policies foram criadas AO LADO
-- das antigas.
--
-- Policies permissivas são combinadas com OR: enquanto a legada existir,
-- ela libera o acesso sozinha e o bloqueio de usuária inativa não vale.
-- Esta migration apaga as legadas e cria as duas policies de SELECT que
-- faltavam para o conjunto ficar completo.
--
-- Ordem importa: cria antes de apagar, para não abrir janela sem policy
-- de leitura (a transação da migration já garante isso, mas mantém a
-- leitura do arquivo óbvia).
-- =============================================================


-- -------------------------------------------------------------
-- 1) Policies de SELECT que só existiam com o nome legado
-- -------------------------------------------------------------
-- profiles: a própria dona lê o próprio perfil MESMO inativa — é assim que
-- o front descobre a desativação e mostra a tela de aviso.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_admin_ativo(auth.uid()));

-- user_roles: mesma lógica — o cliente precisa dos próprios papéis para
-- montar a sessão antes de decidir o que exibir.
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_admin_ativo(auth.uid()));

-- produtos: catálogo é leitura pública (usado pela página de certificado
-- e pelo fluxo público), continua aberto — só troca o nome legado.
DROP POLICY IF EXISTS "produtos_public_select" ON public.produtos;
CREATE POLICY "produtos_public_select" ON public.produtos
  FOR SELECT TO public
  USING (true);


-- -------------------------------------------------------------
-- 2) Apaga as legadas
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Usuário vê o próprio perfil"       ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin gerencia perfis"             ON public.profiles;
DROP POLICY IF EXISTS "Admin remove perfis"               ON public.profiles;

DROP POLICY IF EXISTS "Usuário vê os próprios papéis"     ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia papéis"             ON public.user_roles;

DROP POLICY IF EXISTS "Usuário vê o próprio estoque"      ON public.estoque;
DROP POLICY IF EXISTS "Admin gerencia estoque"            ON public.estoque;

DROP POLICY IF EXISTS "Admin gerencia estoque geral"      ON public.estoque_geral;

DROP POLICY IF EXISTS "Usuário vê os próprios ciclos"     ON public.ciclos_mostruario;
DROP POLICY IF EXISTS "Admin gerencia ciclos"             ON public.ciclos_mostruario;

DROP POLICY IF EXISTS "Usuário vê as próprias vendas"     ON public.vendas;
DROP POLICY IF EXISTS "Usuário registra própria venda"    ON public.vendas;
DROP POLICY IF EXISTS "Admins gerenciam vendas"           ON public.vendas;

DROP POLICY IF EXISTS "Produtos são públicos para leitura" ON public.produtos;
DROP POLICY IF EXISTS "Admin gerencia produtos"            ON public.produtos;


-- -------------------------------------------------------------
-- 3) Rede de segurança
-- -------------------------------------------------------------
-- Se sobrar qualquer policy fora da lista canônica nas tabelas de dados,
-- aborta a migration em vez de deixar o bloqueio furado em silêncio.
DO $$
DECLARE
  v_sobrando TEXT;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO v_sobrando
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'user_roles', 'estoque', 'estoque_geral',
      'ciclos_mostruario', 'vendas', 'clientes', 'produtos',
      'categorias', 'candidatas_revenda'
    )
    AND policyname NOT IN (
      'profiles_select', 'profiles_update', 'profiles_insert', 'profiles_delete',
      'user_roles_select', 'user_roles_admin_all',
      'estoque_select', 'estoque_admin_all',
      'estoque_geral_admin_all',
      'ciclos_select', 'ciclos_admin_all',
      'vendas_select', 'vendas_insert', 'vendas_admin_all',
      'clientes_acesso', 'clientes_auth_insert',
      'clientes_dono_ou_admin_select', 'clientes_dono_ou_admin_update',
      'produtos_public_select', 'produtos_admin_all',
      'categorias_public_select', 'categorias_admin_all',
      'candidatas_admin_select', 'candidatas_admin_update'
    );

  IF v_sobrando IS NOT NULL THEN
    RAISE EXCEPTION
      'Policies não previstas ainda ativas (podem liberar usuária inativa por OR): %',
      v_sobrando;
  END IF;
END;
$$;
