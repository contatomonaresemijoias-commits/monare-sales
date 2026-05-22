import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Saldo = {
  ciclo_id: string;
  aberto_em: string;
  total_vendas: number;
  total_comissao: number;
  qtd_vendas: number;
};

type Venda = {
  id: string;
  produto_nome: string;
  cliente_nome: string;
  data_venda: string;
  valor_venda: number | null;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    async function load() {
      setLoading(true);
      const parceiraId = profile?.parceira_id;

      const vendasQuery = supabase
        .from('vendas')
        .select('id, produto_nome, cliente_nome, data_venda, valor_venda')
        .order('data_venda', { ascending: false })
        .limit(50);

      const [saldoResult, { data: vendasData, error: vendasErr }] = await Promise.all([
        parceiraId
          ? supabase.rpc('saldo_ciclo_aberto', { _parceira_id: parceiraId })
          : Promise.resolve({ data: null, error: null }),
        parceiraId
          ? vendasQuery.eq('parceira_id', parceiraId)
          : vendasQuery.eq('user_id', user!.id),
      ]);

      if (saldoResult.error) console.error('[Dashboard] saldo:', saldoResult.error);
      if (vendasErr) console.error('[Dashboard] vendas:', vendasErr);
      setSaldo((saldoResult.data as any)?.[0] ?? null);
      setVendas((vendasData ?? []) as Venda[]);
      setLoading(false);
    }
    load();
  }, [user, profile?.parceira_id]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-[#C9A96E]" size={20} />
      </div>
    );
  }

  const acertoDate = saldo?.aberto_em
    ? new Date(new Date(saldo.aberto_em).getTime() + 30 * 86_400_000)
    : null;

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Resumo do ciclo */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#E8DDD0] p-5 space-y-4">
        <h2 className="text-[11px] tracking-[0.3em] text-[#9B8E7E] uppercase font-medium flex items-center gap-2">
          <Wallet size={13} className="text-[#C9A96E]" />
          Ciclo Atual
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#FAF6F0] rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#9B8E7E] mb-1 flex items-center gap-1">
              <TrendingUp size={10} />
              Total vendido
            </p>
            <p className="font-semibold text-[#2C2825] text-base">{fmt(saldo?.total_vendas)}</p>
            <p className="text-[10px] text-[#9B8E7E] mt-0.5">{saldo?.qtd_vendas ?? 0} venda(s)</p>
          </div>

          <div className="bg-[#FDF0F4] rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#9B8E7E] mb-1 flex items-center gap-1">
              <Wallet size={10} />
              Comissão a receber
            </p>
            <p className="font-bold text-[#C9607E] text-base">{fmt(saldo?.total_comissao)}</p>
            {saldo?.total_vendas && saldo.total_vendas > 0 ? (
              <p className="text-[10px] text-[#9B8E7E] mt-0.5">
                {((saldo.total_comissao / saldo.total_vendas) * 100).toFixed(0)}% sobre vendido
              </p>
            ) : (
              <p className="text-[10px] text-[#9B8E7E] mt-0.5">Mín. R$ 400 para comissão</p>
            )}
          </div>
        </div>

        {acertoDate && (
          <p className="text-[11px] text-[#9B8E7E] text-center border-t border-[#E8DDD0] pt-3">
            Próximo acerto:{' '}
            <span className="font-medium text-[#2C2825]">
              {acertoDate.toLocaleDateString('pt-BR')}
            </span>
          </p>
        )}
      </div>

      {/* Histórico de vendas */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#E8DDD0] p-5">
        <h2 className="text-[11px] tracking-[0.3em] text-[#9B8E7E] uppercase font-medium flex items-center gap-2 mb-4">
          <ClipboardList size={13} className="text-[#C9A96E]" />
          Histórico de Vendas ({vendas.length})
        </h2>

        {vendas.length === 0 ? (
          <p className="text-sm text-[#9B8E7E] text-center py-4">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {vendas.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-[#E8DDD0]/60 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2C2825] truncate">{v.produto_nome}</p>
                  <p className="text-[11px] text-[#9B8E7E] truncate">
                    {v.cliente_nome} · {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-sm text-[#2C2825]">{fmt(v.valor_venda)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
