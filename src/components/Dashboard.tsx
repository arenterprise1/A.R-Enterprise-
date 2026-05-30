import { TrendingUp, Smartphone, Users, Zap } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Product, Sale } from '../types';
import { Language, translations } from '../translations';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  lang: Language;
}

export default function Dashboard({ products, sales, lang }: DashboardProps) {
  const t = translations[lang];
  
  const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalProducts = products.length;
  const outOfStockItems = products.filter(p => p.stock <= 5).length;
  const todaySales = sales.filter(s => {
    const today = new Date().setHours(0, 0, 0, 0);
    return s.timestamp >= today;
  });
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const stats = [
    { label: t.todaySales, value: formatCurrency(todayRevenue), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t.totalProducts, value: totalProducts, icon: Smartphone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t.lowStock, value: outOfStockItems, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
    { label: t.totalRevenue, value: formatCurrency(totalSalesAmount), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="pro-card p-6 flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-all duration-300 shadow-sm border border-slate-100/50`}>
              <stat.icon size={26} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-tight mb-0.5">{stat.label}</div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="pro-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold flex items-center gap-3 text-slate-900">
            <TrendingUp size={20} className="text-indigo-600" />
            {t.recentSales}
          </h2>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-all uppercase tracking-tight">{t.viewAll}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.id}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight hidden sm:table-cell border-r border-slate-100">{t.items}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.total}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right sm:text-left">{t.time}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length > 0 ? (
                sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 border-r border-slate-50">
                      <p className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 w-fit px-1.5 py-0.5 rounded tracking-tighter">#{sale.id.slice(0, 8)}</p>
                      {sale.customerName && <p className="text-xs font-semibold text-slate-800 truncate max-w-[150px] mt-1">{sale.customerName}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 border-r border-slate-50 hidden sm:table-cell">
                      {sale.items.length} {t.itemsCount}
                    </td>
                    <td className="px-6 py-4 border-r border-slate-50">
                      <span className="text-base font-bold text-slate-900">{formatCurrency(sale.totalAmount)}</span>
                      <span className="text-[10px] text-slate-400 font-medium sm:hidden block">{sale.items.length} {t.itemsCount}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium text-right sm:text-left">
                      {new Date(sale.timestamp).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-3">
                       <Smartphone size={40} className="opacity-20 text-slate-400" />
                       <span className="text-sm font-bold uppercase tracking-tight">{t.noSalesYet}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
