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
  LayoutGrid,
  List,
} from 'lucide-react';
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

type EstoqueGeralRow = {
  id: string;
  produto_id: string;
  quantidade: number;
  produto: { id: string; sku: string; nome: string; preco_venda: number };
};
type EstoqueUsuariosRow = {
  produto_id: string;
  user_id: string;
  quantidade: number;
  produto: { id: string; sku: string; nome: string; preco_venda: number };
};

export default function Mostruario() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [view, setView] = useState<'revendedora' | 'geral'>('revendedora');
  const [estoqueGeral, setEstoqueGeral] = useState<EstoqueGeralRow[]>([]);
  const [estoqueUsuarios, setEstoqueUsuarios] = useState<EstoqueUsuariosRow[]>([]);
  const [loadingGeral, setLoadingGeral] = useState(false);
  // Entrada no estoque geral
  const [geralSku, setGeralSku] = useState('');
  const [geralQty, setGeralQty] = useState(1);
  const [addingGeral, setAddingGeral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Inserção
  const [addSku, setAddSku] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function loadEstoqueGeral() {
    setLoadingGeral(true);
    const [{ data: geral }, { data: usuariosEst }, { data: perfis }] = await Promise.all([
      supabase
        .from('estoque_geral')
        .select('id, produto_id, quantidade, produto:produtos(id, sku, nome, preco_venda)')
        .order('quantidade', { ascending: false }),
      supabase
        .from('estoque')
        .select('produto_id, user_id, quantidade, produto:produtos(id, sku, nome, preco_venda)')
        .gt('quantidade', 0),
      supabase.from('profiles').select('user_id, display_name'),
    ]);
    setEstoqueGeral((geral ?? []) as any);
    setEstoqueUsuarios((usuariosEst ?? []) as any);
    // Store profiles for name lookup
    const nomeMap = new Map((perfis ?? []).map((p) => [p.user_id, p.display_name]));
    setNomeUsuarioMap(nomeMap);
    setLoadingGeral(false);
  }

  const [nomeUsuarioMap, setNomeUsuarioMap] = useState<Map<string, string | null>>(new Map());

  // Produtos que têm quantidade no estoque geral
  const produtosComEstoqueGeral = useMemo(() =>
    estoqueGeral.filter((r) => r.quantidade > 0)
      .sort((a, b) => a.produto.sku.localeCompare(b.produto.sku)),
    [estoqueGeral]);

  // Produtos sem nenhuma unidade no estoque geral
  const produtosSemEstoqueGeral = useMemo(() => {
    const comIds = new Set(estoqueGeral.filter(r => r.quantidade > 0).map((r) => r.produto_id));
    return produtos.filter((p) => !comIds.has(p.id));
  }, [estoqueGeral, produtos]);

  // Distribuição por usuários (para referência na view geral)
  const distribuicaoPorProduto = useMemo(() => {
    const map = new Map<string, { nome: string; quantidade: number }[]>();
    for (const row of estoqueUsuarios) {
      if (!map.has(row.produto_id)) map.set(row.produto_id, []);
      map.get(row.produto_id)!.push({
        nome: nomeUsuarioMap.get(row.user_id) ?? 'Sem nome',
        quantidade: row.quantidade,
      });
    }
    return map;
  }, [estoqueUsuarios, nomeUsuarioMap]);

  async function adicionarAoEstoqueGeral(e: React.FormEvent) {
    e.preventDefault();
    const produtoPreviewGeral = produtos.find((p) => p.sku.toUpperCase() === geralSku.trim().toUpperCase());
    if (!produtoPreviewGeral || geralQty < 1) {
      toast({ title: 'SKU não encontrado ou quantidade inválida', variant: 'destructive' });
      return;
    }
    setAddingGeral(true);
    const existing = estoqueGeral.find((r) => r.produto_id === produtoPreviewGeral.id);
    if (existing) {
      const { error } = await supabase
        .from('estoque_geral')
        .update({ quantidade: existing.quantidade + geralQty })
        .eq('id', existing.id);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      const { error } = await supabase
        .from('estoque_geral')
        .insert({ produto_id: produtoPreviewGeral.id, quantidade: geralQty });
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    setGeralSku('');
    setGeralQty(1);
    setAddingGeral(false);
    loadEstoqueGeral();
  }

  const produtoPreview = useMemo(() => {
    if (!addSku) return null;
    return produtos.find((p) => p.sku.toUpperCase() === addSku.trim().toUpperCase()) ?? null;
  }, [addSku, produtos]);

  useEffect(() => {
    (async () => {
      const [{ data: us }, { data: pr }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name').order('display_name'),
        supabase.from('produtos').select('*').eq('ativo', true).order('sku'),
      ]);
      setUsuarios((us ?? []) as Usuario[]);
      setProdutos((pr ?? []) as Produto[]);
      if (us && us.length && !selectedUserId) setSelectedUserId(us[0].user_id);
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

    // Os triggers do banco cuidam de: baixa de estoque, ciclo, % comissão e valor da comissão.
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;
    setAdding(true);
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((r) => r.split(','))
        .filter((r) => r[0]?.trim());

      let adicionados = 0;
      for (const row of rows) {
        const sku = row[0]?.trim()?.toUpperCase();
        const qtd = parseInt(row[1]?.trim() || '1');
        if (!sku || isNaN(qtd) || qtd < 1) continue;
        const prod = produtos.find((p) => p.sku.toUpperCase() === sku);
        if (!prod) continue;

        const existing = estoque.find((it) => it.produto_id === prod.id);
        if (existing) {
          await supabase
            .from('estoque')
            .update({ quantidade: existing.quantidade + qtd })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('estoque')
            .insert({ user_id: selectedUserId, produto_id: prod.id, quantidade: qtd });
        }
        adicionados++;
      }
      toast({ title: 'Importação concluída', description: `${adicionados} SKUs processados.` });
      await loadEstoque(selectedUserId);
    } catch (err: any) {
      toast({ title: 'Erro no CSV', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    const qtdRestante = item.quantidade;
    if (!confirm(`Remover ${item.produto.sku} do mostruário?${qtdRestante > 0 ? `\n\n${qtdRestante} unidade(s) serão devolvidas ao estoque geral.` : ''}`)) return;

    // Devolve ao estoque geral antes de deletar
    if (qtdRestante > 0) {
      const { data: geralItem, error: errBusca } = await supabase
        .from('estoque_geral')
        .select('id, quantidade')
        .eq('produto_id', item.produto_id)
        .maybeSingle();

      if (errBusca) {
        toast({ title: 'Erro ao buscar estoque geral', description: errBusca.message, variant: 'destructive' });
        return;
      }

      if (geralItem) {
        const { error: errDevolve } = await supabase
          .from('estoque_geral')
          .update({ quantidade: geralItem.quantidade + qtdRestante })
          .eq('id', geralItem.id);
        if (errDevolve) {
          toast({ title: 'Erro ao devolver ao estoque geral', description: errDevolve.message, variant: 'destructive' });
          return;
        }
      }
    }

    const { error } = await supabase.from('estoque').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setEstoque((es) => es.filter((e) => e.id !== item.id));
      if (qtdRestante > 0) {
        setEstoqueGeral((prev) =>
          prev.map((r) =>
            r.produto_id === item.produto_id ? { ...r, quantidade: r.quantidade + qtdRestante } : r,
          ),
        );
      }
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

    // Verifica estoque geral
    const { data: estoqueGeralItem } = await supabase
      .from('estoque_geral')
      .select('id, quantidade')
      .eq('produto_id', produtoPreview.id)
      .maybeSingle();

    const disponivelGeral = estoqueGeralItem?.quantidade ?? 0;

    if (disponivelGeral < addQty) {
      toast({
        title: 'Estoque insuficiente',
        description: `Disponível no estoque geral: ${disponivelGeral} unidade(s). Adicione mais ao estoque geral primeiro.`,
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);

    // Deduz do estoque geral
    const { error: errGeral } = await supabase
      .from('estoque_geral')
      .update({ quantidade: disponivelGeral - addQty })
      .eq('id', estoqueGeralItem!.id);

    if (errGeral) {
      toast({ title: 'Erro ao deduzir do estoque geral', description: errGeral.message, variant: 'destructive' });
      setAdding(false);
      return;
    }

    // Adiciona ao mostruário do usuário
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

  return (
    <div className="space-y-6">
      {/* Toggle de view */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('revendedora')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            view === 'revendedora' ? 'bg-rosa text-white border-rosa' : 'bg-white text-ink-soft border-border hover:border-rosa/40'
          }`}
        >
          <List size={14} /> Por Revendedora
        </button>
        <button
          onClick={() => { setView('geral'); if (estoqueGeral.length === 0) loadEstoqueGeral(); }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            view === 'geral' ? 'bg-rosa text-white border-rosa' : 'bg-white text-ink-soft border-border hover:border-rosa/40'
          }`}
        >
          <LayoutGrid size={14} /> Estoque Geral
        </button>
      </div>

      {/* View: Estoque Geral */}
      {view === 'geral' && (
        <div className="space-y-6">
          {loadingGeral ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-rosa" /></div>
          ) : (
            <>
              {/* Formulário de entrada no estoque geral */}
              <section className="bg-white rounded-2xl border border-bege p-5">
                <h3 className="font-serif text-xl text-ink mb-4">Entrada no Estoque Geral</h3>
                <form onSubmit={adicionarAoEstoqueGeral} className="flex flex-col sm:flex-row gap-2">
                  <SkuCombobox
                    produtos={produtos.map((p) => ({ id: p.id, sku: p.sku, nome: p.nome, preco_venda: p.preco_venda }))}
                    value={geralSku}
                    onChange={setGeralSku}
                    onSelect={(p) => setGeralSku(p.sku)}
                    placeholder="SKU ou nome do produto..."
                    className="flex-1"
                    inputClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                  />
                  <Input type="number" min={1} value={geralQty} onChange={(e) => setGeralQty(parseInt(e.target.value || '1'))} className="sm:w-24" />
                  <Button type="submit" disabled={addingGeral} className="bg-rosa hover:bg-rosa/90">
                    {addingGeral ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Adicionar
                  </Button>
                </form>
              </section>

              {/* Todos os produtos com situação de estoque */}
              <section className="bg-white rounded-2xl border border-bege p-5">
                <h3 className="font-serif text-xl text-ink mb-4">Produtos ({produtos.length})</h3>
                {produtos.length === 0 ? (
                  <p className="text-sm text-ink-soft">Nenhum produto cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {produtos.map((p) => {
                      const geralRow = estoqueGeral.find((r) => r.produto_id === p.id);
                      const qtdGeral = geralRow?.quantidade ?? 0;
                      const distribuicao = distribuicaoPorProduto.get(p.id) ?? [];
                      const qtdRevendedoras = distribuicao.reduce((s, d) => s + d.quantidade, 0);
                      const semEstoque = qtdGeral === 0 && qtdRevendedoras === 0;

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border ${semEstoque ? 'border-border/40 opacity-60' : 'border-border'}`}
                        >
                          {/* Linha principal: SKU + nome + totais */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-rosa font-bold w-20 shrink-0">{p.sku}</span>
                            <span className="text-sm font-medium text-ink flex-1 truncate">{p.nome}</span>
                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              <span className={`font-semibold ${qtdGeral > 0 ? 'text-emerald-700' : 'text-ink-soft'}`}>
                                Geral: {qtdGeral}
                              </span>
                              <span className="text-ink-soft">
                                Revendedoras: <strong className="text-ink">{qtdRevendedoras}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Linha por revendedora */}
                          {distribuicao.length > 0 && (
                            <div className="mt-2 pl-[92px] space-y-1">
                              {distribuicao.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[11px] text-ink-soft">{d.nome}</span>
                                  <span className="text-[11px] font-semibold text-ink">{d.quantidade} un.</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {semEstoque && (
                            <p className="mt-1 pl-[92px] text-[11px] text-ink-soft italic">Sem estoque</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* View: Por Revendedora */}
      {view === 'revendedora' && <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
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
              {u.display_name ?? u.user_id}
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
                    {estoque.length} SKUs · {estoque.reduce((s, e) => s + e.quantidade, 0)} peças
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
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
                    Importar CSV
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
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-rosa/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
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
                      className="h-8 bg-rosa hover:bg-rosa/90 text-white text-xs"
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
      </div>}

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
              <button
                onClick={() => setVendaItem(null)}
                className="text-ink-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {vendaSucesso ? (
              <div className="space-y-4">
                <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={32} />
                  <p className="text-xs uppercase tracking-wider text-emerald-700">Garantia gerada</p>
                  <p className="font-mono font-bold text-lg text-emerald-800">
                    {vendaSucesso.codigo_garantia}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Válida até {formatDateBR(vendaSucesso.validade_garantia)}
                  </p>
                </div>
                <p className="text-sm text-ink-soft text-center">
                  A joia foi baixada do estoque e a comissão foi calculada.
                </p>
                <Button
                  type="button"
                  onClick={enviarGarantiaWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <MessageCircle size={14} className="mr-2" />
                  Enviar Certificado no WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setVendaItem(null)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 rounded-xl bg-bege-light">
                  <p className="text-[10px] uppercase tracking-wider text-ink-soft">
                    {vendaItem.produto.sku}
                  </p>
                  <p className="font-medium text-ink">{vendaItem.produto.nome}</p>
                  <p className="text-xs text-ink-soft">
                    Estoque disponível: {vendaItem.quantidade}
                  </p>
                </div>
                <form onSubmit={registrarVenda} className="space-y-3">
                  <Input
                    placeholder="Nome da cliente"
                    value={vendaForm.cliente_nome}
                    onChange={(e) =>
                      setVendaForm({ ...vendaForm, cliente_nome: e.target.value })
                    }
                    required
                  />
                  <Input
                    placeholder="WhatsApp (15) 99999-9999"
                    value={vendaForm.cliente_whatsapp}
                    onChange={(e) =>
                      setVendaForm({
                        ...vendaForm,
                        cliente_whatsapp: formatWhatsApp(e.target.value),
                      })
                    }
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
                    onChange={(e) =>
                      setVendaForm({ ...vendaForm, data_venda: e.target.value })
                    }
                    max={getToday()}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={vendendo}
                    className="w-full bg-rosa hover:bg-rosa/90"
                  >
                    {vendendo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ShoppingBag size={14} className="mr-2" />
                    )}
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
