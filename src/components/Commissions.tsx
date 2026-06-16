import React, { useState, useMemo } from 'react';
import { Coins, Filter, FileText, User, ShoppingBag, ArrowUpRight, TrendingUp, DollarSign, Calendar, Percent, Sparkles, Award } from 'lucide-react';
import { Sale, UserProfile } from '../types';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface CommissionsProps {
  sales: Sale[];
  staff: UserProfile[];
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  lang: 'bn' | 'en';
  userProfile: UserProfile;
}

export default function Commissions({ sales, staff, showToast, lang, userProfile }: CommissionsProps) {
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month'>('all');

  // Filter Sales based on selections
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Filter by Salesman
      if (selectedSalesmanId !== 'all') {
        if (s.salesmanId !== selectedSalesmanId) return false;
      }

      // 2. Filter by date range
      if (timeFilter === 'today') {
        const today = new Date();
        today.setHours(0,0,0,0);
        return s.timestamp >= today.getTime();
      }

      if (timeFilter === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        return s.timestamp >= startOfMonth.getTime();
      }

      return true;
    });
  }, [sales, selectedSalesmanId, timeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let salesCount = 0;
    let totalRevenue = 0;
    let totalCommissions = 0;

    filteredSales.forEach(s => {
      salesCount++;
      totalRevenue += s.payableAmount || 0;
      
      // Calculate commission amount
      // If the sale already has commissionAmount stored, use it. Otherwise, compute dynamically or fallback.
      if (s.commissionAmount) {
        totalCommissions += s.commissionAmount;
      } else {
        // Fallback: estimate from items if any has commission type
        s.items.forEach(item => {
          const type = item.commissionType || 'flat';
          const val = item.commissionValue || 0;
          const qty = item.quantity || 1;
          if (type === 'flat') {
            totalCommissions += val * qty;
          } else {
            totalCommissions += ((val / 100) * (item.price || 0)) * qty;
          }
        });
      }
    });

    return {
      salesCount,
      totalRevenue,
      totalCommissions
    };
  }, [filteredSales]);

  // Chart data formatting
  const chartData = useMemo(() => {
    // Group sales by date (last 7 recorded sales or days)
    const sorted = [...filteredSales].sort((a,b) => a.timestamp - b.timestamp);
    const groups: { [key: string]: { revenue: number, commission: number } } = {};

    sorted.forEach(s => {
      const dateStr = format(s.timestamp, 'dd MMM');
      if (!groups[dateStr]) {
        groups[dateStr] = { revenue: 0, commission: 0 };
      }
      groups[dateStr].revenue += s.payableAmount || 0;
      
      let comm = s.commissionAmount || 0;
      if (!comm) {
        s.items.forEach(item => {
          const type = item.commissionType || 'flat';
          const val = item.commissionValue || 0;
          const qty = item.quantity || 1;
          if (type === 'flat') {
            comm += val * qty;
          } else {
            comm += ((val / 100) * (item.price || 0)) * qty;
          }
        });
      }

      groups[dateStr].commission += comm;
    });

    return Object.keys(groups).map(key => ({
      date: key,
      ...groups[key]
    })).slice(-10); // Last 10 days/groups
  }, [filteredSales]);

  return (
    <div className="space-y-6" id="commissions-tracker-panel">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Coins className="text-indigo-400" />
          {lang === 'bn' ? 'সেলসম্যান বিক্রি ও কমিশন ট্র্যাকিং' : 'Salesman Commissions & Performance'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'bn' 
            ? 'বিক্রিত পণ্যের ভিত্তিতে কর্মরত সেলসম্যানদের জন্য স্বয়ংক্রিয় আলাদা আলাদা কমিশন ও পারফরম্যান্স হিসাব।' 
            : 'Track the list of sales closed by each salesman employee and calculated compensation payouts.'}
        </p>
      </div>

      {/* Filtering area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sales representative Selection */}
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">
              <User size={14} />
            </span>
            <select
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-bold"
              value={selectedSalesmanId}
              onChange={(e) => setSelectedSalesmanId(e.target.value)}
              id="salesman-filter-select"
            >
              <option value="all">{lang === 'bn' ? 'সকল সেলসম্যান (All Staff)' : 'All Salespersons'}</option>
              {staff.map(member => (
                <option key={member.uid} value={member.uid}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>

          {/* Time range Selection */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'সর্বমোট' : 'Overall'}
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'আজকের' : 'Today'}
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'এই মাস' : 'Month'}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {lang === 'bn' ? 'ফিল্টারকৃত রেজাল্ট:' : 'Matching count:'}{' '}
          <span className="font-bold text-slate-300">{filteredSales.length}</span> {lang === 'bn' ? 'টি বিক্রয় রসিদ' : 'sales'}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Sales volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {lang === 'bn' ? 'মোট বিক্রয় সংখ্যা' : 'Total closed deals'}
            </span>
            <h2 className="text-3xl font-sans font-black text-slate-100 font-mono">
              {stats.salesCount} <span className="text-sm font-bold text-slate-500 font-sans">{lang === 'bn' ? 'টি মেমো' : 'sales'}</span>
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <ShoppingBag size={22} />
          </div>
        </div>

        {/* Total revenue generated */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {lang === 'bn' ? 'মোট বিক্রয় ভলিউম' : 'Sales volume generated'}
            </span>
            <h2 className="text-3xl font-sans font-black text-emerald-400 font-mono">
              ৳{stats.totalRevenue.toLocaleString()}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <ArrowUpRight size={22} />
          </div>
        </div>

        {/* Total calculated salesman payout */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {lang === 'bn' ? 'মোট অর্জিত সেলস কমিশন' : 'Commission compensation'}
            </span>
            <h2 className="text-3xl font-sans font-black text-cyan-400 font-mono">
              ৳{stats.totalCommissions.toLocaleString()}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Coins size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
            <TrendingUp size={13} />
            {lang === 'bn' ? 'বিক্রয় বনাম কমিশন গ্রাফ' : 'Performance and commission trends'}
          </h3>

          {chartData.length > 0 ? (
            <div className="h-64 mt-4 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                  />
                  <Area type="monotone" name={lang === 'bn' ? 'মোট বিক্রি' : 'Sales Volume'} dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                  <Area type="monotone" name={lang === 'bn' ? 'কমিশন' : 'Commission Payout'} dataKey="commission" stroke="#06b6d4" fillOpacity={1} fill="url(#colorComm)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs italic">
              {lang === 'bn' ? 'পর্যাপ্ত ডেটা নেই' : 'Insufficient historical logs to project charts'}
            </div>
          )}
        </div>

        {/* Top sales worker rankings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
            <Award size={14} />
            {lang === 'bn' ? 'সেরা সেলস কর্মী র‍্যাংকিং' : 'Leaderboard performance'}
          </h3>

          <div className="divide-y divide-slate-800/60 font-sans text-xs">
            {staff.map((member, i) => {
              // Calculate sales and commission for this particular user
              const userSales = sales.filter(s => s.salesmanId === member.uid);
              const userRevenue = userSales.reduce((sum, s) => sum + (s.payableAmount || 0), 0);
              const userComm = userSales.reduce((sum, s) => {
                if (s.commissionAmount) return sum + s.commissionAmount;
                let c = 0;
                s.items.forEach(itm => {
                  const t = itm.commissionType || 'flat';
                  const v = itm.commissionValue || 0;
                  const q = itm.quantity || 1;
                  if (t === 'flat') c += v * q;
                  else c += ((v / 100) * (itm.price || 0)) * q;
                });
                return sum + c;
              }, 0);

              return (
                <div key={member.uid} className="py-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-950 font-black flex items-center justify-center text-slate-400 font-mono text-[10px]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-200">{member.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{member.role}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-extrabold text-slate-100 font-mono">৳{userRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-cyan-400 font-bold font-mono">৳{userComm.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}

            {staff.length === 0 && (
              <p className="text-center text-slate-500 italic py-8">{lang === 'bn' ? 'কোন সেলস কর্মী তালিকাভুক্ত নেই' : 'No staff members listed yet.'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed matching transactions list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="wh-sales-commission-records">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <FileText size={13} className="text-indigo-400" />
            {lang === 'bn' ? 'বিক্রয় ভিত্তিক কমিশন বিবরণী' : 'Transaction Payout Logs'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-500 font-black uppercase tracking-wider">
                <th className="py-3 px-5">{lang === 'bn' ? 'চালান আইডি (Invoice)' : 'Invoice ID'}</th>
                <th className="py-3 px-5">{lang === 'bn' ? 'তারিখ' : 'Closed date'}</th>
                <th className="py-3 px-5">{lang === 'bn' ? 'বিক্রেতা' : 'Closed by'}</th>
                <th className="py-3 px-5">{lang === 'bn' ? 'আইটেম বিবরণী' : 'Products sold'}</th>
                <th className="py-3 px-5">{lang === 'bn' ? 'মোট মূল্য' : 'Order cost'}</th>
                <th className="py-3 px-5 text-right font-black text-cyan-400">{lang === 'bn' ? 'প্রাপ্ত কমিশন' : 'Commission won'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSales.map((sale) => {
                let comm = sale.commissionAmount || 0;
                if (!comm) {
                  sale.items.forEach(item => {
                    const type = item.commissionType || 'flat';
                    const val = item.commissionValue || 0;
                    const qty = item.quantity || 1;
                    if (type === 'flat') {
                      comm += val * qty;
                    } else {
                      comm += ((val / 100) * (item.price || 0)) * qty;
                    }
                  });
                }

                return (
                  <tr key={sale.id} className="hover:bg-slate-950/10 transition-all text-slate-300 font-mono">
                    <td className="py-3 px-5 text-indigo-400 font-black">
                      #{sale.id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-5 text-slate-400 font-sans">
                      {format(sale.timestamp, 'dd MMM yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                    </td>
                    <td className="py-3 px-5 text-slate-200 font-sans font-bold">
                      {sale.salesmanName || (lang === 'bn' ? 'সরাসরি (দোকান শপ)' : 'Direct Sale')}
                    </td>
                    <td className="py-3 px-5 font-sans">
                      <div className="space-y-0.5 max-w-xs overflow-hidden text-ellipsis">
                        {sale.items.map((itm, i) => (
                          <div key={i} className="text-slate-300 font-semibold truncate text-[11px]">
                            {itm.name} x {itm.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-200 font-black font-mono">
                      ৳{sale.payableAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right font-black text-cyan-400 font-mono text-sm">
                      ৳{comm.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans italic text-xs">
                    {lang === 'bn' ? 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি।' : 'No verified salesman commission payouts found.'}
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
