import React, { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { FileText, Download, Filter, Eye, Trash2, User, Search } from 'lucide-react';
import { Sale, ShopInfo, UserProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import Receipt from './Receipt';
import { Language, translations } from '../translations';

interface HistoryProps {
  sales: Sale[];
  shopInfo: ShopInfo;
  onDeleteSale: (id: string) => void;
  userProfile: UserProfile;
  lang: Language;
}

export default function History({ sales, shopInfo, onDeleteSale, userProfile, lang }: HistoryProps) {
  const t = translations[lang];
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSales = sales.filter(sale => 
    sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.customerPhone?.includes(searchQuery) ||
    sale.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedSales = [...filteredSales].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t.searchHistory}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pro-input pl-11 shadow-sm"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-11 pro-btn-secondary shadow-sm">
            <Download size={16} /> {t.report}
          </button>
        </div>
      </div>

      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.invoice}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.customers}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.date} & {t.time}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.items}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right border-r border-slate-100">{t.discount}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right border-r border-slate-100">{t.paidAmount}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSales.length > 0 ? (
                sortedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-indigo-400" />
                        <span className="font-mono text-[11px] font-bold text-slate-900 uppercase bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter">#{sale.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sale.customerName ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{sale.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{sale.customerPhone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">{t.unknown}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 font-medium">
                        {format(new Date(sale.timestamp), 'PPpp', { locale: lang === 'bn' ? bn : enUS })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {sale.items.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-indigo-50/50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100">
                            {item.productName} ({item.quantity})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-red-500 font-bold">
                        {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-bold text-slate-900">
                        {formatCurrency(sale.payableAmount || (sale.totalAmount - (sale.discount || 0)))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedSale(sale)}
                          className="flex items-center gap-2 px-3 h-8 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-indigo-700 transition-all shadow-sm"
                        >
                          <Eye size={12} /> {t.memo}
                        </button>
                        {userProfile.role === 'owner' && (
                          <button 
                            onClick={() => {
                              if (confirm(t.confirmDeleteSale)) {
                                onDeleteSale(sale.id);
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title={t.actions_delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-300 font-semibold italic">
                    {t.noSalesYet}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <Receipt sale={selectedSale} shopInfo={shopInfo} onClose={() => setSelectedSale(null)} lang={lang} />
      )}
    </div>
  );
}
