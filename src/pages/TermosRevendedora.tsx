import LegalPage, { Pendencia, Secao } from '@/components/legal/LegalPage';
import usePageMeta from '@/hooks/usePageMeta';
import { PRAZO_RETORNO } from '@/content/landing';

/**
 * ATENÇÃO — este documento está incompleto de propósito.
 *
 * A estrutura e as cláusulas de processo seletivo abaixo refletem o que o
 * sistema realmente faz. Já as condições comerciais (comissão, prazos do
 * mostruário, responsabilidade por perda/avaria, multas) são decisões de
 * negócio da Monarê: estão marcadas com <Pendencia> e precisam ser preenchidas
 * e revisadas por advogado antes de publicar.
 */
export default function TermosRevendedora() {
  usePageMeta({
    title: 'Termos para Revendedoras — Monarê Semijoias',
    description: 'Condições do programa de representantes Monarê Semijoias.',
  });

  return (
    <LegalPage titulo="Termos para Revendedoras" atualizadoEm="30 de julho de 2026">
      <Secao titulo="1. Objeto">
        <p>
          Estes termos regem a participação no programa de representantes da <Pendencia>razão social</Pendencia> (“Monarê”),
          no qual a representante recebe semijoias em consignação para revenda e repassa à Monarê o valor das peças
          efetivamente comercializadas.
        </p>
      </Secao>

      <Secao titulo="2. Quem pode se candidatar">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Pessoa física com 18 anos ou mais;</li>
          <li>CPF regular e válido;</li>
          <li>Endereço de entrega em território nacional;</li>
          <li>Aceite destes termos e da Política de Privacidade.</li>
        </ul>
        <p>
          Restrição no CPF é solicitada no cadastro para fins informativos e <strong>não elimina</strong> a candidatura
          automaticamente.
        </p>
      </Secao>

      <Secao titulo="3. Processo de seleção">
        <p>
          O envio do formulário é uma candidatura, não uma contratação. A Monarê analisa o perfil e responde pelo
          WhatsApp informado em {PRAZO_RETORNO}. A aprovação é critério da Monarê e não gera obrigação de contratar.
        </p>
        <p>
          Cadastros preenchidos parcialmente ficam salvos como incompletos e podem ser retomados pela candidata ou
          contatados pela equipe para conclusão.
        </p>
      </Secao>

      <Secao titulo="4. Consignação e acerto">
        <p>
          Aprovada a candidatura, a representante recebe um mostruário de peças em consignação. A propriedade das peças
          permanece com a Monarê até a venda e o respectivo acerto.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Prazo do mostruário: <Pendencia>prazo em dias</Pendencia>
          </li>
          <li>
            Percentual de comissão / margem: <Pendencia>percentual e faixas</Pendencia>
          </li>
          <li>
            Forma e prazo de pagamento do acerto: <Pendencia>condições de pagamento</Pendencia>
          </li>
          <li>
            Custos de envio e devolução: <Pendencia>quem arca com o frete</Pendencia>
          </li>
        </ul>
      </Secao>

      <Secao titulo="5. Guarda, perda e avaria">
        <p>
          A representante é responsável pela guarda das peças recebidas enquanto estiverem sob sua posse. Em caso de
          perda, furto, roubo ou avaria: <Pendencia>regra de responsabilidade e ressarcimento</Pendencia>.
        </p>
      </Secao>

      <Secao titulo="6. Garantia das peças">
        <p>
          As semijoias Monarê têm garantia de 12 meses contra defeitos de fabricação, contados da data da venda ao
          cliente final, mediante certificado emitido pela representante. A garantia não cobre desgaste natural, mau uso
          ou contato com produtos químicos.
        </p>
        <p>
          Procedimento de acionamento da garantia: <Pendencia>fluxo de troca/reparo</Pendencia>.
        </p>
      </Secao>

      <Secao titulo="7. Uso da marca">
        <p>
          A representante pode divulgar as peças usando o material oficial fornecido pela Monarê, sem alterar marca,
          logotipo ou identidade visual, e sem se apresentar como funcionária, filial ou franqueada da Monarê.
        </p>
        <p>
          Regras de anúncio pago e uso do nome da marca em redes sociais: <Pendencia>política de divulgação</Pendencia>.
        </p>
      </Secao>

      <Secao titulo="8. Natureza da relação">
        <p>
          A parceria é de natureza comercial e autônoma. Estes termos não criam vínculo empregatício, societário ou de
          representação comercial exclusiva entre as partes.
        </p>
      </Secao>

      <Secao titulo="9. Encerramento">
        <p>
          Qualquer das partes pode encerrar a parceria mediante aviso de <Pendencia>prazo de aviso</Pendencia>, com
          devolução das peças em consignação e quitação dos valores pendentes.
        </p>
      </Secao>

      <Secao titulo="10. Foro e contato">
        <p>
          Fica eleito o foro de <Pendencia>comarca</Pendencia> para dirimir controvérsias. Dúvidas sobre estes termos:{' '}
          <Pendencia>e-mail de contato</Pendencia>.
        </p>
      </Secao>
    </LegalPage>
  );
}
