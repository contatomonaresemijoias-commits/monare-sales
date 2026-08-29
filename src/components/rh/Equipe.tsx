import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Lock, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ehPapelProtegido, podeGerenciarConta } from '@/lib/acesso';
import { edgeErro } from '@/lib/edgeErro';
import NovaUsuaria from '@/components/rh/NovaUsuaria';

/** Mesmo formato aceito pela edge function — recusa antes de ir à rede. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Usuaria = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  roles: string[];
  created_at: string;
};

type Filtro = 'todas' | 'ativas' | 'inativas' | 'gestao';

const PAPEL_LABEL: Record<string, string> = {
  administrador: 'Administração',
  rh: 'RH',
  revendedora: 'Revendedora',
  b2b: 'B2B',
};

function rotulaPapeis(roles: string[]) {
  if (!roles.length) return 'Sem papel';
  return roles.map((r) => PAPEL_LABEL[r] ?? r).join(', ');
}

/**
 * Gestão de contas: contratadas manualmente ou vindas da captação, quem está
 * ativo, quem foi desligado, e a senha de quem esqueceu.
 *
 * RH cuida do ciclo inteiro de revendedora e B2B: editar dados (inclusive o
 * e-mail de acesso), redefinir senha, ativar, inativar e excluir.
 *
 * A regra que molda a tela é sobre o ALVO, não sobre a ação: RH não age sobre
 * a própria categoria. Um usuário de RH não toca em outro RH nem num
 * administrador — nem nome, nem e-mail, nem senha, nem status, nem exclusão.
 * O servidor recusa de qualquer forma (edge function + RLS); aqui os botões
 * somem para a pessoa não bater numa porta trancada.
 */
export default function Equipe() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<Usuaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  async function load() {
    setLoading(true);
    const res = await supabase.functions.invoke('admin-manage-users', { body: { action: 'list' } });
    if (res.error || res.data?.error) {
      toast({
        title: 'Erro ao carregar a equipe',
        description: await edgeErro(res.error, res.data),
        variant: 'destructive',
      });
    } else {
      setUsers((res.data?.users ?? []) as Usuaria[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /** Espelha `bloqueioNoAlvo` da edge function — mesma regra, outra camada. */
  function podeAlterar(u: Usuaria) {
    return podeGerenciarConta(u.roles, { souEu: u.user_id === user?.id, souAdmin: isAdmin });
  }

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qDigitos = q.replace(/\D/g, '');
    return users.filter((u) => {
      if (filtro === 'ativas' && !u.ativo) return false;
      if (filtro === 'inativas' && u.ativo) return false;
      if (filtro === 'gestao' && !ehPapelProtegido(u.roles)) return false;
      if (!q) return true;
      return (
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (!!qDigitos && (u.telefone ?? '').replace(/\D/g, '').includes(qDigitos))
      );
    });
  }, [users, busca, filtro]);

  const ativas = users.filter((u) => u.ativo).length;

  async function toggleAtivo(u: Usuaria) {
    const novoAtivo = !u.ativo;
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'toggle_active', user_id: u.user_id, ativo: novoAtivo },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao alterar status', description: await edgeErro(error, data), variant: 'destructive' });
      return;
    }
    setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, ativo: novoAtivo } : x)));
    toast({
      title: novoAtivo ? 'Conta reativada' : 'Conta desativada',
      description: novoAtivo
        ? 'A pessoa volta a acessar o sistema no próximo login.'
        : 'O acesso foi revogado e a sessão atual perde os dados.',
    });
  }

  async function excluir(u: Usuaria) {
    const nome = u.display_name || u.email;
    if (!confirm(`Excluir ${nome} em definitivo? As vendas, ciclos e o estoque dela vão junto. Para só tirar o acesso, use Desativar.`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'delete', user_id: u.user_id },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao excluir', description: await edgeErro(error, data), variant: 'destructive' });
      return;
    }
    toast({ title: 'Conta excluída' });
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  const tabs: { key: Filtro; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'ativas', label: 'Ativas' },
    { key: 'inativas', label: 'Inativas' },
    ...(isAdmin ? [{ key: 'gestao' as Filtro, label: 'Gestão' }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
              filtro === t.key ? 'bg-rosa text-white border-rosa' : 'bg-white text-ink-soft border-border hover:border-rosa/50'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-ink-soft">
          {ativas} ativa{ativas === 1 ? '' : 's'} de {users.length}
        </span>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="w-full pl-9 pr-3 h-10 text-sm border border-border rounded-md bg-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">Nenhuma conta nesta lista.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((u) => (
            <CardUsuaria
              key={u.id}
              u={u}
              editavel={podeAlterar(u)}
              souEu={u.user_id === user?.id}
              onToggleAtivo={toggleAtivo}
              onExcluir={excluir}
              onDadosSalvos={(dados) =>
                setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? { ...x, ...dados } : x)))
              }
            />
          ))}
        </div>
      )}

      <NovaUsuaria onCriada={load} />
    </div>
  );
}

