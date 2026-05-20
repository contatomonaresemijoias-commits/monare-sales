import { useState } from 'react';
import { X, MessageCircle, CheckCircle2, Share2, Download, Loader2 } from 'lucide-react';

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

export default function SuccessModal({ items, cliente_nome, cliente_whatsapp, revendedora_nome, onClose }: SuccessModalProps) {
  const [sharing, setSharing] = useState<Record<number, boolean>>({});

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
      `\n\n🛡️ *Garantia:* 12 meses por peça\n` +
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

        {/* Um card por item */}
        <div className="mt-6 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="p-4 bg-bege-light rounded-2xl border border-bege text-left space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft mb-0.5">{item.produto_nome}</p>
                <p className="font-mono text-base text-ink font-semibold tracking-widest">{item.codigo_garantia}</p>
                <p className="text-[10px] text-ink-soft mt-0.5">Válido até {formatarData(item.validade_garantia)}</p>
              </div>

              {item.pdf_garantia_url && (
                <button
                  onClick={() => handleCompartilhar(item, i)}
                  disabled={sharing[i]}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2C2825] text-white text-[11px] font-semibold tracking-wide hover:bg-[#C9A96E] disabled:opacity-50 transition-all"
                >
                  {sharing[i]
                    ? <><Loader2 size={13} className="animate-spin" /> Preparando…</>
                    : <><ShareIcon size={13} /> {shareBtnLabel}</>
                  }
                </button>
              )}
            </div>
          ))}
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
