-- =============================================================
-- Data da venda passa a ser avaliada no horário de Brasília
-- =============================================================
--
-- O banco roda em UTC, então CURRENT_DATE vira o dia seguinte às 21h daqui.
-- Consequências que isso causava:
--
--   1. A janela de retroatividade (3 dias) era contada a partir da data UTC.
--      Depois das 21h BRT o app oferece "hoje" no horário do Brasil, que já é
--      ontem em UTC — a data mais antiga do seletor seria recusada com P0002.
--   2. Vendas sem data_venda explícita ganhavam a data UTC.
--
-- Toda a lógica de data passa a usar o dia corrente em America/Sao_Paulo.
-- O restante da função é idêntico ao de 20260602000000_schema_final.sql.

CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preco         NUMERIC(12,2);
  v_produto_ativo BOOLEAN;
  v_hoje_br       DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
BEGIN
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

  NEW.valor_venda := v_preco;

  IF NEW.data_venda IS NOT NULL THEN
    IF NEW.data_venda::DATE > v_hoje_br THEN
      RAISE EXCEPTION 'Data de venda não pode ser no futuro'
        USING ERRCODE = 'P0002';
    END IF;
    IF NEW.data_venda::DATE < (v_hoje_br - INTERVAL '3 days') THEN
      RAISE EXCEPTION 'Data de venda não pode ter mais de 3 dias de antecedência'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  NEW.validade_garantia := (COALESCE(NEW.data_venda, v_hoje_br)::DATE + INTERVAL '1 year')::DATE;

  IF NEW.codigo_garantia IS NULL OR length(NEW.codigo_garantia) < 10 THEN
    NEW.codigo_garantia := 'MNR-' ||
      upper(encode(gen_random_bytes(4), 'hex')) || '-' ||
      upper(encode(gen_random_bytes(3), 'hex'));
  END IF;

  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  NEW.comissao_percentual := 0;
  NEW.comissao_valor      := 0;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.preencher_dados_venda() FROM PUBLIC, anon, authenticated;
