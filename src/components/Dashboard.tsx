import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Wallet, ClipboardList, FileText } from 'lucide-react';
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
  codigo_garantia: string;
  garantia_uuid: string | null;
  produtos: { sku: string } | null;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function GarantiaLink({ venda }: { venda: Venda }) {
  const href = venda.garantia_uuid
    ? `/garantia?venda=${venda.garantia_uuid}`
    : `/garantia?codigo=${venda.codigo_garantia}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E8DDD0] text-[#C9607E] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#FDF0F4] transition-colors"
      title="Ver garantia"
    >
      <FileText size={11} />
      Cert.
    </a>
  );
}

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
      
      const [{ data: saldoData }, { data: vendasData }] = await Promise.all([
        supabase.rpc('saldo_ciclo_aberto', { _user_id: user!.id }),
        supabase
          .from('vendas')
          .select('id, produto_nome, cliente_nome, data_venda, valor_venda, codigo_garantia, garantia_uuid, produtos(sku)')
          .eq('user_id', user!.id)
          .order('data_venda', { ascending: false })
          .limit(50),

      ]);

      if (saldoResult.error) console.error('[Dashboard] saldo:', saldoResult.error);
      if (vendasErr) console.error('[Dashboard] vendas:', vendasErr);
      const vendasLista = (vendasData ?? []) as Venda[];
      const saldoRpc = (saldoResult.data as any)?.[0] ?? null;

      // Se não tem parceira_id, calcula totais direto das vendas
      if (!parceiraId && !saldoRpc) {
        const totalVendas = vendasLista.reduce((acc, v) => acc + (v.valor_venda ?? 0), 0);
        setSaldo({
          ciclo_id: '',
          aberto_em: '',
          total_vendas: totalVendas,
          qtd_vendas: vendasLista.length,
          total_comissao: 0,
        });
      } else {
        setSaldo(saldoRpc);
      }

      setVendas(vendasLista);
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

  const consultoraName = profile?.display_name ?? '';

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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#2C2825] truncate">{v.produto_nome}</p>
                  <p className="text-[11px] text-[#9B8E7E] truncate">
                    {v.cliente_nome} · {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-semibold text-sm text-[#2C2825]">{fmt(v.valor_venda)}</p>
                  <GarantiaLink venda={v} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
