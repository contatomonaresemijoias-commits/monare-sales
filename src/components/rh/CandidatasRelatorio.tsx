import { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type CandidataRow = {
  id: string;
  cpf: string | null;
  data_nascimento: string | null;
  endereco_cidade: string | null;
  como_conheceu: string | null;
  experiencia_vendas: string | null;
  status: 'CADASTRO_NAO_CONCLUIDO' | 'pendente' | 'aprovada' | 'recusada';
  motivo_recusa: string | null;
  created_at: string;
};

const PALETTE = ['#BA737A', '#D29AA3', '#9A7B2E', '#5B5750', '#4A6B4D', '#23211E'];
const STATUS_COLORS = { pendente: '#9A7B2E', aprovada: '#4A6B4D', recusada: '#A24B3E' };

const CANAL_LABELS: Record<string, string> = {
  instagram_monare: 'Instagram da Monarê',
  indicacao_revendedora: 'Indicação de revendedora',
  indicacao_amiga: 'Indicação de amiga',
  evento_feira: 'Evento ou feira',
  whatsapp_grupo: 'WhatsApp / grupo',
  outra: 'Outra',
};

const PANELS = [
  { value: 'todos', label: 'Visualizar todos os painéis' },
  { value: 'canal', label: 'Canal de origem' },
  { value: 'status', label: 'Status dos cadastros' },
  { value: 'taxa', label: 'Taxa de aprovação por canal' },
  { value: 'local', label: 'Localização' },
  { value: 'exp', label: 'Experiência prévia × aprovação' },
  { value: 'tempo', label: 'Cadastros por tempo' },
  { value: 'motivo', label: 'Motivos de recusa' },
  { value: 'idade', label: 'Faixa etária' },
];

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

export default function CandidatasRelatorio() {
  const [rows, setRows] = useState<CandidataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<'mes' | 'periodo'>('mes');
  const [monthDate, setMonthDate] = useState(new Date());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [panel, setPanel] = useState('todos');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('candidatas_revenda').select('*');
      setRows((data ?? []) as CandidataRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (periodMode === 'mes') {
      const fMonth = monthDate.getMonth();
      const fYear = monthDate.getFullYear();
      return rows.filter((r) => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        return d.getMonth() === fMonth && d.getFullYear() === fYear;
      });
    }
    if (!startDate || !endDate) return rows;
    const sDate = new Date(startDate + 'T00:00:00');
    const eDate = new Date(endDate + 'T23:59:59');
    return rows.filter((r) => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return d >= sDate && d <= eDate;
    });
  }, [rows, periodMode, monthDate, startDate, endDate]);

  const total = filtered.length;
  const aprovadas = filtered.filter((r) => r.status === 'aprovada').length;
  const recusadas = filtered.filter((r) => r.status === 'recusada').length;
  const pendentes = filtered.filter((r) => (r.status || 'pendente') === 'pendente').length;
  const taxaAprovacao = total ? Math.round((aprovadas / total) * 100) : 0;
  const taxaRecusa = total ? Math.round((recusadas / total) * 100) : 0;

  const countByCpf: Record<string, number> = {};
  filtered.forEach((r) => {
    const cpf = (r.cpf || '').replace(/\D/g, '');
    if (cpf) countByCpf[cpf] = (countByCpf[cpf] || 0) + 1;
  });
  const duplicadas = Object.values(countByCpf).filter((n) => n > 1).reduce((acc, n) => acc + n, 0);

  const idades = filtered.map((r) => calcIdade(r.data_nascimento)).filter((i): i is number => i !== null);
  const idadeMedia = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null;

  const canalCounts: Record<string, number> = {};
  filtered.forEach((r) => {
    const k = r.como_conheceu || 'outra';
    canalCounts[k] = (canalCounts[k] || 0) + 1;
  });
  const canalKeys = Object.keys(canalCounts);
  const canalData = canalKeys.map((k) => ({ name: CANAL_LABELS[k] || k, value: canalCounts[k] }));

  const statusData = [
    { name: 'Pendente', value: pendentes, color: STATUS_COLORS.pendente },
    { name: 'Aprovada', value: aprovadas, color: STATUS_COLORS.aprovada },
    { name: 'Recusada', value: recusadas, color: STATUS_COLORS.recusada },
  ];

  const canalTable = canalKeys.map((k) => {
    const rowsForCanal = filtered.filter((r) => (r.como_conheceu || 'outra') === k);
    const aprov = rowsForCanal.filter((r) => r.status === 'aprovada').length;
    const decidido = rowsForCanal.filter((r) => r.status === 'aprovada' || r.status === 'recusada').length;
    const taxa = decidido ? Math.round((aprov / decidido) * 100) : null;
    return { canal: CANAL_LABELS[k] || k, total: rowsForCanal.length, aprovadas: aprov, taxa };
  });

  const sorocaba = filtered.filter((r) => (r.endereco_cidade || '').toLowerCase().includes('sorocaba')).length;
  const localData = [
    { name: 'Sorocaba', value: sorocaba },
    { name: 'Outras cidades', value: total - sorocaba },
  ];

  const comExp = filtered.filter((r) => r.experiencia_vendas === 'sim');
  const semExp = filtered.filter((r) => r.experiencia_vendas !== 'sim');
  const taxaComExp = comExp.length ? Math.round((comExp.filter((r) => r.status === 'aprovada').length / comExp.length) * 100) : 0;
  const taxaSemExp = semExp.length ? Math.round((semExp.filter((r) => r.status === 'aprovada').length / semExp.length) * 100) : 0;
  const expData = [
    { name: 'Com experiência', value: taxaComExp },
    { name: 'Sem experiência', value: taxaSemExp },
  ];

  const monthCounts: Record<string, number> = {};
  filtered.forEach((r) => {
    if (!r.created_at) return;
    const d = new Date(r.created_at);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  const tempoData = Object.keys(monthCounts).sort().map((k) => ({ name: k, value: monthCounts[k] }));

  const motivoCounts: Record<string, number> = {};
  filtered.filter((r) => r.status === 'recusada' && r.motivo_recusa).forEach((r) => {
    const key = (r.motivo_recusa as string).split(' — ')[0];
    motivoCounts[key] = (motivoCounts[key] || 0) + 1;
  });
  const motivoData = Object.keys(motivoCounts)
    .sort((a, b) => motivoCounts[b] - motivoCounts[a])
    .map((k) => ({ name: k, value: motivoCounts[k] }));

  const faixas = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
  idades.forEach((i) => {
    if (i <= 24) faixas['18-24']++;
    else if (i <= 34) faixas['25-34']++;
    else if (i <= 44) faixas['35-44']++;
    else if (i <= 54) faixas['45-54']++;
    else faixas['55+']++;
  });
  const idadeData = Object.entries(faixas).map(([name, value]) => ({ name, value }));

  const show = (key: string) => panel === 'todos' || panel === key;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-bege p-5 flex flex-wrap items-end gap-6 print:hidden">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-rosa">Período</span>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={periodMode === 'mes'} onChange={() => setPeriodMode('mes')} className="accent-rosa" />
              Do mês
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={periodMode === 'periodo'} onChange={() => setPeriodMode('periodo')} className="accent-rosa" />
              De um período
            </label>
          </div>
        </div>

        {periodMode === 'mes' ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-rosa">Mês selecionado</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="text-rosa hover:text-ink p-1">
                <ChevronLeft size={16} />
              </button>
              <span className="w-24 text-center text-sm font-medium">
                {String(monthDate.getMonth() + 1).padStart(2, '0')}/{monthDate.getFullYear()}
              </span>
              <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="text-rosa hover:text-ink p-1">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-rosa">Data inicial</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-rosa">Data final</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-md border border-input px-3 text-sm" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-rosa">Filtrar relatórios</span>
          <select value={panel} onChange={(e) => setPanel(e.target.value)} className="h-10 rounded-md border border-input px-3 text-sm bg-white">
            {PANELS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <Button className="ml-auto bg-rosa hover:bg-rosa/90" onClick={() => window.print()}>
          <Printer size={14} />
          Exportar relatório
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Cadastros no filtro', value: total, cls: '' },
          { label: 'Pendentes', value: pendentes, cls: 'text-amber-600' },
          { label: 'Aprovações', value: `${taxaAprovacao}%`, cls: 'text-emerald-600' },
          { label: 'Taxa de recusa', value: `${taxaRecusa}%`, cls: 'text-destructive' },
          { label: 'Duplicadas (alerta)', value: duplicadas, cls: duplicadas ? 'text-amber-600' : '' },
          { label: 'Idade média', value: idadeMedia !== null ? `${idadeMedia} anos` : '—', cls: '' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-bege p-4">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft mb-1.5">{k.label}</p>
            <p className={`font-serif text-2xl ${k.cls || 'text-ink'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">Nenhum cadastro no período selecionado.</div>
      ) : (
        <div className="space-y-5">
          {(show('canal') || show('status')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {show('canal') && (
                <div className="bg-white rounded-2xl border border-bege p-5">
                  <h3 className="font-serif text-lg text-ink mb-1">Canal de origem</h3>
                  <p className="text-xs text-ink-soft mb-4">Onde as candidatas dizem ter conhecido a Monarê</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={canalData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                          {canalData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {show('status') && (
                <div className="bg-white rounded-2xl border border-bege p-5">
                  <h3 className="font-serif text-lg text-ink mb-1">Status dos cadastros</h3>
                  <p className="text-xs text-ink-soft mb-4">Pendente, aprovada ou recusada</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                          {statusData.map((s, i) => (
                            <Cell key={i} fill={s.color} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {show('taxa') && (
            <div className="bg-white rounded-2xl border border-bege p-5">
              <h3 className="font-serif text-lg text-ink mb-1">Taxa de aprovação por canal</h3>
              <p className="text-xs text-ink-soft mb-4">Mede a qualidade dos canais: onde vêm as representantes que você mais aprova.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-ink-soft">
                      <th className="py-2 pr-4">Canal</th>
                      <th className="py-2 pr-4">Cadastros</th>
                      <th className="py-2 pr-4">Aprovadas</th>
                      <th className="py-2">Taxa de aprovação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canalTable.map((r) => (
                      <tr key={r.canal} className="border-b border-border/60">
                        <td className="py-2 pr-4 text-ink">{r.canal}</td>
                        <td className="py-2 pr-4 text-ink">{r.total}</td>
                        <td className="py-2 pr-4 text-ink">{r.aprovadas}</td>
                        <td className="py-2 text-ink">{r.taxa === null ? '—' : `${r.taxa}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(show('local') || show('exp')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {show('local') && (
                <div className="bg-white rounded-2xl border border-bege p-5">
                  <h3 className="font-serif text-lg text-ink mb-1">Localização</h3>
                  <p className="text-xs text-ink-soft mb-4">Sorocaba (retirada presencial) vs. outras cidades (logística de envio)</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={localData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#BA737A" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {show('exp') && (
                <div className="bg-white rounded-2xl border border-bege p-5">
                  <h3 className="font-serif text-lg text-ink mb-1">Experiência prévia × aprovação</h3>
                  <p className="text-xs text-ink-soft mb-4">Correlação entre ter trabalhado com vendas e a aprovação</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis unit="%" domain={[0, 100]} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" name="% aprovadas" fill="#4A6B4D" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {show('tempo') && (
            <div className="bg-white rounded-2xl border border-bege p-5">
              <h3 className="font-serif text-lg text-ink mb-1">Cadastros por tempo</h3>
              <p className="text-xs text-ink-soft mb-4">Volume de captação de cadastros mês a mês</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tempoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Cadastros" stroke="#BA737A" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {show('motivo') && (
            <div className="bg-white rounded-2xl border border-bege p-5">
              <h3 className="font-serif text-lg text-ink mb-1">Motivos de recusa</h3>
              <p className="text-xs text-ink-soft mb-4">Principais gargalos que desqualificam candidatas do processo</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motivoData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis type="category" dataKey="name" width={220} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#A24B3E" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {show('idade') && (
            <div className="bg-white rounded-2xl border border-bege p-5">
              <h3 className="font-serif text-lg text-ink mb-1">Faixa etária</h3>
              <p className="text-xs text-ink-soft mb-4">Distribuição de idade do perfil real das interessadas</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={idadeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#BA737A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
