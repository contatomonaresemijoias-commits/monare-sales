-- =============================================================
-- Captação de revendedoras: formulário público + painel de seleção
-- =============================================================

CREATE TYPE public.candidatura_status AS ENUM (
  'CADASTRO_NAO_CONCLUIDO',
  'pendente',
  'aprovada',
  'recusada'
);

-- Candidatas ao programa de revenda (preenchido pelo formulário público
-- em /seja-representante, via Edge Function reseller-registration; nunca
-- gravado direto pelo navegador). Duplicatas por CPF são esperadas (ex:
-- reenvio acidental) e tratadas na UI do admin, por isso não há UNIQUE.
CREATE TABLE public.candidatas_revenda (
  id                          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo               TEXT,
  cpf                         TEXT,
  data_nascimento             DATE,
  whatsapp                    TEXT,
  email                       TEXT,
  endereco_cep                TEXT,
  endereco_rua                TEXT,
  endereco_numero             TEXT,
  endereco_complemento        TEXT,
  endereco_bairro             TEXT,
  endereco_cidade             TEXT,
  endereco_estado             TEXT,
  canal_principal             TEXT,
  instagram_handle            TEXT,
  modalidade_interesse        TEXT,
  como_conheceu                TEXT,
  como_conheceu_outra         TEXT,
  trabalha_atualmente         TEXT,
  experiencia_vendas          TEXT,
  experiencia_vendas_detalhe  TEXT,
  restricao_cpf               TEXT,
  motivo_escolha              TEXT,
  sonho_realizacao            TEXT,
  lgpd_consent                BOOLEAN            NOT NULL DEFAULT false,
  status                      candidatura_status NOT NULL DEFAULT 'CADASTRO_NAO_CONCLUIDO',
  etapa_atual                 SMALLINT           NOT NULL DEFAULT 1,
  avaliacao_manual            SMALLINT,
  motivo_recusa               TEXT,
  created_at                  TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT chk_candidatas_cpf_format        CHECK (cpf IS NULL OR cpf ~ '^\d{11}$'),
  CONSTRAINT chk_candidatas_experiencia       CHECK (experiencia_vendas IS NULL OR experiencia_vendas IN ('sim', 'nao')),
  CONSTRAINT chk_candidatas_avaliacao_manual  CHECK (avaliacao_manual IS NULL OR avaliacao_manual IN (0, 5, 10))
);

CREATE INDEX idx_candidatas_cpf    ON public.candidatas_revenda(cpf);
CREATE INDEX idx_candidatas_status ON public.candidatas_revenda(status);

CREATE TRIGGER trg_candidatas_updated_at
  BEFORE UPDATE ON public.candidatas_revenda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.candidatas_revenda ENABLE ROW LEVEL SECURITY;

-- Sem policy para anon: todo INSERT/UPDATE do fluxo público entra pela
-- Edge Function reseller-registration usando a service role (ignora RLS).
CREATE POLICY "candidatas_admin_select" ON public.candidatas_revenda
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "candidatas_admin_update" ON public.candidatas_revenda
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'administrador'::app_role));
