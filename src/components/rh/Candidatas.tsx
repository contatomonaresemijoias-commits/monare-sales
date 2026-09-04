import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { BadgeCheck, Loader2, MessageCircle, Search, UserPlus, FileSpreadsheet, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppSelect } from '@/components/ui/app-select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { toast } from '@/hooks/use-toast';
import { exportarExcel, exportarPDF } from '@/lib/exportarCandidatas';
import { formatWhatsApp, whatsappLink } from '@/lib/monare';
import { maskCPF } from '@/lib/validacao';

type Status = 'CADASTRO_NAO_CONCLUIDO' | 'pendente' | 'aprovada' | 'recusada' | 'contratada';

type CandidataRow = {
  id: string;
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco_cep: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  canal_principal: string | null;
  instagram_handle: string | null;
  modalidade_interesse: string | null;
  estado_civil: string | null;
  tem_filhos: string | null;
  filhos_quantidade: number | null;
  como_conheceu: string | null;
  como_conheceu_outra: string | null;
  motivo_escolha: string | null;
  sonho_realizacao: string | null;
  trabalha_atualmente: string | null;
  experiencia_vendas: string | null;
  experiencia_vendas_detalhe: string | null;
  restricao_cpf: string | null;
  lgpd_consent: boolean | null;
  status: Status;
  avaliacao_manual: number | null;
  motivo_recusa: string | null;
  etapa_atual: number | null;
  /** Conta criada para ela na contratação. Null enquanto não foi contratada. */
  user_id: string | null;
  contratada_em: string | null;
  created_at: string;
  updated_at: string;
};

const MOTIVOS_RECUSA = [
  'Fora da área de atuação (logística inviável)',
  'Perfil não combina com a marca (Quiet Luxury)',
  'Instagram/rede sem engajamento real',
  'CPF com restrição grave',
  'Resposta genérica / pouco comprometimento',
  'Já é revendedora de concorrente',
  'Não respondeu ao contato',
  'Outro',
];

const COMO_CONHECEU_OPTIONS = [
  { value: 'instagram_monare', label: 'Instagram da marca' },
  { value: 'anuncio', label: 'Anúncio' },
  { value: 'indicacao_revendedora', label: 'Indicação revendedora' },
  { value: 'indicacao_amiga', label: 'Indicação conhecido' },
  { value: 'evento_feira', label: 'Evento ou feira' },
  { value: 'whatsapp_grupo', label: 'WhatsApp / grupo' },
  { value: 'outra', label: 'Outra' },
];

const MODALIDADE_LABELS: Record<string, string> = {
  maleta_consignada: 'Maleta consignada',
  mostruario: 'Mostruário',
  tenho_duvidas: 'Tenho dúvidas, quero conversar antes',
};

const CANAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  presencial: 'Presencial',
  outro: 'Outro',
};

const ESTADO_CIVIL_LABELS: Record<string, string> = {
  solteira: 'Solteira',
  casada: 'Casada',
  uniao_estavel: 'União estável',
  divorciada: 'Divorciada',
  viuva: 'Viúva',
};

// Espelha STEP_LABELS de src/pages/CadastroRevendedora.tsx: etapa_atual guarda
// a próxima etapa a ser preenchida, então 2 = já deixou nome e WhatsApp.
const STAGE_LABELS: Record<number, string> = {
  1: 'Etapa 1 · Contato',
  2: 'Etapa 2 · Seus dados',
  3: 'Etapa 3 · Endereço',
  4: 'Etapa 4 · Perfil comercial',
  5: 'Etapa 5 · Respostas finais',
};

type Filter =
  | 'pendente'
  | 'aprovada'
  | 'contratada'
  | 'recusada'
  | 'duplicada'
  | 'incompleto'
  | 'todas';

