import { useEffect, useState } from 'react';
import { Loader2, UserPlus, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Parceira = { id: string; nome: string; comissao_percentual: number; whatsapp: string | null };
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
  const [form, setForm] = useState({ nome: '', email: '', senha: '', comissao: '30', whatsapp: '' });

  async function load() {
    setLoading(true);
    const [{ data: pa }, res] = await Promise.all([
      supabase.from('parceiras').select('id, nome, comissao_percentual, whatsapp').order('nome'),
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
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      toast({ title: 'Preencha Nome, E-mail e Senha', variant: 'destructive' });
      return;
    }
    setBusy(true);

    // 1. Cria a "parceira" (revendedora) com a comissão informada
    const { data: novaParceira, error: pErr } = await supabase
      .from('parceiras')
      .insert({
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.trim() || null,
        comissao_percentual: parseFloat(form.comissao || '0'),
      })
      .select()
      .single();

    if (pErr || !novaParceira) {
      setBusy(false);
      toast({ title: 'Erro ao criar revendedora', description: pErr?.message, variant: 'destructive' });
      return;
    }

    // 2. Cria o usuário e vincula à parceira recém-criada
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: {
        action: 'create',
        email: form.email.trim(),
        password: form.senha,
        display_name: form.nome.trim(),
        parceira_id: novaParceira.id,
      },
    });
    setBusy(false);

    if (error || data?.error) {
      // rollback: remove parceira se usuário não foi criado
      await supabase.from('parceiras').delete().eq('id', novaParceira.id);
      toast({ title: 'Erro ao criar usuário', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Revendedora criada com sucesso' });
    setForm({ nome: '', email: '', senha: '', comissao: '30', whatsapp: '' });
    load();
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

  async function atualizarComissao(p: Parceira, novo: number) {
    const { error } = await supabase
      .from('parceiras')
      .update({ comissao_percentual: novo })
      .eq('id', p.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setParceiras((ps) => ps.map((x) => (x.id === p.id ? { ...x, comissao_percentual: novo } : x)));
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
          Nova Revendedora
        </h3>
        <form onSubmit={criar} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input type="password" placeholder="Senha (mín. 6)" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} minLength={6} required />
          <Input placeholder="WhatsApp (opcional)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <div className="sm:col-span-2 flex items-center gap-2">
            <label className="text-xs text-ink-soft uppercase tracking-wider whitespace-nowrap">Comissão (%)</label>
            <Input type="number" step="0.01" min="0" max="100" value={form.comissao} onChange={(e) => setForm({ ...form, comissao: e.target.value })} className="w-28" />
          </div>
          <Button type="submit" disabled={busy} className="bg-rosa hover:bg-rosa/90 sm:col-span-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Criar Revendedora
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Revendedoras ({users.length})</h3>
        <div className="space-y-2">
          {users.map((u) => {
            const p = parceiras.find((x) => x.id === u.parceira_id);
            const isAdmin = u.roles.includes('admin');
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate font-medium">{u.display_name || u.email}</p>
                  <p className="text-[11px] text-ink-soft">{u.email}</p>
                  <p className="text-[10px] uppercase tracking-wider text-rosa">{u.roles.join(', ') || 'sem papel'}</p>
                </div>
                {p && !isAdmin && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-ink-soft uppercase">Comissão</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      defaultValue={p.comissao_percentual}
                      onBlur={(e) => atualizarComissao(p, parseFloat(e.target.value || '0'))}
                      className="w-16 h-8 text-center text-sm border border-border rounded-md font-semibold"
                    />
                    <span className="text-xs text-ink-soft">%</span>
                  </div>
                )}
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
