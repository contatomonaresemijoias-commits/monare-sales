import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package } from 'lucide-react';

type ItemEstoque = {
  produto_id: string;
  sku: string;
  nome: string;
  preco_venda: number;
  quantidade: number;
  categoria_nome: string | null;
};

type Props = {
  onSelectSku: (sku: string) => void;
  selectedSku?: string;
};

export default function EstoqueSidebar({ onSelectSku, selectedSku }: Props) {
  const { user } = useAuth();
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('estoque')
      .select(`
        quantidade,
        produto_id,
        produtos (
          sku,
          nome,
          preco_venda,
          categorias ( nome )
        )
      `)
      .eq('user_id', user.id)
      .gt('quantidade', 0)
      .order('produto_id')
      .then(({ data }) => {
        const mapped = (data ?? []).map((row: any) => ({
          produto_id: row.produto_id,
          sku: row.produtos?.sku ?? '',
          nome: row.produtos?.nome ?? '',
          preco_venda: row.produtos?.preco_venda ?? 0,
          quantidade: row.quantidade,
          categoria_nome: row.produtos?.categorias?.nome ?? null,
        }));
        // Ordena por categoria depois por SKU
        mapped.sort((a, b) => {
          const ca = a.categoria_nome ?? 'zzz';
          const cb = b.categoria_nome ?? 'zzz';
          return ca !== cb ? ca.localeCompare(cb) : a.sku.localeCompare(b.sku);
        });
        setItens(mapped);
        setLoading(false);
      });
  }, [user?.id]);

  if (!user?.id) return null;

  // Agrupa por categoria
  const grupos: Record<string, ItemEstoque[]> = {};
  for (const item of itens) {
    const key = item.categoria_nome ?? 'Outros';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(item);
  }

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="bg-white/90 backdrop-blur border border-[#E8E2DA] rounded-sm shadow-sm p-5 sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <Package size={14} className="text-[#C9A96E]" />
          <h2 className="text-[10px] tracking-[0.3em] text-[#9B8E7E] uppercase">
            Meu Mostruário
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F5F1EB] rounded animate-pulse" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <p className="text-[11px] text-[#B5A99A] tracking-wide text-center py-4">
            Nenhum produto disponível.
          </p>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {Object.entries(grupos).map(([cat, lista]) => (
              <div key={cat}>
                <p className="text-[9px] tracking-[0.3em] text-[#C9A96E] uppercase mb-1.5">
                  {cat}
                </p>
                <div className="space-y-1">
                  {lista.map((item) => {
                    const isSelected = selectedSku === item.sku;
                    return (
                      <button
                        key={item.produto_id}
                        onClick={() => onSelectSku(item.sku)}
                        className={`w-full text-left px-3 py-2.5 rounded-sm border transition-all ${
                          isSelected
                            ? 'border-[#C9A96E] bg-[#FAF6EF]'
                            : 'border-[#EDE8E1] hover:border-[#C9A96E] hover:bg-[#FAF9F7]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-[#C9A96E] font-semibold">
                            {item.sku}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              item.quantidade <= 2
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-[#F0F5F1] text-[#4A7A52]'
                            }`}
                          >
                            {item.quantidade} un
                          </span>
                        </div>
                        <p className="text-[11px] text-[#2C2825] tracking-wide mt-0.5 truncate">
                          {item.nome}
                        </p>
                        <p className="text-[10px] text-[#9B8E7E] mt-0.5">
                          R$ {item.preco_venda.toFixed(2).replace('.', ',')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[#EDE8E1]">
          <p className="text-[9px] tracking-[0.2em] text-[#C5BBAE] uppercase text-center">
            {itens.length} {itens.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
          </p>
        </div>
      </div>
    </aside>
  );
}
