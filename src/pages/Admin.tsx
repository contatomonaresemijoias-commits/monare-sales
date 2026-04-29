import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Boxes, UserCog, Receipt } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Mostruario from '@/components/admin/Mostruario';
import Produtos from '@/components/admin/Produtos';
import Vendedoras from '@/components/admin/Vendedoras';
import Vendas from '@/components/admin/Vendas';

export default function Admin() {
  return (
    <main className="min-h-screen bg-monare-gradient pb-12">
      <header className="px-5 py-6 max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-ink-soft hover:text-rosa text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-center">
          <h1 className="font-serif text-3xl tracking-[0.15em] text-ink uppercase">Monarê</h1>
          <p className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Administração</p>
        </div>
        <div className="w-16" />
      </header>

      <div className="max-w-5xl mx-auto px-5">
        <Tabs defaultValue="mostruario" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/70 border border-bege">
            <TabsTrigger value="mostruario" className="data-[state=active]:bg-rosa data-[state=active]:text-white">
              <Boxes size={14} className="mr-1.5" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="vendedoras" className="data-[state=active]:bg-rosa data-[state=active]:text-white">
              <UserCog size={14} className="mr-1.5" />
              Revendedoras
            </TabsTrigger>
            <TabsTrigger value="vendas" className="data-[state=active]:bg-rosa data-[state=active]:text-white">
              <Receipt size={14} className="mr-1.5" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="produtos" className="data-[state=active]:bg-rosa data-[state=active]:text-white">
              <Package size={14} className="mr-1.5" />
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mostruario" className="mt-6">
            <Mostruario />
          </TabsContent>
          <TabsContent value="vendedoras" className="mt-6">
            <Vendedoras />
          </TabsContent>
          <TabsContent value="vendas" className="mt-6">
            <Vendas />
          </TabsContent>
          <TabsContent value="produtos" className="mt-6">
            <Produtos />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
