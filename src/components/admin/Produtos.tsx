import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Produto = { id: string; sku: string; nome: string; descricao: string | null; ativo: boolean };

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState('');
  const [nome, setNome] = useState('');
  const [adding, setAdding] = useState(false);

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
    setAdding(true);
    const { error } = await supabase
      .from('produtos')
      .insert({ sku: sku.trim().toUpperCase(), nome: nome.trim() });
    setAdding(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setSku('');
      setNome('');
      load();
    }
  }

  async function toggleAtivo(p: Produto) {
    const { error } = await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id);
    if (!error) load();
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
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do produto" className="flex-1" />
          <Button type="submit" disabled={adding} className="bg-rosa hover:bg-rosa/90">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Catálogo ({produtos.length})</h3>
        <div className="space-y-2">
          {produtos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
              <p className="font-mono text-xs text-rosa font-bold w-20">{p.sku}</p>
              <p className="text-sm text-ink flex-1 truncate">{p.nome}</p>
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
