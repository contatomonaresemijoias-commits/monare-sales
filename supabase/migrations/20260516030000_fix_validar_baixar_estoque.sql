-- =============================================================
-- Fix: validar_e_baixar_estoque ainda referenciava estoque_parceiras
-- A tabela foi renomeada para estoque e parceira_id → user_id
-- =============================================================

-- 1. Remove todos os triggers que dependem da função antiga
DROP TRIGGER IF EXISTS trg_validar_e_baixar_estoque ON public.vendas;
DROP TRIGGER IF EXISTS trg_validar_estoque_venda    ON public.vendas;

-- 2. Remove a função antiga (CASCADE para remover dependentes restantes)
DROP FUNCTION IF EXISTS public.validar_e_baixar_estoque() CASCADE;

-- 3. Recria a função apontando para a tabela e coluna corretas
CREATE OR REPLACE FUNCTION public.validar_e_baixar_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estoque_id UUID;
  v_quantidade INTEGER;
BEGIN
  SELECT id, quantidade INTO v_estoque_id, v_quantidade
  FROM public.estoque
  WHERE user_id   = NEW.user_id
    AND produto_id = NEW.produto_id
  FOR UPDATE;

  IF v_estoque_id IS NULL THEN
    RAISE EXCEPTION 'Este item não consta no seu mostruário atual'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_quantidade <= 0 THEN
    RAISE EXCEPTION 'Estoque esgotado para este SKU no seu mostruário'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.estoque
  SET quantidade         = quantidade - 1,
      quantidade_vendida = quantidade_vendida + 1
  WHERE id = v_estoque_id;

  NEW.estoque_id = v_estoque_id;
  RETURN NEW;
END;
$$;

-- 4. Recria o trigger
CREATE TRIGGER trg_validar_e_baixar_estoque
  BEFORE INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_e_baixar_estoque();
