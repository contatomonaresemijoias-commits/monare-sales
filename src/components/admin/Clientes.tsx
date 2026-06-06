import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, Search, X, ExternalLink, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatWhatsApp, formatDateBR } from '@/lib/monare';

type Usuario = { user_id: string; display_name: string | null };

type Cliente = {
  id: string;
  nome: string;
  whatsapp: string;
  user_id: string | null;
  created_at: string;
};

type VendaResumo = {
  id: string;
  cliente_whatsapp: string;
  data_venda: string;
  produto_nome: string;
};

type ClienteExibido = Cliente & {
  usuario_nome: string | null;
  ultima_venda: VendaResumo | null;
};

function stripDigits(v: string) {
  return v.replace(/\D/g, '');
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vendas, setVendas] = useState<VendaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estado do painel de troca de revendedora
  const [editandoCliente, setEditandoCliente] = useState<string | null>(null);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [salvando, setSalvando] = useState(false);

  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!editRef.current?.contains(e.target as Node)) setEditandoCliente(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: u }, { data: v }] = await Promise.all([
      supabase.from('clientes').select('id, nome, whatsapp, user_id, created_at').order('nome'),
      supabase.from('profiles').select('user_id, display_name').order('display_name'),
      supabase
        .from('vendas')
        .select('id, cliente_whatsapp, data_venda, produto_nome')
        .order('data_venda', { ascending: false }),
    ]);
    setClientes((c ?? []) as Cliente[]);
    setUsuarios((u ?? []) as Usuario[]);
    setVendas((v ?? []) as VendaResumo[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const clientesExibidos = useMemo<ClienteExibido[]>(() => {
    const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.user_id, u.display_name]));

    // Índice de última venda por whatsapp (dígitos)
    const ultimaVendaMap: Record<string, VendaResumo> = {};
    for (const v of vendas) {
      const key = stripDigits(v.cliente_whatsapp);
      if (key && !ultimaVendaMap[key]) {
        ultimaVendaMap[key] = v;
      }
    }

    const list = clientes.map((c) => ({
      ...c,
      usuario_nome: c.user_id ? (usuarioMap[c.user_id] ?? null) : null,
      ultima_venda: ultimaVendaMap[c.whatsapp] ?? null,
    }));

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.whatsapp.includes(q.replace(/\D/g, '')) ||
        (c.usuario_nome ?? '').toLowerCase().includes(q),
    );
  }, [clientes, usuarios, vendas, search]);

  async function trocarRevendedora(clienteId: string) {
    if (!novoUsuario) return;
    setSalvando(true);
    const { error } = await supabase
      .from('clientes')
      .update({ user_id: novoUsuario })
      .eq('id', clienteId);
    setSalvando(false);
    if (error) {
      toast({ title: 'Erro ao atualizar revendedora', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Revendedora atualizada' });
      setEditandoCliente(null);
      setNovoUsuario('');
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-rosa" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, WhatsApp ou revendedora…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-bege rounded bg-white/80 focus:outline-none focus:border-rosa"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-rosa"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <span className="text-xs text-ink-soft">{clientesExibidos.length} cliente(s)</span>
      </div>

      {/* Tabela */}
      {clientesExibidos.length === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">
          {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
        </div>
      ) : (
        <div className="bg-white/80 border border-bege rounded overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-bege text-[10px] tracking-[0.2em] uppercase text-ink-soft">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">WhatsApp</th>
                <th className="text-left px-4 py-3">Revendedora</th>
                <th className="text-left px-4 py-3">Última compra</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesExibidos.map((c) => (
                <tr key={c.id} className="border-b border-bege/50 last:border-0 hover:bg-bege/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{c.nome}</td>
                  <td className="px-4 py-3 text-ink-soft font-mono text-xs">
                    {formatWhatsApp(c.whatsapp)}
                  </td>

                  {/* Revendedora — com opção de troca */}
                  <td className="px-4 py-3">
                    {editandoCliente === c.id ? (
                      <div ref={editRef} className="flex items-center gap-2">
                        <select
                          value={novoUsuario}
                          onChange={(e) => setNovoUsuario(e.target.value)}
                          className="text-xs border border-bege rounded px-2 py-1 bg-white focus:outline-none focus:border-rosa"
                        >
                          <option value="">— sem revendedora —</option>
                          {usuarios.map((u) => (
                            <option key={u.user_id} value={u.user_id}>{u.display_name ?? u.user_id}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2 border-rosa text-rosa hover:bg-rosa hover:text-white"
                          disabled={!novoUsuario || salvando}
                          onClick={() => trocarRevendedora(c.id)}
                        >
                          {salvando ? <Loader2 size={10} className="animate-spin" /> : 'Salvar'}
                        </Button>
                        <button onClick={() => setEditandoCliente(null)} className="text-ink-soft hover:text-rosa">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className={c.usuario_nome ? 'text-ink' : 'text-ink-soft italic'}>
                          {c.usuario_nome ?? 'sem revendedora'}
                        </span>
                        <button
                          onClick={() => {
                            setEditandoCliente(c.id);
                            setNovoUsuario(c.user_id ?? '');
                          }}
                          title="Trocar revendedora"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-soft hover:text-rosa"
                        >
                          <UserCog size={12} />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Última compra */}
                  <td className="px-4 py-3">
                    {c.ultima_venda ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-soft">
                          {formatDateBR(c.ultima_venda.data_venda)}
                          <span className="mx-1 text-bege">·</span>
                          <span className="text-ink">{c.ultima_venda.produto_nome}</span>
                        </span>
                        <a
                          href={`/garantia/${c.ultima_venda.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver venda"
                          className="text-ink-soft hover:text-rosa transition-colors"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-ink-soft text-xs italic">sem registro</span>
                    )}
                  </td>

                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
