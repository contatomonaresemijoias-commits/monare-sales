import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function NovaUsuaria() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'revendedora' });
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      toast({ title: 'Preencha Nome, E-mail e Senha', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: {
        action: 'create',
        email: form.email.trim(),
        password: form.senha,
        display_name: form.nome.trim(),
        role: form.role,
      },
    });
    setBusy(false);

    if (error || data?.error) {
      toast({ title: 'Erro ao criar usuário', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Usuária criada com sucesso' });
    setForm({ nome: '', email: '', senha: '', role: 'revendedora' });
  }

  return (
    <section className="bg-white rounded-2xl border border-bege p-6 max-w-lg">
      <h3 className="font-serif text-xl text-ink mb-5 flex items-center gap-2">
        <UserPlus size={16} className="text-rosa" />
        Nova Usuária
      </h3>
      <form onSubmit={criar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Nome completo"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
        />
        <Input
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          type="password"
          placeholder="Senha (mín. 6)"
          value={form.senha}
          onChange={(e) => setForm({ ...form, senha: e.target.value })}
          minLength={6}
          required
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-soft uppercase tracking-wider whitespace-nowrap">Tipo</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="flex-1 h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="revendedora">Revendedora</option>
            <option value="b2b">B2B</option>
          </select>
        </div>
        <Button type="submit" disabled={busy} className="bg-rosa hover:bg-rosa/90 sm:col-span-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Criar Usuária
        </Button>
      </form>
    </section>
  );
}
