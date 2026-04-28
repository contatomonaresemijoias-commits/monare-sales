DROP POLICY IF EXISTS "Admin gerencia mostruários" ON public.estoque_parceiras;
DROP POLICY IF EXISTS "Parceira vê o próprio mostruário; admin vê tudo" ON public.estoque_parceiras;

CREATE POLICY "Admins gerenciam todos os mostruários"
ON public.estoque_parceiras
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Parceiras veem o próprio mostruário"
ON public.estoque_parceiras
FOR SELECT
TO authenticated
USING (
  parceira_id = public.current_parceira_id()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Parceira registra venda do próprio mostruário" ON public.vendas;
DROP POLICY IF EXISTS "Vendas são públicas para leitura" ON public.vendas;
DROP POLICY IF EXISTS "Admins gerenciam vendas" ON public.vendas;
DROP POLICY IF EXISTS "Parceiras registram vendas do próprio mostruário" ON public.vendas;

CREATE POLICY "Admins gerenciam vendas"
ON public.vendas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Parceiras registram vendas do próprio mostruário"
ON public.vendas
FOR INSERT
TO authenticated
WITH CHECK (
  parceira_id = public.current_parceira_id()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Vendas seguem públicas para consulta de garantia"
ON public.vendas
FOR SELECT
TO public
USING (true);