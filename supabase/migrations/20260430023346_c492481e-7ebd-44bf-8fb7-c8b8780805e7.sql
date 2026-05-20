-- Adiciona preço sugerido nos produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS preco_venda numeric(10,2) NOT NULL DEFAULT 0;

-- Adiciona contador de peças vendidas no estoque da parceira
ALTER TABLE public.estoque_parceiras
  ADD COLUMN IF NOT EXISTS quantidade_vendida integer NOT NULL DEFAULT 0;

-- Atualiza a função de baixa para também incrementar quantidade_vendida
CREATE OR REPLACE FUNCTION public.validar_e_baixar_estoque()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_estoque_id UUID;
  v_quantidade INTEGER;
BEGIN
  SELECT id, quantidade INTO v_estoque_id, v_quantidade
  FROM public.estoque_parceiras
  WHERE parceira_id = NEW.parceira_id
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

  UPDATE public.estoque_parceiras
  SET quantidade = quantidade - 1,
      quantidade_vendida = quantidade_vendida + 1
  WHERE id = v_estoque_id;

  NEW.estoque_id = v_estoque_id;
  RETURN NEW;
END;
$function$;

-- Garante que o trigger de baixa esteja anexado à tabela vendas
DROP TRIGGER IF EXISTS trg_validar_e_baixar_estoque ON public.vendas;
CREATE TRIGGER trg_validar_e_baixar_estoque
  BEFORE INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_e_baixar_estoque();

-- Garante que o trigger de preencher dados (ciclo + comissão) esteja anexado
DROP TRIGGER IF EXISTS trg_preencher_dados_venda ON public.vendas;
CREATE TRIGGER trg_preencher_dados_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_dados_venda();