-- =============================================================
-- Comissão calculada sobre o total do ciclo, não por venda
-- =============================================================

-- Função auxiliar: retorna o percentual de comissão dado o papel e o total vendido no ciclo
CREATE OR REPLACE FUNCTION private.comissao_pct(p_role text, p_total numeric)
RETURNS numeric(5,2) LANGUAGE plpgsql IMMUTABLE AS $$
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

-- Trigger de inserção: apenas vincula o ciclo aberto; comissão é calculada no total do ciclo
CREATE OR REPLACE FUNCTION public.preencher_dados_venda()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ciclo_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO NEW.ciclo_id
    FROM public.ciclos_mostruario
    WHERE user_id = NEW.user_id AND fechado_em IS NULL
    LIMIT 1;
  END IF;

  -- Comissão é calculada sobre o total do ciclo ao fechar; zera por venda
  NEW.comissao_percentual := 0;
  NEW.comissao_valor := 0;

  RETURN NEW;
END;
$$;

-- saldo_ciclo_aberto: comissão calculada sobre o total acumulado do ciclo
CREATE OR REPLACE FUNCTION public.saldo_ciclo_aberto(_user_id uuid)
RETURNS TABLE(ciclo_id uuid, aberto_em timestamptz, total_vendas numeric, total_comissao numeric, qtd_vendas bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    COUNT(v.id)::bigint AS qtd_vendas
  FROM public.ciclos_mostruario c
  LEFT JOIN public.vendas v ON v.ciclo_id = c.id
  WHERE c.user_id = _user_id AND c.fechado_em IS NULL
  GROUP BY c.id, c.aberto_em;
END;
$$;

-- fechar_ciclo: comissão calculada sobre o total acumulado do ciclo
CREATE OR REPLACE FUNCTION public.fechar_ciclo(_user_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    SET fechado_em    = now(),
        total_vendas  = v_total_v,
        total_comissao = v_total_c,
        observacao    = COALESCE(_observacao, observacao)
    WHERE id = v_ciclo_id;

  INSERT INTO public.ciclos_mostruario (user_id) VALUES (_user_id) RETURNING id INTO v_novo;
  RETURN v_novo;
END;
$$;
