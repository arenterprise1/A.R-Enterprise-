import React, { useState } from 'react';
import { Search, Calendar, User, Phone, Tag, Clock, ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle, Wrench, RefreshCw, FileText } from 'lucide-react';
import { Sale, ServiceJob, RMA } from '../types';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

interface SmartSearchProps {
  sales: Sale[];
  serviceJobs: ServiceJob[];
  rmas: RMA[];
  lang: 'bn' | 'en';
}

export default function SmartSearch({ sales, serviceJobs, rmas, lang }: SmartSearchProps) {
  const [queryText, setQueryText] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{
    sales: { sale: Sale; item: any }[];
    jobs: ServiceJob[];
    rmas: RMA[];
  } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = queryText.trim().toLowerCase();
    if (!cleanQuery) return;

    // Search sales' items for serial / IMEI / Name
    const foundSales: { sale: Sale; item: any }[] = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const serials = item.serialNumbers || [];
        const serialMatch = serials.some(s => s.toLowerCase().includes(cleanQuery));
        const nameMatch = item.productName && item.productName.toLowerCase().includes(cleanQuery);
        if (serialMatch || nameMatch) {
          foundSales.push({ sale, item });
        }
      });
    });

    // Search service jobs
    const foundJobs = serviceJobs.filter(job => 
      (job.serialOrImei && job.serialOrImei.toLowerCase().includes(cleanQuery)) ||
      (job.deviceName && job.deviceName.toLowerCase().includes(cleanQuery)) ||
      (job.customerPhone && job.customerPhone.includes(cleanQuery)) ||
      (job.customerName && job.customerName.toLowerCase().includes(cleanQuery))
    );

    // Search RMA
    const foundRmas = rmas.filter(rma => 
      (rma.serialOrImei && rma.serialOrImei.toLowerCase().includes(cleanQuery)) ||
      (rma.productName && rma.productName.toLowerCase().includes(cleanQuery)) ||
      (rma.supplierName && rma.supplierName.toLowerCase().includes(cleanQuery))
    );

    setResults({
      sales: foundSales,
      jobs: foundJobs,
      rmas: foundRmas,
    });
    setHasSearched(true);
  };

  const getWarrantyStatus = (saleTimestamp: number, warrantyDuration: string | number | undefined) => {
    if (!warrantyDuration) return { status: 'none', daysRemaining: 0, text: lang === 'bn' ? 'কোন ওয়ারেন্টি নেই' : 'No Warranty' };
    
    // Parse warranty string if it is e.g. "12 Months", "1 Year", "6 Months", "10"
    const durationStr = String(warrantyDuration).toLowerCase();
    let durationDays = 0;
    
    const numMatch = durationStr.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0]);
      if (durationStr.includes('year') || durationStr.includes('বছর')) {
        durationDays = num * 365;
      } else if (durationStr.includes('month') || durationStr.includes('মাস')) {
        durationDays = num * 30;
      } else if (durationStr.includes('day') || durationStr.includes('দিন')) {
        durationDays = num;
      } else {
        durationDays = num * 30; // Default to months if just a number
      }
    }

    if (durationDays === 0) {
      return { status: 'none', daysRemaining: 0, text: lang === 'bn' ? 'কোন ওয়ারেন্টি নেই' : 'No Warranty' };
    }

    const ageInMs = Date.now() - saleTimestamp;
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.floor(durationDays - ageInDays));
    const warrantyExpiryDate = saleTimestamp + durationDays * 24 * 60 * 60 * 1000;

    if (daysRemaining > 0) {
      return {
        status: 'active',
        daysRemaining,
        expiryDate: warrantyExpiryDate,
        text: lang === 'bn' 
          ? `সচল (${daysRemaining} দিন বাকি, মেয়াদ শেষ: ${format(warrantyExpiryDate, 'dd MMM yyyy', { locale: bn })})`
          : `Active (${daysRemaining} days left, Expires: ${format(warrantyExpiryDate, 'dd MMM yyyy', { locale: enUS })})`
      };
    } else {
      return {
        status: 'expired',
        daysRemaining: 0,
        expiryDate: warrantyExpiryDate,
        text: lang === 'bn'
          ? `মেয়াদোত্তীর্ণ (${format(warrantyExpiryDate, 'dd MMM yyyy', { locale: bn })})`
          : `Expired on (${format(warrantyExpiryDate, 'dd MMM yyyy', { locale: enUS })})`
      };
    }
  };

  return (
    <div className="space-y-6" id="smart-serial-search-panel">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Search className="text-indigo-400" />
          {lang === 'bn' ? 'স্মার্ট সিরিয়াল ও IMEI সার্চ' : 'Smart Serial / IMEI Lookup'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'bn' 
            ? '৬ মাস পর কোনো কাস্টমার আসলেই কেবল সিরিয়াল বা IMEI নম্বর দিয়ে তার সম্পূর্ণ ক্রয় সংক্রান্ত বিস্তারিত বের করুন।' 
            : 'Look up instant purchasing history, customer, salesman details & active warranty validity across your records.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Search Input Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
                {lang === 'bn' ? 'সিরিয়াল / IMEI নম্বর' : 'Serial / IMEI Number'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'যেমন: IMEI12984920' : 'e.g. IMEI/Serial Number...'}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white pl-10 focus:outline-none focus:border-indigo-500 transition-colors"
                  id="serial-search-query-field"
                />
                <Search size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              id="serial-search-btn"
            >
              <Search size={14} />
              {lang === 'bn' ? 'অনুসন্ধান করুন' : 'Search Now'}
            </button>
          </form>

          <div className="border-t border-slate-800/100 pt-4 mt-6 text-xs text-slate-500 space-y-2">
            <p className="font-bold uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'সার্চ করুন এগুলো দিয়ে:' : 'Supported queries:'}
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{lang === 'bn' ? 'প্রোডাক্ট সিরিয়াল নম্বর (Serial)' : 'Product Serial numbers'}</li>
              <li>{lang === 'bn' ? 'মোবাইলের IMEI নম্বর' : 'Phone IMEI numbers'}</li>
              <li>{lang === 'bn' ? 'বারকোড আইডি (Barcode id)' : 'Barcode identification codes'}</li>
              <li>{lang === 'bn' ? 'রিপেয়ার কাস্টমার ফোন কোড' : 'Repair order tracking customer numbers'}</li>
            </ul>
          </div>
        </div>

        {/* Results view */}
        <div className="lg:col-span-3 space-y-6">
          {!hasSearched ? (
            <div className="bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                <Search size={28} />
              </div>
              <h3 className="text-base font-sans font-black uppercase text-slate-300">
                {lang === 'bn' ? 'অনুসন্ধানের জন্য অপেক্ষা করছে' : 'Awaiting Query'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {lang === 'bn' 
                  ? 'উপরে কোনো ফোনের আইএমইআই (IMEI) বা পণ্যের সিরিয়াল লিখে খুঁজুন' 
                  : 'Type a products serial number, IMEI or customer mobile reference to begin lookup'}
              </p>
            </div>
          ) : (
            <>
              {/* No results */}
              {results?.sales.length === 0 && results?.jobs.length === 0 && results?.rmas.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto mb-4 animate-pulse">
                    <AlertTriangle size={28} />
                  </div>
                  <h3 className="text-base font-sans font-black uppercase text-slate-300">
                    {lang === 'bn' ? 'কোনো তথ্য পাওয়া যায়নি' : 'No Records found'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {lang === 'bn' 
                      ? 'আমরা এই সিরিয়াল বা রেফারেন্সের সাথে মিল রেখে কোনো সেলস, রমা বা সার্ভিসিং লক খুঁজে পাইনি।' 
                      : 'We searched all active sales logs, RMA registers, and servicing sheets but found nothing.'}
                  </p>
                </div>
              )}

              {/* 1. Purchasing / Sales Records */}
              {results && results.sales.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <CheckCircle2 size={13} />
                    {lang === 'bn' ? '১. বিক্রয় ও ক্রেতা বিস্তারিত' : '1. Purchase & Customer Record'}
                  </h3>

                  {results.sales.map(({ sale, item }, idx) => {
                    const warranty = getWarrantyStatus(sale.timestamp, item.warranty);
                    return (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                          <div>
                            <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border border-indigo-400/20 font-bold">
                              {lang === 'bn' ? `রশিদ: ${sale.id?.slice(-8).toUpperCase()}` : `INVOICE: ${sale.id?.slice(-8).toUpperCase()}`}
                            </span>
                            <h4 className="text-lg font-sans font-bold text-slate-200 mt-2">
                              {item.name}
                            </h4>
                          </div>

                          {/* Warranty status badge */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                              {lang === 'bn' ? 'ওয়ারেন্টি স্ট্যাটাস' : 'Warranty status'}
                            </span>
                            <div className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 ${
                              warranty.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {warranty.status === 'active' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                              {warranty.text}
                            </div>
                          </div>
                        </div>

                        {/* Customer & Sellers Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                          {/* Buyer Info */}
                          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                              <User size={12} />
                              {lang === 'bn' ? 'ক্রেতা বিস্তারিত' : 'Buyer Details'}
                            </h5>
                            <div className="space-y-1 text-xs">
                              <p className="font-extrabold text-slate-200">{sale.customerName || (lang === 'bn' ? 'অজ্ঞাতনামা ক্রেতা' : 'Walk-in Customer')}</p>
                              {sale.customerPhone && (
                                <p className="text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone size={10} />
                                  {sale.customerPhone}
                                </p>
                              )}
                              {sale.customerAddress && (
                                <p className="text-slate-500 mt-1">{sale.customerAddress}</p>
                              )}
                            </div>
                          </div>

                          {/* Seller info */}
                          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                              <Clock size={12} />
                              {lang === 'bn' ? 'বিক্রয় বিস্তারিত' : 'Seller details'}
                            </h5>
                            <div className="space-y-1 text-xs">
                              <p className="text-slate-400">
                                {lang === 'bn' ? 'ক্রয় তারিখ:' : 'Purchased Date:'}{' '}
                                <span className="font-bold text-slate-200">
                                  {format(sale.timestamp, 'dd MMMM yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                                </span>
                              </p>
                              <p className="text-slate-400">
                                {lang === 'bn' ? 'বিক্রেতা কর্মী:' : 'Sales representative:'}{' '}
                                <span className="font-bold text-indigo-400 font-mono">
                                  {sale.salesmanName || sale.createdBy || (lang === 'bn' ? 'দোকান মালিক' : 'Shop Owner')}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Product meta info */}
                          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                              <Tag size={12} />
                              {lang === 'bn' ? 'প্রোডাক্ট ও ওয়ারেন্টি বিস্তারিত' : 'Product specifics'}
                            </h5>
                            <div className="space-y-1 text-xs text-slate-400">
                              {item.serial && (
                                <p>
                                  {lang === 'bn' ? 'সিরিয়াল নম্বর:' : 'Serial:'}{' '}
                                  <span className="font-mono font-bold text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                                    {item.serial}
                                  </span>
                                </p>
                              )}
                              {item.imei && (
                                <p>
                                  {lang === 'bn' ? 'IMEI নম্বর:' : 'IMEI:'}{' '}
                                  <span className="font-mono font-bold text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                                    {item.imei}
                                  </span>
                                </p>
                              )}
                              <p>
                                {lang === 'bn' ? 'ওয়ারেন্টি মেয়াদ:' : 'Warranty period:'}{' '}
                                <span className="font-bold text-yellow-400">{item.warranty || (lang === 'bn' ? 'কোন ওয়ারেন্টি নেই' : 'No warranty')}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Repairing / Service logs */}
              {results && results.jobs.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                    <Wrench size={13} />
                    {lang === 'bn' ? '২. রিপেয়ার ও সার্ভিসিং ইতিহাস' : '2. Active Repair & Servicing Logs'}
                  </h3>

                  {results.jobs.map((job) => (
                    <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-bold font-mono">
                            #{job.id?.slice(-6).toUpperCase()}
                          </span>
                          <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                            job.status === 'completed' || job.status === 'delivered'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <h4 className="text-slate-200 font-bold text-sm mt-1">{job.deviceBrand} {job.deviceModel}</h4>
                        <p className="text-slate-400 text-xs mt-1">
                          {lang === 'bn' ? 'কাস্টমার:' : 'Customer:'} <span className="text-slate-300 font-bold">{job.customerName} ({job.customerPhone})</span>
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1 font-mono">
                          {lang === 'bn' ? 'সমস্যা:' : 'Problem:'} {job.problemDescription}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1 text-xs">
                        <p className="text-slate-400">
                          {lang === 'bn' ? 'জমা দেওয়ার তারিখ:' : 'Received Date:'}{' '}
                          <span className="font-bold text-slate-300">
                            {format(job.createdAt, 'dd MMM yyyy', { locale: lang === 'bn' ? bn : enUS })}
                          </span>
                        </p>
                        <p className="text-slate-400">
                          {lang === 'bn' ? 'নির্ধারিত ডেলিভারি:' : 'Expected return:'}{' '}
                          <span className="font-bold text-indigo-400">
                            {job.estimatedDeliveryDays} {lang === 'bn' ? 'দিন' : 'days'}
                          </span>
                        </p>
                        <p className="text-xs font-bold text-yellow-500 font-mono mt-1">
                          {lang === 'bn' ? 'খরচ:' : 'Cost:'} ৳{job.cost}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. RMA Suppliers Log */}
              {results && results.rmas.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                    <RefreshCw size={13} />
                    {lang === 'bn' ? '৩. সাপ্লায়ার ওয়ারেন্টি (RMA) হিস্ট্রি' : '3. Supplier Warranty & RMA logs'}
                  </h3>

                  {results.rmas.map((rma) => (
                    <div key={rma.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                            RMA REGISTERED
                          </span>
                          <span className="text-xs text-slate-500">#{rma.id?.slice(-6).toUpperCase()}</span>
                        </div>
                        <h4 className="text-slate-200 font-sans font-bold text-sm mt-1">{rma.productName}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {lang === 'bn' ? 'সরবরাহকারী (Supplier):' : 'Supplier Name:'} <span className="text-slate-300 font-bold">{rma.supplierName}</span>
                        </p>
                        <p className="text-slate-500 text-[10px] mt-1 font-mono">
                          {lang === 'bn' ? 'সমস্যা:' : 'Flaw reported:'} {rma.reason}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rma.status === 'completed' || rma.status === 'replaced'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {rma.status}
                        </span>
                        <p className="text-slate-500 text-[10px] mt-1">
                          {lang === 'bn' ? 'তৈরির তারিখ:' : 'Claimed date:'}{' '}
                          <span className="font-mono text-slate-400">
                            {format(rma.warrantyDate, 'dd MMMM yyyy', { locale: lang === 'bn' ? bn : enUS })}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
