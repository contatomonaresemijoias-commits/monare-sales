-- =============================================================
-- Adiciona suporte a PDF de garantia por item de venda
-- =============================================================

-- 1. Campo para URL do PDF na tabela de vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS pdf_garantia_url TEXT;

-- 2. Campo material nos produtos (exibido no PDF)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS material TEXT;

-- 3. Bucket público para os certificados em PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados', 'certificados', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas do bucket
CREATE POLICY "certificados_leitura_publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificados');

CREATE POLICY "certificados_upload_autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificados');

CREATE POLICY "certificados_update_autenticado"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'certificados');
