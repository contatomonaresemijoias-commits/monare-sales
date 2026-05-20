CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.current_parceira_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parceira_id
  FROM public.profiles
  WHERE user_id = auth.uid()
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_parceira_id() TO authenticated;

DROP POLICY IF EXISTS "Admin gerencia parceiras" ON public.parceiras;
DROP POLICY IF EXISTS "Parceiras são públicas para leitura" ON public.parceiras;
CREATE POLICY "Admin gerencia parceiras"
ON public.parceiras
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Parceiras são públicas para leitura"
ON public.parceiras
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admin gerencia produtos" ON public.produtos;
DROP POLICY IF EXISTS "Produtos são públicos para leitura" ON public.produtos;
CREATE POLICY "Admin gerencia produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Produtos são públicos para leitura"
ON public.produtos
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Admin gerencia perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admin remove perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê o próprio perfil" ON public.profiles;
CREATE POLICY "Admin gerencia perfis"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() = user_id);
CREATE POLICY "Admin remove perfis"
ON public.profiles
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Usuário atualiza o próprio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Usuário vê o próprio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin gerencia papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Usuário vê os próprios papéis" ON public.user_roles;
CREATE POLICY "Admin gerencia papéis"
ON public.user_roles
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Usuário vê os próprios papéis"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam todos os mostruários" ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Parceiras veem o próprio mostruário" ON public.estoque_parceiras;
CREATE POLICY "Admins gerenciam todos os mostruários"
ON public.estoque_parceiras
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Parceiras veem o próprio mostruário"
ON public.estoque_parceiras
FOR SELECT
TO authenticated
USING (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins gerenciam vendas" ON public.vendas;
DROP POLICY IF EXISTS "Parceiras registram vendas do próprio mostruário" ON public.vendas;
DROP POLICY IF EXISTS "Vendas seguem públicas para consulta de garantia" ON public.vendas;
CREATE POLICY "Admins gerenciam vendas"
ON public.vendas
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Parceiras registram vendas do próprio mostruário"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Vendas seguem públicas para consulta de garantia"
ON public.vendas
FOR SELECT
TO public
USING (true);

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_parceira_id() FROM PUBLIC, anon, authenticated;