-- Tabela de estoque central (geral) da empresa
CREATE TABLE public.estoque_geral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(produto_id)
);

ALTER TABLE public.estoque_geral ENABLE ROW LEVEL SECURITY;

-- Apenas admin gerencia o estoque geral
CREATE POLICY "Admin gerencia estoque geral"
  ON public.estoque_geral FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
