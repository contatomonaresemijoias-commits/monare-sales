
-- Tabela de parceiras (revendedoras)
CREATE TABLE public.parceiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceira_id UUID REFERENCES public.parceiras(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT NOT NULL,
  data_venda DATE NOT NULL,
  codigo_garantia TEXT NOT NULL UNIQUE,
  validade_garantia DATE,
  termo_aceito BOOLEAN NOT NULL DEFAULT false,
  ip_venda TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_produtos_sku ON public.produtos(sku);
CREATE INDEX idx_vendas_codigo_garantia ON public.vendas(codigo_garantia);

-- RLS
ALTER TABLE public.parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Produtos: leitura pública (para lookup de SKU)
CREATE POLICY "Produtos são públicos para leitura"
  ON public.produtos FOR SELECT
  USING (true);

-- Vendas: leitura pública (certificado é público via link)
CREATE POLICY "Vendas são públicas para leitura"
  ON public.vendas FOR SELECT
  USING (true);

-- Vendas: inserção pública (revendedora registra a venda)
CREATE POLICY "Qualquer um pode registrar venda"
  ON public.vendas FOR INSERT
  WITH CHECK (true);

-- Parceiras: leitura pública
CREATE POLICY "Parceiras são públicas para leitura"
  ON public.parceiras FOR SELECT
  USING (true);

-- Seed: produtos de exemplo
INSERT INTO public.produtos (sku, nome, descricao) VALUES
  ('SKU001', 'Colar Veneziana Gold', 'Colar folheado a ouro 18k, corrente veneziana delicada'),
  ('SKU002', 'Brinco Argola Cravejada', 'Argola folheada a ouro com zircônias cravejadas'),
  ('SKU003', 'Pulseira Elos Cartier', 'Pulseira folheada a ouro com elos no estilo Cartier'),
  ('SKU004', 'Anel Solitário Zircônia', 'Anel folheado a ouro com zircônia central'),
  ('SKU005', 'Conjunto Pérolas Clássico', 'Colar e brincos de pérolas com fecho dourado');

-- Seed: parceira demo
INSERT INTO public.parceiras (id, nome, whatsapp) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Revendedora Demo', '15999999999');
