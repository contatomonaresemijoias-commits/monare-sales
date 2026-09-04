-- Remove rascunhos abandonados 15 dias após o cadastro.
--
-- O job roda diariamente, em vez de uma vez a cada 15 dias, para que cada
-- registro seja removido assim que completar o prazo (com tolerância máxima
-- de 24 horas). Somente CADASTRO_NAO_CONCLUIDO entra nesta limpeza.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE INDEX IF NOT EXISTS idx_candidatas_incompletas_expiracao
  ON public.candidatas_revenda (created_at)
  WHERE status = 'CADASTRO_NAO_CONCLUIDO';

CREATE OR REPLACE FUNCTION public.cleanup_incomplete_candidates()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.candidatas_revenda
  WHERE status = 'CADASTRO_NAO_CONCLUIDO'
    AND created_at < now() - interval '15 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_incomplete_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_incomplete_candidates() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_incomplete_candidates() FROM authenticated;

-- 03:15 UTC todos os dias. cron.schedule com nome é idempotente: ao aplicar
-- novamente, a definição do job de mesmo nome é atualizada.
SELECT cron.schedule(
  'cleanup-incomplete-candidates-older-than-15-days',
  '15 3 * * *',
  'SELECT public.cleanup_incomplete_candidates();'
);
