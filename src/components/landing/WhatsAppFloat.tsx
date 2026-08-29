import { MessageCircle } from 'lucide-react';
import { WHATSAPP_MENSAGEM } from '@/content/landing';
import { whatsappLink } from '@/lib/monare';
import { track, EVENTS } from '@/lib/analytics';

/**
 * Saída para quem não vai preencher formulário nenhum — é uma das próprias
 * opções do cadastro ("tenho dúvidas, quero conversar antes").
 */
export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(WHATSAPP_MENSAGEM)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EVENTS.whatsappClick, { local: 'flutuante' })}
      aria-label="Tirar dúvidas pelo WhatsApp"
      className="fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-medium text-white shadow-[0_8px_24px_rgba(35,33,30,0.18)] transition-transform hover:-translate-y-0.5 sm:px-5"
    >
      <MessageCircle size={20} strokeWidth={2} />
      <span className="hidden sm:inline">Tirar dúvidas</span>
    </a>
  );
}
