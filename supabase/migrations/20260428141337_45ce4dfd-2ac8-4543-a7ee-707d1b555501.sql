-- Add 'vendedora' role to enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'vendedora'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendedora';
  END IF;
END$$;

-- Add FK with proper cascade behavior on profiles.parceira_id -> parceiras.id (SET NULL on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_parceira_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_parceira_id_fkey
      FOREIGN KEY (parceira_id) REFERENCES public.parceiras(id) ON DELETE SET NULL;
  END IF;
END$$;

-- estoque_parceiras: cascade on parceira/produto delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'estoque_parceiras_parceira_id_fkey'
  ) THEN
    ALTER TABLE public.estoque_parceiras
      ADD CONSTRAINT estoque_parceiras_parceira_id_fkey
      FOREIGN KEY (parceira_id) REFERENCES public.parceiras(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'estoque_parceiras_produto_id_fkey'
  ) THEN
    ALTER TABLE public.estoque_parceiras
      ADD CONSTRAINT estoque_parceiras_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;
  END IF;
END$$;

-- vendas: keep history when parceira/produto removed (SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendas_parceira_id_fkey'
  ) THEN
    ALTER TABLE public.vendas
      ADD CONSTRAINT vendas_parceira_id_fkey
      FOREIGN KEY (parceira_id) REFERENCES public.parceiras(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vendas_produto_id_fkey'
  ) THEN
    ALTER TABLE public.vendas
      ADD CONSTRAINT vendas_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL;
  END IF;
END$$;

-- profiles & user_roles: cascade when auth user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_parceira_id ON public.profiles(parceira_id);
CREATE INDEX IF NOT EXISTS idx_estoque_parceira ON public.estoque_parceiras(parceira_id);
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON public.estoque_parceiras(produto_id);
CREATE INDEX IF NOT EXISTS idx_vendas_parceira ON public.vendas(parceira_id);