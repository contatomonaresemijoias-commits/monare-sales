import { useState, useCallback } from 'react';
import { ShieldCheck, Gem, Send, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateWarrantyCode, formatWhatsApp, getMinDate, getToday, getWarrantyExpiryISO } from '@/lib/monare';
import SuccessModal from './SuccessModal';

type ProdutoEstoque = { id: string; nome: string; sku: string; quantidade: number; preco_venda: number };
type SkuStatus = 'idle' | 'loading' | 'found' | 'not_in_showcase' | 'out_of_stock' | 'error';

export default function SaleRegistrationForm() {
  const { profile } = useAuth();
  const parceiraId = profile?.parceira_id ?? profile?.id ?? null;

  const [form, setForm] = useState({
    sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false,
  });
  const [produto, setProduto] = useState<ProdutoEstoque | null>(null);
  const [skuStatus, setSkuStatus] = useState<SkuStatus>('idle');
  const [skuMessage, setSkuMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);

  const lookupSKU = useCallback(
    async (sku: string) => {
      if (sku.length < 3) {
        setProduto(null); setSkuStatus('idle'); setSkuMessage(''); setForm((f) => ({ ...f, valor_venda: '' }));
        return;
      }
      if (!parceiraId) return;
      
      setSkuStatus('loading');
      try {
        const { data: prod } = await supabase.from('produtos').select('id, nome, sku, preco_venda').eq('sku', sku.toUpperCase()).eq('ativo', true).maybeSingle();
        if (!prod) {
          setProduto(null); setSkuStatus('not_in_showcase'); setSkuMessage('Item não consta no sistema.'); return;
        }

        const { data: estoque } = await supabase.from('estoque_parceiras').select('quantidade').eq('parceira_id', parceiraId).eq('produto_id', prod.id).maybeSingle();
        if (!estoque || estoque.quantidade <= 0) {
          setProduto({ ...prod, quantidade: 0 }); setSkuStatus('out_of_stock'); setSkuMessage('Estoque esgotado.'); return;
        }

        setProduto({ ...prod, quantidade: estoque.quantidade });
        setForm((f) => ({ ...f, valor_venda: prod.preco_venda?.toString() || '0' }));
        setSkuStatus('found'); setSkuMessage('');
      } catch {
        setSkuStatus('error'); setSkuMessage('Erro ao consultar mostruário.');
      }
    }, [parceiraId]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    let val: string | boolean = type === 'checkbox' ? checked : value;
    if (name === 'cliente_whatsapp') val = formatWhatsApp(value);
    if (name === 'sku') {
      val = (value as string).toUpperCase();
      lookupSKU(val as string);
    }
    setForm((f) => ({ ...f, [name]: val }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: '' }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.sku || skuStatus !== 'found') errs.sku = skuMessage || 'SKU inválido.';
    if (!form.cliente_nome.trim() || form.cliente_nome.trim().length < 3) errs.cliente_nome = 'Nome obrigatório.';
    const digits = form.cliente_whatsapp.replace(/\D/g, '');
    if (digits.length !== 11) errs.cliente_whatsapp = 'WhatsApp inválido. Use (99) 99999-9999.';
    const valor = parseFloat((form.valor_venda || '').replace(',', '.'));
    if (!valor || valor <= 0) errs.valor_venda = 'Valor da venda inválido.';
    if (!form.data_venda) errs.data_venda = 'Data obrigatória.';
    if (!form.termo_aceito) errs.termo_aceito = 'Confirme a entrega.';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!parceiraId || !produto) return;
    setSubmitting(true);
    
    try {
      const codigo_garantia = generateWarrantyCode();
      const valor = parseFloat(form.valor_venda.replace(',', '.'));
      const whatsapp_limpo = form.cliente_whatsapp.replace(/\D/g, '');
      const validade_garantia = getWarrantyExpiryISO(form.data_venda);

      // CORREÇÃO APLICADA AQUI: usando parceira_id ao invés de vendedora_id
      const { data, error } = await supabase.from('vendas').insert({
        parceira_id: parceiraId,
        produto_id: produto.id,
        valor_venda: valor,
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: whatsapp_limpo,
        data_venda: form.data_venda,
        codigo_garantia: codigo_garantia,
        validade_garantia: validade_garantia,
        termo_aceito: true,
      }).select().single();

      if (error) throw error;

      setVendaFinalizada({
        ...data, cliente_nome: form.cliente_nome, cliente_whatsapp: whatsapp_limpo, produto_nome: produto.nome, sku: produto.sku, revendedora_nome: profile?.display_name || 'Equipe Monarê',
      });
      setForm({ sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false });
      setProduto(null); setSkuStatus('idle');
    } catch (err: any) {
      setErrors({ _global: 'Erro ao registrar venda. Verifique suas permissões.' });
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase = 'w-full rounded-2xl px-5 py-4 text-ink text-base outline-none transition-all duration-200 border border-border bg-white/80 placeholder:text-ink-soft/40 focus:border-rosa focus:ring-2 focus:ring-rosa/20';
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft mb-2';

  return (
    <div className="w-full max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="h-px w-8 bg-rosa/40" />
          <ShieldCheck size={12} className="text-rosa" />
          <span className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Área da Revendedora</span>
          <ShieldCheck size={12} className="text-rosa" />
          <div className="h-px w-8 bg-rosa/40" />
        </div>
        <h1 className="font-serif text-5xl tracking-[0.15em] font-light text-ink uppercase">Monarê</h1>
        <p className="text-ink-soft text-xs tracking-[0.25em] uppercase mt-2">Registro de Venda</p>
      </div>

      <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
        <div className="h-1.5 w-full accent-bar" />
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors._global && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-sm">{errors._global}</p>
            </div>
          )}

          <div>
            <label className={labelBase}>Código do Produto (SKU)</label>
            <div className="relative">
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU001" autoComplete="off" className={inputBase + ' pr-12 font-mono'} />
            </div>
            {skuStatus === 'found' && produto && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-bege-light border border-bege">
                <Gem size={14} className="text-rosa" />
                <p className="text-sm text-ink font-medium flex-1">{produto.nome}</p>
                <span className="text-[10px] uppercase tracking-wider text-ink-soft">Em estoque: {produto.quantidade}</span>
              </div>
            )}
            {skuStatus !== 'idle' && skuStatus !== 'found' && skuStatus !== 'loading' && <p className="mt-1.5 text-xs text-destructive">{skuMessage}</p>}
          </div>

          <div><label className={labelBase}>Nome da Cliente</label><input name="cliente_nome" value={form.cliente_nome} onChange={handleChange} placeholder="Maria Silva" className={inputBase} /></div>
          <div><label className={labelBase}>WhatsApp da Cliente</label><input name="cliente_whatsapp" value={form.cliente_whatsapp} onChange={handleChange} placeholder="(15) 99999-9999" inputMode="tel" className={inputBase} /></div>
          <div><label className={labelBase}>Valor da Venda (R$)</label><input name="valor_venda" type="number" value={form.valor_venda} className={`${inputBase} bg-gray-50 text-gray-500`} disabled required /></div>
          <div><label className={labelBase}>Data da Venda</label><input type="date" name="data_venda" value={form.data_venda} onChange={handleChange} max={getToday()} className={inputBase} /></div>

          <div className="h-px bg-border" />
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative pt-0.5"><input type="checkbox" name="termo_aceito" checked={form.termo_aceito} onChange={handleChange} className="sr-only peer" /><div className="w-5 h-5 rounded-md border-2 border-border peer-checked:bg-rosa flex items-center justify-center">{form.termo_aceito && <CheckCircle size={14} className="text-white" />}</div></div>
              <span className="text-xs text-ink-soft leading-relaxed">Confirmo entrega e aceitação da <span className="text-rosa font-semibold">garantia de 12 meses</span>.</span>
            </label>
          </div>

          <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-[0.1em] uppercase shadow-rosa active:scale-[0.98] transition-all disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Finalizar Venda
          </button>
        </form>
      </div>
      
      {vendaFinalizada && <SuccessModal venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />}
    </div>
  );
}