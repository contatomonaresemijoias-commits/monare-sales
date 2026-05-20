-- =============================================================
-- Corrige vendas com ciclo_id NULL (vendas "órfãs")
-- 1. Cria ciclo aberto para usuários que têm vendas mas sem ciclo
-- 2. Vincula as vendas órfãs ao ciclo aberto
-- 3. Atualiza saldo_ciclo_aberto para incluir órfãs como fallback
-- =============================================================

-- 1. Cria ciclo aberto para usuários que possuem vendas órfãs mas nenhum ciclo aberto
INSERT INTO public.ciclos_mostruario (user_id)
SELECT DISTINCT v.user_id
FROM public.vendas v
WHERE v.ciclo_id IS NULL
  AND v.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ciclos_mostruario c
    WHERE c.user_id = v.user_id AND c.fechado_em IS NULL
  );

-- 2. Backfill: vincula vendas órfãs ao ciclo aberto do mesmo user
UPDATE public.vendas v
SET ciclo_id = c.id
FROM public.ciclos_mostruario c
WHERE v.ciclo_id IS NULL
  AND v.user_id IS NOT NULL
  AND c.user_id = v.user_id
  AND c.fechado_em IS NULL;

-- 3. Atualiza saldo_ciclo_aberto para também incluir vendas que ainda
--    fiquem órfãs (ciclo_id IS NULL) do mesmo usuário — segurança extra
CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id uuid)
RETURNS TABLE(ciclo_id uuid, aberto_em timestamptz, total_vendas numeric, total_comissao numeric, qtd_vendas bigint)
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
    COUNT(v.id)::bigint AS qtd_vendas
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v
    ON (v.ciclo_id = c.id OR (v.ciclo_id IS NULL AND v.user_id = _user_id))
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
END;
$$;
