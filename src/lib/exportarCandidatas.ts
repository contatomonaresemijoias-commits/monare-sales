import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

type CandidataExport = {
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  estado_civil: string | null;
  tem_filhos: string | null;
  filhos_quantidade: number | null;
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
  como_conheceu: string | null;
  como_conheceu_outra: string | null;
  trabalha_atualmente: string | null;
  experiencia_vendas: string | null;
  experiencia_vendas_detalhe: string | null;
  restricao_cpf: string | null;
  motivo_escolha: string | null;
  sonho_realizacao: string | null;
  status: string | null;
  created_at: string;
};

const MODALIDADE_LABELS: Record<string, string> = {
  maleta_consignada: 'Maleta consignada',
  mostruario: 'Mostruário',
  tenho_duvidas: 'Tenho dúvidas',
};

const COMO_CONHECEU_LABELS: Record<string, string> = {
  instagram_monare: 'Instagram da marca',
  anuncio: 'Anúncio',
  indicacao_revendedora: 'Indicação revendedora',
  indicacao_amiga: 'Indicação conhecido',
  evento_feira: 'Evento ou feira',
  whatsapp_grupo: 'WhatsApp / grupo',
  outra: 'Outra',
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

const STATUS_LABELS: Record<string, string> = {
  CADASTRO_NAO_CONCLUIDO: 'Não concluído',
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  contratada: 'Contratada',
};

function fmt(v: string | null | undefined): string {
  return v ?? '—';
}

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function fmtZap(zap: string | null | undefined): string {
  if (!zap) return '—';
  const d = zap.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  return zap;
}

function buildRows(data: CandidataExport[]) {
  return data.map((c) => ({
    'Nome': fmt(c.nome_completo),
    'CPF': fmtCpf(c.cpf),
    'Data de nascimento': c.data_nascimento ? new Date(c.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    'WhatsApp': fmtZap(c.whatsapp),
    'E-mail': fmt(c.email),
    'Estado civil': ESTADO_CIVIL_LABELS[c.estado_civil ?? ''] ?? fmt(c.estado_civil),
    'Filhos': c.tem_filhos === 'sim' ? `Sim (${c.filhos_quantidade ?? '—'})` : c.tem_filhos === 'nao' ? 'Não' : '—',
    'Cidade': fmt(c.endereco_cidade),
    'UF': fmt(c.endereco_estado),
    'Endereço completo': [c.endereco_rua, c.endereco_numero, c.endereco_complemento, c.endereco_bairro].filter(Boolean).join(', ') || '—',
    'CEP': fmt(c.endereco_cep),
    'Instagram': fmt(c.instagram_handle),
    'Canal de vendas': CANAL_LABELS[c.canal_principal ?? ''] ?? fmt(c.canal_principal),
    'Modalidade': MODALIDADE_LABELS[c.modalidade_interesse ?? ''] ?? fmt(c.modalidade_interesse),
    'Como conheceu': COMO_CONHECEU_LABELS[c.como_conheceu ?? ''] ?? fmt(c.como_conheceu),
    'Como conheceu (detalhe)': c.como_conheceu === 'outra' ? fmt(c.como_conheceu_outra) : '—',
    'Trabalha atualmente': fmt(c.trabalha_atualmente),
    'Experiência com vendas': c.experiencia_vendas === 'sim' ? 'Sim' : c.experiencia_vendas === 'nao' ? 'Não' : '—',
    'Detalhe experiência': fmt(c.experiencia_vendas_detalhe),
    'Restrição CPF': fmt(c.restricao_cpf),
    'Motivo da escolha': fmt(c.motivo_escolha),
    'Sonho / realização': fmt(c.sonho_realizacao),
    'Status': STATUS_LABELS[c.status ?? ''] ?? fmt(c.status),
    'Data do cadastro': fmtData(c.created_at),
  }));
}

function buildFilename(prefix: string, ext: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', 'h');
  return `cadastros_${prefix}_${date}_${time}.${ext}`;
}

function filterLabel(canal: string | null, dataInicio: string | null, dataFim: string | null): string {
  const parts: string[] = [];
  if (canal && canal !== 'todos') parts.push(CANAL_LABELS[canal] ?? canal);
  if (dataInicio || dataFim) {
    const i = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
    const f = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
    parts.push(`${i} a ${f}`);
  }
  return parts.length ? parts.join(' — ') : 'todos';
}

type SummaryItem = { label: string; value: number | string };
type SummarySection = { title: string; items: SummaryItem[] };

function countValues(
  data: CandidataExport[],
  getValue: (row: CandidataExport) => string | null | undefined,
  labels?: Record<string, string>,
): SummaryItem[] {
  const counts = new Map<string, number>();
  data.forEach((row) => {
    const raw = getValue(row)?.trim() || 'nao_informado';
    counts.set(raw, (counts.get(raw) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([key, value]) => ({
      label: key === 'nao_informado' ? 'Não informado' : labels?.[key] ?? key,
      value,
    }));
}

function buildSummary(data: CandidataExport[]): SummarySection[] {
  const total = data.length;
  const cpfs = data.map((row) => (row.cpf || '').replace(/\D/g, '')).filter(Boolean);
  const cpfCounts = new Map<string, number>();
  cpfs.forEach((cpf) => cpfCounts.set(cpf, (cpfCounts.get(cpf) || 0) + 1));
  const registrosDuplicados = [...cpfCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
  const comFilhos = data.filter((row) => row.tem_filhos === 'sim').length;
  const totalFilhos = data.reduce((sum, row) => sum + (row.filhos_quantidade || 0), 0);
  const comExperiencia = data.filter((row) => row.experiencia_vendas === 'sim').length;
  const percent = (value: number) => total ? `${value} (${Math.round((value / total) * 100)}%)` : '0 (0%)';

  return [
    {
      title: 'Totais gerais',
      items: [
        { label: 'Total de cadastros', value: total },
        { label: 'CPFs únicos informados', value: new Set(cpfs).size },
        { label: 'Registros com CPF duplicado', value: registrosDuplicados },
        { label: 'Cadastros com e-mail', value: percent(data.filter((row) => !!row.email).length) },
        { label: 'Cadastros com WhatsApp', value: percent(data.filter((row) => !!row.whatsapp).length) },
      ],
    },
    { title: 'Por status', items: countValues(data, (row) => row.status, STATUS_LABELS) },
    { title: 'Como conheceu a empresa', items: countValues(data, (row) => row.como_conheceu, COMO_CONHECEU_LABELS) },
    { title: 'Por canal de vendas', items: countValues(data, (row) => row.canal_principal, CANAL_LABELS) },
    { title: 'Por modalidade de interesse', items: countValues(data, (row) => row.modalidade_interesse, MODALIDADE_LABELS) },
    {
      title: 'Perfil das candidatas',
      items: [
        { label: 'Com filhos', value: percent(comFilhos) },
        { label: 'Total de filhos informado', value: totalFilhos },
        { label: 'Com experiência em vendas', value: percent(comExperiencia) },
        ...countValues(data, (row) => row.estado_civil, ESTADO_CIVIL_LABELS),
      ],
    },
    {
      title: 'Por cidade/UF',
      items: countValues(data, (row) => {
        const cidade = row.endereco_cidade?.trim();
        const uf = row.endereco_estado?.trim();
        return cidade ? `${cidade}${uf ? `/${uf}` : ''}` : null;
      }),
    },
  ];
}

function summaryAsRows(sections: SummarySection[]): (string | number)[][] {
  return sections.flatMap((section) => [
    ['', ''],
    [section.title.toUpperCase(), 'QUANTIDADE / PERCENTUAL'],
    ...section.items.map((item) => [item.label, item.value]),
  ]);
}

export function exportarExcel(
  data: CandidataExport[],
  canal: string | null,
  dataInicio: string | null,
  dataFim: string | null,
) {
  const rows = buildRows(data);
  const ws = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.sheet_add_aoa(ws, [
    ['', ''],
    ['RESUMO DA EXPORTAÇÃO', ''],
    ['Filtro aplicado', filterLabel(canal, dataInicio, dataFim)],
    ['Exportado em', new Date().toLocaleString('pt-BR')],
    ...summaryAsRows(buildSummary(data)),
  ], { origin: -1 });

  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, key === 'Nome' ? 34 : 18),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cadastros');

  const label = filterLabel(canal, dataInicio, dataFim);
  const prefix = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 40) || 'todos';
  XLSX.writeFile(wb, buildFilename(prefix, 'xlsx'));
}

const COR_ESCURA = '#2C2825';
const COR_OURO = '#C9A96E';
const COR_BEGE = '#F5F2ED';

export function exportarPDF(
  data: CandidataExport[],
  canal: string | null,
  dataInicio: string | null,
  dataFim: string | null,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const tableW = pageW - margin * 2;

  const columns = [
    { header: 'Nome', key: 'nome', w: 38 },
    { header: 'WhatsApp', key: 'zap', w: 28 },
    { header: 'Cidade/UF', key: 'cidade', w: 28 },
    { header: 'Instagram', key: 'ig', w: 28 },
    { header: 'Canal', key: 'canal', w: 26 },
    { header: 'Modalidade', key: 'mod', w: 28 },
    { header: 'Estado civil', key: 'ec', w: 22 },
    { header: 'Filhos', key: 'filhos', w: 16 },
    { header: 'Status', key: 'status', w: 20 },
    { header: 'Cadastro', key: 'data', w: 26 },
    { header: 'Como conheceu', key: 'como', w: 28 },
  ];

  const totalColW = columns.reduce((s, c) => s + c.w, 0);
  const scale = tableW / totalColW;
  columns.forEach((c) => (c.w = c.w * scale));

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
  }

  let y = margin;

  doc.setFillColor(COR_ESCURA);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Monarê Semijoias — Cadastros', margin, 11);

  const subtitle = filterLabel(canal, dataInicio, dataFim);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, 16);

  doc.setFontSize(7);
  doc.text(`${data.length} registro(s)`, pageW - margin, 16, { align: 'right' });

  y = 22;

  doc.setFillColor(COR_OURO);
  doc.rect(margin, y, tableW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let x = margin;
  for (const col of columns) {
    doc.text(col.header, x + 1.5, y + 4.5);
    x += col.w;
  }
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(COR_ESCURA);

  for (let i = 0; i < data.length; i++) {
    const c = data[i];

    const row = {
      nome: fmt(c.nome_completo),
      zap: fmtZap(c.whatsapp),
      cidade: `${fmt(c.endereco_cidade)}/${fmt(c.endereco_estado)}`,
      ig: fmt(c.instagram_handle),
      canal: CANAL_LABELS[c.canal_principal ?? ''] ?? fmt(c.canal_principal),
      mod: MODALIDADE_LABELS[c.modalidade_interesse ?? ''] ?? fmt(c.modalidade_interesse),
      ec: ESTADO_CIVIL_LABELS[c.estado_civil ?? ''] ?? fmt(c.estado_civil),
      filhos: c.tem_filhos === 'sim' ? `Sim (${c.filhos_quantidade ?? '?'})` : c.tem_filhos === 'nao' ? 'Não' : '—',
      status: STATUS_LABELS[c.status ?? ''] ?? fmt(c.status),
      data: fmtData(c.created_at),
      como: COMO_CONHECEU_LABELS[c.como_conheceu ?? ''] ?? fmt(c.como_conheceu),
    };

    const cellLines = columns.map((col) =>
      doc.splitTextToSize(String(row[col.key as keyof typeof row]), Math.max(col.w - 3, 4)) as string[],
    );
    const maxLines = Math.max(...cellLines.map((lines) => lines.length), 1);
    const rowHeight = Math.max(7, maxLines * 3 + 2);

    if (y + rowHeight > pageH - 12) {
      doc.addPage('landscape');
      y = margin;
      doc.setFillColor(COR_OURO);
      doc.rect(margin, y, tableW, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      x = margin;
      for (const col of columns) {
        doc.text(col.header, x + 1.5, y + 4.5);
        x += col.w;
      }
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COR_ESCURA);
    }

    if (i % 2 === 0) {
      doc.setFillColor(COR_BEGE);
      doc.rect(margin, y, tableW, rowHeight, 'F');
    }

    x = margin;
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const col = columns[colIndex];
      doc.text(cellLines[colIndex], x + 1.5, y + 3.5, { lineHeightFactor: 1.15 });
      x += col.w;
    }
    y += rowHeight;
  }

  const summary = buildSummary(data);

  function addSummaryPage(continuation = false) {
    doc.addPage('a4', 'landscape');
    doc.setFillColor(COR_ESCURA);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Resumo da exportação${continuation ? ' — continuação' : ''}`, margin, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${data.length} cadastro(s) · ${subtitle}`, margin, 16);
    y = 24;
  }

  addSummaryPage();
  summary.forEach((section) => {
    const requiredHeight = 9 + section.items.length * 6;
    if (y + Math.min(requiredHeight, 24) > pageH - 12) addSummaryPage(true);

    doc.setFillColor(COR_OURO);
    doc.roundedRect(margin, y, tableW, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(section.title, margin + 2, y + 4.8);
    y += 9;

    section.items.forEach((item, index) => {
      if (y + 6 > pageH - 12) {
        addSummaryPage(true);
        doc.setTextColor(COR_ESCURA);
      }
      if (index % 2 === 0) {
        doc.setFillColor(COR_BEGE);
        doc.roundedRect(margin, y - 1, tableW, 6, 1, 1, 'F');
      }
      doc.setTextColor(COR_ESCURA);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(truncate(item.label, 85), margin + 2, y + 3);
      doc.setFont('helvetica', 'bold');
      doc.text(String(item.value), pageW - margin - 2, y + 3, { align: 'right' });
      y += 6;
    });
    y += 3;
  });

  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`Exportado em ${new Date().toLocaleString('pt-BR')}`, pageW - margin, pageH - 5, { align: 'right' });

  const label = filterLabel(canal, dataInicio, dataFim);
  const prefix = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 40) || 'todos';
  doc.save(buildFilename(prefix, 'pdf'));
}

