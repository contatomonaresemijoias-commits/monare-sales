-- Estende lookup_certificate para retornar também SKU e nome da consultora
CREATE OR REPLACE FUNCTION public.lookup_certificate(_id UUID)
RETURNS TABLE (
  id               UUID,
  codigo_garantia  TEXT,
  produto_nome     TEXT,
  produto_sku      TEXT,
  cliente_nome     TEXT,
  consultora_nome  TEXT,
  data_venda       DATE,
  created_at       TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.codigo_garantia,
    v.produto_nome,
    COALESCE(p.sku, '')          AS produto_sku,
    v.cliente_nome,
    COALESCE(pr.display_name, '') AS consultora_nome,
    v.data_venda,
    v.created_at
  FROM public.vendas v
  LEFT JOIN public.produtos  p  ON p.id = v.produto_id
  LEFT JOIN public.profiles  pr ON pr.user_id = v.user_id
  WHERE v.id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_certificate(UUID) TO anon, authenticated;
