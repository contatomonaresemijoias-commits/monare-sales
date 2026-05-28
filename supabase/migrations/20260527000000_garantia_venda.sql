-- Adiciona garantia_uuid às vendas para identificar a transação completa publicamente
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS garantia_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_vendas_garantia_uuid ON public.vendas(garantia_uuid);


-- RPC: busca certificado individual pelo codigo_garantia (texto)
-- Substitui o lookup por UUID quando o acesso vem via ?codigo=
CREATE OR REPLACE FUNCTION public.lookup_certificate_by_codigo(_codigo TEXT)
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
    COALESCE(p.sku, '')           AS produto_sku,
    v.cliente_nome,
    COALESCE(pr.display_name, '') AS consultora_nome,
    v.data_venda,
    v.created_at
  FROM public.vendas v
  LEFT JOIN public.produtos  p  ON p.id = v.produto_id
  LEFT JOIN public.profiles  pr ON pr.user_id = v.user_id
  WHERE v.codigo_garantia = _codigo
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_certificate_by_codigo(TEXT) TO anon, authenticated;


-- RPC: busca todos os certificados de uma venda pelo UUID público
-- Acesso anônimo — não expõe id interno nem dados financeiros
CREATE OR REPLACE FUNCTION public.lookup_garantia_venda(_uuid UUID)
RETURNS TABLE (
  cliente_nome      TEXT,
  data_compra       DATE,
  codigo_garantia   TEXT,
  produto_nome      TEXT,
  validade_garantia DATE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.cliente_nome,
    v.data_venda        AS data_compra,
    v.codigo_garantia,
    v.produto_nome,
    v.validade_garantia
  FROM public.vendas v
  WHERE v.garantia_uuid = _uuid
  ORDER BY v.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_garantia_venda(UUID) TO anon, authenticated;
