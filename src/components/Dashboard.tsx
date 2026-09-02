import { useEffect, useState, useCallback } from 'react';
import { Loader2, TrendingUp, Wallet, ClipboardList, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDateBR, addDaysISO, statusComissao, MINIMO_VENDAS_SAQUE } from '@/lib/monare';

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
  comissao_valor: number | null;
  codigo_garantia: string;
  produtos: { sku: string } | null;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Cada linha do histórico é uma peça, então o link abre o certificado dela —
// não o painel da venda inteira.
function GarantiaLink({ codigo }: { codigo: string }) {
  return (
    <a
      href={`/garantia?codigo=${codigo}`}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E8DDD0] text-[#C9607E] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#FDF0F4] transition-colors"
      title="Ver certificado desta peça"
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

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: saldoData } = await supabase.rpc('saldo_ciclo_aberto', { _user_id: user.id });
    const cicloAtual = saldoData?.[0] ?? null;
    setSaldo(cicloAtual);

    // Mostra apenas vendas do ciclo atual — após acerto, histórico fica limpo
    if (cicloAtual?.ciclo_id) {
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('id, produto_nome, cliente_nome, data_venda, valor_venda, codigo_garantia, produtos(sku)')
        .eq('user_id', user.id)
        .eq('ciclo_id', cicloAtual.ciclo_id)
        .order('data_venda', { ascending: false })
        .limit(50);
      setVendas((vendasData ?? []) as Venda[]);
    } else {
      setVendas([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Atualiza em tempo real quando uma nova venda é registrada
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-vendas-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendas', filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-[#C9A96E]" size={20} />
      </div>
    );
  }

  const acertoFmt = saldo?.aberto_em
    ? formatDateBR(addDaysISO(saldo.aberto_em.includes('T') ? saldo.aberto_em.split('T')[0] : saldo.aberto_em, 30))
    : null;

  const pct = saldo && saldo.total_vendas > 0
    ? ((saldo.total_comissao / saldo.total_vendas) * 100).toFixed(0)
    : null;

  // A comissão aparece sempre, desde a primeira venda. O que o mínimo do ciclo
  // decide é só se ela já pode ser sacada — por isso vira status, e não um
  // valor escondido.
  const saque = statusComissao(saldo?.total_vendas);

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
            {pct !== null ? (
              <p className="text-[10px] text-[#9B8E7E] mt-0.5">{pct}% sobre vendido</p>
            ) : (
              <p className="text-[10px] text-[#9B8E7E] mt-0.5">30% já na 1ª venda</p>
            )}
          </div>
        </div>

        {/* Status do saque: sim ou não, com o quanto falta quando for não. */}
        {saque.liberada ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-800">
              <span className="font-semibold">Comissão liberada para receber.</span>{' '}
              Você já passou de {fmt(MINIMO_VENDAS_SAQUE)} vendidos neste ciclo.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-[#E8DDD0] bg-[#FAF6F0] px-3 py-2">
            <Sparkles size={13} className="text-[#C9A96E] shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-[#6B6259]">
                Grandes resultados começam com metas simples. A sua:{' '}
                <span className="font-semibold text-[#2C2825]">R$ {MINIMO_VENDAS_SAQUE}</span>. Você consegue.
              </p>
              <p className="text-[10px] text-[#9B8E7E] mt-0.5">
                Faltam {fmt(saque.faltam)} para liberar sua comissão.
              </p>
            </div>
          </div>
        )}

        {acertoFmt && (
          <p className="text-[11px] text-[#9B8E7E] text-center border-t border-[#E8DDD0] pt-3">
            Próximo acerto:{' '}
            <span className="font-medium text-[#2C2825]">
              {acertoFmt}
            </span>
          </p>
        )}
      </div>

      {/* Histórico de vendas do ciclo atual */}
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
                    {v.cliente_nome} · {formatDateBR(v.data_venda)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-sm text-[#2C2825]">{fmt(v.valor_venda)}</p>
                    {v.comissao_valor != null && v.comissao_valor > 0 && (
                      <p className="text-[10px] text-[#C9607E]">{fmt(v.comissao_valor)} comissão</p>
                    )}
                  </div>
                  <GarantiaLink codigo={v.codigo_garantia} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