function CardUsuaria({
  u,
  editavel,
  souEu,
  onToggleAtivo,
  onExcluir,
  onDadosSalvos,
}: {
  u: Usuaria;
  /** Uma permissão só para tudo: editar, senha, status e excluir. */
  editavel: boolean;
  souEu: boolean;
  onToggleAtivo: (u: Usuaria) => Promise<void>;
  onExcluir: (u: Usuaria) => Promise<void>;
  onDadosSalvos: (dados: Partial<Usuaria>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(u.display_name ?? '');
  const [email, setEmail] = useState(u.email ?? '');
  const [telefone, setTelefone] = useState(u.telefone ?? '');
  const [salvando, setSalvando] = useState(false);

  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [salvandoAtivo, setSalvandoAtivo] = useState(false);

  const daGestao = ehPapelProtegido(u.roles);

  async function salvarDados() {
    const novoNome = nome.trim();
    const novoEmail = email.trim().toLowerCase();
    const novoTel = telefone.trim() || null;
    const emailMudou = novoEmail !== (u.email ?? '').toLowerCase();

    if (novoNome.length < 2) {
      toast({ title: 'O nome precisa de ao menos 2 caracteres', variant: 'destructive' });
      return;
    }
    if (emailMudou && !EMAIL_RE.test(novoEmail)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
      return;
    }

    setSalvando(true);

    // E-mail primeiro: é a única parte que pode esbarrar em conta duplicada.
    // Falhando aqui, nada foi gravado e a tela continua igual ao banco.
    if (emailMudou) {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'update_email', user_id: u.user_id, email: novoEmail },
      });
      if (error || data?.error) {
        setSalvando(false);
        toast({
          title: 'Erro ao alterar o e-mail',
          description: await edgeErro(error, data),
          variant: 'destructive',
        });
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: novoNome, telefone: novoTel })
      .eq('user_id', u.user_id);
    setSalvando(false);

    if (error) {
      // O e-mail pode já ter mudado: dizer só "erro ao salvar" faria a pessoa
      // achar que nada aconteceu e tentar logar com o endereço antigo.
      onDadosSalvos(emailMudou ? { email: novoEmail } : {});
      toast({
        title: emailMudou ? 'E-mail alterado, mas o resto não salvou' : 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    onDadosSalvos({ display_name: novoNome, telefone: novoTel, ...(emailMudou && { email: novoEmail }) });
    setEditando(false);
    toast({
      title: 'Dados atualizados',
      description: emailMudou ? 'O acesso passa a ser pelo novo e-mail.' : undefined,
    });
  }

  async function salvarSenha() {
    if (novaSenha.length < 6) {
      toast({ title: 'A senha deve ter ao menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setSalvandoSenha(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: { action: 'reset_password', user_id: u.user_id, new_password: novaSenha },
    });
    setSalvandoSenha(false);
    if (error || data?.error) {
      toast({ title: 'Erro ao redefinir senha', description: await edgeErro(error, data), variant: 'destructive' });
      return;
    }
    setNovaSenha('');
    setTrocandoSenha(false);
    toast({ title: 'Senha redefinida' });
  }

  return (
    <div className={`bg-white rounded-2xl border border-bege p-5 ${u.ativo ? '' : 'opacity-70'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-lg font-serif text-ink truncate">{u.display_name || u.email}</p>
          <p className="text-xs text-ink-soft truncate">
            {u.email} · {u.telefone || 'sem telefone'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] uppercase tracking-wider text-rosa">{rotulaPapeis(u.roles)}</span>
            {souEu && (
              <span className="text-[9px] uppercase tracking-wider text-ink-soft bg-ink-soft/10 px-1.5 py-0.5 rounded">
                você
              </span>
            )}
          </div>
        </div>

        {editavel ? (
          <button
            disabled={salvandoAtivo}
            onClick={async () => {
              setSalvandoAtivo(true);
              await onToggleAtivo(u);
              setSalvandoAtivo(false);
            }}
            title={u.ativo ? 'Clique para desativar o acesso' : 'Clique para reativar o acesso'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-60 ${
              u.ativo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
            }`}
          >
            {salvandoAtivo ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${u.ativo ? 'bg-emerald-500' : 'bg-red-400'}`} />
            )}
            {u.ativo ? 'Ativa' : 'Inativa'}
          </button>
        ) : (
          <span
            title={
              souEu
                ? 'Ninguém altera a própria conta por aqui'
                : 'Contas da gestão não são alteradas por este painel'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-ink-soft"
          >
            <Lock size={11} />
            {u.ativo ? 'Ativa' : 'Inativa'}
          </span>
        )}
      </div>

      {editavel && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {editando ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="h-8 text-sm w-48" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail de acesso"
                  className="h-8 text-sm w-56"
                  autoComplete="off"
                />
                <Input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-8 text-sm w-40"
                />
                <Button size="sm" className="h-8 text-xs bg-rosa hover:bg-rosa/90" disabled={salvando} onClick={salvarDados}>
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                </Button>
                <button onClick={() => setEditando(false)} className="text-xs text-ink-soft hover:text-ink">
                  <X size={14} />
                </button>
              </div>
              {email.trim().toLowerCase() !== (u.email ?? '').toLowerCase() && (
                <p className="text-[11px] text-ink-soft">
                  O e-mail é o login: depois de salvar, ela entra com o novo endereço.
                </p>
              )}
            </div>
          ) : trocandoSenha ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Nova senha (mín. 6)"
                minLength={6}
                className="h-8 text-sm w-48"
              />
              <Button size="sm" className="h-8 text-xs bg-rosa hover:bg-rosa/90" disabled={salvandoSenha} onClick={salvarSenha}>
                {salvandoSenha ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
              </Button>
              <button onClick={() => setTrocandoSenha(false)} className="text-xs text-ink-soft hover:text-ink">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditando(true);
                  setNome(u.display_name ?? '');
                  setEmail(u.email ?? '');
                  setTelefone(u.telefone ?? '');
                }}
              >
                Editar dados
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setTrocandoSenha(true); setNovaSenha(''); }}>
                <KeyRound size={13} />
                Redefinir senha
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/5"
                onClick={() => onExcluir(u)}
              >
                <Trash2 size={13} />
                Excluir
              </Button>
            </div>
          )}
        </div>
      )}

      {!editavel && daGestao && !souEu && (
        <p className="mt-3 pt-3 border-t border-border text-[11px] text-ink-soft">
          Conta da gestão. Alterações de nome, senha e status são feitas por um administrador.
        </p>
      )}
    </div>
  );
}
