-- =============================================================
-- SCHEMA FINAL — Monare Sales
-- Migration única de criação. Para banco zerado, mantenha apenas
-- este arquivo e o seed (20260602000001_seed.sql).
-- =============================================================


-- =============================================================
-- PARTE 1 — SCHEMAS & TYPES
-- =============================================================

CREATE SCHEMA IF NOT EXISTS private;

CREATE TYPE public.app_role AS ENUM ('administrador', 'revendedora', 'b2b');


-- =============================================================
-- PARTE 2 — TABELAS
-- =============================================================

-- Categorias de produtos (ex: Anéis, Colares, Pulseiras)
CREATE TABLE public.categorias (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  prefixo    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categorias_prefixo_unique ON public.categorias (upper(prefixo));
CREATE UNIQUE INDEX categorias_nome_unique    ON public.categorias (lower(nome));


-- Produtos do catálogo
CREATE TABLE public.produtos (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          TEXT          NOT NULL UNIQUE,
  nome         TEXT          NOT NULL,
  descricao    TEXT,
  material     TEXT,
  preco_venda  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo        BOOLEAN       NOT NULL DEFAULT true,
  categoria_id UUID          REFERENCES public.categorias(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT chk_produtos_preco_positivo CHECK (ativo = false OR preco_venda > 0),
  CONSTRAINT chk_produtos_nome_length    CHECK (char_length(trim(nome)) BETWEEN 2 AND 200) NOT VALID,
  CONSTRAINT chk_produtos_sku_length     CHECK (char_length(trim(sku))  BETWEEN 2 AND 30)  NOT VALID
);

CREATE INDEX idx_produtos_sku          ON public.produtos(sku);
CREATE INDEX idx_produtos_categoria_id ON public.produtos(categoria_id);


-- Perfis das usuárias (revendedoras e admins)
CREATE TABLE public.profiles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  telefone     TEXT,
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 2 AND 100)
);

CREATE INDEX        idx_profiles_user_id    ON public.profiles(user_id);


-- Papéis das usuárias
CREATE TABLE public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);


-- Estoque individual (mostruário da revendedora)
CREATE TABLE public.estoque (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_id         UUID        NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade         INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_vendida INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, produto_id)
);

CREATE INDEX idx_estoque_user_id    ON public.estoque(user_id);
CREATE INDEX idx_estoque_produto_id ON public.estoque(produto_id);


-- Estoque central (geral da empresa)
CREATE TABLE public.estoque_geral (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID        NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produto_id)
);


-- Ciclos de mostruário (período para acerto de comissão)
CREATE TABLE public.ciclos_mostruario (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aberto_em      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  fechado_em     TIMESTAMPTZ,
  total_vendas   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_comissao NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Apenas um ciclo aberto por usuária
CREATE UNIQUE INDEX ciclos_um_aberto_por_usuario
  ON public.ciclos_mostruario (user_id) WHERE fechado_em IS NULL;


-- Clientes cadastrados pelas revendedoras
CREATE TABLE public.clientes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  whatsapp   TEXT        NOT NULL,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_clientes_nome_length     CHECK (char_length(trim(nome)) BETWEEN 2 AND 120),
  CONSTRAINT chk_clientes_whatsapp_digits CHECK (whatsapp ~ '^\d{10,11}$')
);

CREATE UNIQUE INDEX clientes_whatsapp_unique ON public.clientes (whatsapp);


-- Vendas registradas pelas revendedoras
CREATE TABLE public.vendas (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  produto_id          UUID          REFERENCES public.produtos(id) ON DELETE SET NULL,
  estoque_id          UUID          REFERENCES public.estoque(id) ON DELETE SET NULL,
  ciclo_id            UUID          REFERENCES public.ciclos_mostruario(id) ON DELETE SET NULL,
  produto_nome        TEXT          NOT NULL,
  cliente_nome        TEXT          NOT NULL,
  cliente_whatsapp    TEXT          NOT NULL,
  data_venda          DATE          NOT NULL,
  codigo_garantia     TEXT          NOT NULL UNIQUE,
  validade_garantia   DATE,
  garantia_uuid       UUID,
  valor_venda         NUMERIC(12,2),
  comissao_percentual NUMERIC(5,2),
  comissao_valor      NUMERIC(12,2),
  pdf_garantia_url    TEXT,
  termo_aceito        BOOLEAN       NOT NULL DEFAULT false,
  ip_venda            TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT chk_cliente_nome_length
    CHECK (char_length(trim(cliente_nome)) BETWEEN 2 AND 120),
  CONSTRAINT chk_cliente_whatsapp_format
    CHECK (cliente_whatsapp ~ '^\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}$' OR cliente_whatsapp ~ '^\d{10,11}$'),
  CONSTRAINT chk_valor_venda_positive
    CHECK (valor_venda IS NULL OR valor_venda > 0),
  CONSTRAINT chk_produto_nome_length
    CHECK (char_length(produto_nome) BETWEEN 2 AND 200)
);

