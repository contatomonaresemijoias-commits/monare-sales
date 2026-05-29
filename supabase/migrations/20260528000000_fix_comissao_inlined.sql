-- =============================================================
-- Corrige saldo_ciclo_aberto: internaliza cálculo de comissão
-- para eliminar dependência de private.comissao_pct via CTE.
-- =============================================================

CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id uuid)
RETURNS TABLE(
  ciclo_id       uuid,
  aberto_em      timestamptz,
  total_vendas   numeric,
  total_comissao numeric,
  qtd_vendas     bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  RETURN QUERY
  WITH totais AS (
    SELECT
      c.id           AS ciclo_id,
      c.aberto_em,
      COALESCE(SUM(v.valor_venda), 0)::numeric AS total_vendas,
      COUNT(v.id)::bigint                       AS qtd_vendas
    FROM public.ciclos_mostruario c
    LEFT JOIN public.vendas v
      ON (v.ciclo_id = c.id OR (v.ciclo_id IS NULL AND v.user_id = _user_id))
    WHERE c.user_id = _user_id AND c.fechado_em IS NULL
    GROUP BY c.id, c.aberto_em
  )
  SELECT
    t.ciclo_id,
    t.aberto_em,
    t.total_vendas,
    CASE
      WHEN v_role = 'b2b'           THEN round(t.total_vendas * 20.0 / 100.0, 2)
      WHEN t.total_vendas < 400     THEN 0::numeric
      WHEN t.total_vendas <= 499.99 THEN round(t.total_vendas * 20.0 / 100.0, 2)
      WHEN t.total_vendas <= 1999.99 THEN round(t.total_vendas * 30.0 / 100.0, 2)
      WHEN t.total_vendas <= 3999.99 THEN round(t.total_vendas * 35.0 / 100.0, 2)
      WHEN t.total_vendas <= 8999.99 THEN round(t.total_vendas * 40.0 / 100.0, 2)
      WHEN t.total_vendas <= 18999.99 THEN round(t.total_vendas * 45.0 / 100.0, 2)
      ELSE                               round(t.total_vendas * 50.0 / 100.0, 2)
    END AS total_comissao,
    t.qtd_vendas
  FROM totais t;
END;
$$;
