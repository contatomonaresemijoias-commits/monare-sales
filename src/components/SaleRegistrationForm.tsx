import { useState, useCallback } from 'react';
import { ShieldCheck, Gem, Send, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateWarrantyCode, formatWhatsApp, getToday, getWarrantyExpiryISO } from '@/lib/monare';
import SuccessModal from './SuccessModal';

type ProdutoEstoque = { id: string; nome: string; sku: string; quantidade: number; preco_venda: number };

export default function SaleRegistrationForm() {
  const { profile } = useAuth();
  // No seu banco, o ID da revendedora é o ID do perfil dela
  const vendedoraId = profile?.id ?? null;

  const [form, setForm] = useState({
    sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false,
  });
  const [produto, setProduto] = useState<ProdutoEstoque | null>(null);
  const [skuStatus, setSkuStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);

  const lookupSKU = useCallback(async (sku: string) => {
    if (sku.length < 3 || !vendedoraId) return;
    setSkuStatus('loading');
    try {
      const { data: prod } = await supabase.from('produtos').select('id, nome, sku, preco_venda').eq('sku', sku.toUpperCase()).eq('ativo', true).maybeSingle();
      if (prod) {
        setProduto(prod as any);
        setForm(f => ({ ...f, valor_venda: prod.preco_venda?.toString() || '0' }));
        setSkuStatus('found');
      } else {
        setSkuStatus('error');
      }
    } catch { setSkuStatus('error'); }
  }, [vendedoraId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendedoraId || !produto || !form.termo_aceito) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('vendas').insert({
        vendedora_id: vendedoraId, // CAMPO CORRIGIDO PARA O SEU BANCO
        produto_id: produto.id,
        produto_nome: produto.nome,
        valor_venda: parseFloat(form.valor_venda),
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: form.cliente_whatsapp.replace(/\D/g, ''),
        data_venda: form.data_venda,
        codigo_garantia: generateWarrantyCode(),
        validade_garantia: getWarrantyExpiryISO(form.data_venda),
        termo_aceito: true
      }).select().single();

      if (error) throw error;
      setVendaFinalizada(data);
    } catch (err: any) {
      setErrors({ _global: "Erro de permissão ou dados. Verifique o estoque." });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border mt-10">
      <h2 className="text-2xl font-serif text-center mb-6 uppercase tracking-widest text-ink">Monarê</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors._global && <p className="text-destructive text-xs text-center">{errors._global}</p>}
        <input placeholder="SKU do Produto" className="w-full p-4 border rounded-2xl" value={form.sku} onChange={e => { setForm({...form, sku: e.target.value.toUpperCase()}); lookupSKU(e.target.value); }} />
        <input placeholder="Nome da Cliente" className="w-full p-4 border rounded-2xl" value={form.cliente_nome} onChange={e => setForm({...form, cliente_nome: e.target.value})} />
        <input placeholder="WhatsApp" className="w-full p-4 border rounded-2xl" value={form.cliente_whatsapp} onChange={e => setForm({...form, cliente_whatsapp: formatWhatsApp(e.target.value)})} />
        <input placeholder="Valor" className="w-full p-4 border rounded-2xl bg-gray-50" value={form.valor_venda} disabled />
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={form.termo_aceito} onChange={e => setForm({...form, termo_aceito: e.target.checked})} />
          Aceito os termos de garantia.
        </label>
        <button type="submit" disabled={submitting} className="w-full bg-rosa p-4 rounded-2xl text-white font-bold uppercase">
          {submitting ? 'Processando...' : 'Finalizar Venda'}
        </button>
      </form>
      {vendaFinalizada && <SuccessModal venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />}
    </div>
  );
}