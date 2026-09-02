import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { AppSelect } from '@/components/ui/app-select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Sale = {
  id: string;
  user_id: string | null;
  produto_id: string | null;
  produto_nome: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  data_venda: string;
  valor_venda: number | null;
  comissao_percentual: number | null;
  comissao_valor: number | null;
  garantia_uuid: string | null;
  created_at: string;
};

type Seller = {
  user_id: string;
  display_name: string | null;
  ativo: boolean;
  role: string | null;
  region: string;
};

type SellerMetric = {
  id: string;
  nome: string;
  tipo: string;
  regiao: string;
  faturamento: number;
  comissao: number;
  itens: number;
  pedidos: number;
  clientes: number;
  ticket: number;
  participacao: number;
  estoque: number;
};

const NOT_INFORMED = 'Não informada';
const PAGE_SIZE = 1000;

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function localISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialPeriod() {
  const today = new Date();
  return {
    start: localISO(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: localISO(today),
  };
}

function orderKey(sale: Sale) {
  return sale.garantia_uuid || sale.id;
}

function roleLabel(role: string | null) {
  if (role === 'b2b') return 'B2B';
  if (role === 'revendedora') return 'Revendedora';
  return role || 'Não informado';
}

async function loadAllSales(): Promise<Sale[]> {
  const result: Sale[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('vendas')
      .select('id,user_id,produto_id,produto_nome,cliente_nome,cliente_whatsapp,data_venda,valor_venda,comissao_percentual,comissao_valor,garantia_uuid,created_at')
      .order('data_venda', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as Sale[];
    result.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return result;
}

function MetricCard({ icon: Icon, label, value, detail }: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-bege bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        <Icon size={13} className="text-rosa" />
        {label}
      </div>
      <p className="font-serif text-2xl text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-soft">{detail}</p>
    </div>
  );
}

export default function VendasRelatorio() {
  const initial = useMemo(initialPeriod, []);
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stockBySeller, setStockBySeller] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [sellerFilter, setSellerFilter] = useState('todos');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [regionFilter, setRegionFilter] = useState('todos');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [allSales, profilesResult, rolesResult, candidatesResult, stockResult] = await Promise.all([
          loadAllSales(),
          supabase.from('profiles').select('user_id,display_name,ativo').order('display_name'),
          supabase.from('user_roles').select('user_id,role'),
          supabase.from('candidatas_revenda').select('user_id,endereco_cidade,endereco_estado').not('user_id', 'is', null),
          supabase.from('estoque').select('user_id,quantidade'),
        ]);
        if (profilesResult.error) throw profilesResult.error;
        if (rolesResult.error) throw rolesResult.error;
        if (candidatesResult.error) throw candidatesResult.error;
        if (stockResult.error) throw stockResult.error;

        const roles = new Map<string, string>();
        (rolesResult.data ?? []).forEach((row) => {
          if (row.role === 'revendedora' || row.role === 'b2b') roles.set(row.user_id, row.role);
        });
        const regions = new Map<string, string>();
        (candidatesResult.data ?? []).forEach((row) => {
          if (!row.user_id || regions.has(row.user_id)) return;
          const city = row.endereco_cidade?.trim();
          const state = row.endereco_estado?.trim();
          regions.set(row.user_id, city ? `${city}${state ? `/${state}` : ''}` : NOT_INFORMED);
        });
        const stock: Record<string, number> = {};
        (stockResult.data ?? []).forEach((row) => {
          stock[row.user_id] = (stock[row.user_id] || 0) + Number(row.quantidade || 0);
        });
        const sellerRows = (profilesResult.data ?? [])
          .filter((profile) => roles.has(profile.user_id))
          .map((profile) => ({
            ...profile,
            role: roles.get(profile.user_id) || null,
            region: regions.get(profile.user_id) || NOT_INFORMED,
          }));

        if (!active) return;
        setSales(allSales);
        setSellers(sellerRows);
        setStockBySeller(stock);
      } catch (error) {
        if (active) toast({
          title: 'Erro ao carregar relatório de vendas',
          description: error instanceof Error ? error.message : 'Não foi possível consultar os dados.',
          variant: 'destructive',
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const sellerById = useMemo(() => new Map(sellers.map((seller) => [seller.user_id, seller])), [sellers]);
  const regions = useMemo(() => [...new Set(sellers.map((seller) => seller.region))].sort(), [sellers]);

  const filtered = useMemo(() => sales.filter((sale) => {
    const seller = sale.user_id ? sellerById.get(sale.user_id) : undefined;
    if (startDate && sale.data_venda < startDate) return false;
    if (endDate && sale.data_venda > endDate) return false;
    if (sellerFilter !== 'todos' && sale.user_id !== sellerFilter) return false;
    if (roleFilter !== 'todos' && seller?.role !== roleFilter) return false;
    if (regionFilter !== 'todos' && (seller?.region || NOT_INFORMED) !== regionFilter) return false;
    return true;
  }), [sales, sellerById, startDate, endDate, sellerFilter, roleFilter, regionFilter]);

  const report = useMemo(() => {
    const revenue = filtered.reduce((sum, sale) => sum + Number(sale.valor_venda || 0), 0);
    const commission = filtered.reduce((sum, sale) => sum + Number(sale.comissao_valor || 0), 0);
    const orders = new Set(filtered.map(orderKey));
    const customers = new Set(filtered.map((sale) => sale.cliente_whatsapp?.replace(/\D/g, '')).filter(Boolean));
    const activeSellers = new Set(filtered.map((sale) => sale.user_id).filter(Boolean));

    const sellerMetrics = new Map<string, SellerMetric & { orderIds: Set<string>; customerIds: Set<string> }>();
    filtered.forEach((sale) => {
      const id = sale.user_id || 'sem_vendedor';
      const seller = sale.user_id ? sellerById.get(sale.user_id) : undefined;
      const current = sellerMetrics.get(id) || {
        id,
        nome: seller?.display_name || 'Vendedor não identificado',
        tipo: roleLabel(seller?.role || null),
        regiao: seller?.region || NOT_INFORMED,
        faturamento: 0,
        comissao: 0,
        itens: 0,
        pedidos: 0,
        clientes: 0,
        ticket: 0,
        participacao: 0,
        estoque: sale.user_id ? stockBySeller[sale.user_id] || 0 : 0,
        orderIds: new Set<string>(),
        customerIds: new Set<string>(),
      };
      current.faturamento += Number(sale.valor_venda || 0);
      current.comissao += Number(sale.comissao_valor || 0);
      current.itens += 1;
      current.orderIds.add(orderKey(sale));
      if (sale.cliente_whatsapp) current.customerIds.add(sale.cliente_whatsapp.replace(/\D/g, ''));
      sellerMetrics.set(id, current);
    });
    const ranking = [...sellerMetrics.values()].map((metric) => ({
      ...metric,
      pedidos: metric.orderIds.size,
      clientes: metric.customerIds.size,
      ticket: metric.orderIds.size ? metric.faturamento / metric.orderIds.size : 0,
      participacao: revenue ? (metric.faturamento / revenue) * 100 : 0,
    })).sort((a, b) => b.faturamento - a.faturamento);

    const regionMetrics = new Map<string, { regiao: string; faturamento: number; itens: number; pedidos: Set<string>; vendedores: Set<string> }>();
    filtered.forEach((sale) => {
      const seller = sale.user_id ? sellerById.get(sale.user_id) : undefined;
      const region = seller?.region || NOT_INFORMED;
      const current = regionMetrics.get(region) || { regiao: region, faturamento: 0, itens: 0, pedidos: new Set(), vendedores: new Set() };
      current.faturamento += Number(sale.valor_venda || 0);
      current.itens += 1;
      current.pedidos.add(orderKey(sale));
      if (sale.user_id) current.vendedores.add(sale.user_id);
      regionMetrics.set(region, current);
    });
    const byRegion = [...regionMetrics.values()].map((metric) => ({
      regiao: metric.regiao,
      faturamento: metric.faturamento,
      itens: metric.itens,
      pedidos: metric.pedidos.size,
      vendedores: metric.vendedores.size,
      ticket: metric.pedidos.size ? metric.faturamento / metric.pedidos.size : 0,
    })).sort((a, b) => b.faturamento - a.faturamento);

    const productMetrics = new Map<string, { produto: string; faturamento: number; itens: number }>();
    filtered.forEach((sale) => {
      const key = sale.produto_id || sale.produto_nome;
      const current = productMetrics.get(key) || { produto: sale.produto_nome, faturamento: 0, itens: 0 };
      current.faturamento += Number(sale.valor_venda || 0);
      current.itens += 1;
      productMetrics.set(key, current);
    });
    const products = [...productMetrics.values()].sort((a, b) => b.faturamento - a.faturamento);

    const daySpan = startDate && endDate
      ? (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86_400_000
      : 0;
    const groupByMonth = daySpan > 93;
    const timeline = new Map<string, { periodo: string; faturamento: number; itens: number }>();
    filtered.forEach((sale) => {
      const key = groupByMonth ? sale.data_venda.slice(0, 7) : sale.data_venda;
      const [year, month, day] = key.split('-');
      const label = groupByMonth ? `${month}/${year}` : `${day}/${month}`;
      const current = timeline.get(key) || { periodo: label, faturamento: 0, itens: 0 };
      current.faturamento += Number(sale.valor_venda || 0);
      current.itens += 1;
      timeline.set(key, current);
    });

    return {
      revenue,
      commission,
      orders: orders.size,
      customers: customers.size,
      activeSellers: activeSellers.size,
      averageTicket: orders.size ? revenue / orders.size : 0,
      itemsPerOrder: orders.size ? filtered.length / orders.size : 0,
      ranking,
      byRegion,
      products,
      timeline: [...timeline.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
    };
  }, [filtered, sellerById, stockBySeller, startDate, endDate]);

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const summary = [
      { Indicador: 'Período', Valor: `${startDate || 'início'} a ${endDate || 'hoje'}` },
      { Indicador: 'Faturamento', Valor: report.revenue },
      { Indicador: 'Pedidos', Valor: report.orders },
      { Indicador: 'Itens vendidos', Valor: filtered.length },
      { Indicador: 'Ticket médio', Valor: report.averageTicket },
      { Indicador: 'Comissão total', Valor: report.commission },
      { Indicador: 'Clientes únicos', Valor: report.customers },
      { Indicador: 'Vendedores com venda', Valor: report.activeSellers },
    ];
    const sellerRows = report.ranking.map((row, index) => ({
      Posição: index + 1,
      Vendedor: row.nome,
      Tipo: row.tipo,
      Região: row.regiao,
      Faturamento: row.faturamento,
      Pedidos: row.pedidos,
      'Itens vendidos': row.itens,
      'Ticket médio': row.ticket,
      'Clientes únicos': row.clientes,
      Comissão: row.comissao,
      'Participação (%)': Number(row.participacao.toFixed(1)),
      'Estoque atual': row.estoque,
    }));
    const regionRows = report.byRegion.map((row) => ({
      Região: row.regiao,
      Faturamento: row.faturamento,
      Pedidos: row.pedidos,
      'Itens vendidos': row.itens,
      Vendedores: row.vendedores,
      'Ticket médio': row.ticket,
    }));
    const productRows = report.products.map((row, index) => ({
      Posição: index + 1,
      Produto: row.produto,
      'Itens vendidos': row.itens,
      Faturamento: row.faturamento,
      'Preço médio': row.itens ? row.faturamento / row.itens : 0,
    }));
    const detailRows = filtered.map((sale) => {
      const seller = sale.user_id ? sellerById.get(sale.user_id) : undefined;
      return {
        Data: sale.data_venda,
        Pedido: orderKey(sale),
        Vendedor: seller?.display_name || 'Não identificado',
        Tipo: roleLabel(seller?.role || null),
        Região: seller?.region || NOT_INFORMED,
        Produto: sale.produto_nome,
        Cliente: sale.cliente_nome,
        WhatsApp: sale.cliente_whatsapp,
        Valor: Number(sale.valor_venda || 0),
        'Comissão (%)': Number(sale.comissao_percentual || 0),
        'Comissão (R$)': Number(sale.comissao_valor || 0),
      };
    });
    [
      ['Resumo', summary],
      ['Por vendedor', sellerRows],
      ['Por região', regionRows],
      ['Produtos', productRows],
      ['Vendas detalhadas', detailRows],
    ].forEach(([name, rows]) => {
      const sheet = XLSX.utils.json_to_sheet(rows as Record<string, string | number>[]);
      const first = (rows as Record<string, unknown>[])[0];
      if (first) sheet['!cols'] = Object.keys(first).map((key) => ({ wch: Math.max(16, key.length + 2) }));
      XLSX.utils.book_append_sheet(workbook, sheet, name as string);
    });
    XLSX.writeFile(workbook, `relatorio_vendas_${startDate || 'inicio'}_${endDate || 'hoje'}.xlsx`);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rosa" /></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-bege bg-white p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
              <BarChart3 size={18} className="text-rosa" />
              Vendas e desempenho
            </h2>
            <p className="mt-1 text-xs text-ink-soft">Resultados por vendedor, região, canal comercial e produto.</p>
          </div>
          <Button onClick={exportExcel} disabled={!filtered.length} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90">
            <FileSpreadsheet size={15} />
            Exportar Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Data inicial</label>
            <DatePickerInput value={startDate} onValueChange={setStartDate} className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Data final</label>
            <DatePickerInput value={endDate} onValueChange={setEndDate} className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Vendedor</label>
            <AppSelect
              value={sellerFilter}
              onValueChange={setSellerFilter}
              options={[{ value: 'todos', label: 'Todos' }, ...sellers.map((seller) => ({ value: seller.user_id, label: seller.display_name || seller.user_id }))]}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Tipo</label>
            <AppSelect
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={[{ value: 'todos', label: 'Todos' }, { value: 'revendedora', label: 'Revendedora' }, { value: 'b2b', label: 'B2B' }]}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Região da vendedora</label>
            <AppSelect
              value={regionFilter}
              onValueChange={setRegionFilter}
              options={[{ value: 'todos', label: 'Todas' }, ...regions.map((region) => ({ value: region, label: region }))]}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Faturamento" value={money(report.revenue)} detail={`${report.orders} pedido(s)`} />
        <MetricCard icon={Receipt} label="Ticket médio" value={money(report.averageTicket)} detail="Por pedido" />
        <MetricCard icon={ShoppingBag} label="Itens vendidos" value={String(filtered.length)} detail={`${report.itemsPerOrder.toFixed(1)} item(ns) por pedido`} />
        <MetricCard icon={Wallet} label="Comissão" value={money(report.commission)} detail={report.revenue ? `${((report.commission / report.revenue) * 100).toFixed(1)}% do faturamento` : 'Sem vendas'} />
        <MetricCard icon={Users} label="Clientes únicos" value={String(report.customers)} detail="Por WhatsApp" />
        <MetricCard icon={Users} label="Vendedores ativos" value={String(report.activeSellers)} detail={`${sellers.length} cadastrado(s)`} />
        <MetricCard icon={MapPin} label="Regiões com venda" value={String(report.byRegion.length)} detail="Cidade/UF da vendedora" />
        <MetricCard icon={Package} label="Produtos vendidos" value={String(report.products.length)} detail="Produtos distintos" />
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border border-bege bg-white py-16 text-center text-sm text-ink-soft">Nenhuma venda encontrada nos filtros selecionados.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-bege bg-white p-5">
              <h3 className="font-serif text-lg text-ink">Evolução das vendas</h3>
              <p className="mb-4 text-xs text-ink-soft">Faturamento ao longo do período</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.timeline} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd1" />
                    <XAxis dataKey="periodo" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#BA737A" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-bege bg-white p-5">
              <h3 className="font-serif text-lg text-ink">Top vendedores</h3>
              <p className="mb-4 text-xs text-ink-soft">Ranking por faturamento no período</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.ranking.slice(0, 8)} layout="vertical" margin={{ left: 28, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd1" />
                    <XAxis type="number" fontSize={10} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                    <YAxis type="category" dataKey="nome" width={105} fontSize={10} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#BA737A" radius={[0, 7, 7, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-bege bg-white p-5">
            <h3 className="font-serif text-lg text-ink">Desempenho por vendedor</h3>
            <p className="mb-4 text-xs text-ink-soft">Faturamento, volume, clientes, comissão e estoque atual</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="px-2 py-2">#</th><th className="px-2 py-2">Vendedor</th><th className="px-2 py-2">Região</th>
                  <th className="px-2 py-2 text-right">Faturamento</th><th className="px-2 py-2 text-right">Pedidos</th>
                  <th className="px-2 py-2 text-right">Itens</th><th className="px-2 py-2 text-right">Ticket médio</th>
                  <th className="px-2 py-2 text-right">Clientes</th><th className="px-2 py-2 text-right">Comissão</th>
                  <th className="px-2 py-2 text-right">Participação</th><th className="px-2 py-2 text-right">Estoque</th>
                </tr></thead>
                <tbody>{report.ranking.map((row, index) => (
                  <tr key={row.id} className="border-b border-border/60 hover:bg-bege-light/40">
                    <td className="px-2 py-2 text-ink-soft">{index + 1}</td>
                    <td className="px-2 py-2"><p className="font-medium text-ink">{row.nome}</p><p className="text-[10px] text-ink-soft">{row.tipo}</p></td>
                    <td className="px-2 py-2 text-ink-soft">{row.regiao}</td>
                    <td className="px-2 py-2 text-right font-semibold">{money(row.faturamento)}</td>
                    <td className="px-2 py-2 text-right">{row.pedidos}</td><td className="px-2 py-2 text-right">{row.itens}</td>
                    <td className="px-2 py-2 text-right">{money(row.ticket)}</td><td className="px-2 py-2 text-right">{row.clientes}</td>
                    <td className="px-2 py-2 text-right text-rosa">{money(row.comissao)}</td>
                    <td className="px-2 py-2 text-right">{row.participacao.toFixed(1)}%</td><td className="px-2 py-2 text-right">{row.estoque}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-bege bg-white p-5">
              <h3 className="font-serif text-lg text-ink">Desempenho por região</h3>
              <p className="mb-4 text-xs text-ink-soft">Região vinculada ao cadastro da vendedora</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.byRegion.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd1" />
                    <XAxis dataKey="regiao" fontSize={9} interval={0} angle={-20} textAnchor="end" height={55} />
                    <YAxis fontSize={10} tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#C9A96E" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-bege bg-white p-5">
              <h3 className="font-serif text-lg text-ink">Produtos com melhor desempenho</h3>
              <p className="mb-4 text-xs text-ink-soft">Ordenados pelo faturamento gerado</p>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2">Produto</th><th className="py-2 text-right">Itens</th><th className="py-2 text-right">Faturamento</th>
                </tr></thead><tbody>{report.products.map((row) => (
                  <tr key={row.produto} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-ink">{row.produto}</td><td className="py-2 text-right">{row.itens}</td>
                    <td className="py-2 text-right font-medium">{money(row.faturamento)}</td>
                  </tr>
                ))}</tbody></table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
