-- 1. Comissão na parceira
ALTER TABLE public.parceiras
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric(5,2) NOT NULL DEFAULT 30.00;

-- 2. Comissão registrada na venda (histórico imutável)
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric(5,2),
  ADD COLUMN IF NOT EXISTS comissao_valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_venda numeric(12,2);

-- 3. Tabela de ciclos de mostruário
CREATE TABLE IF NOT EXISTS public.ciclos_mostruario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parceira_id uuid NOT NULL REFERENCES public.parceiras(id) ON DELETE CASCADE,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  total_vendas numeric(12,2) NOT NULL DEFAULT 0,
  total_comissao numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ciclos_um_aberto_por_parceira
  ON public.ciclos_mostruario (parceira_id) WHERE fechado_em IS NULL;

ALTER TABLE public.ciclos_mostruario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia ciclos" ON public.ciclos_mostruario;
CREATE POLICY "Admin gerencia ciclos" ON public.ciclos_mostruario
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Parceira vê os próprios ciclos" ON public.ciclos_mostruario;
CREATE POLICY "Parceira vê os próprios ciclos" ON public.ciclos_mostruario
  FOR SELECT TO authenticated
  USING (parceira_id = private.current_parceira_id() OR private.has_role(auth.uid(), 'admin'::app_role));

-- 4. ciclo_id em vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS ciclo_id uuid REFERENCES public.ciclos_mostruario(id) ON DELETE SET NULL;

-- 5. Garantir um ciclo aberto para cada parceira existente
INSERT INTO public.ciclos_mostruario (parceira_id)
SELECT p.id FROM public.parceiras p
WHERE NOT EXISTS (
  SELECT 1 FROM public.ciclos_mostruario c
  WHERE c.parceira_id = p.id AND c.fechado_em IS NULL
);

-- 6. Trigger: ao criar parceira, abrir ciclo automaticamente
CREATE OR REPLACE FUNCTION public.abrir_ciclo_para_parceira()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ciclos_mostruario (parceira_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abrir_ciclo ON public.parceiras;
CREATE TRIGGER trg_abrir_ciclo
  AFTER INSERT ON public.parceiras
  FOR EACH ROW EXECUTE FUNCTION public.abrir_ciclo_para_parceira();

-- 7. Trigger: preencher ciclo_id, comissão e valor na venda
CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pct numeric(5,2);
BEGIN
  IF NEW.ciclo_id IS NULL AND NEW.parceira_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE parceira_id = NEW.parceira_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  IF NEW.comissao_percentual IS NULL AND NEW.parceira_id IS NOT NULL THEN
    SELECT comissao_percentual INTO v_pct FROM public.parceiras WHERE id = NEW.parceira_id;
    NEW.comissao_percentual := COALESCE(v_pct, 0);
  END IF;

  IF NEW.valor_venda IS NOT NULL AND NEW.comissao_percentual IS NOT NULL AND NEW.comissao_valor IS NULL THEN
    NEW.comissao_valor := round(NEW.valor_venda * NEW.comissao_percentual / 100, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preencher_venda ON public.vendas;
CREATE TRIGGER trg_preencher_venda
  BEFORE INSERT ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.preencher_dados_venda();

-- 8. RPC: fechar ciclo (acerto de contas) - só admin
CREATE OR REPLACE FUNCTION public.fechar_ciclo(_parceira_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ciclo_id uuid;
  v_total_v numeric(12,2);
  v_total_c numeric(12,2);
  v_novo uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem fechar ciclos';
  END IF;

  SELECT id INTO v_ciclo_id FROM public.ciclos_mostruario
  WHERE parceira_id = _parceira_id AND fechado_em IS NULL LIMIT 1;

  IF v_ciclo_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ciclo aberto para esta parceira';
  END IF;

  SELECT COALESCE(SUM(valor_venda),0), COALESCE(SUM(comissao_valor),0)
    INTO v_total_v, v_total_c
  FROM public.vendas WHERE ciclo_id = v_ciclo_id;

  UPDATE public.ciclos_mostruario
  SET fechado_em = now(), total_vendas = v_total_v, total_comissao = v_total_c,
      observacao = COALESCE(_observacao, observacao)
  WHERE id = v_ciclo_id;

  INSERT INTO public.ciclos_mostruario (parceira_id) VALUES (_parceira_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;

-- 9. RPC: saldo a pagar do ciclo aberto
CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_parceira_id uuid)
RETURNS TABLE(ciclo_id uuid, aberto_em timestamptz, total_vendas numeric, total_comissao numeric, qtd_vendas bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.aberto_em,
    COALESCE(SUM(v.valor_venda),0)::numeric,
    COALESCE(SUM(v.comissao_valor),0)::numeric,
    COUNT(v.id)::bigint
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.parceira_id = _parceira_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
$$;