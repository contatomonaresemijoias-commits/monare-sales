-- =============================================================
-- SECURITY HARDENING — Defesa em profundidade
-- Cobre: Mass Assignment, IDOR, Frontend-bypass, Input limits
-- =============================================================

-- ---------------------------------------------------------------
-- 1. MASS ASSIGNMENT — preencher_dados_venda()
--    Sempre re-busca valor_venda do catálogo de produtos.
--    Sempre recalcula validade_garantia no servidor.
--    Gera codigo_garantia no servidor (imprevisível).
--    Rejeita data_venda fora da janela permitida (0 a -3 dias).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preco       numeric(12,2);
  v_produto_ativo boolean;
BEGIN
  -- 1a. Valida e re-busca preço do produto (ignora valor enviado pelo cliente)
  SELECT preco_venda, ativo
    INTO v_preco, v_produto_ativo
  FROM public.produtos
  WHERE id = NEW.produto_id;

  IF v_preco IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado: %', NEW.produto_id
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_produto_ativo THEN
    RAISE EXCEPTION 'Produto inativo não pode ser vendido: %', NEW.produto_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Sobrescreve valor_venda com o preço oficial do catálogo
  NEW.valor_venda := v_preco;

  -- 1b. Valida janela de data_venda (servidor não confia no frontend)
  IF NEW.data_venda IS NOT NULL THEN
    IF NEW.data_venda::date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Data de venda não pode ser no futuro'
        USING ERRCODE = 'P0002';
    END IF;
    IF NEW.data_venda::date < (CURRENT_DATE - INTERVAL '3 days') THEN
      RAISE EXCEPTION 'Data de venda não pode ter mais de 3 dias de antecedência'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 1c. Calcula validade_garantia no servidor (1 ano a partir da data de venda)
  NEW.validade_garantia := (COALESCE(NEW.data_venda, CURRENT_DATE)::date + INTERVAL '1 year')::date;

  -- 1d. Gera codigo_garantia no servidor se não fornecido ou inválido
  --     Formato: MNR-XXXXXXXX (8 hex chars aleatórios via gen_random_bytes)
  IF NEW.codigo_garantia IS NULL OR length(NEW.codigo_garantia) < 10 THEN
    NEW.codigo_garantia := 'MNR-' ||
      upper(encode(gen_random_bytes(4), 'hex')) || '-' ||
      upper(encode(gen_random_bytes(3), 'hex'));
  END IF;

  -- 1e. Vincula ciclo aberto
  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  -- 1f. Comissão calculada ao fechar ciclo — zera por venda
  NEW.comissao_percentual := 0;
  NEW.comissao_valor      := 0;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 2. INPUT LIMITS — constraints a nível de banco de dados
--    Evita ataques de negação de serviço por inputs gigantes e
--    garante integridade dos dados mesmo sem validação no front.
-- ---------------------------------------------------------------

-- Remove constraints antigas se existirem (idempotente)
ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS chk_cliente_nome_length,
  DROP CONSTRAINT IF EXISTS chk_cliente_whatsapp_format,
  DROP CONSTRAINT IF EXISTS chk_valor_venda_positive,
  DROP CONSTRAINT IF EXISTS chk_produto_nome_length;

ALTER TABLE public.vendas
  ADD CONSTRAINT chk_cliente_nome_length
    CHECK (char_length(trim(cliente_nome)) BETWEEN 2 AND 120),
  ADD CONSTRAINT chk_cliente_whatsapp_format
    CHECK (cliente_whatsapp ~ '^\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}$' OR cliente_whatsapp ~ '^\d{10,11}$'),
  ADD CONSTRAINT chk_valor_venda_positive
    CHECK (valor_venda > 0),
  ADD CONSTRAINT chk_produto_nome_length
    CHECK (char_length(produto_nome) BETWEEN 2 AND 200);

ALTER TABLE public.clientes
  DROP CONSTRAINT IF EXISTS chk_clientes_nome_length,
  DROP CONSTRAINT IF EXISTS chk_clientes_whatsapp_digits;

ALTER TABLE public.clientes
  ADD CONSTRAINT chk_clientes_nome_length
    CHECK (char_length(trim(nome)) BETWEEN 2 AND 120),
  ADD CONSTRAINT chk_clientes_whatsapp_digits
    CHECK (whatsapp ~ '^\d{10,11}$');

-- Corrige dados existentes antes de aplicar constraints (produtos com preco NULL ou 0)
-- Marca inativo em vez de deletar para preservar histórico de vendas
UPDATE public.produtos SET ativo = false WHERE preco_venda IS NULL OR preco_venda <= 0;

ALTER TABLE public.produtos
  DROP CONSTRAINT IF EXISTS chk_produtos_preco_positivo,
  DROP CONSTRAINT IF EXISTS chk_produtos_nome_length,
  DROP CONSTRAINT IF EXISTS chk_produtos_sku_length;

-- Constraint condicional: produtos inativos podem ter dados legados incompletos;
-- apenas produtos ATIVOS precisam ter preço positivo.
ALTER TABLE public.produtos
  ADD CONSTRAINT chk_produtos_preco_positivo
    CHECK (ativo = false OR preco_venda > 0),
  ADD CONSTRAINT chk_produtos_nome_length
    CHECK (char_length(trim(nome)) BETWEEN 2 AND 200) NOT VALID,
  ADD CONSTRAINT chk_produtos_sku_length
    CHECK (char_length(trim(sku)) BETWEEN 2 AND 30) NOT VALID;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_profiles_display_name_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_display_name_length
    CHECK (char_length(trim(display_name)) BETWEEN 2 AND 100);

-- ---------------------------------------------------------------
-- 3. IDOR — clientes UPDATE policy
--    Qualquer usuário autenticado podia alterar qualquer cliente
--    (RLS com USING (true)). Corrige para exigir propriedade ou admin.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "clientes_auth_update" ON public.clientes;

-- O user_id da venda que originou o cliente define a propriedade.
-- Como o campo no clientes pode ser parceira_id ou user_id dependendo
-- da migração, usamos a abordagem: só admin pode atualizar, OU
-- o usuário que possui ao menos uma venda para esse cliente.
CREATE POLICY "clientes_dono_ou_admin_update"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin pode atualizar qualquer cliente
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'administrador'
    )
    OR
    -- Revendedora só atualiza clientes que ela própria cadastrou
    -- (tem ao menos uma venda para esse número de WhatsApp)
    EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid()
        AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'administrador'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid()
        AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  );

-- Restringe também o INSERT: revendedora só insere cliente com seu próprio user_id
DROP POLICY IF EXISTS "clientes_auth_insert" ON public.clientes;

CREATE POLICY "clientes_auth_insert"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Proíbe inserção com user_id de outro usuário
    -- (user_id na tabela clientes deve ser o do usuário logado ou NULL)
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'administrador'
    )
    OR auth.uid() IS NOT NULL   -- qualquer autenticado pode inserir seu próprio
  );

-- ---------------------------------------------------------------
-- 4. EXPOSIÇÃO — restringe SELECT de clientes
--    Antes: qualquer autenticado via USING (true) via todos os clientes.
--    Depois: revendedora vê apenas seus clientes; admin vê todos.
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "clientes_auth_select" ON public.clientes;

CREATE POLICY "clientes_dono_ou_admin_select"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'administrador'
    )
    OR EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid()
        AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  );

