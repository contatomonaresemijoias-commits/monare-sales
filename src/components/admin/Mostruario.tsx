import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Plus, Minus, Trash2, Users, ShoppingBag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { generateWarrantyCode, formatWhatsApp, getToday, getWarrantyExpiryISO } from '@/lib/monare';

type Parceira = { id: string; nome: string; whatsapp: string | null; ativa: boolean };
type Produto = { id: string; sku: string; nome: string; ativo: boolean };
type EstoqueItem = {
  id: string;
  parceira_id: string;
  produto_id: string;
  quantidade: number;
  produto: Produto;
};

export default function Mostruario() {
  const [parceiras, setParceiras] = useState<Parceira[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addSku, setAddSku] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [vendaItem, setVendaItem] = useState<EstoqueItem | null>(null);
  const [vendaForm, setVendaForm] = useState({ cliente_nome: '', cliente_whatsapp: '', valor: '', data_venda: getToday() });
  const [vendendo, setVendendo] = useState(false);

  async function registrarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!vendaItem || !selected) return;
    const valor = parseFloat(vendaForm.valor.replace(',', '.'));
    const wa = vendaForm.cliente_whatsapp.replace(/\D/g, '');
    if (!vendaForm.cliente_nome.trim() || wa.length !== 11 || !valor || valor <= 0) {
      toast({ title: 'Preencha cliente, WhatsApp válido e valor.', variant: 'destructive' });
      return;
    }
    setVendendo(true);
    const { error } = await supabase.from('vendas').insert({
      parceira_id: selected,
      produto_id: vendaItem.produto_id,
      produto_nome: vendaItem.produto.nome,
      cliente_nome: vendaForm.cliente_nome.trim(),
      cliente_whatsapp: wa,
      data_venda: vendaForm.data_venda,
      codigo_garantia: generateWarrantyCode(),
      termo_aceito: true,
      validade_garantia: getWarrantyExpiryISO(vendaForm.data_venda),
      valor_venda: valor,
    });
    setVendendo(false);
    if (error) {
      toast({ title: 'Erro ao registrar venda', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Venda registrada', description: 'Estoque atualizado e comissão calculada.' });
    setVendaItem(null);
    setVendaForm({ cliente_nome: '', cliente_whatsapp: '', valor: '', data_venda: getToday() });
    if (selected) loadEstoque(selected);
  }

  useEffect(() => {
    (async () => {
      const [{ data: pa }, { data: pr }] = await Promise.all([
        supabase.from('parceiras').select('*').order('nome'),
        supabase.from('produtos').select('*').eq('ativo', true).order('sku'),
      ]);
      setParceiras((pa ?? []) as Parceira[]);
      setProdutos((pr ?? []) as Produto[]);
      if (pa && pa.length && !selected) setSelected(pa[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadEstoque(selected);
  }, [selected]);

  async function loadEstoque(parceiraId: string) {
    const { data } = await supabase
      .from('estoque_parceiras')
      .select('id, parceira_id, produto_id, quantidade, produto:produtos(id, sku, nome, ativo)')
      .eq('parceira_id', parceiraId)
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

  async function updateQty(item: EstoqueItem, novaQtd: number) {
    if (novaQtd < 0) return;
    setSavingId(item.id);
    const { error } = await supabase
      .from('estoque_parceiras')
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
    const { error } = await supabase.from('estoque_parceiras').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setEstoque((es) => es.filter((e) => e.id !== item.id));
    }
  }

  async function addToShowcase(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !addSku.trim() || addQty < 1) return;
    setAdding(true);
    const prod = produtos.find((p) => p.sku.toUpperCase() === addSku.trim().toUpperCase());
    if (!prod) {
      toast({ title: 'SKU não encontrado', description: 'Cadastre o produto primeiro.', variant: 'destructive' });
      setAdding(false);
      return;
    }
    const existing = estoque.find((e) => e.produto_id === prod.id);
    if (existing) {
      await updateQty(existing, existing.quantidade + addQty);
    } else {
      const { data, error } = await supabase
        .from('estoque_parceiras')
        .insert({ parceira_id: selected, produto_id: prod.id, quantidade: addQty })
        .select('id, parceira_id, produto_id, quantidade, produto:produtos(id, sku, nome, ativo)')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  const selectedParceira = parceiras.find((p) => p.id === selected);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
        {/* Lista de parceiras */}
        <aside className="bg-white rounded-2xl border border-bege p-3 max-h-[70vh] overflow-y-auto">
          <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-ink-soft font-semibold flex items-center gap-2">
            <Users size={12} /> Parceiras ({parceiras.length})
          </p>
          {parceiras.length === 0 && (
            <p className="px-3 py-4 text-xs text-ink-soft">Nenhuma parceira cadastrada.</p>
          )}
          {parceiras.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                selected === p.id
                  ? 'bg-rosa/10 text-rosa font-semibold'
                  : 'text-ink-soft hover:bg-bege-light'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </aside>

        {/* Mostruário da parceira */}
        <section className="bg-white rounded-2xl border border-bege p-5">
          {!selectedParceira ? (
            <p className="text-sm text-ink-soft">Selecione uma parceira para gerenciar o mostruário.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-serif text-2xl text-ink">{selectedParceira.nome}</h3>
                  <p className="text-xs text-ink-soft uppercase tracking-wider">
                    {estoque.length} SKUs · {estoque.reduce((s, e) => s + e.quantidade, 0)} peças
                  </p>
                </div>
              </div>

              {/* Adicionar item */}
              <form
                onSubmit={addToShowcase}
                className="flex flex-col sm:flex-row gap-2 mb-5 p-3 bg-bege-light rounded-xl border border-bege"
              >
                <Input
                  value={addSku}
                  onChange={(e) => setAddSku(e.target.value.toUpperCase())}
                  placeholder="SKU para adicionar"
                  className="flex-1 font-mono"
                />
                <Input
                  type="number"
                  min={1}
                  value={addQty}
                  onChange={(e) => setAddQty(parseInt(e.target.value || '1'))}
                  className="sm:w-24"
                />
                <Button type="submit" disabled={adding} className="bg-rosa hover:bg-rosa/90">
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Adicionar
                </Button>
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

              {/* Lista de itens */}
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-ink-soft text-center py-8">
                    {estoque.length === 0
                      ? 'Esta parceira ainda não tem itens no mostruário.'
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
                              x.id === item.id ? { ...x, quantidade: parseInt(e.target.value || '0') } : x,
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
                      onClick={() => setVendaItem(item)}
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

      {/* Modal Vender */}
      {vendaItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVendaItem(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-ink">Registrar Venda</h3>
              <button onClick={() => setVendaItem(null)} className="text-ink-soft hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-bege-light">
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">{vendaItem.produto.sku}</p>
              <p className="font-medium text-ink">{vendaItem.produto.nome}</p>
              <p className="text-xs text-ink-soft">Estoque atual: {vendaItem.quantidade}</p>
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
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Valor da venda (R$)"
                value={vendaForm.valor}
                onChange={(e) => setVendaForm({ ...vendaForm, valor: e.target.value })}
                required
              />
              <Input
                type="date"
                value={vendaForm.data_venda}
                onChange={(e) => setVendaForm({ ...vendaForm, data_venda: e.target.value })}
                max={getToday()}
                required
              />
              <Button type="submit" disabled={vendendo} className="w-full bg-rosa hover:bg-rosa/90">
                {vendendo ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                Confirmar Venda
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
