


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'administrador',
    'revendedora',
    'b2b'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."comissao_pct"("p_role" "text", "p_total" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF p_role = 'b2b' THEN
    RETURN 20.00;
  ELSIF p_total IS NULL OR p_total < 400 THEN
    RETURN 0.00;
  ELSIF p_total <= 499.99  THEN RETURN 20.00;
  ELSIF p_total <= 1999.99 THEN RETURN 30.00;
  ELSIF p_total <= 3999.99 THEN RETURN 35.00;
  ELSIF p_total <= 8999.99 THEN RETURN 40.00;
  ELSIF p_total <= 18999.99 THEN RETURN 45.00;
  ELSE RETURN 50.00;
  END IF;
END;
$$;


ALTER FUNCTION "private"."comissao_pct"("p_role" "text", "p_total" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


ALTER FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."abrir_ciclo_para_usuario"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.ciclos_mostruario (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."abrir_ciclo_para_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fechar_ciclo"("_user_id" "uuid", "_observacao" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ciclo_id uuid;
  v_role     text;
  v_total_v  numeric(12,2);
  v_pct      numeric(5,2);
  v_total_c  numeric(12,2);
  v_novo     uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem fechar ciclos';
  END IF;

  SELECT id INTO v_ciclo_id FROM public.ciclos_mostruario
    WHERE user_id = _user_id AND fechado_em IS NULL LIMIT 1;
  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para este usuário';
  END IF;

  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  LIMIT 1;

  SELECT COALESCE(SUM(valor_venda), 0) INTO v_total_v
  FROM public.vendas WHERE ciclo_id = v_ciclo_id;

  v_pct     := private.comissao_pct(v_role, v_total_v);
  v_total_c := round(v_total_v * v_pct / 100.0, 2);

  UPDATE public.ciclos_mostruario
    SET fechado_em     = now(),
        total_vendas   = v_total_v,
        total_comissao = v_total_c,
        observacao     = COALESCE(_observacao, observacao)
    WHERE id = v_ciclo_id;

  -- Zero out the seller's stock when settling accounts
  UPDATE public.estoque
    SET quantidade = 0, updated_at = now()
    WHERE user_id = _user_id AND quantidade > 0;

  INSERT INTO public.ciclos_mostruario (user_id) VALUES (_user_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;


ALTER FUNCTION "public"."fechar_ciclo"("_user_id" "uuid", "_observacao" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_certificate"("_id" "uuid") RETURNS TABLE("id" "uuid", "codigo_garantia" "text", "produto_nome" "text", "cliente_nome" "text", "data_venda" "date", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id, codigo_garantia, produto_nome, cliente_nome, data_venda, created_at
  FROM public.vendas
  WHERE id = _id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."lookup_certificate"("_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_certificate_by_codigo"("_codigo" "text") RETURNS TABLE("id" "uuid", "codigo_garantia" "text", "produto_nome" "text", "produto_sku" "text", "cliente_nome" "text", "consultora_nome" "text", "data_venda" "date", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."lookup_certificate_by_codigo"("_codigo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_garantia_venda"("_uuid" "uuid") RETURNS TABLE("cliente_nome" "text", "data_compra" "date", "codigo_garantia" "text", "produto_nome" "text", "validade_garantia" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."lookup_garantia_venda"("_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preencher_dados_venda"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_preco       numeric(12,2);
  v_produto_ativo boolean;
BEGIN
  -- 1a. Valida e re-busca preço do produto (ignora valor enviado pelo cliente)
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

  -- Sobrescreve valor_venda com o preço oficial do catálogo
  NEW.valor_venda := v_preco;

  -- 1b. Valida janela de data_venda (servidor não confia no frontend)
  IF NEW.data_venda IS NOT NULL THEN
    IF NEW.data_venda::date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Data de venda não pode ser no futuro'
        USING ERRCODE = 'P0002';
    END IF;
    IF NEW.data_venda::date < (CURRENT_DATE - INTERVAL '3 days') THEN
      RAISE EXCEPTION 'Data de venda não pode ter mais de 3 dias de antecedência'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 1c. Calcula validade_garantia no servidor (1 ano a partir da data de venda)
  NEW.validade_garantia := (COALESCE(NEW.data_venda, CURRENT_DATE)::date + INTERVAL '1 year')::date;

  -- 1d. Gera codigo_garantia no servidor se não fornecido ou inválido
  --     Formato: MNR-XXXXXXXX (8 hex chars aleatórios via gen_random_bytes)
  IF NEW.codigo_garantia IS NULL OR length(NEW.codigo_garantia) < 10 THEN
    NEW.codigo_garantia := 'MNR-' ||
      upper(encode(gen_random_bytes(4), 'hex')) || '-' ||
      upper(encode(gen_random_bytes(3), 'hex'));
  END IF;

  -- 1e. Vincula ciclo aberto
  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  -- 1f. Comissão calculada ao fechar ciclo — zera por venda
  NEW.comissao_percentual := 0;
  NEW.comissao_valor      := 0;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."preencher_dados_venda"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recolher_maleta"("_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'administrador'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem recolher maletas';
  END IF;

  UPDATE public.estoque
    SET quantidade  = 0,
        updated_at  = now()
    WHERE user_id = _user_id AND quantidade > 0;
END;
$$;


ALTER FUNCTION "public"."recolher_maleta"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."saldo_ciclo_aberto"("_user_id" "uuid") RETURNS TABLE("ciclo_id" "uuid", "aberto_em" timestamp with time zone, "total_vendas" numeric, "total_comissao" numeric, "comissao_percentual" numeric, "qtd_vendas" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_role text;
  BEGIN
    SELECT ur.role::text INTO v_role
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    LIMIT 1;

    RETURN QUERY
    SELECT
      c.id,
      c.aberto_em,
      COALESCE(SUM(v.valor_venda), 0)::numeric AS total_vendas,
      round(
        COALESCE(SUM(v.valor_venda), 0) *
        private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0)) / 100.0,
        2
      )::numeric AS total_comissao,
      private.comissao_pct(v_role, COALESCE(SUM(v.valor_venda), 0))::numeric AS comissao_percentual,
      COUNT(v.id)::bigint AS qtd_vendas
    FROM public.ciclos_mostruario c
    LEFT JOIN public.vendas v ON v.ciclo_id = c.id
    WHERE c.user_id = _user_id AND c.fechado_em IS NULL
    GROUP BY c.id, c.aberto_em;
  END;
  $$;


ALTER FUNCTION "public"."saldo_ciclo_aberto"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validar_e_baixar_estoque"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_estoque_id UUID;
  v_quantidade INTEGER;
BEGIN
  SELECT id, quantidade INTO v_estoque_id, v_quantidade
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
  SET quantidade         = quantidade - 1,
      quantidade_vendida = quantidade_vendida + 1
  WHERE id = v_estoque_id;

  NEW.estoque_id = v_estoque_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validar_e_baixar_estoque"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categorias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "prefixo" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ciclos_mostruario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "aberto_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fechado_em" timestamp with time zone,
    "total_vendas" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_comissao" numeric(12,2) DEFAULT 0 NOT NULL,
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."ciclos_mostruario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "whatsapp" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    CONSTRAINT "chk_clientes_nome_length" CHECK ((("char_length"(TRIM(BOTH FROM "nome")) >= 2) AND ("char_length"(TRIM(BOTH FROM "nome")) <= 120))),
    CONSTRAINT "chk_clientes_whatsapp_digits" CHECK (("whatsapp" ~ '^\d{10,11}$'::"text"))
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estoque" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "quantidade" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quantidade_vendida" integer DEFAULT 0 NOT NULL,
    "user_id" "uuid",
    CONSTRAINT "estoque_parceiras_quantidade_check" CHECK (("quantidade" >= 0))
);


ALTER TABLE "public"."estoque" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estoque_geral" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "quantidade" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "estoque_geral_quantidade_check" CHECK (("quantidade" >= 0))
);


ALTER TABLE "public"."estoque_geral" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "preco_venda" numeric(10,2) DEFAULT 0 NOT NULL,
    "categoria_id" "uuid",
    "material" "text",
    CONSTRAINT "chk_produtos_preco_positivo" CHECK ((("ativo" = false) OR ("preco_venda" > (0)::numeric)))
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "telefone" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "chk_profiles_display_name_length" CHECK ((("char_length"(TRIM(BOTH FROM "display_name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "display_name")) <= 100)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid",
    "produto_nome" "text" NOT NULL,
    "cliente_nome" "text" NOT NULL,
    "cliente_whatsapp" "text" NOT NULL,
    "data_venda" "date" NOT NULL,
    "codigo_garantia" "text" NOT NULL,
    "validade_garantia" "date",
    "termo_aceito" boolean DEFAULT false NOT NULL,
    "ip_venda" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estoque_id" "uuid",
    "comissao_percentual" numeric(5,2),
    "comissao_valor" numeric(12,2),
    "valor_venda" numeric(12,2),
    "ciclo_id" "uuid",
    "user_id" "uuid",
    "pdf_garantia_url" "text",
    "garantia_uuid" "uuid",
    CONSTRAINT "chk_cliente_nome_length" CHECK ((("char_length"(TRIM(BOTH FROM "cliente_nome")) >= 2) AND ("char_length"(TRIM(BOTH FROM "cliente_nome")) <= 120))),
    CONSTRAINT "chk_cliente_whatsapp_format" CHECK ((("cliente_whatsapp" ~ '^\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}$'::"text") OR ("cliente_whatsapp" ~ '^\d{10,11}$'::"text"))),
    CONSTRAINT "chk_produto_nome_length" CHECK ((("char_length"("produto_nome") >= 2) AND ("char_length"("produto_nome") <= 200))),
    CONSTRAINT "chk_valor_venda_positive" CHECK (("valor_venda" > (0)::numeric))
);


ALTER TABLE "public"."vendas" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categorias"
    ADD CONSTRAINT "categorias_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."produtos"
    ADD CONSTRAINT "chk_produtos_nome_length" CHECK ((("char_length"(TRIM(BOTH FROM "nome")) >= 2) AND ("char_length"(TRIM(BOTH FROM "nome")) <= 200))) NOT VALID;



ALTER TABLE "public"."produtos"
    ADD CONSTRAINT "chk_produtos_sku_length" CHECK ((("char_length"(TRIM(BOTH FROM "sku")) >= 2) AND ("char_length"(TRIM(BOTH FROM "sku")) <= 30))) NOT VALID;



ALTER TABLE ONLY "public"."ciclos_mostruario"
    ADD CONSTRAINT "ciclos_mostruario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estoque_geral"
    ADD CONSTRAINT "estoque_geral_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estoque_geral"
    ADD CONSTRAINT "estoque_geral_produto_id_key" UNIQUE ("produto_id");



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_parceiras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_codigo_garantia_key" UNIQUE ("codigo_garantia");



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "categorias_nome_unique" ON "public"."categorias" USING "btree" ("lower"("nome"));



CREATE UNIQUE INDEX "categorias_prefixo_unique" ON "public"."categorias" USING "btree" ("upper"("prefixo"));



CREATE UNIQUE INDEX "ciclos_um_aberto_por_usuario" ON "public"."ciclos_mostruario" USING "btree" ("user_id") WHERE ("fechado_em" IS NULL);



CREATE UNIQUE INDEX "clientes_whatsapp_unique" ON "public"."clientes" USING "btree" ("whatsapp");



CREATE INDEX "idx_estoque_produto" ON "public"."estoque" USING "btree" ("produto_id");



CREATE INDEX "idx_produtos_categoria_id" ON "public"."produtos" USING "btree" ("categoria_id");



CREATE INDEX "idx_produtos_sku" ON "public"."produtos" USING "btree" ("sku");



CREATE INDEX "idx_vendas_codigo_garantia" ON "public"."vendas" USING "btree" ("codigo_garantia");



CREATE INDEX "idx_vendas_garantia_uuid" ON "public"."vendas" USING "btree" ("garantia_uuid");



CREATE OR REPLACE TRIGGER "set_clientes_updated_at" BEFORE UPDATE ON "public"."clientes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_abrir_ciclo" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."abrir_ciclo_para_usuario"();



CREATE OR REPLACE TRIGGER "trg_estoque_updated" BEFORE UPDATE ON "public"."estoque" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_preencher_venda" BEFORE INSERT ON "public"."vendas" FOR EACH ROW EXECUTE FUNCTION "public"."preencher_dados_venda"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_validar_e_baixar_estoque" BEFORE INSERT ON "public"."vendas" FOR EACH ROW EXECUTE FUNCTION "public"."validar_e_baixar_estoque"();



ALTER TABLE ONLY "public"."ciclos_mostruario"
    ADD CONSTRAINT "ciclos_mostruario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estoque_geral"
    ADD CONSTRAINT "estoque_geral_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_parceiras_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_parceiras_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_ciclo_id_fkey" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclos_mostruario"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_estoque_id_fkey" FOREIGN KEY ("estoque_id") REFERENCES "public"."estoque"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendas"
    ADD CONSTRAINT "vendas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admin gerencia ciclos" ON "public"."ciclos_mostruario" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admin gerencia estoque" ON "public"."estoque" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admin gerencia estoque geral" ON "public"."estoque_geral" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admin gerencia papéis" ON "public"."user_roles" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admin gerencia perfis" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Admin gerencia produtos" ON "public"."produtos" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admin remove perfis" ON "public"."profiles" FOR DELETE TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Admins gerenciam vendas" ON "public"."vendas" TO "authenticated" USING ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")) WITH CHECK ("private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"));



CREATE POLICY "Produtos são públicos para leitura" ON "public"."produtos" FOR SELECT USING (true);



CREATE POLICY "Usuário atualiza o próprio perfil" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"))) WITH CHECK ((("auth"."uid"() = "user_id") OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário registra própria venda" ON "public"."vendas" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário vê as próprias vendas" ON "public"."vendas" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário vê o próprio estoque" ON "public"."estoque" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário vê o próprio perfil" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário vê os próprios ciclos" ON "public"."ciclos_mostruario" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "Usuário vê os próprios papéis" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



ALTER TABLE "public"."categorias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categorias_admin_all" ON "public"."categorias" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role")))));



CREATE POLICY "categorias_public_select" ON "public"."categorias" FOR SELECT USING (true);



ALTER TABLE "public"."ciclos_mostruario" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clientes_acesso" ON "public"."clientes" TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role"))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "private"."has_role"("auth"."uid"(), 'administrador'::"public"."app_role")));



CREATE POLICY "clientes_auth_insert" ON "public"."clientes" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role")))) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "clientes_dono_ou_admin_select" ON "public"."clientes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."vendas"
  WHERE (("vendas"."user_id" = "auth"."uid"()) AND ("vendas"."cliente_whatsapp" = "clientes"."whatsapp"))
 LIMIT 1))));



CREATE POLICY "clientes_dono_ou_admin_update" ON "public"."clientes" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."vendas"
  WHERE (("vendas"."user_id" = "auth"."uid"()) AND ("vendas"."cliente_whatsapp" = "clientes"."whatsapp"))
 LIMIT 1)))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'administrador'::"public"."app_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."vendas"
  WHERE (("vendas"."user_id" = "auth"."uid"()) AND ("vendas"."cliente_whatsapp" = "clientes"."whatsapp"))
 LIMIT 1))));



