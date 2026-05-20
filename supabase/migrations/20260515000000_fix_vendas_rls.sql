-- Corrige RLS da tabela vendas:
-- Remove política pública de leitura (qualquer anônimo via SELECT)
-- e substitui por acesso restrito por parceira_id.
-- O certificado público continua acessível via RPC lookup_certificate (SECURITY DEFINER).

DROP POLICY IF EXISTS "Vendas são públicas para leitura" ON public.vendas;

-- Parceira vê apenas as próprias vendas
CREATE POLICY "Parceira vê as próprias vendas"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (
    parceira_id = public.current_parceira_id()
    OR public.has_role(auth.uid(), 'admin')
  );