CREATE INDEX idx_vendas_codigo_garantia ON public.vendas(codigo_garantia);
CREATE INDEX idx_vendas_garantia_uuid   ON public.vendas(garantia_uuid);
CREATE INDEX idx_vendas_user_id         ON public.vendas(user_id);
CREATE INDEX idx_vendas_produto_id      ON public.vendas(produto_id);


-- =============================================================
-- PARTE 3 — FUNÇÕES UTILITÁRIAS
-- =============================================================

-- Atualiza updated_at automaticamente em qualquer tabela
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

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;


-- Verifica se um usuário possui determinado papel
CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated;


-- Percentual de comissão baseado no papel e total vendido no ciclo
CREATE OR REPLACE FUNCTION private.comissao_pct(p_role TEXT, p_total NUMERIC)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_role = 'b2b' THEN
    RETURN 20.00;
  ELSIF p_total IS NULL OR p_total < 400 THEN
    RETURN 0.00;
  ELSIF p_total <= 499.99   THEN RETURN 20.00;
  ELSIF p_total <= 1999.99  THEN RETURN 30.00;
  ELSIF p_total <= 3999.99  THEN RETURN 35.00;
  ELSIF p_total <= 8999.99  THEN RETURN 40.00;
  ELSIF p_total <= 18999.99 THEN RETURN 45.00;
  ELSE RETURN 50.00;
  END IF;
END;
$$;


-- =============================================================
-- PARTE 4 — FUNÇÕES DE NEGÓCIO (RPCs públicas)
-- =============================================================

-- Consulta pública de certificado de garantia por UUID interno
CREATE OR REPLACE FUNCTION public.lookup_certificate(_id UUID)
RETURNS TABLE (
  id              UUID,
  codigo_garantia TEXT,
  produto_nome    TEXT,
  produto_sku     TEXT,
  cliente_nome    TEXT,
  consultora_nome TEXT,
  data_venda      DATE,
  created_at      TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.codigo_garantia,
    v.produto_nome,
    COALESCE(p.sku, '')           AS produto_sku,
    v.cliente_nome,
    COALESCE(pr.display_name, '') AS consultora_nome,
    v.data_venda,
    v.created_at
  FROM public.vendas v
  LEFT JOIN public.produtos  p  ON p.id = v.produto_id
  LEFT JOIN public.profiles  pr ON pr.user_id = v.user_id
  WHERE v.id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_certificate(UUID) TO anon, authenticated;


-- Consulta pública de certificado pelo codigo_garantia (texto)
CREATE OR REPLACE FUNCTION public.lookup_certificate_by_codigo(_codigo TEXT)
RETURNS TABLE (
  id              UUID,
  codigo_garantia TEXT,
  produto_nome    TEXT,
  produto_sku     TEXT,
  cliente_nome    TEXT,
  consultora_nome TEXT,
  data_venda      DATE,
  created_at      TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.codigo_garantia,
    v.produto_nome,
    COALESCE(p.sku, '')           AS produto_sku,
    v.cliente_nome,
    COALESCE(pr.display_name, '') AS consultora_nome,
    v.data_venda,
    v.created_at
  FROM public.vendas v
  LEFT JOIN public.produtos  p  ON p.id = v.produto_id
  LEFT JOIN public.profiles  pr ON pr.user_id = v.user_id
  WHERE v.codigo_garantia = _codigo
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_certificate_by_codigo(TEXT) TO anon, authenticated;


-- Consulta pública de todos os itens de uma venda pelo UUID público
CREATE OR REPLACE FUNCTION public.lookup_garantia_venda(_uuid UUID)
RETURNS TABLE (
  cliente_nome      TEXT,
  data_compra       DATE,
  codigo_garantia   TEXT,
  produto_nome      TEXT,
  validade_garantia DATE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.cliente_nome,
    v.data_venda        AS data_compra,
    v.codigo_garantia,
    v.produto_nome,
    v.validade_garantia
  FROM public.vendas v
  WHERE v.garantia_uuid = _uuid
  ORDER BY v.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_garantia_venda(UUID) TO anon, authenticated;


-- Saldo do ciclo aberto de uma revendedora com comissão e percentual
CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id UUID)
RETURNS TABLE (
  ciclo_id            UUID,
  aberto_em           TIMESTAMPTZ,
  total_vendas        NUMERIC,
  total_comissao      NUMERIC,
  comissao_percentual NUMERIC,
  qtd_vendas          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT ur.role::TEXT INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    c.aberto_em,
    COALESCE(SUM(v.valor_venda), 0)::NUMERIC AS total_vendas,
    round(
      COALESCE(SUM(v.valor_venda), 0) *
      private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0)) / 100.0,
      2
    )::NUMERIC AS total_comissao,
    private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0))::NUMERIC AS comissao_percentual,
    COUNT(v.id)::BIGINT AS qtd_vendas
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
END;
$$;


