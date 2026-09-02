import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, UserCog, Receipt, Users, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Mostruario from '@/components/admin/Mostruario';
import Produtos from '@/components/admin/Produtos';
import Vendedoras from '@/components/admin/Vendedoras';
import Vendas from '@/components/admin/Vendas';
import Clientes from '@/components/admin/Clientes';
import VendasRelatorio from '@/components/admin/VendasRelatorio';
import { RH_PATH } from '@/lib/acesso';
import { PAINEL_PATH } from '@/content/landing';

const tabTriggerClass =
  'flex-col sm:flex-row gap-0.5 sm:gap-0 h-auto py-2 text-[11px] sm:text-sm data-[state=active]:bg-rosa data-[state=active]:text-white';

/**
 * Painel comercial: estoque, catálogo, vendas, clientes e comissão.
 *
 * Captação, contratação e ativação/inativação de contas moraram aqui até a
 * separação por papel — agora vivem no /rh, com acesso também para quem é RH.
 * A aba Revendedoras continua nesta tela, mas só com a visão operacional.
 */
export default function Admin() {
  return (
    <main className="min-h-screen bg-monare-gradient pb-12">
      <header className="px-4 sm:px-5 py-5 sm:py-6 max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link
          to={PAINEL_PATH}
          className="inline-flex items-center gap-2 text-ink-soft hover:text-rosa text-sm transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-center">
          <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.15em] text-ink uppercase">Monarê</h1>
          <p className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Administração</p>
        </div>
        <Link
          to={RH_PATH}
          className="inline-flex items-center gap-1.5 text-ink-soft hover:text-rosa text-xs transition-colors shrink-0"
          title="Captação, contratação e status das contas"
        >
          <Users size={14} />
          <span className="hidden sm:inline">RH</span>
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-5">
        <Tabs defaultValue="mostruario" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 bg-white/70 border border-bege p-1">
            <TabsTrigger value="mostruario" className={tabTriggerClass}>
              <Boxes size={14} className="sm:mr-1.5" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="vendedoras" className={tabTriggerClass}>
              <UserCog size={14} className="sm:mr-1.5" />
              Revendedoras
            </TabsTrigger>
            <TabsTrigger value="clientes" className={tabTriggerClass}>
              <Users size={14} className="sm:mr-1.5" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="vendas" className={tabTriggerClass}>
              <Receipt size={14} className="sm:mr-1.5" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="relatorio" className={tabTriggerClass}>
              <BarChart3 size={14} className="sm:mr-1.5" />
              Relatório
            </TabsTrigger>
            <TabsTrigger value="produtos" className={tabTriggerClass}>
              <Package size={14} className="sm:mr-1.5" />
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mostruario" className="mt-6">
            <Mostruario />
          </TabsContent>
          <TabsContent value="vendedoras" className="mt-6">
            <Vendedoras />
          </TabsContent>
          <TabsContent value="clientes" className="mt-6">
            <Clientes />
          </TabsContent>
          <TabsContent value="vendas" className="mt-6">
            <Vendas />
          </TabsContent>
          <TabsContent value="relatorio" className="mt-6">
            <VendasRelatorio />
          </TabsContent>
          <TabsContent value="produtos" className="mt-6">
            <Produtos />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
