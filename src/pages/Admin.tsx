import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, UserCog, Receipt, Users, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Mostruario from '@/components/admin/Mostruario';
import Produtos from '@/components/admin/Produtos';
import Vendedoras from '@/components/admin/Vendedoras';
import NovaUsuaria from '@/components/admin/NovaUsuaria';
import Vendas from '@/components/admin/Vendas';
import Clientes from '@/components/admin/Clientes';

const tabTriggerClass =
  'flex-col sm:flex-row gap-0.5 sm:gap-0 h-auto py-2 text-[11px] sm:text-sm data-[state=active]:bg-rosa data-[state=active]:text-white';

export default function Admin() {
  return (
    <main className="min-h-screen bg-monare-gradient pb-12">
      <header className="px-4 sm:px-5 py-5 sm:py-6 max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-ink-soft hover:text-rosa text-sm transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-center">
          <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.15em] text-ink uppercase">Monarê</h1>
          <p className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Administração</p>
        </div>
        <div className="w-10 sm:w-16 shrink-0" />
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
            <TabsTrigger value="produtos" className={tabTriggerClass}>
              <Package size={14} className="sm:mr-1.5" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="nova-usuaria" className={tabTriggerClass}>
              <UserPlus size={14} className="sm:mr-1.5" />
              Nova Usuária
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
          <TabsContent value="produtos" className="mt-6">
            <Produtos />
          </TabsContent>
          <TabsContent value="nova-usuaria" className="mt-6">
            <NovaUsuaria />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
