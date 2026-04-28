import { Send, Eye, X, CheckCircle } from 'lucide-react';
import { INSTAGRAM_URL, getCertificateBaseUrl, getWarrantyExpiryBR } from '@/lib/monare';

type Venda = {
  id: string;
  codigo_garantia: string;
  produto_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  data_venda: string;
};

export default function SuccessModal({ venda, onClose }: { venda: Venda; onClose: () => void }) {
  const certLink = `${getCertificateBaseUrl()}/${venda.id}`;
  const whatsappMsg = encodeURIComponent(
    `Olá, ${venda.cliente_nome}! 🌟\n\nSua compra na *Monarê Semijoias* foi registrada com sucesso.\n\n` +
      `✨ *Peça:* ${venda.produto_nome}\n` +
      `🛡️ *Código de Garantia:* ${venda.codigo_garantia}\n` +
      `📅 *Garantia válida até:* ${getWarrantyExpiryBR(venda.data_venda)}\n\n` +
      `Acesse seu Certificado Digital:\n${certLink}\n\n` +
      `Nos siga no Instagram para novidades exclusivas:\n${INSTAGRAM_URL}\n\n` +
      `_Com carinho, Monarê Semijoias_ 💛`
  );
  const whatsappNumber = venda.cliente_whatsapp?.replace(/\D/g, '');
  const whatsappLink = `https://api.whatsapp.com/send?phone=55${whatsappNumber}&text=${whatsappMsg}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-luxe overflow-hidden animate-slide-up">
        <div className="h-1.5 w-full accent-bar" />
        <div className="p-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-bege-light hover:bg-bege flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X size={16} className="text-ink-soft" />
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rosa-gradient mb-4 shadow-rosa">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h3 className="font-serif text-2xl text-ink mb-1">Venda Registrada</h3>
            <p className="text-ink-soft text-sm">Certificado gerado com sucesso</p>
          </div>

          <div className="bg-bege-soft-gradient rounded-2xl px-5 py-4 mb-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-soft mb-1">Código de Garantia</p>
            <p className="font-mono text-xl font-bold text-ink tracking-widest">{venda.codigo_garantia}</p>
          </div>

          <div className="space-y-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-wide shadow-rosa active:scale-[0.98] transition-all"
            >
              <Send size={16} />
              Enviar via WhatsApp
            </a>
            <a
              href={certLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl border border-bege bg-bege-light hover:bg-bege text-ink text-sm font-semibold tracking-wide transition-all"
            >
              <Eye size={16} />
              Ver Certificado Digital
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
