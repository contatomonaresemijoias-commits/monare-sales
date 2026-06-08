import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Loader2,
  Search,
  Plus,
  Minus,
  Trash2,
  Users,
  ShoppingBag,
  X,
  FileSpreadsheet,
  MessageCircle,
  CheckCircle2,
  Truck,
  PackageOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SkuCombobox from '@/components/SkuCombobox';
import { toast } from '@/hooks/use-toast';
import {
  generateWarrantyCode,
  formatWhatsApp,
  getToday,
  getWarrantyExpiryISO,
  formatDateBR,
} from '@/lib/monare';

type Usuario = { user_id: string; display_name: string | null };
type Produto = { id: string; sku: string; nome: string; ativo: boolean; preco_venda: number };
type EstoqueItem = {
  id: string;
  user_id: string;
  produto_id: string;
  quantidade: number;
  quantidade_vendida: number;
  produto: Produto;
};
type VendaSucesso = {
  cliente_nome: string;
  cliente_whatsapp: string;
  produto_nome: string;
  codigo_garantia: string;
  validade_garantia: string;
};

// Linha parseada de uma planilha/CSV de importação
type ImportRow = { sku: string; qty: number; nome: string; preco: number };
// Item já casado com um produto existente (será somado ao estoque)
type PreviewExistente = { sku: string; nome: string; qty: number; produto_id: string };
// Item novo (SKU sem produto) que será criado automaticamente
type PreviewNovo = { sku: string; nome: string; preco: number; qty: number };
// Item descartado, com o motivo
type PreviewIgnorado = { sku: string; motivo: string };
type ImportPreview = {
  existentes: PreviewExistente[];
  novos: PreviewNovo[];
  ignorados: PreviewIgnorado[];
};

