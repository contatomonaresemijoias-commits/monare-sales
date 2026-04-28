import { useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Parceira = { id: string; nome: string };
type VendedoraRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  parceira_id: string | null;
  email: string | null;
  roles: string[];
};

export default function Vendedoras() {
  const [parceiras, setParceiras] = useState<Parceira[]>([]);
  const [users, setUsers] = useState<VendedoraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', parceira_id: '' });

  async function load() {
    setLoading(true);
    const [{ data: pa }, res] = await Promise.all([
      supabase.from('parceiras').select('id, nome').order('nome'),
      supabase.functions.invoke('admin-manage-users', { body: { action: 'list' } }),
    ]);
    setParceiras((pa ?? []) as Parceira[]);
    if (res.error) {
      toast({ title: 'Erro ao carregar usuários', description: res.error.message, variant: 'destructive' });
    } else {
      setUsers((res.data?.users ?? []) as VendedoraRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !form.senha.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: {
        action: 'create',
        email: form.email.trim(),
        password: form.senha,
        display_name: form.nome.trim() || form.email.trim(),
        parceira_id: form.parceira_id || null,
      },
    });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: 'Erro ao criar', description: error?.message || data?.error, variant: 'destructive' });
    } else {
      toast({ title: 'Vendedora criada' });
      setForm({ nome: '', email: '', senha: '', parceira_id: '' });
      load();
    }
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

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-rosa" />
          Nova Vendedora
        </h3>
        <form onSubmit={criar} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder="Senha (mín. 6)" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} minLength={6} required />
          <select
            value={form.parceira_id}
            onChange={(e) => setForm({ ...form, parceira_id: e.target.value })}
            className="text-sm border border-border rounded-md px-3 py-2 bg-white"
          >
            <option value="">— Sem parceira —</option>
            {parceiras.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <Button type="submit" disabled={busy} className="bg-rosa hover:bg-rosa/90 sm:col-span-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Criar Vendedora
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Usuários ({users.length})</h3>
        <div className="space-y-2">
          {users.map((u) => {
            const parceiraNome = parceiras.find((p) => p.id === u.parceira_id)?.nome ?? '—';
            const isAdmin = u.roles.includes('admin');
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{u.display_name || u.email}</p>
                  <p className="text-[11px] text-ink-soft">{u.email} · Parceira: {parceiraNome}</p>
                  <p className="text-[10px] uppercase tracking-wider text-rosa">{u.roles.join(', ') || 'sem papel'}</p>
                </div>
                {!isAdmin && (
                  <button
                    onClick={() => excluir(u)}
                    className="text-xs px-3 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