-- Fecha ciclo da revendedora, zera estoque e abre o próximo (somente admin)
CREATE OR REPLACE FUNCTION public.fechar_ciclo(_user_id UUID, _observacao TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo_id UUID;
  v_role     TEXT;
  v_total_v  NUMERIC(12,2);
  v_pct      NUMERIC(5,2);
  v_total_c  NUMERIC(12,2);
  v_novo     UUID;
BEGIN
  IF NOT private.has_role(auth.uid(), 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem fechar ciclos';
  END IF;

  SELECT id INTO v_ciclo_id
  FROM public.ciclos_mostruario
  WHERE user_id = _user_id AND fechado_em IS NULL
  LIMIT 1;

  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para este usuário';
  END IF;

  SELECT ur.role::TEXT INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  SELECT COALESCE(SUM(valor_venda), 0) INTO v_total_v
  FROM public.vendas WHERE ciclo_id = v_ciclo_id;

  v_pct     := private.comissao_pct(v_role, v_total_v);
  v_total_c := round(v_total_v * v_pct / 100.0, 2);

  UPDATE public.ciclos_mostruario
  SET
    fechado_em     = now(),
    total_vendas   = v_total_v,
    total_comissao = v_total_c,
    observacao     = COALESCE(_observacao, observacao)
  WHERE id = v_ciclo_id;

  UPDATE public.estoque
  SET quantidade = 0, updated_at = now()
  WHERE user_id = _user_id AND quantidade > 0;

  INSERT INTO public.ciclos_mostruario (user_id) VALUES (_user_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;


-- Zera estoque da revendedora sem fechar o ciclo financeiro (somente admin)
CREATE OR REPLACE FUNCTION public.recolher_maleta(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem recolher maletas';
  END IF;

  UPDATE public.estoque
  SET quantidade = 0, updated_at = now()
  WHERE user_id = _user_id AND quantidade > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recolher_maleta(UUID) TO authenticated;


-- =============================================================
-- PARTE 5 — TRIGGERS
-- =============================================================

-- Cria profile ao registrar novo usuário no Auth
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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Abre ciclo automaticamente ao criar perfil da revendedora
CREATE OR REPLACE FUNCTION public.abrir_ciclo_para_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ciclos_mostruario (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_abrir_ciclo
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.abrir_ciclo_para_usuario();


-- Preenche dados da venda no servidor (anti mass-assignment):
-- sobrescreve valor_venda com preço do catálogo, gera codigo_garantia e
-- validade_garantia, valida janela de data_venda (máx 3 dias atrás),
-- vincula ao ciclo aberto e zera comissão por venda.
CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preco         NUMERIC(12,2);
  v_produto_ativo BOOLEAN;
BEGIN
  SELECT preco_venda, ativo
    INTO v_preco, v_produto_ativo
  FROM public.produtos
  WHERE id = NEW.produto_id;

  IF v_preco IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado: %', NEW.produto_id
      USING ERRCODE = 'P0001';
  END IF;
  IF NOT v_produto_ativo THEN
    RAISE EXCEPTION 'Produto inativo não pode ser vendido: %', NEW.produto_id
      USING ERRCODE = 'P0001';
  END IF;

  NEW.valor_venda := v_preco;

  IF NEW.data_venda IS NOT NULL THEN
    IF NEW.data_venda::DATE > CURRENT_DATE THEN
      RAISE EXCEPTION 'Data de venda não pode ser no futuro'
        USING ERRCODE = 'P0002';
    END IF;
    IF NEW.data_venda::DATE < (CURRENT_DATE - INTERVAL '3 days') THEN
      RAISE EXCEPTION 'Data de venda não pode ter mais de 3 dias de antecedência'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  NEW.validade_garantia := (COALESCE(NEW.data_venda, CURRENT_DATE)::DATE + INTERVAL '1 year')::DATE;

  IF NEW.codigo_garantia IS NULL OR length(NEW.codigo_garantia) < 10 THEN
    NEW.codigo_garantia := 'MNR-' ||
      upper(encode(gen_random_bytes(4), 'hex')) || '-' ||
      upper(encode(gen_random_bytes(3), 'hex'));
  END IF;

  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  NEW.comissao_percentual := 0;
  NEW.comissao_valor      := 0;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.preencher_dados_venda() FROM PUBLIC, anon, authenticated;

-- Dispara ANTES de trg_validar_e_baixar_estoque (ordem alfabética: p < v)
CREATE TRIGGER trg_preencher_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.preencher_dados_venda();


-- Valida e decrementa estoque ao registrar venda
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
  SELECT id, quantidade
    INTO v_estoque_id, v_quantidade
  FROM public.estoque
  WHERE user_id   = NEW.user_id
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

  UPDATE public.estoque
  SET
    quantidade         = quantidade - 1,
    quantidade_vendida = quantidade_vendida + 1
  WHERE id = v_estoque_id;

  NEW.estoque_id := v_estoque_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_e_baixar_estoque() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_validar_e_baixar_estoque
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.validar_e_baixar_estoque();


-- Triggers de updated_at
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_estoque_updated
  BEFORE UPDATE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================================
-- PARTE 6 — ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE public.categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_geral     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_mostruario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas            ENABLE ROW LEVEL SECURITY;


-- categorias: leitura pública, escrita somente admin
CREATE POLICY "categorias_public_select" ON public.categorias
  FOR SELECT USING (true);

CREATE POLICY "categorias_admin_all" ON public.categorias
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador'));


-- produtos: leitura pública, escrita somente admin
CREATE POLICY "produtos_public_select" ON public.produtos
  FOR SELECT TO public USING (true);

CREATE POLICY "produtos_admin_all" ON public.produtos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));


-- profiles: usuária vê/edita o próprio; admin gerencia todos
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role) OR auth.uid() = user_id);

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role));