function isSorocaba(c: CandidataRow) {
  return (c.endereco_cidade || '').trim().toLowerCase().includes('sorocaba');
}
function temExperiencia(c: CandidataRow) {
  return c.experiencia_vendas === 'sim';
}
function calcIdade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const dob = new Date(dataNascimento + 'T00:00:00');
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function possibleCpfRestriction(text: string | null) {
  const t = (text || '').trim().toLowerCase();
  if (!t) return false;
  const negatives = ['não', 'nao', 'nenhuma', 'nenhum', 'não tenho', 'nao tenho', 'sem restrição', 'sem restricao', 'n/a', 'não possuo', 'nao possuo'];
  return !negatives.some((n) => t.startsWith(n));
}
function findDuplicateIds(rows: CandidataRow[]) {
  const countByCpf: Record<string, number> = {};
  rows.forEach((c) => {
    const cpf = (c.cpf || '').replace(/\D/g, '');
    if (cpf) countByCpf[cpf] = (countByCpf[cpf] || 0) + 1;
  });
  const dupIds = new Set<string>();
  rows.forEach((c) => {
    const cpf = (c.cpf || '').replace(/\D/g, '');
    if (cpf && countByCpf[cpf] > 1) dupIds.add(c.id);
  });
  return dupIds;
}
function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function enderecoCompleto(c: CandidataRow) {
  return [c.endereco_rua, c.endereco_numero, c.endereco_complemento, c.endereco_bairro, c.endereco_cidade, c.endereco_estado]
    .filter((parte) => parte?.trim())
    .join(', ');
}

function numeroWhatsapp(value: string | null) {
  const digits = (value || '').replace(/\D/g, '');
  const nacional = (digits.length === 12 || digits.length === 13) && digits.startsWith('55')
    ? digits.slice(2)
    : digits;
  if (![10, 11].includes(nacional.length) || /^(\d)\1+$/.test(nacional)) return null;
  // O DDD 55 também precisa do código do país: o tamanho distingue os dois.
  return `55${nacional}`;
}

