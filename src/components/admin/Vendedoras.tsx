import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, Trash2, Search, X, ShoppingBag, Boxes, ChevronRight, KeyRound, PowerOff, Power } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type VendedoraRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  telefone: string | null;
  erp_id: string | null;
  ativo: boolean;
  roles: string[];
};
type EstoqueDetalhe = {
  quantidade: number;
  quantidade_vendida: number;
  produto: { sku: string; nome: string; preco_venda: number } | null;
};
type VendaDetalhe = {
  produto_nome: string;
  cliente_nome: string;
  data_venda: string;
  valor_venda: number | null;
  codigo_garantia: string;
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Vendedoras() {
  const [users, setUsers] = useState<VendedoraRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchAberto, setSearchAberto] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = useState<VendedoraRow | null>(null);
  const [detalheEstoque, setDetalheEstoque] = useState<EstoqueDetalhe[]>([]);
  const [detalheVendas, setDetalheVendas] = useState<VendaDetalhe[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Edição de telefone
  const [editandoTel, setEditandoTel] = useState(false);
  const [novoTel, setNovoTel] = useState('');
  const [salvandoTel, setSalvandoTel] = useState(false);

  // Edição de ERP ID
  const [editandoErp, setEditandoErp] = useState(false);
  const [novoErp, setNovoErp] = useState('');
  const [salvandoErp, setSalvandoErp] = useState(false);

  // Reset de senha
  const [resetandoSenha, setResetandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  // Toggle ativo
  const [salvandoAtivo, setSalvandoAtivo] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [searchInput, users]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setSearchAberto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    const res = await supabase.functions.invoke('admin-manage-users', { body: { action: 'list' } });
    if (res.error) {
      toast({ title: 'Erro ao carregar usuários', description: res.error.message, variant: 'destructive' });
    } else {
      setUsers((res.data?.users ?? []) as VendedoraRow[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function salvarTelefone() {
    if (!selectedUser) return;
    setSalvandoTel(true);
    const { error } = await supabase
      .from('profiles')
      .update({ telefone: novoTel.trim() || null } as any)
      .eq('user_id', selectedUser.user_id);
    setSalvandoTel(false);
    if (error) {
      toast({ title: 'Erro ao salvar telefone', description: error.message, variant: 'destructive' });
    } else {
      setSelectedUser((prev) => prev ? { ...prev, telefone: novoTel.trim() || null } : prev);
      setEditandoTel(false);
      toast({ title: 'Telefone atualizado' });
    }
  }

  async function salvarErpId() {
    if (!selectedUser) return;
    setSalvandoErp(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'update_erp_id', user_id: selectedUser.user_id, erp_id: novoErp.trim() || null },
    });
    setSalvandoErp(false);
    if (error || data?.error) {
      toast({ title: 'Erro ao salvar código ERP', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      const erp = novoErp.trim() || null;
      setSelectedUser((prev) => prev ? { ...prev, erp_id: erp } : prev);
      setEditandoErp(false);
      toast({ title: 'Código ERP atualizado' });
    }
  }

  async function salvarSenha() {
    if (!selectedUser) return;
    if (novaSenha.length < 6) {
      toast({ title: 'Senha deve ter ao menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setSalvandoSenha(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'reset_password', user_id: selectedUser.user_id, new_password: novaSenha },
    });
    setSalvandoSenha(false);
    if (error || data?.error) {
      toast({ title: 'Erro ao redefinir senha', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      setNovaSenha('');
      setResetandoSenha(false);
      toast({ title: 'Senha redefinida com sucesso' });
    }
  }

  async function toggleAtivo(u: VendedoraRow) {
    const novoAtivo = !u.ativo;
    setSalvandoAtivo(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'toggle_active', user_id: u.user_id, ativo: novoAtivo },
    });
    setSalvandoAtivo(false);
    if (error || data?.error) {
      toast({ title: 'Erro ao alterar status', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      setUsers((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, ativo: novoAtivo } : x));
      setSelectedUser((prev) => prev?.user_id === u.user_id ? { ...prev, ativo: novoAtivo } : prev);
      toast({ title: novoAtivo ? 'Perfil reativado' : 'Perfil desativado' });
    }
  }

  async function loadDetalhe(u: VendedoraRow) {
    setSelectedUser(u);
    setEditandoTel(false);
    setNovoTel(u.telefone ?? '');
    setEditandoErp(false);
    setNovoErp(u.erp_id ?? '');
    setResetandoSenha(false);
    setNovaSenha('');
    setLoadingDetalhe(true);
    const [{ data: est }, { data: vnd }] = await Promise.all([
      supabase
        .from('estoque')
        .select('quantidade, quantidade_vendida, produto:produtos(sku, nome, preco_venda)')
        .eq('user_id', u.user_id)
        .order('quantidade', { ascending: false }),
      supabase
        .from('vendas')
        .select('produto_nome, cliente_nome, data_venda, valor_venda, codigo_garantia')
        .eq('user_id', u.user_id)
        .order('data_venda', { ascending: false })
        .limit(30),
    ]);
    setDetalheEstoque((est ?? []) as EstoqueDetalhe[]);
    setDetalheVendas((vnd ?? []) as VendaDetalhe[]);
    setLoadingDetalhe(false);
  }

  async function excluir(u: VendedoraRow) {
    if (!confirm(`Remover ${u.email ?? u.display_name}?`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'delete', user_id: u.user_id },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao remover', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      toast({ title: 'Removida' });
      if (selectedUser?.user_id === u.user_id) setSelectedUser(null);
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

  const estoqueComStock = detalheEstoque.filter((e) => e.quantidade > 0);
  const estoqueSemStock = detalheEstoque.filter((e) => e.quantidade <= 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* Lista com busca */}
        <section className="bg-white rounded-2xl border border-bege p-5 space-y-3">
          <h3 className="font-serif text-xl text-ink">Usuárias ({users.length})</h3>

          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setSearchAberto(true); }}
                onFocus={() => setSearchAberto(true)}
                placeholder="Buscar usuária..."
                className="w-full pl-9 pr-8 h-10 text-sm border border-border rounded-md bg-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {searchInput && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSearchInput(''); setSearchAberto(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchAberto && usuariosFiltrados.length > 0 && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {usuariosFiltrados.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { loadDetalhe(u); setSearchInput(u.display_name || u.email || ''); setSearchAberto(false); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-bege-light transition-colors"
                    >
                      <p className="text-sm font-medium text-ink">{u.display_name || u.email}</p>
                      <p className="text-[11px] text-ink-soft">{u.email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {users.map((u) => {
              const isAdmin = u.roles.includes('administrador');
              const isSelected = selectedUser?.user_id === u.user_id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected ? 'border-rosa bg-rosa/5' : 'border-border hover:border-rosa/40'
                  } ${!u.ativo ? 'opacity-50' : ''}`}
                  onClick={() => loadDetalhe(u)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate font-medium">{u.display_name || u.email}</p>
                    <p className="text-[11px] text-ink-soft">{u.email}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-rosa">{u.roles.join(', ') || 'sem papel'}</p>
                      {!u.ativo && <span className="text-[9px] uppercase tracking-wider text-ink-soft bg-ink-soft/10 px-1 rounded">Inativo</span>}
                    </div>
                  </div>
                  {!isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); excluir(u); }}
                      className="text-xs p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <ChevronRight size={14} className={`shrink-0 transition-colors ${isSelected ? 'text-rosa' : 'text-ink-soft'}`} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Painel de detalhe */}
        <section className="bg-white rounded-2xl border border-bege p-5">
          {!selectedUser ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-ink-soft text-sm">
              Selecione uma usuária para ver o status completo.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="border-b border-border pb-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-2xl text-ink">{selectedUser.display_name || selectedUser.email}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">{selectedUser.email}</p>
                  </div>

                  {/* Status ativo/inativo — cor mostra estado atual; clique alterna */}
                  {!selectedUser.roles.includes('administrador') && (
                    <button
                      disabled={salvandoAtivo}
                      onClick={() => toggleAtivo(selectedUser)}
                      title={selectedUser.ativo ? 'Clique para desativar' : 'Clique para reativar'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-60 ${
                        selectedUser.ativo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                      }`}
                    >
                      {salvandoAtivo ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${selectedUser.ativo ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      )}
                      {selectedUser.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  )}
                </div>

                {/* Telefone editável */}
                {!editandoTel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink">
                      {selectedUser.telefone
                        ? <span className="font-medium">{selectedUser.telefone}</span>
                        : <span className="text-ink-soft italic">Sem telefone cadastrado</span>}
                    </span>
                    <button
                      onClick={() => { setEditandoTel(true); setNovoTel(selectedUser.telefone ?? ''); }}
                      className="text-[10px] text-ink-soft underline underline-offset-2 hover:text-rosa transition-colors"
                    >
                      {selectedUser.telefone ? 'alterar' : 'adicionar'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="tel"
                      value={novoTel}
                      onChange={(e) => setNovoTel(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="h-8 text-sm w-44"
                    />
                    <Button size="sm" className="h-8 text-xs" disabled={salvandoTel} onClick={salvarTelefone}>
                      {salvandoTel ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                    </Button>
                    <button onClick={() => setEditandoTel(false)} className="text-xs text-ink-soft hover:text-ink">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* ERP ID editável */}
                {!editandoErp ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-soft uppercase tracking-wider">ERP:</span>
                    <span className="text-sm text-ink font-mono">
                      {selectedUser.erp_id || <span className="text-ink-soft italic font-sans">não definido</span>}
                    </span>
                    <button
                      onClick={() => { setEditandoErp(true); setNovoErp(selectedUser.erp_id ?? ''); }}
                      className="text-[10px] text-ink-soft underline underline-offset-2 hover:text-rosa transition-colors"
                    >
                      {selectedUser.erp_id ? 'alterar' : 'definir'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={novoErp}
                      onChange={(e) => setNovoErp(e.target.value)}
                      placeholder="Ex: 001"
                      className="h-8 text-sm w-32 font-mono"
                    />
                    <Button size="sm" className="h-8 text-xs" disabled={salvandoErp} onClick={salvarErpId}>
                      {salvandoErp ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                    </Button>
                    <button onClick={() => setEditandoErp(false)} className="text-xs text-ink-soft hover:text-ink">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Redefinir senha */}
                {!selectedUser.roles.includes('administrador') && (
                  <>
                    {!resetandoSenha ? (
                      <button
                        onClick={() => { setResetandoSenha(true); setNovaSenha(''); }}
                        className="flex items-center gap-1.5 text-[11px] text-ink-soft hover:text-rosa transition-colors"
                      >
                        <KeyRound size={12} />
                        Redefinir senha
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="Nova senha (mín. 6)"
                          minLength={6}
                          className="h-8 text-sm w-44"
                        />
                        <Button size="sm" className="h-8 text-xs bg-rosa hover:bg-rosa/90" disabled={salvandoSenha} onClick={salvarSenha}>
                          {salvandoSenha ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                        </Button>
                        <button onClick={() => setResetandoSenha(false)} className="text-xs text-ink-soft hover:text-ink">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {loadingDetalhe ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-rosa" />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Estoque */}
                  <div>
                    <h4 className="font-semibold text-ink flex items-center gap-2 mb-3">
                      <Boxes size={14} className="text-rosa" />
                      Estoque ({detalheEstoque.length} SKUs)
                    </h4>

                    {estoqueComStock.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-ink-soft">Com estoque</p>
                        {estoqueComStock.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                            <span className="font-mono text-xs text-rosa font-bold w-16 shrink-0">{e.produto?.sku}</span>
                            <span className="text-xs text-ink truncate flex-1">{e.produto?.nome}</span>
                            <span className="text-xs font-semibold text-ink shrink-0">{e.quantidade} un.</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {estoqueSemStock.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-ink-soft">Sem estoque</p>
                        {estoqueSemStock.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 opacity-50">
                            <span className="font-mono text-xs text-rosa font-bold w-16 shrink-0">{e.produto?.sku}</span>
                            <span className="text-xs text-ink truncate flex-1">{e.produto?.nome}</span>
                            <span className="text-xs text-ink-soft shrink-0">0 un.</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {detalheEstoque.length === 0 && (
                      <p className="text-sm text-ink-soft">Nenhum item no mostruário.</p>
                    )}
                  </div>

                  {/* Vendas recentes */}
                  <div>
                    <h4 className="font-semibold text-ink flex items-center gap-2 mb-3">
                      <ShoppingBag size={14} className="text-rosa" />
                      Últimas Vendas ({detalheVendas.length})
                    </h4>
                    {detalheVendas.length === 0 ? (
                      <p className="text-sm text-ink-soft">Nenhuma venda registrada.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {detalheVendas.map((v, i) => (
                          <div key={i} className="p-2.5 rounded-lg border border-border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-ink truncate">{v.produto_nome}</p>
                                <p className="text-[11px] text-ink-soft">{v.cliente_nome}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-semibold text-rosa">{fmt(v.valor_venda)}</p>
                                <p className="text-[10px] text-ink-soft">
                                  {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
