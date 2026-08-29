-- =============================================================
-- Rate limit para o formulário público de captação de revendedoras
-- =============================================================
-- A edge function reseller-registration é o único endpoint gravável por
-- visitante anônimo do site. Sem freio, um script consegue inundar
-- candidatas_revenda ou varrer o fluxo em força bruta.
--
-- O contador vive no banco (e não na memória do isolate Deno) porque cada
-- requisição pode cair em um isolate diferente — contador em memória zera
-- sozinho e não segura nada na prática.

CREATE TABLE private.rate_limit (
  chave         TEXT        NOT NULL,
  janela_inicio TIMESTAMPTZ NOT NULL,
  tentativas    INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela_inicio)
);

-- Só a service role (edge functions) enxerga: RLS ligada sem policy alguma
-- barra qualquer acesso vindo do navegador.
ALTER TABLE private.rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rate_limit FROM PUBLIC, anon, authenticated;

CREATE INDEX idx_rate_limit_janela ON private.rate_limit(janela_inicio);

-- Consome uma tentativa da janela atual e diz se a requisição ainda cabe
-- dentro do limite. Janela fixa: simples, barata e suficiente aqui —
-- no pior caso um atacante consegue 2x o limite na virada da janela.
--
-- Retorna TRUE quando a requisição é permitida, FALSE quando estourou.
CREATE OR REPLACE FUNCTION public.rate_limit_consumir(
  p_chave           TEXT,
  p_janela_segundos INTEGER,
  p_limite          INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, pg_temp
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_total  INTEGER;
BEGIN
  IF p_chave IS NULL OR p_janela_segundos IS NULL OR p_janela_segundos <= 0 OR p_limite IS NULL THEN
    RAISE EXCEPTION 'Parâmetros inválidos para rate_limit_consumir';
  END IF;

  v_inicio := to_timestamp(
    floor(extract(EPOCH FROM now()) / p_janela_segundos) * p_janela_segundos
  );

  INSERT INTO private.rate_limit AS r (chave, janela_inicio, tentativas)
  VALUES (left(p_chave, 200), v_inicio, 1)
  ON CONFLICT (chave, janela_inicio)
    DO UPDATE SET tentativas = r.tentativas + 1
  RETURNING r.tentativas INTO v_total;

  -- Limpeza oportunista (~1% das chamadas) para a tabela não crescer sem fim,
  -- evitando depender de pg_cron.
  IF random() < 0.01 THEN
    DELETE FROM private.rate_limit WHERE janela_inicio < now() - INTERVAL '1 day';
  END IF;

  RETURN v_total <= p_limite;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_consumir(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_consumir(TEXT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.rate_limit_consumir(TEXT, INTEGER, INTEGER) IS
  'Contador de janela fixa usado pelas edge functions. TRUE = dentro do limite.';