-- user_roles: usuária vê os próprios papéis; admin gerencia tudo
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));


-- estoque: revendedora vê o próprio; admin gerencia tudo
CREATE POLICY "estoque_select" ON public.estoque
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "estoque_admin_all" ON public.estoque
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));


-- estoque_geral: somente admin
CREATE POLICY "estoque_geral_admin_all" ON public.estoque_geral
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));


-- ciclos_mostruario: revendedora vê os próprios; admin gerencia tudo
CREATE POLICY "ciclos_select" ON public.ciclos_mostruario
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "ciclos_admin_all" ON public.ciclos_mostruario
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));


-- clientes: inserção por qualquer autenticada; leitura/edição pelo dono ou admin
CREATE POLICY "clientes_acesso" ON public.clientes
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "clientes_auth_insert" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "clientes_dono_ou_admin_select" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  );

CREATE POLICY "clientes_dono_ou_admin_update" ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'administrador')
    OR EXISTS (
      SELECT 1 FROM public.vendas
      WHERE user_id = auth.uid() AND cliente_whatsapp = public.clientes.whatsapp
      LIMIT 1
    )
  );


-- vendas: revendedora vê/insere as próprias; admin gerencia tudo
CREATE POLICY "vendas_select" ON public.vendas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "vendas_insert" ON public.vendas
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "vendas_admin_all" ON public.vendas
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));
