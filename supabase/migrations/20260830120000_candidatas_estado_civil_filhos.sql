-- =============================================================
-- Adiciona estado civil e filhos ao cadastro de candidatas
-- =============================================================

ALTER TABLE public.candidatas_revenda
  ADD COLUMN IF NOT EXISTS estado_civil      TEXT,
  ADD COLUMN IF NOT EXISTS tem_filhos        TEXT,
  ADD COLUMN IF NOT EXISTS filhos_quantidade SMALLINT;

ALTER TABLE public.candidatas_revenda
  ADD CONSTRAINT chk_candidatas_estado_civil
    CHECK (estado_civil IS NULL OR estado_civil IN ('solteira', 'casada', 'uniao_estavel', 'divorciada', 'viuva')),
  ADD CONSTRAINT chk_candidatas_tem_filhos
    CHECK (tem_filhos IS NULL OR tem_filhos IN ('sim', 'nao')),
  ADD CONSTRAINT chk_candidatas_filhos_qtd
    CHECK (filhos_quantidade IS NULL OR (filhos_quantidade >= 0 AND filhos_quantidade <= 30));
