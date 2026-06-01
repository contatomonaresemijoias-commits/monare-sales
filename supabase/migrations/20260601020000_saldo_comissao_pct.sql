-- Expose comissao_percentual in saldo_ciclo_aberto so the UI can display it
-- Must drop first because the return type is changing (new column added)
DROP FUNCTION IF EXISTS public.saldo_ciclo_aberto(uuid);

CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id uuid)
RETURNS TABLE(
  ciclo_id            uuid,
  aberto_em           timestamptz,
  total_vendas        numeric,
  total_comissao      numeric,
  comissao_percentual numeric,
  qtd_vendas          bigint
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
  SELECT
    c.id,
    c.aberto_em,
    COALESCE(SUM(v.valor_venda), 0)::numeric AS total_vendas,
    round(
      COALESCE(SUM(v.valor_venda), 0) *
      private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0)) / 100.0,
      2
    )::numeric AS total_comissao,
    private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0))::numeric AS comissao_percentual,
    COUNT(v.id)::bigint AS qtd_vendas
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
END;
$$;