ALTER TABLE "public"."estoque" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estoque_geral" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendas" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "private"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";



GRANT ALL ON FUNCTION "public"."abrir_ciclo_para_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."abrir_ciclo_para_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."abrir_ciclo_para_usuario"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fechar_ciclo"("_user_id" "uuid", "_observacao" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fechar_ciclo"("_user_id" "uuid", "_observacao" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fechar_ciclo"("_user_id" "uuid", "_observacao" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_certificate"("_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_certificate"("_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_certificate"("_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_certificate_by_codigo"("_codigo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_certificate_by_codigo"("_codigo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_certificate_by_codigo"("_codigo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_garantia_venda"("_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_garantia_venda"("_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_garantia_venda"("_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."preencher_dados_venda"() TO "anon";
GRANT ALL ON FUNCTION "public"."preencher_dados_venda"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."preencher_dados_venda"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recolher_maleta"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recolher_maleta"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recolher_maleta"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."saldo_ciclo_aberto"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."saldo_ciclo_aberto"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."saldo_ciclo_aberto"("_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validar_e_baixar_estoque"() TO "anon";
GRANT ALL ON FUNCTION "public"."validar_e_baixar_estoque"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validar_e_baixar_estoque"() TO "service_role";


















GRANT ALL ON TABLE "public"."categorias" TO "anon";
GRANT ALL ON TABLE "public"."categorias" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias" TO "service_role";



GRANT ALL ON TABLE "public"."ciclos_mostruario" TO "anon";
GRANT ALL ON TABLE "public"."ciclos_mostruario" TO "authenticated";
GRANT ALL ON TABLE "public"."ciclos_mostruario" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."estoque" TO "anon";
GRANT ALL ON TABLE "public"."estoque" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque" TO "service_role";



GRANT ALL ON TABLE "public"."estoque_geral" TO "anon";
GRANT ALL ON TABLE "public"."estoque_geral" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque_geral" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."vendas" TO "anon";
GRANT ALL ON TABLE "public"."vendas" TO "authenticated";
GRANT ALL ON TABLE "public"."vendas" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