function ContatoWhatsapp({ numero, nome }: { numero: string | null; nome: string | null }) {
  const phone = numeroWhatsapp(numero);
  if (!phone) return <span>{numero?.trim() || 'Não informado'}</span>;
  const nacional = phone.slice(2);
  const label = nacional.length === 11
    ? formatWhatsApp(nacional)
    : nacional.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Conversar com ${nome || 'a candidata'} no WhatsApp: ${label}`}
      className="inline-flex min-h-10 items-center gap-2 rounded-md text-emerald-700 underline underline-offset-4 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MessageCircle size={16} aria-hidden="true" />
      {label}
    </a>
  );
}

export default function Candidatas() {
  const [rows, setRows] = useState<CandidataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pendente');
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [comoConheceuFilter, setComoConheceuFilter] = useState('todos');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidatas_revenda')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar candidatas', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as CandidataRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const dupIds = useMemo(() => findDuplicateIds(rows), [rows]);
  const pendentesCount = rows.filter((c) => (c.status || 'pendente') === 'pendente').length;
  const incompletosCount = rows.filter((c) => c.status === 'CADASTRO_NAO_CONCLUIDO').length;
  // Aprovada e ainda sem conta: é a fila de contratação, o gargalo que mais
  // importa nesta tela — de nada adianta aprovar se ninguém entra no sistema.
  const aguardandoContratacao = rows.filter((c) => c.status === 'aprovada').length;

  function matchesSearch(c: CandidataRow) {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const nome = (c.nome_completo || '').toLowerCase();
    const cpf = (c.cpf || '').replace(/\D/g, '');
    const zap = (c.whatsapp || '').replace(/\D/g, '');
    const qDigits = q.replace(/\D/g, '');
    return nome.includes(q) || (!!qDigits && (cpf.includes(qDigits) || zap.includes(qDigits)));
  }

  const filtered = useMemo(() => {
    let list: CandidataRow[];
    if (filter === 'incompleto') {
      list = rows.filter((c) => c.status === 'CADASTRO_NAO_CONCLUIDO');
    } else if (filter === 'todas') {
      list = rows.filter((c) => c.status !== 'CADASTRO_NAO_CONCLUIDO');
    } else if (filter === 'duplicada') {
      list = rows.filter((c) => dupIds.has(c.id));
    } else {
      list = rows.filter((c) => (c.status || 'pendente') === filter);
    }
    list = list.filter(matchesSearch);
    if (canalFilter && canalFilter !== 'todos') {
      list = list.filter((c) => c.canal_principal === canalFilter);
    }
    if (comoConheceuFilter !== 'todos') {
      list = list.filter((c) => c.como_conheceu === comoConheceuFilter);
    }
    if (dataInicio) {
      const start = new Date(dataInicio + 'T00:00:00').getTime();
      list = list.filter((c) => new Date(c.created_at).getTime() >= start);
    }
    if (dataFim) {
      const end = new Date(dataFim + 'T23:59:59').getTime();
      list = list.filter((c) => new Date(c.created_at).getTime() <= end);
    }
    return [...list].sort((a, b) => {
      const ra = a.avaliacao_manual === null || a.avaliacao_manual === undefined ? -1 : a.avaliacao_manual;
      const rb = b.avaliacao_manual === null || b.avaliacao_manual === undefined ? -1 : b.avaliacao_manual;
      if (ra !== rb) return rb - ra;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filter, search, dupIds, canalFilter, comoConheceuFilter, dataInicio, dataFim]);

  async function updateRating(id: string, value: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, avaliacao_manual: value } : r)));
    const { error } = await supabase.from('candidatas_revenda').update({ avaliacao_manual: value }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao salvar avaliação', description: error.message, variant: 'destructive' });
      load();
    }
  }

  /**
   * Contratação: a candidata aprovada vira usuária de verdade. A conta, o
   * papel e o vínculo com a ficha são criados de uma vez pela edge function —
   * se qualquer parte falhar, nada fica criado pela metade.
   */
  async function contratar(
    id: string,
    dados: { email: string; senha: string; role: string; nome: string },
  ) {
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: {
        action: 'hire',
        candidata_id: id,
        email: dados.email,
        password: dados.senha,
        role: dados.role,
        display_name: dados.nome,
      },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao contratar', description: error?.message || data?.error, variant: 'destructive' });
      return false;
    }
    toast({
      title: 'Contratada!',
      description: 'A conta foi criada. Passe o e-mail e a senha para ela acessar o painel.',
    });
    load();
    return true;
  }

  async function updateStatus(id: string, status: 'aprovada' | 'recusada', motivoRecusa?: string) {
    const payload: { status: Status; motivo_recusa?: string | null } = { status };
    if (status === 'recusada') payload.motivo_recusa = motivoRecusa ?? null;
    const { error } = await supabase.from('candidatas_revenda').update(payload).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar cadastro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'aprovada' ? 'Cadastro aprovado' : 'Cadastro recusado' });
    load();
  }

  const tabs: { key: Filter; label: string; badge?: number }[] = [
    { key: 'pendente', label: 'Pendentes', badge: pendentesCount },
    { key: 'aprovada', label: 'Aprovadas', badge: aguardandoContratacao },
    { key: 'contratada', label: 'Contratadas' },
    { key: 'recusada', label: 'Recusadas' },
    { key: 'duplicada', label: 'Duplicadas' },
    { key: 'incompleto', label: 'Cadastro Não Concluído', badge: incompletosCount },
    { key: 'todas', label: 'Todas' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              filter === t.key ? 'bg-rosa text-white border-rosa' : 'bg-white text-ink-soft border-border hover:border-rosa/50'
            }`}
          >
            {t.label}
            {!!t.badge && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === t.key ? 'bg-white/20' : 'bg-rosa/10 text-rosa'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou WhatsApp..."
          className="w-full pl-9 pr-3 h-10 text-sm border border-border rounded-md bg-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-border bg-bege-light">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink-soft mb-1">Período</label>
          <div className="flex items-center gap-2">
            <DatePickerInput value={dataInicio} onValueChange={setDataInicio} className="h-9 w-40" />
            <span className="text-ink-soft text-xs">a</span>
            <DatePickerInput value={dataFim} onValueChange={setDataFim} className="h-9 w-40" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink-soft mb-1">Canal</label>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="h-9 min-w-36 rounded-xl border-border bg-white px-3 shadow-sm focus:ring-rosa/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              <SelectItem value="todos" className="rounded-lg">Todos</SelectItem>
              <SelectItem value="instagram" className="rounded-lg">Instagram</SelectItem>
              <SelectItem value="whatsapp" className="rounded-lg">WhatsApp</SelectItem>
              <SelectItem value="presencial" className="rounded-lg">Presencial</SelectItem>
              <SelectItem value="outro" className="rounded-lg">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-ink-soft mb-1">Como conheceu a empresa</label>
          <Select value={comoConheceuFilter} onValueChange={setComoConheceuFilter}>
            <SelectTrigger className="h-9 min-w-56 rounded-xl border-border bg-white px-3 shadow-sm focus:ring-rosa/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              <SelectItem value="todos" className="rounded-lg">Todos</SelectItem>
              {COMO_CONHECEU_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="rounded-lg">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarExcel(filtered, canalFilter, dataInicio, dataFim)}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <FileSpreadsheet size={14} />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarPDF(filtered, canalFilter, dataInicio, dataFim)}
            disabled={filtered.length === 0}
            className="gap-1.5"
          >
            <FileText size={14} />
            PDF
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">Nenhum cadastro nesta lista ainda.</div>
      ) : filter === 'incompleto' ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <FichaCandidata key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CandidataCard
              key={c.id}
              c={c}
              isDuplicate={filter === 'duplicada'}
              onRate={updateRating}
              onApprove={(id) => updateStatus(id, 'aprovada')}
              onReject={(id, motivo) => updateStatus(id, 'recusada', motivo)}
              onHire={contratar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RespostasCadastro({ c }: { c: CandidataRow }) {
  const titleId = useId();
  const incompleto = c.status === 'CADASTRO_NAO_CONCLUIDO';
  const origem = COMO_CONHECEU_OPTIONS.find((option) => option.value === c.como_conheceu)?.label ?? c.como_conheceu;
  const respostas = [
    { pergunta: 'Por que devemos escolher o seu cadastro?', resposta: c.motivo_escolha, destaque: true },
    { pergunta: 'Qual sonho ou realização você quer conquistar com as vendas?', resposta: c.sonho_realizacao, destaque: true },
    { pergunta: 'Você trabalha atualmente? Se sim, onde e com o quê?', resposta: c.trabalha_atualmente },
    { pergunta: 'Você possui experiência com vendas?', resposta: c.experiencia_vendas === 'sim' ? 'Sim' : c.experiencia_vendas === 'nao' ? 'Não' : c.experiencia_vendas },
    { pergunta: 'O que você vende ou já vendeu?', resposta: c.experiencia_vendas_detalhe },
    { pergunta: 'Você possui restrição no CPF? Se sim, onde?', resposta: c.restricao_cpf },
    { pergunta: 'Como você conheceu a marca?', resposta: origem },
    ...(c.como_conheceu === 'outra' ? [{ pergunta: 'Como conheceu a marca — detalhe de Outra', resposta: c.como_conheceu_outra }] : []),
    { pergunta: 'Qual modalidade de parceria você tem interesse?', resposta: MODALIDADE_LABELS[c.modalidade_interesse ?? ''] ?? c.modalidade_interesse },
    { pergunta: 'Qual é o seu principal canal de vendas?', resposta: CANAL_LABELS[c.canal_principal ?? ''] ?? c.canal_principal },
    { pergunta: 'Qual é o seu @ do Instagram?', resposta: c.instagram_handle },
  ];

  return (
    <section aria-labelledby={titleId} className="min-w-0 border-t border-border pt-4 mt-3">
      <h3 id={titleId} className="font-serif text-lg text-ink">Respostas do cadastro</h3>
      <p className="mt-1 mb-3 text-xs text-ink-soft">
        {incompleto
          ? 'Respostas já salvas até a etapa alcançada. As respostas finais só são salvas ao enviar o cadastro.'
          : 'Perguntas do formulário e respostas informadas pela candidata.'}
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {respostas.map(({ pergunta, resposta, destaque }) => (
          <div key={pergunta} className={`min-w-0 rounded-xl border p-3 ${destaque ? 'sm:col-span-2 border-rosa/20 bg-rosa/5' : 'border-border bg-bege-light/40'}`}>
            <dt className="font-medium text-rosa">{pergunta}</dt>
            <dd className={`mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed ${resposta?.trim() ? 'text-ink' : 'text-ink-soft italic'}`}>
              {resposta?.trim() ? resposta : incompleto ? 'Resposta ainda não salva' : 'Resposta não registrada'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DadosPessoaisCadastro({ c }: { c: CandidataRow }) {
  const idade = calcIdade(c.data_nascimento);
  const filhos = c.tem_filhos === 'sim'
    ? c.filhos_quantidade == null
      ? 'Sim (quantidade não informada)'
      : `Sim, ${c.filhos_quantidade} ${c.filhos_quantidade === 1 ? 'filho' : 'filhos'}`
    : c.tem_filhos === 'nao' ? 'Não' : null;
  const dados = [
    { label: 'CPF', value: c.cpf },
    { label: 'Data de nascimento', value: c.data_nascimento ? new Date(`${c.data_nascimento}T00:00:00`).toLocaleDateString('pt-BR') : null },
    { label: 'Idade', value: idade === null ? null : `${idade} anos` },
    { label: 'E-mail', value: c.email },
    { label: 'WhatsApp', value: c.whatsapp },
    { label: 'Endereço completo', value: enderecoCompleto(c) },
    { label: 'CEP', value: c.endereco_cep },
    { label: 'Estado civil', value: ESTADO_CIVIL_LABELS[c.estado_civil ?? ''] ?? c.estado_civil },
    { label: 'Filhos', value: filhos },
    { label: 'Autorização de uso dos dados (LGPD)', value: c.lgpd_consent === true ? 'Autorizado' : 'Autorização não registrada' },
    { label: 'Data de criação', value: formatDateTime(c.created_at) },
    { label: 'Última atualização', value: formatDateTime(c.updated_at) },
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-3 mt-4 text-sm">
      {dados.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-rosa">{label}</dt>
          <dd className="text-ink whitespace-pre-wrap [overflow-wrap:anywhere]">{value?.trim() ? value : 'Não informado'}</dd>
        </div>
      ))}
    </dl>
  );
}

function FichaCandidata({ c, children, questionnaireExtras }: { c: CandidataRow; children?: ReactNode; questionnaireExtras?: ReactNode }) {
  const [panel, setPanel] = useState<'dados' | 'questionario' | null>(null);
  const detailsId = useId();
  const questionnaireId = useId();
  const incompleto = c.status === 'CADASTRO_NAO_CONCLUIDO';

  return (
    <article aria-label={`Cadastro de ${c.nome_completo || 'candidata sem nome'}`} className="min-w-0 bg-white rounded-2xl border border-bege p-5">
      <h3 className="font-serif text-lg text-ink [overflow-wrap:anywhere]">{c.nome_completo || 'Sem nome'}</h3>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-ink-soft">Telefone / WhatsApp</dt>
          <dd className="text-ink [overflow-wrap:anywhere]"><ContatoWhatsapp numero={c.whatsapp} nome={c.nome_completo} /></dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-ink-soft">CPF</dt>
          <dd className="mt-1 text-ink [overflow-wrap:anywhere]">{c.cpf?.trim() ? maskCPF(c.cpf) : 'Não informado'}</dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-ink-soft">Endereço</dt>
          <dd className="mt-1 text-ink [overflow-wrap:anywhere]">{enderecoCompleto(c) || 'Não informado'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant={panel === 'dados' ? 'secondary' : 'outline'} className="rounded-xl" aria-expanded={panel === 'dados'} aria-controls={detailsId} onClick={() => setPanel((current) => current === 'dados' ? null : 'dados')}>
          Dados pessoais
        </Button>
        <Button type="button" variant={panel === 'questionario' ? 'secondary' : 'outline'} className="rounded-xl" aria-expanded={panel === 'questionario'} aria-controls={questionnaireId} onClick={() => setPanel((current) => current === 'questionario' ? null : 'questionario')}>
          Questionário
        </Button>
      </div>

      {children}

      <section id={detailsId} aria-label="Dados pessoais" hidden={panel !== 'dados'}>
        {panel === 'dados' && (
          <>
            {incompleto && (
              <p className="mt-4 text-xs text-amber-700">
                Cadastro não concluído · {STAGE_LABELS[c.etapa_atual ?? 0] || `Parou na etapa ${c.etapa_atual ?? '—'}`}
              </p>
            )}
            <DadosPessoaisCadastro c={c} />
          </>
        )}
      </section>
      <div id={questionnaireId} hidden={panel !== 'questionario'}>
        {panel === 'questionario' && <><RespostasCadastro c={c} />{questionnaireExtras}</>}
      </div>
    </article>
  );
}

function CandidataCard({
  c,
  isDuplicate,
  onRate,
  onApprove,
  onReject,
  onHire,
}: {
  c: CandidataRow;
  isDuplicate: boolean;
  onRate: (id: string, value: number) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, motivo: string) => void;
  onHire: (
    id: string,
    dados: { email: string; senha: string; role: string; nome: string },
  ) => Promise<boolean>;
}) {
  const [showReject, setShowReject] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [showHire, setShowHire] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [contrato, setContrato] = useState({
    email: c.email ?? '',
    senha: '',
    role: 'revendedora',
    nome: c.nome_completo ?? '',
  });

  const cpfFlag = possibleCpfRestriction(c.restricao_cpf);
  const sorocaba = isSorocaba(c);
  const experiencia = temExperiencia(c);
  const status = c.status || 'pendente';

  function confirmReject() {
    if (!motivo) {
      toast({ title: 'Selecione um motivo', variant: 'destructive' });
      return;
    }
    onReject(c.id, motivoOutro ? `${motivo} — ${motivoOutro}` : motivo);
    setShowReject(false);
  }

  async function confirmarContratacao() {
    if (contrato.nome.trim().length < 2) {
      toast({ title: 'Informe o nome de exibição', variant: 'destructive' });
      return;
    }
    if (!contrato.email.trim()) {
      toast({ title: 'Informe o e-mail de acesso', variant: 'destructive' });
      return;
    }
    if (contrato.senha.length < 6) {
      toast({ title: 'A senha inicial precisa de ao menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setHiring(true);
    const ok = await onHire(c.id, {
      email: contrato.email.trim(),
      senha: contrato.senha,
      role: contrato.role,
      nome: contrato.nome.trim(),
    });
    setHiring(false);
    if (ok) setShowHire(false);
  }

  function chamarWhatsapp() {
    const phone = numeroWhatsapp(c.whatsapp);
    if (!phone) return;
    const firstName = (c.nome_completo || 'Candidata').split(' ')[0];
    const msg = `Parabéns, ${firstName}! 🎉 Analisamos seu perfil e você foi pré-aprovada! Agora só falta a gente fazer um bate papo rapidinho por vídeo chamada, pra gente se conhecer e eu te passar algumas informações. Você consegue na [DIA], às [HORA]?`;
    window.open(whatsappLink(msg, phone), '_blank', 'noopener,noreferrer');
  }

  const avaliacao = (
    <>
      <div className="flex flex-wrap gap-2 my-3">
        {isDuplicate && (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-red-300 text-red-700 bg-red-50">
            CPF repetido — conferir cadastros duplicados
          </span>
        )}
        {sorocaba ? (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50">Sorocaba — logística fácil</span>
        ) : (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-red-300 text-red-700 bg-red-50">Fora de Sorocaba — avaliar envio</span>
        )}
        {experiencia ? (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50">Tem experiência com vendas</span>
        ) : (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-border text-ink-soft">Primeira experiência</span>
        )}
        {cpfFlag ? (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-red-300 text-red-700 bg-red-50">CPF: revisar resposta</span>
        ) : (
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50">Sem restrição de CPF informada</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="text-xs font-medium text-ink-soft">Avaliação interna:</span>
        {[0, 5, 10].map((v) => (
          <button
            key={v}
            onClick={() => onRate(c.id, v)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              c.avaliacao_manual === v ? 'bg-rosa text-white border-rosa' : 'bg-white text-ink-soft border-border hover:border-rosa/50'
            }`}
          >
            {v} · {v === 0 ? 'Ruim' : v === 5 ? 'Mediana' : 'Boa'}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <FichaCandidata c={c} questionnaireExtras={avaliacao}>
      <div className="flex flex-wrap gap-2 items-center mt-4">
        {status === 'pendente' && (
          <>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(c.id)}>
              Aprovar cadastro
            </Button>
            <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => setShowReject((s) => !s)}>
              Recusar cadastro
            </Button>
          </>
        )}
        {status === 'aprovada' && (
          <>
            <span className="text-xs text-ink-soft">
              Status atual: <strong>Aprovada</strong>
            </span>
            <Button size="sm" className="bg-[#25D366] hover:bg-[#1fb659]" disabled={!numeroWhatsapp(c.whatsapp)} onClick={chamarWhatsapp}>
              <MessageCircle size={14} />
              Chamar no WhatsApp
            </Button>
            <Button size="sm" className="bg-rosa hover:bg-rosa/90" onClick={() => setShowHire((s) => !s)}>
              <UserPlus size={14} />
              Contratar
            </Button>
          </>
        )}
        {status === 'contratada' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <BadgeCheck size={14} />
            Contratada{c.contratada_em ? ` em ${formatDateTime(c.contratada_em)}` : ''} — já tem acesso ao
            sistema
          </span>
        )}
        {status === 'recusada' && (
          <span className="text-xs text-ink-soft">
            Status atual: <strong>Recusada</strong>
            {c.motivo_recusa ? ` — ${c.motivo_recusa}` : ''}
          </span>
        )}
      </div>

      {showHire && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-bege-light">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rosa mb-1">
            Criar acesso ao sistema
          </p>
          <p className="text-xs text-ink-soft mb-3">
            O telefone vem do WhatsApp da ficha. Anote a senha: ela é mostrada só agora, e a
            pessoa pode trocá-la depois com você.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <Input
              value={contrato.nome}
              onChange={(e) => setContrato({ ...contrato, nome: e.target.value })}
              placeholder="Nome de exibição"
              className="bg-white"
            />
            <Input
              type="email"
              value={contrato.email}
              onChange={(e) => setContrato({ ...contrato, email: e.target.value })}
              placeholder="E-mail de acesso"
              className="bg-white"
            />
            <Input
              type="text"
              value={contrato.senha}
              onChange={(e) => setContrato({ ...contrato, senha: e.target.value })}
              placeholder="Senha inicial (mín. 6)"
              className="bg-white"
            />
            <AppSelect
              value={contrato.role}
              onValueChange={(role) => setContrato({ ...contrato, role })}
              options={[{ value: 'revendedora', label: 'Revendedora' }, { value: 'b2b', label: 'B2B' }]}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-rosa hover:bg-rosa/90" disabled={hiring} onClick={confirmarContratacao}>
              {hiring ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Confirmar contratação
            </Button>
            <Button size="sm" variant="outline" disabled={hiring} onClick={() => setShowHire(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {showReject && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-bege-light">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rosa mb-2.5">Motivo da recusa</p>
          <AppSelect
            value={motivo}
            onValueChange={setMotivo}
            options={[{ value: '', label: 'Selecione um motivo...' }, ...MOTIVOS_RECUSA.map((m) => ({ value: m, label: m }))]}
            className="mb-3 w-full"
          />
          <input
            type="text"
            value={motivoOutro}
            onChange={(e) => setMotivoOutro(e.target.value)}
            placeholder="Detalhe adicional (opcional)"
            className="w-full h-10 rounded-md border border-input bg-white px-3 text-sm mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={confirmReject}>
              Confirmar recusa
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </FichaCandidata>
  );
}
