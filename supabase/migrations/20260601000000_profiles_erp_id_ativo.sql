-- Add erp_id (for ERP/CSV import matching) and ativo (soft-delete) to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS erp_id TEXT,
  ADD COLUMN IF NOT EXISTS ativo  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_erp_id_unique
  ON public.profiles(erp_id)
  WHERE erp_id IS NOT NULL;
