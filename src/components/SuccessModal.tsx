import { X, MessageCircle, CheckCircle2 } from 'lucide-react';

interface SuccessModalProps {
  venda: any;
  onClose: () => void;
}

export default function SuccessModal({ venda, onClose }: SuccessModalProps) {
  const formatarData = (dataIso: string) => {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const enviarGarantiaWhatsApp = () => {
    const msg = `✨ *Certificado de Garantia Monarê*\n\nOlá, ${venda.cliente_nome}! 🌟\n\nSua peça foi registrada com sucesso às ${horaAtual}.\n\n📦 *Produto:* ${venda.produto_nome}\n🔖 *Código:* ${venda.sku}\n📍 *Revendedora:* ${venda.revendedora_nome}\n🛡️ *Garantia:* 12 meses\n📅 *Válida até:* ${formatarData(venda.validade_garantia)}\n🔑 *Certificado:* #${venda.codigo_garantia}\n\n_Monarê Semijoias — Sorocaba_`;
    
    const url = `https://wa.me/55${venda.cliente_whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-[32px] max-w-sm w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-6 top-6 text-ink-soft hover:text-ink transition-colors">
          <X size={20} />
        </button>
        
        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-100">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          
          <h3 className="font-serif text-2xl text-ink">Venda Registrada!</h3>
          <p className="text-sm text-ink-soft">A joia foi baixada do estoque e sua comissão contabilizada.</p>

          <div className="p-4 bg-bege-light rounded-2xl border border-bege mt-6 text-left">
            <p className="text-[10px] uppercase tracking-wider text-ink-soft mb-1">Cód. Garantia</p>
            <p className="font-mono text-lg text-ink font-semibold tracking-widest">{venda.codigo_garantia}</p>
          </div>

          <button onClick={enviarGarantiaWhatsApp} className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[#25D366]/20 transition-all active:scale-[0.98] mt-6">
            <MessageCircle size={18} />
            Enviar Certificado (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}