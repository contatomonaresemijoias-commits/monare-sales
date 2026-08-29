import LegalPage, { Pendencia, Secao } from '@/components/legal/LegalPage';
import usePageMeta from '@/hooks/usePageMeta';
import { PRAZO_RETORNO } from '@/content/landing';

/**
 * O conteúdo abaixo descreve exatamente os dados que o formulário de
 * /cadastro coleta hoje (ver a tabela candidatas_revenda e a
 * edge function reseller-registration). Os campos marcados com <Pendencia>
 * dependem de informação da empresa e precisam de revisão jurídica antes de
 * publicar.
 */
export default function PoliticaPrivacidade() {
  usePageMeta({
    title: 'Política de Privacidade — Monarê Semijoias',
    description: 'Como a Monarê Semijoias coleta, usa e protege os dados das candidatas a representante.',
  });

  return (
    <LegalPage titulo="Política de Privacidade" atualizadoEm="30 de julho de 2026">
      <Secao titulo="1. Quem é o controlador dos seus dados">
        <p>
          O controlador dos dados pessoais tratados nesta página é <Pendencia>razão social</Pendencia>, inscrita no CNPJ
          sob o nº <Pendencia>CNPJ</Pendencia>, com sede em <Pendencia>endereço completo</Pendencia>, aqui referida como
          “Monarê”.
        </p>
        <p>
          Encarregado pelo tratamento de dados pessoais (DPO): <Pendencia>nome e e-mail do encarregado</Pendencia>.
        </p>
      </Secao>

      <Secao titulo="2. Quais dados coletamos">
        <p>Ao preencher o formulário de candidatura a representante, coletamos:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Identificação e contato:</strong> nome completo, CPF, data de nascimento, número de WhatsApp e
            e-mail.
          </li>
          <li>
            <strong>Endereço:</strong> CEP, rua, número, complemento, bairro, cidade e estado.
          </li>
          <li>
            <strong>Perfil comercial:</strong> canal principal de vendas, perfil do Instagram, modalidade de parceria de
            interesse, como conheceu a marca, ocupação atual e experiência com vendas.
          </li>
          <li>
            <strong>Respostas abertas:</strong> informação sobre restrição de CPF, motivação para a candidatura e
            objetivos pessoais com a revenda.
          </li>
          <li>
            <strong>Registros técnicos:</strong> data e hora do envio e da última atualização do cadastro.
          </li>
        </ul>
        <p>
          O CEP informado é consultado no serviço público ViaCEP apenas para preencher o endereço automaticamente. Nenhum
          outro dado seu é enviado nessa consulta.
        </p>
      </Secao>

      <Secao titulo="3. Por que tratamos esses dados">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Analisar sua candidatura ao programa de revenda e decidir sobre a aprovação;</li>
          <li>Entrar em contato pelo WhatsApp ou e-mail sobre o andamento do processo, em {PRAZO_RETORNO};</li>
          <li>Retomar um cadastro que ficou incompleto, para você não precisar preencher tudo de novo;</li>
          <li>Cumprir obrigações legais e regulatórias aplicáveis, quando houver.</li>
        </ul>
        <p>
          Não usamos seus dados para publicidade de terceiros e não os vendemos. Caso passemos a enviar comunicações
          promocionais, isso será feito apenas com o seu consentimento específico, revogável a qualquer momento.
        </p>
      </Secao>

      <Secao titulo="4. Base legal">
        <p>
          O tratamento se apoia no seu <strong>consentimento</strong> (art. 7º, I da Lei 13.709/2018), manifestado nos
          aceites do formulário, e nos <strong>procedimentos preliminares relacionados a contrato</strong> do qual você é
          parte interessada (art. 7º, V), já que a candidatura antecede uma eventual parceria comercial.
        </p>
      </Secao>

      <Secao titulo="5. Com quem compartilhamos">
        <p>
          Seus dados são armazenados na infraestrutura da Supabase Inc., que atua como operadora e processa os dados
          exclusivamente sob nossas instruções. O acesso interno é restrito às pessoas da Monarê responsáveis pela
          seleção e pelo relacionamento com representantes.
        </p>
        <p>
          O formulário de cadastro usa o Cloudflare Turnstile, da Cloudflare, Inc., apenas para confirmar que quem
          preenche é uma pessoa e não um robô. Para isso a Cloudflare recebe dados técnicos da sua navegação (como
          endereço IP e características do navegador) e não recebe as informações que você digita no formulário. A
          ferramenta não é usada para publicidade nem para criar perfil comercial seu.
        </p>
        <p>
          Região de armazenamento dos dados: <Pendencia>região do projeto Supabase</Pendencia>. Havendo transferência
          internacional, ela ocorre com as garantias exigidas pelos arts. 33 a 36 da LGPD.
        </p>
      </Secao>

      <Secao titulo="6. Por quanto tempo guardamos">
        <p>
          Cadastros <strong>aprovados</strong> são mantidos enquanto durar a relação de parceria e pelo prazo legal
          aplicável após o seu término.
        </p>
        <p>
          Cadastros <strong>não aprovados ou incompletos</strong> são mantidos por <Pendencia>prazo de retenção</Pendencia>{' '}
          e depois eliminados ou anonimizados, salvo se houver obrigação legal de guarda.
        </p>
      </Secao>

      <Secao titulo="7. Seus direitos">
        <p>
          Você pode, a qualquer momento, solicitar confirmação da existência de tratamento, acesso, correção,
          anonimização, portabilidade ou eliminação dos seus dados, além de revogar o consentimento — conforme o art. 18
          da LGPD.
        </p>
        <p>
          Para exercer qualquer desses direitos, escreva para <Pendencia>e-mail de contato para titulares</Pendencia>.
          Respondemos em até 15 dias.
        </p>
        <p>
          A revogação do consentimento durante o processo seletivo encerra a análise da sua candidatura, já que os dados
          são necessários para avaliá-la.
        </p>
      </Secao>

      <Secao titulo="8. Segurança">
        <p>
          O envio do formulário é feito por conexão criptografada e gravado por um serviço com credencial privilegiada —
          o navegador nunca escreve direto no banco. O acesso de leitura é restrito a contas administrativas
          autenticadas.
        </p>
        <p>
          Guardamos localmente no seu navegador apenas um identificador do rascunho do cadastro, para permitir retomá-lo.
          Você pode apagá-lo limpando os dados do site.
        </p>
      </Secao>

      <Secao titulo="9. Alterações">
        <p>
          Podemos atualizar esta política. A data de última atualização no topo sempre indicará a versão vigente.
        </p>
      </Secao>
    </LegalPage>
  );
}
