import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGINS: Set<string> = new Set(
  (Deno.env.get('APP_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') ?? '';
const META_CONVERSIONS_TOKEN = Deno.env.get('META_CONVERSIONS_TOKEN') ?? '';
const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE = 'candidatas_revenda';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MODALIDADE_VALUES = ['maleta_consignada', 'mostruario', 'tenho_duvidas'];
const COMO_CONHECEU_VALUES = ['instagram_monare', 'anuncio', 'indicacao_revendedora', 'indicacao_amiga', 'evento_feira', 'whatsapp_grupo', 'outra'];
const CANAL_PRINCIPAL_VALUES = ['instagram', 'whatsapp', 'presencial', 'outro'];
const ESTADO_CIVIL_VALUES = ['solteira', 'casada', 'uniao_estavel', 'divorciada', 'viuva'];

function str(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function onlyDigits(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\D/g, '') : '';
}

function isValidCPF(rawCpf: unknown): string | null {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(cpf)) return null;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check1 = 11 - (sum % 11);
  if (check1 >= 10) check1 = 0;
  if (check1 !== parseInt(cpf[9], 10)) return null;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let check2 = 11 - (sum % 11);
  if (check2 >= 10) check2 = 0;
  if (check2 !== parseInt(cpf[10], 10)) return null;

  return cpf;
}

function isAdult(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string' || !dateStr) return false;
  const dob = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age >= 18 && age <= 120;
}

function isValidWhatsApp(rawValue: unknown): string | null {
  const phone = onlyDigits(rawValue);
  if (phone.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(phone)) return null;
  return phone;
}

function isValidCEP(rawValue: unknown): string | null {
  const cep = onlyDigits(rawValue);
  if (cep.length !== 8) return null;
  return cep;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// ─── Rate limit ───────────────────────────────────────────────────────────────
// Este é o único endpoint gravável por visitante anônimo. Dois freios por IP:
// um curto contra rajada e um longo contra inundação lenta ao longo do dia.
// O `start` tem freio próprio porque é a ação que cria linha nova no banco —
// as demais só atualizam um rascunho que já existe.
const LIMITES: Record<string, Array<{ janela: number; limite: number }>> = {
  // Todas as ações somadas, para segurar rajada de qualquer tipo.
  geral: [
    { janela: 60, limite: 20 },
    { janela: 3600, limite: 120 },
  ],
  // Criação de rascunho: o que um humano faz uma ou duas vezes por sessão.
  start: [
    { janela: 300, limite: 5 },
    { janela: 3600, limite: 15 },
  ],
  // Envio final.
  complete: [
    { janela: 300, limite: 5 },
    { janela: 3600, limite: 15 },
  ],
};

// ─── Turnstile ────────────────────────────────────────────────────────────────
// O rate limit acima conta tentativas por IP; ele não distingue pessoa de bot.
// O Turnstile faz essa parte, e só na etapa 1 (`start`) — a única ação que cria
// linha nova no banco. As etapas 2 a 4 apenas atualizam um rascunho existente.
//
// Enquanto o secret não existir, a exigência fica desligada: isso permite subir
// esta função antes de o front ser publicado com a site key, sem barrar
// candidata legítima no intervalo entre os dois deploys.
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type VeredictoCaptcha = 'ok' | 'ausente' | 'invalido' | 'indisponivel';

/**
 * Não enviamos `remoteip`: a Cloudflare já vê o IP da visitante quando o widget
 * carrega, e repassá-lo daqui só acrescentaria uma transferência de dado
 * pessoal a declarar na política de privacidade, sem ganho real de sinal.
 */
async function verificarCaptcha(token: unknown): Promise<VeredictoCaptcha> {
  if (!TURNSTILE_SECRET) return 'ok';

  const resposta = typeof token === 'string' ? token.trim() : '';
  // O token da Cloudflare tem centenas de bytes; o teto evita usar o siteverify
  // como amplificador para payload grande.
  if (!resposta || resposta.length > 2048) return 'ausente';

  try {
    const form = new FormData();
    form.append('secret', TURNSTILE_SECRET);
    form.append('response', resposta);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 'indisponivel';

    const data = await res.json();
    return data?.success === true ? 'ok' : 'invalido';
  } catch {
    return 'indisponivel';
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  return first || req.headers.get('cf-connecting-ip')?.trim() || 'desconhecido';
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value.toLowerCase().trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface MetaUserData {
  email?: string;
  phone?: string;
  fn?: string;
  external_id?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
}

interface MetaEventPayload {
  event_name: string;
  event_time: number;
  event_source_url?: string;
  user_data: MetaUserData;
  custom_data?: Record<string, unknown>;
  action_source: string;
}

async function enviarEventoMeta(
  eventName: string,
  userData: { email?: string; phone?: string; nome?: string; id?: string },
  customData: Record<string, unknown>,
  clientInfo: { ip?: string; userAgent?: string; fbc?: string; fbp?: string; url?: string },
): Promise<void> {
  if (!META_PIXEL_ID || !META_CONVERSIONS_TOKEN) {
    console.warn('[reseller-registration] Meta Pixel não configurado — evento não enviado');
    return;
  }

  const hashedUserData: MetaUserData = {};

  if (userData.email) {
    hashedUserData.em = await sha256Hex(userData.email);
  }
  if (userData.phone) {
    const digitsOnly = userData.phone.replace(/\D/g, '');
    const withCountry = digitsOnly.startsWith('55') ? digitsOnly : `55${digitsOnly}`;
    hashedUserData.ph = await sha256Hex(withCountry);
  }
  if (userData.nome) {
    const parts = userData.nome.trim().split(/\s+/);
    if (parts[0]) hashedUserData.fn = await sha256Hex(parts[0]);
    if (parts.length > 1) hashedUserData.ln = await sha256Hex(parts[parts.length - 1]);
  }
  if (userData.id) {
    hashedUserData.external_id = await sha256Hex(userData.id);
  }

  if (clientInfo.ip) hashedUserData.client_ip_address = clientInfo.ip;
  if (clientInfo.userAgent) hashedUserData.client_user_agent = clientInfo.userAgent;
  if (clientInfo.fbc) hashedUserData.fbc = clientInfo.fbc;
  if (clientInfo.fbp) hashedUserData.fbp = clientInfo.fbp;

  const event: MetaEventPayload = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    user_data: hashedUserData,
    custom_data: customData,
    action_source: 'website',
  };

  if (clientInfo.url) {
    event.event_source_url = clientInfo.url;
  }

  try {
    const response = await fetch(`${META_GRAPH_URL}/${META_PIXEL_ID}/events?access_token=${META_CONVERSIONS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reseller-registration] Meta API error: ${response.status} - ${errorText}`);
    } else {
      console.log(`[reseller-registration] Evento ${eventName} enviado ao Meta com sucesso`);
    }
  } catch (error) {
    console.error(`[reseller-registration] Falha ao enviar evento ${eventName} ao Meta:`, error);
  }
}

// O IP vira hash antes de ir para o banco: dá para contar tentativas sem
// guardar dado pessoal de quem só visitou o formulário (LGPD).
async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`monare:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Retorna a janela estourada, ou `null` se a requisição está liberada. */
async function excedeuLimite(
  admin: ReturnType<typeof createClient>,
  ipHash: string,
  escopo: string,
): Promise<{ janela: number } | null> {
  for (const { janela, limite } of LIMITES[escopo] ?? []) {
    const { data, error } = await admin.rpc('rate_limit_consumir', {
      p_chave: `reseller:${escopo}:${ipHash}`,
      p_janela_segundos: janela,
      p_limite: limite,
    });
    // Falha no contador não pode derrubar o cadastro de quem é legítimo:
    // registra e segue (fail-open), que é o trade-off aceitável aqui.
    if (error) {
      console.error('[reseller-registration] rate limit indisponível', error);
      return null;
    }
    if (data === false) return { janela };
  }
  return null;
}

// Etapa 1: contato — deliberadamente enxuta. Concluí-la já cria a candidata no
// banco como lead contatável, mesmo que ela abandone as etapas seguintes.
function parseStep1(body: any) {
  const errors: string[] = [];

  const nome_completo = str(body.nome_completo, 100);
  if (!nome_completo || nome_completo.length < 2) errors.push('Nome completo inválido.');

  const whatsapp = isValidWhatsApp(body.whatsapp);
  if (!whatsapp) errors.push('WhatsApp inválido.');

  if (body.terms_accept !== true) errors.push('É necessário aceitar os termos e a política de privacidade.');

  if (errors.length) return { errors };

  return {
    data: {
      nome_completo,
      whatsapp,
    },
  };
}

// Etapa 2: dados pessoais (CPF, nascimento, e-mail, estado civil, filhos)
function parseStep2(body: any, required: boolean) {
  const errors: string[] = [];

  const cpf = body.cpf !== undefined ? isValidCPF(body.cpf) : null;
  const email = str(body.email, 254);
  const temNascimento = typeof body.data_nascimento === 'string' && body.data_nascimento !== '';
  const estado_civil = str(body.estado_civil, 30);
  const tem_filhos = str(body.tem_filhos, 10);
  const filhos_qtd = typeof body.filhos_quantidade === 'string' && body.filhos_quantidade.trim() !== ''
    ? parseInt(body.filhos_quantidade, 10)
    : typeof body.filhos_quantidade === 'number'
      ? body.filhos_quantidade
      : null;

  if (body.cpf !== undefined && !cpf) errors.push('CPF inválido.');
  if (email && !EMAIL_RE.test(email)) errors.push('E-mail inválido.');
  if (temNascimento && !isAdult(body.data_nascimento)) {
    errors.push('É preciso ter 18 anos ou mais para se cadastrar.');
  }
  if (estado_civil && !ESTADO_CIVIL_VALUES.includes(estado_civil)) errors.push('Estado civil inválido.');
  if (tem_filhos && !['sim', 'nao'].includes(tem_filhos)) errors.push('Campo "possui filhos" inválido.');
  if (tem_filhos === 'sim' && (filhos_qtd === null || isNaN(filhos_qtd) || filhos_qtd < 1 || filhos_qtd > 30)) {
    errors.push('Quantidade de filhos inválida.');
  }

  if (required) {
    if (!cpf) errors.push('CPF inválido.');
    if (!temNascimento) errors.push('Data de nascimento obrigatória.');
    if (!email) errors.push('E-mail inválido.');
    if (!estado_civil) errors.push('Estado civil obrigatório.');
    if (!tem_filhos) errors.push('É necessário informar se possui filhos.');
    if (tem_filhos === 'sim' && (filhos_qtd === null || isNaN(filhos_qtd) || filhos_qtd < 1)) {
      errors.push('Quantidade de filhos obrigatória.');
    }
  }

  if (errors.length) return { errors: [...new Set(errors)] };

  return {
    data: {
      ...(cpf ? { cpf } : {}),
      ...(temNascimento ? { data_nascimento: body.data_nascimento } : {}),
      ...(email ? { email } : {}),
      ...(estado_civil ? { estado_civil } : {}),
      ...(tem_filhos ? { tem_filhos } : {}),
      ...(tem_filhos === 'sim' && filhos_qtd !== null ? { filhos_quantidade: filhos_qtd } : {}),
    },
  };
}

// Etapa 3: endereço
function parseStep3(body: any, required: boolean) {
  const errors: string[] = [];
  const cep = body.endereco_cep !== undefined ? isValidCEP(body.endereco_cep) : null;
  const rua = str(body.endereco_rua, 200);
  const numero = str(body.endereco_numero, 20);
  const complemento = str(body.endereco_complemento, 200);
  const bairro = str(body.endereco_bairro, 120);
  const cidade = str(body.endereco_cidade, 120);
  const estado = str(body.endereco_estado, 2)?.toUpperCase() ?? null;

  if (required) {
    if (!cep) errors.push('CEP inválido.');
    if (!rua) errors.push('Rua obrigatória.');
    if (!numero) errors.push('Número obrigatório.');
    if (!bairro) errors.push('Bairro obrigatório.');
    if (!cidade) errors.push('Cidade obrigatória.');
    if (!estado || estado.length !== 2) errors.push('Estado (UF) inválido.');
  }

  if (errors.length) return { errors };

  return {
    data: {
      ...(cep ? { endereco_cep: cep } : {}),
      ...(rua ? { endereco_rua: rua } : {}),
      ...(numero ? { endereco_numero: numero } : {}),
      endereco_complemento: complemento,
      ...(bairro ? { endereco_bairro: bairro } : {}),
      ...(cidade ? { endereco_cidade: cidade } : {}),
      ...(estado ? { endereco_estado: estado } : {}),
    },
  };
}

// Etapa 4: perfil comercial
function parseStep4(body: any, required: boolean) {
  const errors: string[] = [];

  const canal_principal = str(body.canal_principal, 30);
  if (canal_principal && !CANAL_PRINCIPAL_VALUES.includes(canal_principal)) errors.push('Canal principal inválido.');

  const instagram_handle = str(body.instagram_handle, 60);
  const modalidade_interesse = str(body.modalidade_interesse, 30);
  const como_conheceu = str(body.como_conheceu, 30);
  const como_conheceu_outra = str(body.como_conheceu_outra, 200);
  const trabalha_atualmente = str(body.trabalha_atualmente, 1000);
  const experiencia_vendas = str(body.experiencia_vendas, 10);
  const experiencia_vendas_detalhe = str(body.experiencia_vendas_detalhe, 1000);

  if (modalidade_interesse && !MODALIDADE_VALUES.includes(modalidade_interesse)) errors.push('Modalidade de interesse inválida.');
  if (como_conheceu && !COMO_CONHECEU_VALUES.includes(como_conheceu)) errors.push('Campo "como conheceu" inválido.');
  if (experiencia_vendas && !['sim', 'nao'].includes(experiencia_vendas)) errors.push('Campo de experiência com vendas inválido.');

  if (required) {
    if (!instagram_handle) errors.push('Instagram obrigatório.');
    if (!modalidade_interesse) errors.push('Modalidade de interesse obrigatória.');
    if (!como_conheceu) errors.push('Como conheceu a marca é obrigatório.');
    if (como_conheceu === 'outra' && !como_conheceu_outra) errors.push('Detalhe de "outra" obrigatório.');
    if (!trabalha_atualmente) errors.push('Campo "trabalha atualmente" obrigatório.');
    if (!experiencia_vendas) errors.push('É necessário informar se possui experiência com vendas.');
    if (!experiencia_vendas_detalhe) errors.push('Detalhe da experiência com vendas obrigatório.');
  }

  if (errors.length) return { errors };

  return {
    data: {
      canal_principal,
      instagram_handle,
      modalidade_interesse,
      como_conheceu,
      como_conheceu_outra: como_conheceu === 'outra' ? como_conheceu_outra : null,
      trabalha_atualmente,
      experiencia_vendas,
      experiencia_vendas_detalhe,
    },
  };
}

// Etapa 5: sobre você e termos
function parseStep5(body: any, required: boolean) {
  const errors: string[] = [];

  const restricao_cpf = str(body.restricao_cpf, 1000);
  const motivo_escolha = str(body.motivo_escolha, 1000);
  const sonho_realizacao = str(body.sonho_realizacao, 1000);

  if (required) {
    if (!restricao_cpf) errors.push('Campo de restrição de CPF obrigatório.');
    if (!motivo_escolha) errors.push('Campo "motivo da escolha" obrigatório.');
    if (!sonho_realizacao) errors.push('Campo "sonho/realização" obrigatório.');
    if (body.lgpd_consent !== true) errors.push('É necessário autorizar o uso dos dados (LGPD).');
  }

  if (errors.length) return { errors };

  return {
    data: {
      restricao_cpf,
      motivo_escolha,
      sonho_realizacao,
      lgpd_consent: body.lgpd_consent === true,
    },
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405, headers);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const ipHash = await hashIp(clientIp(req));

  function respostaLimite(janela: number) {
    return jsonResponse(
      { error: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' },
      429,
      { ...headers, 'Retry-After': String(janela) },
    );
  }

  try {
    // Conta antes de qualquer trabalho, para que requisição malformada em
    // sequência também consuma cota.
    const limiteGeral = await excedeuLimite(admin, ipHash, 'geral');
    if (limiteGeral) return respostaLimite(limiteGeral.janela);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Requisição inválida.' }, 400, headers);
    }

    const { action } = body ?? {};

    if (action === 'start' || action === 'complete') {
      const limiteAcao = await excedeuLimite(admin, ipHash, action);
      if (limiteAcao) return respostaLimite(limiteAcao.janela);
    }

    // ---------------------------------------------------------------
    // ACTION: start (etapa 1)
    // ---------------------------------------------------------------
    if (action === 'start') {
      // Antes de qualquer validação de campo: bot que insiste não deve receber
      // de volta um mapa de quais campos estão errados.
      const veredicto = await verificarCaptcha(body.turnstile_token);
      if (veredicto === 'ausente' || veredicto === 'invalido') {
        return jsonResponse(
          { error: 'Não foi possível confirmar a verificação de segurança. Recarregue a página e tente novamente.' },
          403,
          headers,
        );
      }
      // Cloudflare fora do ar não pode derrubar a captação: mesma escolha de
      // fail-open feita no rate limit, com registro para dar para auditar depois.
      if (veredicto === 'indisponivel') {
        console.error('[reseller-registration] turnstile indisponível — start liberado sem verificação');
      }

      const parsed = parseStep1(body);
      if (parsed.errors) return jsonResponse({ error: parsed.errors[0], errors: parsed.errors }, 400, headers);

      let existing: { id: string; etapa_atual: number } | null = null;

      // O rascunho passou a ser identificado pelo WhatsApp: o CPF só é pedido
      // na etapa 2 e portanto não existe ainda neste ponto do fluxo.
      if (typeof body.existing_id === 'string' && body.existing_id) {
        const { data } = await admin
          .from(TABLE)
          .select('id, whatsapp, etapa_atual, status')
          .eq('id', body.existing_id)
          .maybeSingle();
        if (data && data.whatsapp === parsed.data!.whatsapp && data.status === 'CADASTRO_NAO_CONCLUIDO') {
          existing = { id: data.id, etapa_atual: data.etapa_atual };
        }
      }

      if (!existing) {
        const { data } = await admin
          .from(TABLE)
          .select('id, etapa_atual')
          .eq('whatsapp', parsed.data!.whatsapp)
          .eq('status', 'CADASTRO_NAO_CONCLUIDO')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) existing = data;
      }

      const nextEtapa = Math.max(existing?.etapa_atual ?? 1, 2);

      if (existing) {
        const { error } = await admin
          .from(TABLE)
          .update({ ...parsed.data, etapa_atual: nextEtapa })
          .eq('id', existing.id);
        if (error) throw error;
        return jsonResponse({ id: existing.id, etapa_atual: nextEtapa }, 200, headers);
      }

      const { data: inserted, error } = await admin
        .from(TABLE)
        .insert({ ...parsed.data, status: 'CADASTRO_NAO_CONCLUIDO', etapa_atual: nextEtapa })
        .select('id')
        .single();
      if (error) throw error;
      return jsonResponse({ id: inserted.id, etapa_atual: nextEtapa }, 200, headers);
    }

    // ---------------------------------------------------------------
    // ACTION: update_step (etapas 2, 3 e 4 — progresso incremental)
    // ---------------------------------------------------------------
    if (action === 'update_step') {
      const id = typeof body.id === 'string' ? body.id : null;
      const step = Number(body.step);
      if (!id || ![2, 3, 4].includes(step)) return jsonResponse({ error: 'Requisição inválida.' }, 400, headers);

      const { data: row } = await admin
        .from(TABLE)
        .select('id, etapa_atual, status')
        .eq('id', id)
        .maybeSingle();
      if (!row || row.status !== 'CADASTRO_NAO_CONCLUIDO') {
        return jsonResponse({ error: 'Cadastro não encontrado ou já finalizado.' }, 404, headers);
      }

      const parsers: Record<number, (b: any, r: boolean) => { errors?: string[]; data?: Record<string, unknown> }> = {
        2: parseStep2,
        3: parseStep3,
        4: parseStep4,
      };
      const parsed = parsers[step](body, false);
      if (parsed.errors) return jsonResponse({ error: parsed.errors[0], errors: parsed.errors }, 400, headers);

      const nextEtapa = Math.max(row.etapa_atual, step + 1);
      const { error } = await admin
        .from(TABLE)
        .update({ ...parsed.data, etapa_atual: nextEtapa })
        .eq('id', id);
      if (error) throw error;

      return jsonResponse({ ok: true, etapa_atual: nextEtapa }, 200, headers);
    }

    // ---------------------------------------------------------------
    // ACTION: complete (envio final, etapa 4)
    // ---------------------------------------------------------------
    if (action === 'complete') {
      const s1 = parseStep1(body);
      const s2 = parseStep2(body, true);
      const s3 = parseStep3(body, true);
      const s4 = parseStep4(body, true);
      const s5 = parseStep5(body, true);
      const errors = [
        ...(s1.errors ?? []),
        ...(s2.errors ?? []),
        ...(s3.errors ?? []),
        ...(s4.errors ?? []),
        ...(s5.errors ?? []),
      ];
      if (errors.length) return jsonResponse({ error: errors[0], errors }, 400, headers);

      const payload = {
        ...s1.data,
        ...s2.data,
        ...s3.data,
        ...s4.data,
        ...s5.data,
        status: 'pendente',
        etapa_atual: 5,
      };

      const id = typeof body.id === 'string' ? body.id : null;
      let existing: { id: string; status: string } | null = null;
      if (id) {
        const { data } = await admin.from(TABLE).select('id, status').eq('id', id).maybeSingle();
        if (data) existing = data;
      }

      const clientInfo = {
        ip: clientIp(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
        fbc: typeof body.fbc === 'string' ? body.fbc : undefined,
        fbp: typeof body.fbp === 'string' ? body.fbp : undefined,
        url: typeof body.page_url === 'string' ? body.page_url : undefined,
      };

      const userData = {
        email: s2.data?.email as string | undefined,
        phone: s1.data?.whatsapp as string | undefined,
        nome: s1.data?.nome_completo as string | undefined,
      };

      const customData = {
        modalidade: s4.data?.modalidade_interesse,
        canal: s4.data?.canal_principal,
        estado: s3.data?.endereco_estado,
        cidade: s3.data?.endereco_cidade,
      };

      if (existing && existing.status === 'CADASTRO_NAO_CONCLUIDO') {
        const { error } = await admin.from(TABLE).update(payload).eq('id', existing.id);
        if (error) {
          console.error('[reseller-registration] UPDATE falhou', {
            id: existing.id,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        try {
          await enviarEventoMeta('Lead', { ...userData, id: existing.id }, customData, clientInfo);
        } catch (metaErr) {
          console.error('[reseller-registration] enviarEventoMeta falhou (update)', metaErr);
        }
        return jsonResponse({ id: existing.id, ok: true }, 200, headers);
      }

      // Sem rascunho válido (id ausente, não encontrado, ou já decidido por outra
      // candidatura com o mesmo CPF): nunca sobrescreve — sempre cria uma linha nova
      // e deixa o admin resolver eventuais duplicatas por CPF manualmente.
      const { data: inserted, error } = await admin.from(TABLE).insert(payload).select('id').single();
      if (error) {
        console.error('[reseller-registration] INSERT falhou', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      try {
        await enviarEventoMeta('Lead', { ...userData, id: inserted.id }, customData, clientInfo);
      } catch (metaErr) {
        console.error('[reseller-registration] enviarEventoMeta falhou (insert)', metaErr);
      }
      return jsonResponse({ id: inserted.id, ok: true }, 200, headers);
    }

    return jsonResponse({ error: 'Ação inválida' }, 400, headers);
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    console.error('[reseller-registration] 500', {
      message: err?.message ?? String(e),
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
      stack: err?.stack,
    });
    return jsonResponse({ error: 'Erro interno do servidor' }, 500, headers);
  }
});
