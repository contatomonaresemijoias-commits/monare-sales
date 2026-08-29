-- Recolher maleta agora remove os itens do estoque (em vez de apenas zerar),
-- para que produtos zerados não continuem aparecendo no mostruário da revendedora.
-- vendas.estoque_id é ON DELETE SET NULL, então o histórico de vendas é preservado.
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

  DELETE FROM public.estoque
  WHERE user_id = _user_id;
END;
$$;
