import { useState } from 'react';
import { X, MessageCircle, CheckCircle2, Share2, Download, Loader2, Copy, Check } from 'lucide-react';

interface VendaItem {
  produto_nome: string;
  sku: string;
  codigo_garantia: string;
  validade_garantia: string;
  pdf_garantia_url?: string | null;
}

interface SuccessModalProps {
  items: VendaItem[];
  cliente_nome: string;
  cliente_whatsapp: string;
  revendedora_nome: string;
  garantia_uuid: string;
  onClose: () => void;
}

async function compartilharPDF(item: VendaItem): Promise<void> {
  if (!item.pdf_garantia_url) return;

  const response = await fetch(item.pdf_garantia_url);
  const blob = await response.blob();
  const file = new File([blob], `certificado-${item.sku}.pdf`, { type: 'application/pdf' });

  // Web Share API — no celular abre o seletor nativo (WhatsApp, Drive, etc.)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: `Certificado Monarê — ${item.produto_nome}` });
    return;
  }

  // Fallback: download direto no dispositivo
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificado-${item.sku}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SuccessModal({ items, cliente_nome, cliente_whatsapp, revendedora_nome, garantia_uuid, onClose }: SuccessModalProps) {
  const [sharing, setSharing] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const garantiaLink = `${window.location.origin}/garantia?venda=${garantia_uuid}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(garantiaLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback para navegadores sem suporte
      const el = document.createElement('textarea');
      el.value = garantiaLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handleCompartilhar = async (item: VendaItem, index: number) => {
    setSharing((s) => ({ ...s, [index]: true }));
    try {
      await compartilharPDF(item);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('[compartilharPDF]', err);
    } finally {
      setSharing((s) => ({ ...s, [index]: false }));
    }
  };

  // Determina o ícone e texto do botão conforme suporte do dispositivo
  const supportsShare = typeof navigator !== 'undefined' && !!navigator.share;
  const ShareIcon = supportsShare ? Share2 : Download;
  const shareBtnLabel = supportsShare ? 'Compartilhar PDF' : 'Baixar PDF';

  const abrirWhatsApp = () => {
    const linhas = items.map((item) => [
      `📦 *${item.produto_nome}* (${item.sku})`,
      `🔑 Certificado: #${item.codigo_garantia}`,
      `📅 Válido até: ${formatarData(item.validade_garantia)}`,
    ].join('\n')).join('\n\n');

    const msg =
      `✨ *Certificado${items.length > 1 ? 's' : ''} de Garantia Monarê*\n\n` +
      `Olá, ${cliente_nome}! 🌟\n\n` +
      `Sua${items.length > 1 ? 's peças foram' : ' peça foi'} registrada${items.length > 1 ? 's' : ''} com sucesso às ${horaAtual}.\n\n` +
      linhas +
      `\n\n🔗 *Seus certificados:*\n${garantiaLink}\n\n` +
      `🛡️ *Garantia:* 12 meses por peça\n` +
      `📍 *Revendedora:* ${revendedora_nome}\n\n` +
      `_Monarê Semijoias — Sorocaba_`;

    window.open(`https://wa.me/55${cliente_whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-[32px] max-w-sm w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-6 top-6 text-ink-soft hover:text-ink transition-colors">
          <X size={20} />
        </button>

        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-100">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h3 className="font-serif text-2xl text-ink">Venda Registrada!</h3>
          <p className="text-sm text-ink-soft">
            {items.length > 1
              ? `${items.length} peças baixadas do estoque e comissões contabilizadas.`
              : 'A joia foi baixada do estoque e sua comissão contabilizada.'}
          </p>
        </div>


        {/* Link de garantia da venda — copiar e enviar ao cliente */}
        <div className="mt-5 p-4 bg-[#FAF9F7] border border-[#E8E2DA] rounded-2xl space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9B8E7E] font-semibold">
            Link de garantia
          </p>
          <p className="text-[11px] text-[#6B6259] break-all leading-relaxed font-mono">
            {garantiaLink}
          </p>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#C9A96E] text-[#C9A96E] text-[11px] font-semibold tracking-wide hover:bg-[#C9A96E] hover:text-white transition-all active:scale-[0.98]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
        </div>

        {/* Abrir WhatsApp com texto (sem link de PDF) */}
        <button
          onClick={abrirWhatsApp}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold tracking-wide shadow-lg shadow-[#25D366]/20 transition-all active:scale-[0.98] mt-4"
        >
          <MessageCircle size={18} />
          Abrir WhatsApp
        </button>

        {supportsShare && (
          <p className="text-center text-[10px] text-ink-soft mt-3 leading-relaxed">
            Compartilhe o PDF pelo botão acima, depois abra o WhatsApp para enviar ao cliente.
          </p>
        )}
      </div>
    </div>
  );
}
