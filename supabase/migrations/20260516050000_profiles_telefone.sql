-- Adiciona telefone ao perfil da revendedora (exibido no certificado PDF)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone TEXT;
