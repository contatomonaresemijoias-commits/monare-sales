-- =============================================================
-- NOVOS VALORES DE ENUM: papel 'rh' e status 'contratada'
-- =============================================================
-- Migration separada de propósito. O Postgres permite
-- `ALTER TYPE ... ADD VALUE` dentro de uma transação (>= 12), mas o valor
-- recém-adicionado NÃO pode ser usado na mesma transação — qualquer
-- `'rh'::app_role` no mesmo arquivo falharia com "unsafe use of new value
-- of enum type". Por isso o valor entra aqui e tudo que o consome vai na
-- migration seguinte (20260804120100_papel_rh.sql).
-- =============================================================

-- Papel de RH: cuida de captação, contratação e ativação/inativação de
-- revendedoras e B2B. Não enxerga estoque, vendas nem comissão — isso
-- continua sendo do administrador.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh';

-- Candidata aprovada que virou usuária de verdade no sistema. Sem este
-- estado, "aprovada" acumularia para sempre e o RH não saberia quem já
-- foi contratada de quem ainda está na fila.
ALTER TYPE public.candidatura_status ADD VALUE IF NOT EXISTS 'contratada';
