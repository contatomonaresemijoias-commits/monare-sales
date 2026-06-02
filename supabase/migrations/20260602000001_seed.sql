-- =============================================================
-- SEED — Monare Sales
-- Dados iniciais necessários para o funcionamento da aplicação.
-- =============================================================


-- =============================================================
-- STORAGE — Bucket de certificados PDF
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados', 'certificados', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "certificados_leitura_publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificados');

CREATE POLICY "certificados_upload_autenticado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificados');

CREATE POLICY "certificados_update_autenticado" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'certificados');
