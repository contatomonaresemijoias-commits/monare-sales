-- =============================================================
-- Comissão: faixa única para todos os papéis
-- =============================================================
-- Regra nova de negócio (09/08/2026): acaba a diferenciação entre
-- revendedora e b2b. Todo mundo passa a receber pelas mesmas faixas:
--
--   R$      0,00 a R$ 1.999,99 → 30%
--   R$  2.000,00 a R$ 3.999,99 → 35%
--   R$  4.000,00 em diante     → 38%
--
-- O que sai junto:
--   • os 20% fixos do papel 'b2b';
--   • o mínimo de R$ 400 no ciclo para haver comissão — agora a primeira
--     venda já paga 30%;
--   • as faixas de 40% / 45% / 50%, que 38% substitui como teto.
--
-- Ciclos já fechados não mudam: `ciclos_mostruario` guarda o total_comissao
-- apurado no fechamento. Ciclos abertos passam a ser calculados pela regra
-- nova na próxima leitura do saldo, que é o comportamento esperado.

-- O parâmetro p_role continua na assinatura de propósito: `saldo_ciclo_atual`
-- e `fechar_ciclo` chamam esta função com 2 argumentos, e mantê-la assim
-- evita recriar as duas RPCs só para trocar a aridade. O valor é ignorado.
CREATE OR REPLACE FUNCTION private.comissao_pct(p_role TEXT, p_total NUMERIC)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_total IS NULL OR p_total < 0     THEN RETURN 0.00;
  ELSIF p_total <= 1999.99              THEN RETURN 30.00;
  ELSIF p_total <= 3999.99              THEN RETURN 35.00;
  ELSE RETURN 38.00;
  END IF;
END;
$$;

COMMENT ON FUNCTION private.comissao_pct(TEXT, NUMERIC) IS
  'Percentual de comissão por total vendido no ciclo: 30% até 1.999,99, 35% até 3.999,99, 38% acima. Igual para todos os papéis — p_role é ignorado.';