export default function Mostruario() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Inserção
  const [addSku, setAddSku] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Importação com pré-visualização
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  // Entregar Maleta
  const [confirmarEntrega, setConfirmarEntrega] = useState(false);
  const [entregando, setEntregando] = useState(false);

  // Recolher Maleta
  const [confirmarRecolher, setConfirmarRecolher] = useState(false);
  const [recolhendo, setRecolhendo] = useState(false);

  // Venda
  const [vendaItem, setVendaItem] = useState<EstoqueItem | null>(null);
  const [vendaForm, setVendaForm] = useState({
    cliente_nome: '',
    cliente_whatsapp: '',
    valor: '',
    data_venda: getToday(),
  });
  const [vendendo, setVendendo] = useState(false);
  const [vendaSucesso, setVendaSucesso] = useState<VendaSucesso | null>(null);

  const produtoPreview = useMemo(() => {
    if (!addSku) return null;
    return produtos.find((p) => p.sku.toUpperCase() === addSku.trim().toUpperCase()) ?? null;
  }, [addSku, produtos]);

  useEffect(() => {
    (async () => {
      const [{ data: us }, { data: pr }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, ativo').order('display_name'),
        supabase.from('produtos').select('*').eq('ativo', true).order('sku'),
      ]);
      const ativos = ((us ?? []) as any[]).filter((u) => u.ativo !== false);
      setUsuarios(ativos as Usuario[]);
      setProdutos((pr ?? []) as Produto[]);
      if (ativos.length && !selectedUserId) setSelectedUserId(ativos[0].user_id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    loadEstoque(selectedUserId);
    setVendaSucesso(null);
  }, [selectedUserId]);

  async function loadEstoque(userId: string) {
    const { data } = await supabase
      .from('estoque')
      .select(
        'id, user_id, produto_id, quantidade, quantidade_vendida, produto:produtos(id, sku, nome, ativo, preco_venda)',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setEstoque((data ?? []) as any);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return estoque;
    return estoque.filter(
      (e) => e.produto.sku.toLowerCase().includes(q) || e.produto.nome.toLowerCase().includes(q),
    );
  }, [estoque, search]);

  function abrirModalVenda(item: EstoqueItem) {
    setVendaItem(item);
    setVendaSucesso(null);
    setVendaForm({
      cliente_nome: '',
      cliente_whatsapp: '',
      valor: item.produto.preco_venda ? item.produto.preco_venda.toFixed(2) : '',
      data_venda: getToday(),
    });
  }

  async function registrarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!vendaItem || !selectedUserId) return;

    const valor = parseFloat(vendaForm.valor.replace(',', '.'));
    const wa = vendaForm.cliente_whatsapp.replace(/\D/g, '');

    if (!vendaForm.cliente_nome.trim() || wa.length !== 11 || !valor || valor <= 0) {
      toast({
        title: 'Atenção',
        description: 'Preencha cliente, WhatsApp válido (11 dígitos) e valor.',
        variant: 'destructive',
      });
      return;
    }

    setVendendo(true);
    const codigo = generateWarrantyCode();
    const validade = getWarrantyExpiryISO(vendaForm.data_venda);

    const { error } = await supabase.from('vendas').insert({
      user_id: selectedUserId,
      produto_id: vendaItem.produto_id,
      produto_nome: vendaItem.produto.nome,
      cliente_nome: vendaForm.cliente_nome.trim(),
      cliente_whatsapp: wa,
      data_venda: vendaForm.data_venda,
      codigo_garantia: codigo,
      termo_aceito: true,
      validade_garantia: validade,
      valor_venda: valor,
    });

    setVendendo(false);

    if (error) {
      toast({ title: 'Erro ao registrar venda', description: error.message, variant: 'destructive' });
      return;
    }

    setVendaSucesso({
      cliente_nome: vendaForm.cliente_nome.trim(),
      cliente_whatsapp: wa,
      produto_nome: vendaItem.produto.nome,
      codigo_garantia: codigo,
      validade_garantia: validade,
    });
    toast({ title: 'Venda registrada', description: 'Estoque atualizado e comissão calculada.' });
    if (selectedUserId) loadEstoque(selectedUserId);
  }

  // Normaliza texto para comparação de cabeçalhos: minúsculo, sem acento, trim.
  function normalizeHeader(s: string): string {
    return s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }

  // Converte número no formato PT-BR. Aceita number direto (SheetJS no .xls) ou
  // strings como "1,00" / "4.181,18". Retorna NaN se não for um número válido.
  function parseBrNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').trim();
    if (!s) return NaN;
    // Remove separador de milhar (.) e troca a vírgula decimal por ponto.
    const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    return normalized ? Number(normalized) : NaN;
  }

  // Parse das linhas de uma planilha/CSV usando SheetJS.
  // Detecta colunas pelo cabeçalho (Código/Produto/Quantidade/Valor unitário); se não
  // houver cabeçalho reconhecível, usa posicional col0=sku, col1=qty (compatibilidade).
  // Agrega SKUs duplicados (soma de qty) e ignora a linha de "Totais".
  function parseImportRows(data: unknown[][]): ImportRow[] {
    if (!data.length) return [];

    const headerCells = (data[0] ?? []).map((c) => normalizeHeader(String(c ?? '')));
    const findCol = (...keys: string[]) =>
      headerCells.findIndex((h) => keys.some((k) => h === k || h.includes(k)));

    const skuCol = findCol('codigo', 'sku');
    const nomeCol = findCol('produto', 'nome', 'descricao');
    const qtyCol = findCol('quantidade', 'qtd', 'qty');
    const precoCol = findCol('valor unitario', 'preco', 'valor unit');

    const hasHeader = skuCol !== -1 || qtyCol !== -1;
    const idx = {
      sku: skuCol !== -1 ? skuCol : 0,
      nome: nomeCol !== -1 ? nomeCol : -1,
      qty: qtyCol !== -1 ? qtyCol : 1,
      preco: precoCol,
    };

    const rows = hasHeader ? data.slice(1) : data;
    const map = new Map<string, ImportRow>();

    for (const row of rows) {
      const cell = (i: number) => (i >= 0 ? String(row[i] ?? '').trim() : '');
      const sku = cell(idx.sku).toUpperCase();
      // Pula linhas em branco e a linha de resumo "Totais (N Itens)" / "Total".
      if (!sku || /^tota(l|is)/i.test(sku)) continue;

      const qty = Math.trunc(parseBrNumber(idx.qty >= 0 ? row[idx.qty] : 0)) || 0;
      if (qty <= 0) continue;

      const nome = cell(idx.nome);
      const preco = idx.preco >= 0 ? parseBrNumber(row[idx.preco]) : NaN;

      const existing = map.get(sku);
      if (existing) {
        existing.qty += qty;
      } else {
        map.set(sku, { sku, qty, nome, preco: isNaN(preco) ? 0 : preco });
      }
    }

    return [...map.values()];
  }

  // Classifica as linhas parseadas contra o catálogo em memória.
  function buildPreview(rows: ImportRow[]): ImportPreview {
    const existentes: PreviewExistente[] = [];
    const novos: PreviewNovo[] = [];
    const ignorados: PreviewIgnorado[] = [];

    for (const { sku, qty, nome, preco } of rows) {
      const prod = produtos.find((p) => p.sku.toUpperCase() === sku);
      if (prod) {
        existentes.push({ sku: prod.sku, nome: prod.nome, qty, produto_id: prod.id });
        continue;
      }
      // SKU novo: precisa de nome (2-200) e preço > 0 para ser criado ativo.
      if (sku.length < 2 || sku.length > 30) {
        ignorados.push({ sku, motivo: 'SKU fora do limite de 2 a 30 caracteres' });
      } else if (nome.trim().length < 2) {
        ignorados.push({ sku, motivo: 'Sem nome de produto no arquivo' });
      } else if (!(preco > 0)) {
        ignorados.push({ sku, motivo: 'Sem preço válido no arquivo' });
      } else {
        novos.push({ sku, nome: nome.trim().slice(0, 200), preco, qty });
      }
    }

    return { existentes, novos, ignorados };
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedUserId) {
      toast({ title: 'Selecione uma revendedora antes de importar', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAdding(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      const rows = parseImportRows(raw);
      if (!rows.length) {
        toast({ title: 'Arquivo sem dados reconhecíveis', variant: 'destructive' });
        return;
      }

      // Em vez de gravar direto, calcula o que vai acontecer e abre a pré-visualização.
      setImportPreview(buildPreview(rows));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao importar arquivo', description: msg, variant: 'destructive' });
    } finally {
      setAdding(false);
      // Reseta o input para permitir reimportar o mesmo arquivo depois.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Aplica a importação após o usuário confirmar no modal: cria os produtos novos
  // e lança as quantidades no estoque da revendedora.
  async function confirmImport() {
    if (!importPreview || !selectedUserId) return;
    setImporting(true);

    try {
      const { existentes, novos } = importPreview;

      // 1) Cria os produtos novos em lote (ativos, com o preço do arquivo).
      let criados: Produto[] = [];
      if (novos.length) {
        const { data, error } = await supabase
          .from('produtos')
          .insert(
            novos.map((n) => ({
              sku: n.sku,
              nome: n.nome,
              preco_venda: n.preco,
              ativo: true,
            })),
          )
          .select('id, sku, nome, ativo, preco_venda');

        if (error) {
          toast({ title: 'Erro ao criar produtos', description: error.message, variant: 'destructive' });
          setImporting(false);
          return;
        }
        criados = (data ?? []) as Produto[];
        // Mantém o catálogo em memória consistente para a tela.
        setProdutos((ps) => [...ps, ...criados]);
      }

      // 2) Mapa sku -> produto_id juntando catálogo existente + recém-criados.
      const idPorSku = new Map<string, string>();
      for (const p of produtos) idPorSku.set(p.sku.toUpperCase(), p.id);
      for (const p of criados) idPorSku.set(p.sku.toUpperCase(), p.id);

      // 3) Lança no estoque (soma quando já existe, insere quando novo).
      const alvos = [
        ...existentes.map((it) => ({ produto_id: it.produto_id, qty: it.qty })),
        ...novos
          .map((it) => ({ produto_id: idPorSku.get(it.sku.toUpperCase()), qty: it.qty }))
          .filter((it): it is { produto_id: string; qty: number } => !!it.produto_id),
      ];

      let erros = 0;
      for (const { produto_id, qty } of alvos) {
        const existing = estoque.find((it) => it.produto_id === produto_id);
        const { error } = existing
          ? await supabase
              .from('estoque')
              .update({ quantidade: existing.quantidade + qty })
              .eq('id', existing.id)
          : await supabase
              .from('estoque')
              .insert({ user_id: selectedUserId, produto_id, quantidade: qty });
        if (error) erros++;
      }

      const partes = [];
      if (criados.length) partes.push(`${criados.length} produto(s) criado(s)`);
      partes.push(`${alvos.length - erros} item(ns) no estoque`);
      if (erros) partes.push(`${erros} com erro`);

      toast({
        title: 'Importação concluída',
        description: partes.join(' · ') + '.',
        variant: erros ? 'destructive' : 'default',
      });

      await loadEstoque(selectedUserId);
      setImportPreview(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao importar', description: msg, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }

  async function updateQty(item: EstoqueItem, novaQtd: number) {
    if (novaQtd < 0) return;
    setSavingId(item.id);
    const { error } = await supabase
      .from('estoque')
      .update({ quantidade: novaQtd })
      .eq('id', item.id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      setEstoque((es) => es.map((e) => (e.id === item.id ? { ...e, quantidade: novaQtd } : e)));
    }
  }

  async function removeItem(item: EstoqueItem) {
    if (!confirm(`Remover ${item.produto.sku} do mostruário?`)) return;
    const { error } = await supabase.from('estoque').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setEstoque((es) => es.filter((e) => e.id !== item.id));
    }
  }

  async function addToShowcase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !produtoPreview || addQty < 1) {
      if (!produtoPreview) {
        toast({ title: 'SKU não encontrado', description: 'Cadastre o produto primeiro.', variant: 'destructive' });
      }
      return;
    }

    setAdding(true);

    const existing = estoque.find((e) => e.produto_id === produtoPreview.id);
    if (existing) {
      await updateQty(existing, existing.quantidade + addQty);
    } else {
      const { data, error } = await supabase
        .from('estoque')
        .insert({ user_id: selectedUserId, produto_id: produtoPreview.id, quantidade: addQty })
        .select('id, user_id, produto_id, quantidade, quantidade_vendida, produto:produtos(id, sku, nome, ativo, preco_venda)')
        .single();
      if (error) {
        toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
      } else if (data) {
        setEstoque((es) => [data as any, ...es]);
      }
    }

    setAddSku('');
    setAddQty(1);
    setAdding(false);
  }

  async function entregarMaleta() {
    if (!selectedUserId) return;
    setEntregando(true);

    const hoje = new Date().toISOString();

    const { data: ciclo, error: errBusca } = await supabase
      .from('ciclos_mostruario')
      .select('id')
      .eq('user_id', selectedUserId)
      .is('fechado_em', null)
      .maybeSingle();

    if (errBusca) {
      toast({ title: 'Erro', description: errBusca.message, variant: 'destructive' });
      setEntregando(false);
      return;
    }

    let erro = null;
    if (ciclo) {
      const { error } = await supabase
        .from('ciclos_mostruario')
        .update({ aberto_em: hoje })
        .eq('id', ciclo.id);
      erro = error;
    } else {
      const { error } = await supabase
        .from('ciclos_mostruario')
        .insert({ user_id: selectedUserId, aberto_em: hoje });
      erro = error;
    }

    if (erro) {
      toast({ title: 'Erro ao registrar entrega', description: erro.message, variant: 'destructive' });
      setEntregando(false);
      return;
    }

    const dataAcerto = new Date();
    dataAcerto.setDate(dataAcerto.getDate() + 30);

    toast({
      title: 'Maleta entregue!',
      description: `Data do acerto: ${dataAcerto.toLocaleDateString('pt-BR')}`,
    });

    setConfirmarEntrega(false);
    setEntregando(false);
  }

  async function recolherMaleta() {
    if (!selectedUserId) return;
    setRecolhendo(true);

    const { error } = await supabase.rpc('recolher_maleta', { _user_id: selectedUserId } as any);

    if (error) {
      toast({ title: 'Erro ao recolher maleta', description: error.message, variant: 'destructive' });
      setRecolhendo(false);
      return;
    }

    toast({ title: 'Maleta recolhida', description: 'Estoque da revendedora zerado.' });
    setConfirmarRecolher(false);
    setRecolhendo(false);
    await loadEstoque(selectedUserId);
  }

  function enviarGarantiaWhatsApp() {
    if (!vendaSucesso) return;
    const msg =
      `Olá, ${vendaSucesso.cliente_nome}! Aqui é da Monarê. 💎\n\n` +
      `Sua compra da peça *${vendaSucesso.produto_nome}* foi registrada com sucesso!\n\n` +
      `📋 *Certificado de Garantia:* ${vendaSucesso.codigo_garantia}\n` +
      `📅 *Validade:* ${formatDateBR(vendaSucesso.validade_garantia)}\n\n` +
      `Agradecemos a preferência!`;
    const url = `https://wa.me/55${vendaSucesso.cliente_whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  const selectedUsuario = usuarios.find((u) => u.user_id === selectedUserId);

  const dataAcertoPreview = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('pt-BR');
  })();

  const totalEstoque = estoque.reduce((s, e) => s + e.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
        {/* Lista de usuários */}
        <aside className="bg-white rounded-2xl border border-bege p-3 max-h-[70vh] overflow-y-auto">
          <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-ink-soft font-semibold flex items-center gap-2">
            <Users size={12} /> Revendedoras ({usuarios.length})
          </p>
          {usuarios.length === 0 && (
            <p className="px-3 py-4 text-xs text-ink-soft">Nenhuma revendedora cadastrada.</p>
          )}
          {usuarios.map((u) => (
            <button
              key={u.user_id}
              onClick={() => setSelectedUserId(u.user_id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                selectedUserId === u.user_id
                  ? 'bg-rosa/10 text-rosa font-semibold'
                  : 'text-ink-soft hover:bg-bege-light'
              }`}
            >
              <span>{u.display_name ?? u.user_id}</span>
            </button>
          ))}
        </aside>

        {/* Mostruário */}
        <section className="bg-white rounded-2xl border border-bege p-5">
          {!selectedUsuario ? (
            <p className="text-sm text-ink-soft">Selecione uma revendedora para gerenciar o mostruário.</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
                <div>
                  <h3 className="font-serif text-2xl text-ink">{selectedUsuario.display_name ?? 'Usuário'}</h3>
                  <p className="text-xs text-ink-soft uppercase tracking-wider">
                    {estoque.length} SKUs · {totalEstoque} peças
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={adding}
                  >
                    {adding ? (
                      <Loader2 size={14} className="animate-spin mr-2" />
                    ) : (
                      <FileSpreadsheet size={14} className="mr-2" />
                    )}
                    Importar CSV/Excel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => setConfirmarRecolher(true)}
                    disabled={totalEstoque === 0}
                    title="Recolher maleta (zera o estoque da revendedora)"
                  >
                    <PackageOpen size={14} className="mr-2" />
                    Recolher Maleta
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setConfirmarEntrega(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Truck size={14} className="mr-2" />
                    Entregar Maleta
                  </Button>
                </div>
              </div>

              {/* Adicionar item */}
              <form
                onSubmit={addToShowcase}
                className="flex flex-col gap-2 mb-5 p-3 bg-bege-light rounded-xl border border-bege"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <SkuCombobox
                    produtos={produtos.map((p) => ({
                      id: p.id,
                      sku: p.sku,
                      nome: p.nome,
                      preco_venda: p.preco_venda,
                    }))}
                    value={addSku}
                    onChange={(val) => setAddSku(val)}
                    onSelect={(produto) => setAddSku(produto.sku)}
                    placeholder="Digite o SKU ou nome..."
                    className="flex-1"
                    inputClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(parseInt(e.target.value || '1'))}
                    className="sm:w-24"
                  />
                  <Button
                    type="submit"
                    disabled={adding || !produtoPreview}
                    className="bg-rosa hover:bg-rosa/90"
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Adicionar
                  </Button>
                </div>
                {addSku && (
                  <div
                    className={`text-xs px-3 py-2 rounded-md ${
                      produtoPreview
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                    }`}
                  >
                    {produtoPreview ? (
                      <>
                        ✓ {produtoPreview.nome}{' '}
                        <span className="opacity-70">
                          (R$ {produtoPreview.preco_venda?.toFixed(2) || '0.00'})
                        </span>
                      </>
                    ) : (
                      <>✕ SKU não cadastrado no sistema</>
                    )}
                  </div>
                )}
              </form>

              {/* Busca */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por SKU ou nome..."
                  className="pl-9"
                />
              </div>

              {/* Itens */}
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-ink-soft text-center py-8">
                    {estoque.length === 0
                      ? 'Esta revendedora ainda não tem itens no mostruário.'
                      : 'Nenhum item encontrado para esta busca.'}
                  </p>
                )}
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-xl border border-border hover:border-rosa/40 transition-colors"
                  >
                    <div className="flex-1 min-w-[40%]">
                      <p className="font-mono text-xs text-rosa font-bold">{item.produto.sku}</p>
                      <p className="text-sm text-ink truncate">{item.produto.nome}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={savingId === item.id || item.quantidade <= 0}
                        onClick={() => updateQty(item, item.quantidade - 1)}
                      >
                        <Minus size={12} />
                      </Button>
                      <input
                        type="number"
                        min={0}
                        value={item.quantidade}
                        onChange={(e) =>
                          setEstoque((es) =>
                            es.map((x) =>
                              x.id === item.id
                                ? { ...x, quantidade: parseInt(e.target.value || '0') }
                                : x,
                            ),
                          )
                        }
                        onBlur={(e) => updateQty(item, parseInt(e.target.value || '0'))}
                        className="w-14 h-8 text-center text-sm border border-border rounded-md font-semibold"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={savingId === item.id}
                        onClick={() => updateQty(item, item.quantidade + 1)}
                      >
                        <Plus size={12} />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 flex-1 sm:flex-none bg-rosa hover:bg-rosa/90 text-white text-xs"
                      disabled={item.quantidade <= 0}
                      onClick={() => abrirModalVenda(item)}
                    >
                      <ShoppingBag size={12} className="mr-1" /> Vender
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modal: Pré-visualização da Importação */}
      {importPreview && selectedUsuario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !importing && setImportPreview(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-bege">
              <div>
                <h3 className="font-serif text-xl text-ink">Pré-visualização da importação</h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  {selectedUsuario.display_name ?? 'Revendedora'}
                </p>
              </div>
              <button
                onClick={() => !importing && setImportPreview(null)}
                className="text-ink-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumo */}
            <div className="flex flex-wrap gap-2 px-6 py-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                {importPreview.novos.length} novo(s) a criar
              </span>
              <span className="px-3 py-1 rounded-full bg-bege-light text-ink-soft border border-bege font-medium">
                {importPreview.existentes.length} já cadastrado(s)
              </span>
              {importPreview.ignorados.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                  {importPreview.ignorados.length} ignorado(s)
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
              {/* Novos produtos */}
              {importPreview.novos.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-2 flex items-center gap-1.5">
                    <Plus size={12} /> Novos produtos (serão criados)
                  </p>
                  <div className="space-y-1.5">
                    {importPreview.novos.map((n) => (
                      <div
                        key={n.sku}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200"
                      >
                        <span className="font-mono text-xs text-emerald-800 font-bold w-24 shrink-0">{n.sku}</span>
                        <span className="text-sm text-ink flex-1 truncate">{n.nome}</span>
                        <span className="text-xs text-ink-soft shrink-0">R$ {n.preco.toFixed(2)}</span>
                        <span className="text-xs font-semibold text-ink shrink-0 w-12 text-right">×{n.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Já cadastrados */}
              {importPreview.existentes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-soft font-semibold mb-2">
                    Já cadastrados (somar ao estoque)
                  </p>
                  <div className="space-y-1.5">
                    {importPreview.existentes.map((it) => (
                      <div
                        key={it.sku}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border"
                      >
                        <span className="font-mono text-xs text-rosa font-bold w-24 shrink-0">{it.sku}</span>
                        <span className="text-sm text-ink flex-1 truncate">{it.nome}</span>
                        <span className="text-xs font-semibold text-ink shrink-0 w-12 text-right">×{it.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ignorados */}
              {importPreview.ignorados.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-destructive font-semibold mb-2">
                    Ignorados
                  </p>
                  <div className="space-y-1.5">
                    {importPreview.ignorados.map((it) => (
                      <div
                        key={it.sku}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20"
                      >
                        <span className="font-mono text-xs text-destructive font-bold w-24 shrink-0">{it.sku}</span>
                        <span className="text-xs text-ink-soft flex-1">{it.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-6 pt-4 border-t border-bege">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setImportPreview(null)}
                disabled={importing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-rosa hover:bg-rosa/90 text-white"
                onClick={confirmImport}
                disabled={importing || (importPreview.novos.length === 0 && importPreview.existentes.length === 0)}
              >
                {importing ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <FileSpreadsheet size={14} className="mr-2" />
                )}
                Confirmar importação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Entrega da Maleta */}
      {confirmarEntrega && selectedUsuario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmarEntrega(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">Confirmar Entrega</h3>
              <button onClick={() => setConfirmarEntrega(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 p-4 rounded-xl bg-bege-light space-y-2">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-ink">
                  Entregar maleta para <strong>{selectedUsuario.display_name ?? 'Revendedora'}</strong>?
                </p>
              </div>
              <div className="mt-3 space-y-1 text-sm text-ink-soft">
                <p>
                  <span className="font-medium text-ink">Data de entrega:</span>{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <span className="font-medium text-ink">Data do acerto:</span>{' '}
                  <span className="text-emerald-700 font-semibold">{dataAcertoPreview}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmarEntrega(false)} disabled={entregando}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={entregarMaleta} disabled={entregando}>
                {entregando ? <Loader2 size={14} className="animate-spin mr-2" /> : <CheckCircle2 size={14} className="mr-2" />}
                Confirmar Entrega
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Recolhimento da Maleta */}
      {confirmarRecolher && selectedUsuario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmarRecolher(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">Recolher Maleta</h3>
              <button onClick={() => setConfirmarRecolher(false)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2">
                <PackageOpen size={16} className="text-amber-600 shrink-0" />
                <p className="text-sm font-medium text-ink">
                  Recolher maleta de <strong>{selectedUsuario.display_name ?? 'Revendedora'}</strong>?
                </p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Isso irá zerar o estoque desta revendedora ({totalEstoque} peças). O ciclo financeiro permanece aberto.
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmarRecolher(false)} disabled={recolhendo}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={recolherMaleta} disabled={recolhendo}>
                {recolhendo ? <Loader2 size={14} className="animate-spin mr-2" /> : <PackageOpen size={14} className="mr-2" />}
                Confirmar Recolhimento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vender */}
      {vendaItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setVendaItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">
                {vendaSucesso ? 'Venda Concluída!' : 'Registrar Venda'}
              </h3>
              <button onClick={() => setVendaItem(null)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {vendaSucesso ? (
              <div className="space-y-4">
                <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={32} />
                  <p className="text-xs uppercase tracking-wider text-emerald-700">Garantia gerada</p>
                  <p className="font-mono font-bold text-lg text-emerald-800">{vendaSucesso.codigo_garantia}</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Válida até {formatDateBR(vendaSucesso.validade_garantia)}
                  </p>
                </div>
                <p className="text-sm text-ink-soft text-center">
                  A joia foi baixada do estoque e a comissão foi calculada.
                </p>
                <Button type="button" onClick={enviarGarantiaWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <MessageCircle size={14} className="mr-2" />
                  Enviar Certificado no WhatsApp
                </Button>
                <Button type="button" variant="ghost" onClick={() => setVendaItem(null)} className="w-full">
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 rounded-xl bg-bege-light">
                  <p className="text-[10px] uppercase tracking-wider text-ink-soft">{vendaItem.produto.sku}</p>
                  <p className="font-medium text-ink">{vendaItem.produto.nome}</p>
                  <p className="text-xs text-ink-soft">Estoque disponível: {vendaItem.quantidade}</p>
                </div>
                <form onSubmit={registrarVenda} className="space-y-3">
                  <Input
                    placeholder="Nome da cliente"
                    value={vendaForm.cliente_nome}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_nome: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="WhatsApp (15) 99999-9999"
                    value={vendaForm.cliente_whatsapp}
                    onChange={(e) => setVendaForm({ ...vendaForm, cliente_whatsapp: formatWhatsApp(e.target.value) })}
                    required
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-soft">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Valor da venda"
                      value={vendaForm.valor}
                      onChange={(e) => setVendaForm({ ...vendaForm, valor: e.target.value })}
                      required
                    />
                  </div>
                  <Input
                    type="date"
                    value={vendaForm.data_venda}
                    onChange={(e) => setVendaForm({ ...vendaForm, data_venda: e.target.value })}
                    max={getToday()}
                    required
                  />
                  <Button type="submit" disabled={vendendo} className="w-full bg-rosa hover:bg-rosa/90">
                    {vendendo ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} className="mr-2" />}
                    Confirmar Venda
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
