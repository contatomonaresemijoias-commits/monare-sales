-- Function: recolher_maleta — zeros out a seller's stock without closing the financial cycle

CREATE OR REPLACE FUNCTION public.recolher_maleta(_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.recolher_maleta(UUID) TO authenticated;


-- Update fechar_ciclo to also zero the seller's stock when settling accounts

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
