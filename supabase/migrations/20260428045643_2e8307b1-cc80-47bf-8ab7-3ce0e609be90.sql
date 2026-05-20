-- Remove permissive public SELECT on vendas and replace with safe RPC
DROP POLICY IF EXISTS "Vendas seguem públicas para consulta de garantia" ON public.vendas;

-- Safe RPC for certificate lookup by id, returning only non-sensitive fields
CREATE OR REPLACE FUNCTION public.lookup_certificate(_id uuid)
RETURNS TABLE (
  id uuid,
  codigo_garantia text,
  produto_nome text,
  cliente_nome text,
  data_venda date,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, codigo_garantia, produto_nome, cliente_nome, data_venda, created_at
  FROM public.vendas
  WHERE id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_certificate(uuid) TO anon, authenticated;