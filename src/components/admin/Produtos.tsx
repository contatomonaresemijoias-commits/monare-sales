import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Produto = {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  preco_venda: number;
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de novo produto
  const [sku, setSku] = useState('');
  const [nome, setNome] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [adding, setAdding] = useState(false);

  // Edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', preco_venda: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const { data } = await supabase.from('produtos').select('*').order('sku');
    setProdutos((data ?? []) as Produto[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !nome.trim()) return;
    const preco = parseFloat(precoVenda.replace(',', '.')) || 0;
    if (preco < 0) {
      toast({ title: 'Preço inválido', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('produtos').insert({
      sku: sku.trim().toUpperCase(),
      nome: nome.trim(),
      preco_venda: preco,
    });
    setAdding(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setSku('');
      setNome('');
      setPrecoVenda('');
      load();
    }
  }

  function iniciarEdicao(p: Produto) {
    setEditId(p.id);
    setEditForm({ nome: p.nome, preco_venda: p.preco_venda?.toString() ?? '0' });
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditForm({ nome: '', preco_venda: '' });
  }

  async function salvarEdicao(p: Produto) {
    const preco = parseFloat(editForm.preco_venda.replace(',', '.'));
    if (!editForm.nome.trim() || isNaN(preco) || preco < 0) {
      toast({ title: 'Preencha nome e preço válidos', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('produtos')
      .update({ nome: editForm.nome.trim(), preco_venda: preco })
      .eq('id', p.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto atualizado' });
      cancelarEdicao();
      load();
    }
  }

  async function toggleAtivo(p: Produto) {
    const { error } = await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id);
    if (!error) load();
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir produto ${p.sku} - ${p.nome}? Isso removerá também o estoque vinculado.`))
      return;
    const { error } = await supabase.from('produtos').delete().eq('id', p.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído' });
      load();
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Novo Produto</h3>
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            placeholder="SKU"
            className="sm:w-32 font-mono"
          />
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do produto"
            className="flex-1"
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            placeholder="Preço (R$)"
            className="sm:w-32"
          />
          <Button type="submit" disabled={adding} className="bg-rosa hover:bg-rosa/90">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Catálogo ({produtos.length})</h3>
        <div className="space-y-2">
          {produtos.map((p) => {
            const isEditing = editId === p.id;
            return (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border"
              >
                <p className="font-mono text-xs text-rosa font-bold w-20">{p.sku}</p>

                {isEditing ? (
                  <>
                    <Input
                      value={editForm.nome}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.preco_venda}
                      onChange={(e) =>
                        setEditForm({ ...editForm, preco_venda: e.target.value })
                      }
                      className="sm:w-28"
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-rosa hover:bg-rosa/90"
                      disabled={savingEdit}
                      onClick={() => salvarEdicao(p)}
                    >
                      {savingEdit ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={cancelarEdicao}
                    >
                      <X size={14} />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink flex-1 truncate">{p.nome}</p>
                    <p className="text-sm text-ink-soft font-medium sm:w-24 sm:text-right">
                      R$ {(p.preco_venda ?? 0).toFixed(2)}
                    </p>
                    <button
                      onClick={() => toggleAtivo(p)}
                      className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-semibold transition-colors ${
                        p.ativo
                          ? 'bg-rosa/10 text-rosa hover:bg-rosa/20'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => iniciarEdicao(p)}
                      className="text-ink-soft hover:bg-bege-light p-2 rounded-md"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluir(p)}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-md"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