export type CandidataRelatorioRow = {
  nome_completo: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  whatsapp: string | null;
  email: string | null;
  estado_civil: string | null;
  tem_filhos: string | null;
  filhos_quantidade: number | null;
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
  como_conheceu: string | null;
  como_conheceu_outra: string | null;
  trabalha_atualmente: string | null;
  experiencia_vendas: string | null;
  experiencia_vendas_detalhe: string | null;
  restricao_cpf: string | null;
  motivo_escolha: string | null;
  sonho_realizacao: string | null;
  motivo_recusa: string | null;
  status: string | null;
  created_at: string;
};

function calcIdadeFromRow(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null;
  const dob = new Date(dataNascimento + 'T00:00:00');
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function exportarRelatorioExcel(
  data: CandidataRelatorioRow[],
  periodLabel: string,
) {
  const wb = XLSX.utils.book_new();
  const total = data.length;
  const aprovadas = data.filter((r) => r.status === 'aprovada').length;
  const recusadas = data.filter((r) => r.status === 'recusada').length;
  const pendentes = data.filter((r) => (r.status || 'pendente') === 'pendente').length;
  const contratadas = data.filter((r) => r.status === 'contratada').length;
  const taxaAprovacao = total ? Math.round((aprovadas / total) * 100) : 0;
  const taxaRecusa = total ? Math.round((recusadas / total) * 100) : 0;

  const countByCpf: Record<string, number> = {};
  data.forEach((r) => {
    const cpf = (r.cpf || '').replace(/\D/g, '');
    if (cpf) countByCpf[cpf] = (countByCpf[cpf] || 0) + 1;
  });
  const duplicadas = Object.values(countByCpf).filter((n) => n > 1).reduce((acc, n) => acc + n, 0);

  const idades = data.map((r) => calcIdadeFromRow(r.data_nascimento)).filter((i): i is number => i !== null);
  const idadeMedia = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null;

  const canalCounts: Record<string, number> = {};
  data.forEach((r) => {
    const k = r.como_conheceu || 'outra';
    canalCounts[k] = (canalCounts[k] || 0) + 1;
  });

  const canalVendasCounts: Record<string, number> = {};
  data.forEach((r) => {
    const k = r.canal_principal || 'outro';
    canalVendasCounts[k] = (canalVendasCounts[k] || 0) + 1;
  });

  const motivoCounts: Record<string, number> = {};
  data.filter((r) => r.status === 'recusada' && r.motivo_recusa).forEach((r) => {
    const key = (r.motivo_recusa as string).split(' — ')[0];
    motivoCounts[key] = (motivoCounts[key] || 0) + 1;
  });

  const faixas = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
  idades.forEach((i) => {
    if (i <= 24) faixas['18-24']++;
    else if (i <= 34) faixas['25-34']++;
    else if (i <= 44) faixas['35-44']++;
    else if (i <= 54) faixas['45-54']++;
    else faixas['55+']++;
  });

  const resumoRows = [
    { 'Indicador': 'Período do filtro', 'Valor': periodLabel },
    { 'Indicador': 'Data da exportação', 'Valor': new Date().toLocaleString('pt-BR') },
    { 'Indicador': '', 'Valor': '' },
    { 'Indicador': 'Total de cadastros', 'Valor': total },
    { 'Indicador': 'Pendentes', 'Valor': pendentes },
    { 'Indicador': 'Aprovadas', 'Valor': aprovadas },
    { 'Indicador': 'Recusadas', 'Valor': recusadas },
    { 'Indicador': 'Contratadas', 'Valor': contratadas },
    { 'Indicador': 'Taxa de aprovação', 'Valor': `${taxaAprovacao}%` },
    { 'Indicador': 'Taxa de recusa', 'Valor': `${taxaRecusa}%` },
    { 'Indicador': 'Cadastros duplicados (alerta)', 'Valor': duplicadas },
    { 'Indicador': 'Idade média', 'Valor': idadeMedia !== null ? `${idadeMedia} anos` : '—' },
    { 'Indicador': '', 'Valor': '' },
    { 'Indicador': '--- Canal de origem (como conheceu) ---', 'Valor': '' },
    ...Object.entries(canalCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ 'Indicador': COMO_CONHECEU_LABELS[k] ?? k, 'Valor': v })),
    { 'Indicador': '', 'Valor': '' },
    { 'Indicador': '--- Canal de vendas ---', 'Valor': '' },
    ...Object.entries(canalVendasCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ 'Indicador': CANAL_LABELS[k] ?? k, 'Valor': v })),
    { 'Indicador': '', 'Valor': '' },
    { 'Indicador': '--- Faixa etária ---', 'Valor': '' },
    ...Object.entries(faixas).map(([k, v]) => ({ 'Indicador': k, 'Valor': v })),
    { 'Indicador': '', 'Valor': '' },
    { 'Indicador': '--- Motivos de recusa ---', 'Valor': '' },
    ...Object.entries(motivoCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ 'Indicador': k, 'Valor': v })),
  ];

  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
  wsResumo['!cols'] = [{ wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  const detailRows = data.map((c) => ({
    'Nome': fmt(c.nome_completo),
    'CPF': fmtCpf(c.cpf),
    'Data de nascimento': c.data_nascimento ? new Date(c.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    'Idade': (() => { const i = calcIdadeFromRow(c.data_nascimento); return i !== null ? i : '—'; })(),
    'WhatsApp': fmtZap(c.whatsapp),
    'E-mail': fmt(c.email),
    'Estado civil': ESTADO_CIVIL_LABELS[c.estado_civil ?? ''] ?? fmt(c.estado_civil),
    'Filhos': c.tem_filhos === 'sim' ? `Sim (${c.filhos_quantidade ?? '—'})` : c.tem_filhos === 'nao' ? 'Não' : '—',
    'Cidade': fmt(c.endereco_cidade),
    'UF': fmt(c.endereco_estado),
    'Endereço completo': [c.endereco_rua, c.endereco_numero, c.endereco_complemento, c.endereco_bairro].filter(Boolean).join(', ') || '—',
    'CEP': fmt(c.endereco_cep),
    'Instagram': fmt(c.instagram_handle),
    'Canal de vendas': CANAL_LABELS[c.canal_principal ?? ''] ?? fmt(c.canal_principal),
    'Como conheceu': COMO_CONHECEU_LABELS[c.como_conheceu ?? ''] ?? fmt(c.como_conheceu),
    'Como conheceu (detalhe)': c.como_conheceu === 'outra' ? fmt(c.como_conheceu_outra) : '—',
    'Modalidade de interesse': MODALIDADE_LABELS[c.modalidade_interesse ?? ''] ?? fmt(c.modalidade_interesse),
    'Trabalha atualmente': fmt(c.trabalha_atualmente),
    'Experiência com vendas': c.experiencia_vendas === 'sim' ? 'Sim' : c.experiencia_vendas === 'nao' ? 'Não' : '—',
    'Detalhe experiência': fmt(c.experiencia_vendas_detalhe),
    'Restrição CPF': fmt(c.restricao_cpf),
    'Motivo da escolha': fmt(c.motivo_escolha),
    'Sonho / realização': fmt(c.sonho_realizacao),
    'Status': STATUS_LABELS[c.status ?? ''] ?? fmt(c.status),
    'Motivo da recusa': fmt(c.motivo_recusa),
    'Data do cadastro': fmtData(c.created_at),
  }));

  const wsDetalhe = XLSX.utils.json_to_sheet(detailRows.length ? detailRows : [{ 'Mensagem': 'Nenhum cadastro no período selecionado.' }]);
  if (detailRows.length) {
    wsDetalhe['!cols'] = Object.keys(detailRows[0]).map((key) => ({
      wch: Math.max(key.length + 2, 18),
    }));
  }
  XLSX.utils.book_append_sheet(wb, wsDetalhe, 'Cadastros detalhados');

  const canalRows = Object.keys(canalCounts).map((k) => {
    const rowsForCanal = data.filter((r) => (r.como_conheceu || 'outra') === k);
    const aprov = rowsForCanal.filter((r) => r.status === 'aprovada').length;
    const recus = rowsForCanal.filter((r) => r.status === 'recusada').length;
    const decidido = aprov + recus;
    const taxa = decidido ? Math.round((aprov / decidido) * 100) : null;
    return {
      'Canal': COMO_CONHECEU_LABELS[k] ?? k,
      'Total de cadastros': rowsForCanal.length,
      'Aprovadas': aprov,
      'Recusadas': recus,
      'Pendentes': rowsForCanal.filter((r) => (r.status || 'pendente') === 'pendente').length,
      'Taxa de aprovação': taxa !== null ? `${taxa}%` : '—',
    };
  });

  if (canalRows.length) {
    const wsCanal = XLSX.utils.json_to_sheet(canalRows);
    wsCanal['!cols'] = Object.keys(canalRows[0]).map((key) => ({
      wch: Math.max(key.length + 2, 18),
    }));
    XLSX.utils.book_append_sheet(wb, wsCanal, 'Por canal');
  }

  const prefix = periodLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 40) || 'relatorio';
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', 'h');
  XLSX.writeFile(wb, `relatorio_cadastros_${prefix}_${date}_${time}.xlsx`);
}
