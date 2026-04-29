import { useEffect, useState } from 'react';
import { Loader2, FileText, Wallet, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Parceira = { id: string; nome: string; comissao_percentual: number };
type Venda = {
  id: string;
  produto_nome: string;
  cliente_nome: string;
  data_venda: string;
  valor_venda: number | null;
  comissao_percentual: number | null;
  comissao_valor: number | null;
  ciclo_id: string | null;
  parceira_id: string | null;
  codigo_garantia: string;
  created_at: string;
};
type Saldo = {
  ciclo_id: string;
  aberto_em: string;
  total_vendas: number;
  total_comissao: number;
  qtd_vendas: number;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Vendas() {
  const [parceiras, setParceiras] = useState<Parceira[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [saldos, setSaldos] = useState<Record<string, Saldo>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('');
  const [fechando, setFechando] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: pa } = await supabase.from('parceiras').select('id, nome, comissao_percentual').order('nome');
    const { data: vs } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    setParceiras((pa ?? []) as Parceira[]);
    setVendas((vs ?? []) as Venda[]);

    // Saldos por parceira
    const map: Record<string, Saldo> = {};
    for (const p of pa ?? []) {
      const { data } = await supabase.rpc('saldo_ciclo_aberto', { _parceira_id: p.id });
      if (data && data[0]) map[p.id] = data[0] as Saldo;
    }
    setSaldos(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function fecharCiclo(p: Parceira) {
    const saldo = saldos[p.id];
    const msg = saldo
      ? `Acerto de contas para "${p.nome}"?\n\nVendas: ${saldo.qtd_vendas}\nTotal vendido: ${fmt(saldo.total_vendas)}\nComissão a pagar: ${fmt(saldo.total_comissao)}\n\nO ciclo será fechado e o saldo voltará a zero. As vendas continuam no histórico.`
      : `Fechar ciclo de "${p.nome}"?`;
    if (!confirm(msg)) return;

    setFechando(p.id);
    const { error } = await supabase.rpc('fechar_ciclo', { _parceira_id: p.id, _observacao: null });
    setFechando(null);
    if (error) {
      toast({ title: 'Erro ao fechar ciclo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ciclo fechado', description: 'Saldo zerado e novo ciclo aberto.' });
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  const vendasFiltradas = filtro
    ? vendas.filter((v) => v.parceira_id === filtro)
    : vendas;

  const nomeParceira = (id: string | null) =>
    parceiras.find((p) => p.id === id)?.nome ?? '—';

  return (
    <div className="space-y-6">
      {/* Saldos a pagar (ciclo aberto) */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-rosa" />
          Saldo a Pagar (Ciclo Atual)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parceiras.map((p) => {
            const s = saldos[p.id];
            const aberto = s?.aberto_em ? new Date(s.aberto_em).toLocaleDateString('pt-BR') : '—';
            return (
              <div key={p.id} className="p-4 rounded-xl border border-border hover:border-rosa/40 transition-colors">
                <p className="font-semibold text-ink truncate">{p.nome}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">
                  Ciclo desde {aberto} · {p.comissao_percentual}%
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-ink-soft">Vendido</p>
                    <p className="font-semibold text-ink">{fmt(s?.total_vendas)}</p>
                  </div>
                  <div>
                    <p className="text-ink-soft">A pagar</p>
                    <p className="font-bold text-rosa">{fmt(s?.total_comissao)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft mt-1">{s?.qtd_vendas ?? 0} venda(s)</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full mt-3 text-xs"
                  disabled={fechando === p.id || !s || s.qtd_vendas === 0}
                  onClick={() => fecharCiclo(p)}
                >
                  {fechando === p.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Acerto de Contas
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Histórico de vendas */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-serif text-xl text-ink flex items-center gap-2">
            <FileText size={16} className="text-rosa" />
            Histórico de Vendas ({vendasFiltradas.length})
          </h3>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-2 bg-white"
          >
            <option value="">Todas as revendedoras</option>
            {parceiras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-soft border-b border-border">
                <th className="py-2 pr-2">Data</th>
                <th className="py-2 pr-2">Revendedora</th>
                <th className="py-2 pr-2">Produto</th>
                <th className="py-2 pr-2">Cliente</th>
                <th className="py-2 pr-2 text-right">Valor</th>
                <th className="py-2 pr-2 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-soft">Nenhuma venda registrada.</td>
                </tr>
              )}
              {vendasFiltradas.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-bege-light/40">
                  <td className="py-2 pr-2 text-ink-soft">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 pr-2">{nomeParceira(v.parceira_id)}</td>
                  <td className="py-2 pr-2 truncate max-w-[200px]">{v.produto_nome}</td>
                  <td className="py-2 pr-2 truncate max-w-[150px]">{v.cliente_nome}</td>
                  <td className="py-2 pr-2 text-right">{fmt(v.valor_venda)}</td>
                  <td className="py-2 pr-2 text-right text-rosa font-semibold">
                    {fmt(v.comissao_valor)}
                    <span className="text-[10px] text-ink-soft ml-1">({v.comissao_percentual ?? 0}%)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
