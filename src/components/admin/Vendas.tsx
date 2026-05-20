import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, FileText, Wallet, CheckCheck, Search, X, Share2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

async function compartilharPDFAdmin(url: string, sku: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], `certificado-${sku}.pdf`, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: `Certificado Monarê` });
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `certificado-${sku}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

type Usuario = { user_id: string; display_name: string | null; role: string | null };
type Venda = {
  id: string;
  produto_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string | null;
  data_venda: string;
  valor_venda: number | null;
  comissao_percentual: number | null;
  comissao_valor: number | null;
  ciclo_id: string | null;
  user_id: string | null;
  codigo_garantia: string;
  pdf_garantia_url: string | null;
  created_at: string;
};
type Saldo = {
  ciclo_id: string;
  aberto_em: string;
  total_vendas: number;
  total_comissao: number;
  qtd_vendas: number;
};

const DIAS_CICLO = 30;

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function acertoDe(s: Saldo | undefined): Date | null {
  if (!s?.aberto_em) return null;
  const d = new Date(s.aberto_em);
  d.setDate(d.getDate() + DIAS_CICLO);
  return d;
}

function urgencia(s: Saldo | undefined): 'vencido' | 'proximo' | 'ok' | 'sem-saldo' {
  if (!s || s.qtd_vendas === 0) return 'sem-saldo';
  const acerto = acertoDe(s);
  if (!acerto) return 'ok';
  const diff = Math.floor((acerto.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'vencido';
  if (diff <= 7) return 'proximo';
  return 'ok';
}

function sortPorAcerto(lista: Usuario[], saldos: Record<string, Saldo>): Usuario[] {
  return [...lista].sort((a, b) => {
    const da = acertoDe(saldos[a.user_id])?.getTime() ?? Infinity;
    const db = acertoDe(saldos[b.user_id])?.getTime() ?? Infinity;
    return da - db;
  });
}

function PdfShareButton({ url, sku }: { url: string; sku: string }) {
  const [loading, setLoading] = useState(false);
  const supportsShare = typeof navigator !== 'undefined' && !!navigator.share;
  const Icon = supportsShare ? Share2 : Download;

  const handleClick = async () => {
    setLoading(true);
    try {
      await compartilharPDFAdmin(url, sku);
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast({ title: 'Erro ao compartilhar PDF', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={supportsShare ? 'Compartilhar PDF' : 'Baixar PDF'}
      className="flex items-center justify-center gap-1 mx-auto p-1.5 rounded-md text-[#C9A96E] hover:bg-[#C9A96E]/10 disabled:opacity-40 transition-colors"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
    </button>
  );
}

function SaldoCard({
  u,
  s,
  fechando,
  fecharCiclo,
}: {
  u: Usuario;
  s: Saldo | undefined;
  fechando: string | null;
  fecharCiclo: (u: Usuario) => void;
}) {
  const aberto = s?.aberto_em ? new Date(s.aberto_em).toLocaleDateString('pt-BR') : '—';
  const acerto = acertoDe(s);
  const acertoFmt = acerto ? acerto.toLocaleDateString('pt-BR') : '—';
  const urg = urgencia(s);

  const diffDias = acerto
    ? Math.floor((acerto.getTime() - Date.now()) / 86_400_000)
    : null;

  const bordaClass =
    urg === 'vencido' ? 'border-red-300 bg-red-50/40' :
    urg === 'proximo' ? 'border-amber-300 bg-amber-50/40' :
    'border-border';

  const badgeClass =
    urg === 'vencido' ? 'bg-red-100 text-red-700' :
    urg === 'proximo' ? 'bg-amber-100 text-amber-700' :
    'bg-bege-light text-ink-soft';

  const badgeLabel =
    urg === 'vencido' ? `Vencido há ${Math.abs(diffDias!)} dia(s)` :
    urg === 'proximo' ? `Acerto em ${diffDias} dia(s)` :
    `Acerto em ${acertoFmt}`;

  return (
    <div className={`p-4 rounded-xl border transition-colors ${bordaClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-ink truncate">{u.display_name ?? u.user_id}</p>
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-ink-soft mt-0.5">
        Ciclo desde {aberto} · {s?.qtd_vendas ?? 0} venda(s)
      </p>
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-ink-soft">Total vendido</span>
          <span className="font-semibold text-ink">{fmt(s?.total_vendas)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-border/50 pt-1.5">
          <span className="text-ink-soft font-medium">Comissão a pagar</span>
          <span className="font-bold text-rosa text-sm">{fmt(s?.total_comissao)}</span>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full mt-3 text-xs"
        disabled={fechando === u.user_id || !s || s.qtd_vendas === 0}
        onClick={() => fecharCiclo(u)}
      >
        {fechando === u.user_id ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
        Acerto de Contas
      </Button>
    </div>
  );
}

export default function Vendas() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [saldos, setSaldos] = useState<Record<string, Saldo>>({});
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroInput, setFiltroInput] = useState('');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [fechando, setFechando] = useState<string | null>(null);
  const filtroRef = useRef<HTMLDivElement>(null);

  const usuariosFiltrados = useMemo(() => {
    const q = filtroInput.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => (u.display_name ?? '').toLowerCase().includes(q));
  }, [filtroInput, usuarios]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!filtroRef.current?.contains(e.target as Node)) setFiltroAberto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    const { data: us } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .order('display_name');
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');
    const { data: vs } = await supabase
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    const rolesMap: Record<string, string> = {};
    for (const r of rolesData ?? []) rolesMap[r.user_id] = r.role;

    const usuariosComRole: Usuario[] = (us ?? []).map((u) => ({
      ...u,
      role: rolesMap[u.user_id] ?? null,
    }));

    setUsuarios(usuariosComRole);
    setVendas((vs ?? []) as Venda[]);

    const map: Record<string, Saldo> = {};
    for (const u of us ?? []) {
      const { data } = await supabase.rpc('saldo_ciclo_aberto', { _user_id: u.user_id });
      if (data && data[0]) map[u.user_id] = data[0] as Saldo;
    }
    setSaldos(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function fecharCiclo(u: Usuario) {
    const saldo = saldos[u.user_id];
    const nome = u.display_name ?? u.user_id;
    const msg = saldo
      ? `Acerto de contas para "${nome}"?\n\nVendas: ${saldo.qtd_vendas}\nTotal vendido: ${fmt(saldo.total_vendas)}\nComissão a pagar: ${fmt(saldo.total_comissao)}\n\nO ciclo será fechado e o saldo voltará a zero.`
      : `Fechar ciclo de "${nome}"?`;
    if (!confirm(msg)) return;

    setFechando(u.user_id);
    const { error } = await supabase.rpc('fechar_ciclo', { _user_id: u.user_id, _observacao: null });
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

  const vendasFiltradas = filtro ? vendas.filter((v) => v.user_id === filtro) : vendas;
  const nomeUsuario = (id: string | null) =>
    usuarios.find((u) => u.user_id === id)?.display_name ?? '—';

  return (
    <div className="space-y-6">
      {/* Saldos */}
      <section className="bg-white rounded-2xl border border-bege p-5 space-y-6">
        <h3 className="font-serif text-xl text-ink flex items-center gap-2">
          <Wallet size={16} className="text-rosa" />
          Saldo a Pagar (Ciclo Atual)
        </h3>

        {/* Lojas B2B */}
        {usuarios.some((u) => u.role === 'b2b') && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold mb-2">
              Lojas B2B
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortPorAcerto(usuarios.filter((u) => u.role === 'b2b'), saldos).map((u) => (
                <SaldoCard key={u.user_id} u={u} s={saldos[u.user_id]} fechando={fechando} fecharCiclo={fecharCiclo} />
              ))}
            </div>
          </div>
        )}

        {/* Revendedoras */}
        {usuarios.some((u) => u.role !== 'b2b') && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-soft font-semibold mb-2">
              Revendedoras
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortPorAcerto(usuarios.filter((u) => u.role !== 'b2b'), saldos).map((u) => (
                <SaldoCard key={u.user_id} u={u} s={saldos[u.user_id]} fechando={fechando} fecharCiclo={fecharCiclo} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Histórico */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-serif text-xl text-ink flex items-center gap-2">
            <FileText size={16} className="text-rosa" />
            Histórico de Vendas ({vendasFiltradas.length})
          </h3>

          {/* Combobox de revendedora */}
          <div ref={filtroRef} className="relative sm:w-64">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
              <input
                type="text"
                value={filtroInput}
                onChange={(e) => {
                  setFiltroInput(e.target.value);
                  setFiltroAberto(true);
                  if (!e.target.value) setFiltro('');
                }}
                onFocus={() => setFiltroAberto(true)}
                placeholder="Filtrar revendedora..."
                className="w-full pl-9 pr-8 h-10 text-sm border border-border rounded-md bg-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {filtroInput && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setFiltroInput(''); setFiltro(''); setFiltroAberto(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {filtroAberto && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setFiltro(''); setFiltroInput(''); setFiltroAberto(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-ink-soft hover:bg-bege-light"
                  >
                    Todas as revendedoras
                  </button>
                </li>
                {usuariosFiltrados.map((u) => (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setFiltro(u.user_id); setFiltroInput(u.display_name ?? u.user_id); setFiltroAberto(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-bege-light transition-colors ${
                        filtro === u.user_id ? 'bg-rosa/10 text-rosa font-medium' : 'text-ink'
                      }`}
                    >
                      {u.display_name ?? u.user_id}
                    </button>
                  </li>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <li className="px-3 py-2 text-sm text-ink-soft">Nenhuma revendedora encontrada.</li>
                )}
              </ul>
            )}
          </div>
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
                <th className="py-2 text-center">Certificado</th>
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
                  <td className="py-2 pr-2">{nomeUsuario(v.user_id)}</td>
                  <td className="py-2 pr-2 truncate max-w-[200px]">{v.produto_nome}</td>
                  <td className="py-2 pr-2 truncate max-w-[150px]">{v.cliente_nome}</td>
                  <td className="py-2 pr-2 text-right">{fmt(v.valor_venda)}</td>
                  <td className="py-2 text-center">
                    {v.pdf_garantia_url ? (
                      <PdfShareButton url={v.pdf_garantia_url} sku={v.produto_nome} />
                    ) : (
                      <span className="text-[10px] text-ink-soft">—</span>
                    )}
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
