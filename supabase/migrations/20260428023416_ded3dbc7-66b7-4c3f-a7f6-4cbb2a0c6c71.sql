
-- =========================================================
-- 1. ENUM de roles
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'parceira');

-- =========================================================
-- 2. Tabela profiles (liga auth.users -> parceiras)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  parceira_id UUID REFERENCES public.parceiras(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. Tabela user_roles
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. Funções security definer (evita recursão em RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_parceira_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parceira_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- =========================================================
-- 5. Tabela estoque_parceiras (mostruário)
-- =========================================================
CREATE TABLE public.estoque_parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceira_id UUID NOT NULL REFERENCES public.parceiras(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parceira_id, produto_id)
);

CREATE INDEX idx_estoque_parceira ON public.estoque_parceiras(parceira_id);
CREATE INDEX idx_estoque_produto ON public.estoque_parceiras(produto_id);

ALTER TABLE public.estoque_parceiras ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 6. Coluna estoque_id em vendas (rastreabilidade)
-- =========================================================
ALTER TABLE public.vendas
  ADD COLUMN estoque_id UUID REFERENCES public.estoque_parceiras(id) ON DELETE SET NULL;

-- =========================================================
-- 7. Trigger updated_at genérico
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_estoque_updated
  BEFORE UPDATE ON public.estoque_parceiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 8. Trigger: cria profile ao registrar usuário
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 9. Trigger: validar e decrementar estoque ao registrar venda
-- =========================================================
CREATE OR REPLACE FUNCTION public.validar_e_baixar_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estoque_id UUID;
  v_quantidade INTEGER;
BEGIN
  SELECT id, quantidade INTO v_estoque_id, v_quantidade
  FROM public.estoque_parceiras
  WHERE parceira_id = NEW.parceira_id
    AND produto_id = NEW.produto_id
  FOR UPDATE;

  IF v_estoque_id IS NULL THEN
    RAISE EXCEPTION 'Este item não consta no seu mostruário atual'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_quantidade <= 0 THEN
    RAISE EXCEPTION 'Estoque esgotado para este SKU no seu mostruário'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.estoque_parceiras
  SET quantidade = quantidade - 1
  WHERE id = v_estoque_id;

  NEW.estoque_id = v_estoque_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_estoque_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.validar_e_baixar_estoque();

-- =========================================================
-- 10. RLS — profiles
-- =========================================================
CREATE POLICY "Usuário vê o próprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admin remove perfis"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 11. RLS — user_roles
-- =========================================================
CREATE POLICY "Usuário vê os próprios papéis"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia papéis"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 12. RLS — estoque_parceiras
-- =========================================================
CREATE POLICY "Parceira vê o próprio mostruário; admin vê tudo"
  ON public.estoque_parceiras FOR SELECT
  TO authenticated
  USING (
    parceira_id = public.current_parceira_id()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin gerencia mostruários"
  ON public.estoque_parceiras FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 13. RLS — vendas (substituir política pública)
-- =========================================================
DROP POLICY IF EXISTS "Qualquer um pode registrar venda" ON public.vendas;

CREATE POLICY "Parceira registra venda do próprio mostruário"
  ON public.vendas FOR INSERT
  TO authenticated
  WITH CHECK (
    parceira_id = public.current_parceira_id()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Mantém SELECT público para o certificado de garantia funcionar sem login
-- (a política "Vendas são públicas para leitura" já existe)

-- =========================================================
-- 14. RLS — produtos / parceiras: admin pode escrever
-- =========================================================
CREATE POLICY "Admin gerencia produtos"
  ON public.produtos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia parceiras"
  ON public.parceiras FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
