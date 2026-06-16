import React, { useEffect, useState } from 'react';
import { Sale, ShopInfo } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Language, translations } from '../translations';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';

// Pure React responsive Flex-based barcode generator (No external library dependency)
function SVGBarcode({ value }: { value: string }) {
  const seedString = value.toUpperCase();
  const barPattern: number[] = [];
  
  // Produce realistic looking high density stripes
  for (let i = 0; i < seedString.length; i++) {
    const code = seedString.charCodeAt(i);
    const binary = (code * 101) % 32;
    for (let j = 0; j < 5; j++) {
      barPattern.push((binary >> j) & 1);
    }
  }

  while (barPattern.length < 50) {
    barPattern.push(...barPattern);
  }

  const finalBars = barPattern.slice(0, 60);

  return (
    <div className="flex flex-col items-center w-full my-1">
      <div className="flex h-11 w-full justify-between items-stretch bg-white px-2">
        {finalBars.map((val, idx) => {
          const isBar = idx % 2 === 0 ? val === 1 : val === 0;
          return (
            <div 
              key={idx} 
              className={`flex-grow h-full ${isBar ? 'bg-black' : 'bg-transparent'}`} 
              style={{ minWidth: '1.5px' }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ReceiptProps {
  sale: Sale;
  shopInfo: ShopInfo;
  onClose: () => void;
  lang: Language;
}

export default function Receipt({ sale, shopInfo, onClose, lang }: ReceiptProps) {
  const t = translations[lang];
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const accentColor = shopInfo.accentColor || '#4f46e5';

  const [selectedLayout, setSelectedLayout] = useState<'classic' | 'thermal' | 'label'>('classic');
  const [courierPartner, setCourierPartner] = useState<'steadfast' | 'pathao' | 'redx' | 'paperfly'>('steadfast');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Generate QR code pointing to the digital invoice
    const generateQR = async () => {
      try {
        const invoiceUrl = `${window.location.origin}/?invoice=${sale.id}&shop=${sale.shopId}`;
        const url = await QRCode.toDataURL(invoiceUrl, {
          width: 300,
          margin: 1,
          color: {
            dark: '#1e293b', // slate-800
            light: '#ffffff'
          }
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };
    generateQR();
  }, [sale.id, sale.shopId]);

  useEffect(() => {
    // Auto-trigger print when receipt is shown
    const timer = setTimeout(() => {
      handlePrint(true);
    }, 500); // Small delay to let fonts/styles load
    return () => clearTimeout(timer);
  }, [sale.id, selectedLayout, courierPartner]);

  const handlePrint = (isAutoTrigger = false) => {
    try {
      const originalTitle = document.title;
      document.title = `${shopInfo.name} - Invoice`;
      window.print();
      document.title = originalTitle;
      
      if (!isAutoTrigger) {
        showToast(
          lang === 'bn' 
            ? 'মেমো প্রিন্ট করার নির্দেশ পাঠানো হয়েছে! 🖨️' 
            : 'Print command initiated successfully! 🖨️'
        );
      }
    } catch (e) {
      console.error("Print failed", e);
    }
  };

  return (
    <div id="printable-receipt-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all overflow-y-auto">
      {/* Print Size Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: ${selectedLayout === 'label' ? '100mm 150mm' : selectedLayout === 'thermal' ? '80mm auto' : 'A4'};
            margin: 0 !important; 
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            height: auto !important;
          }

          #printable-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          #printable-receipt-container > div {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }

          #printable-receipt {
            width: ${selectedLayout === 'label' ? '100mm' : selectedLayout === 'thermal' ? '80mm' : '100%'} !important;
            max-width: ${selectedLayout === 'label' ? '100mm' : selectedLayout === 'thermal' ? '80mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${selectedLayout === 'classic' ? '30px' : '12px'} !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
          }

          /* Hide non-print elements */
          .print\\:hidden, #verified-memo-nav, .fixed-selectors {
            display: none !important;
          }
        }
      `}} />

      <div className="bg-white w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Sale Confirmation Header - Hidden on Print */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={24} className="animate-bounce" />
            </div>
            <div>
              <h3 className="font-sans font-black text-slate-900 text-lg sm:text-xl leading-tight">
                {lang === 'bn' ? 'বিক্রয় সফলভাবে নিশ্চিত করা হয়েছে!' : 'Sale Completed Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                {lang === 'bn' 
                  ? 'লেনদেনটি সিস্টেমে সংরক্ষিত হয়েছে এবং কাস্টমার লয়্যালটি পয়েন্ট আপডেট করা হয়েছে।' 
                  : 'Transaction has been stored securely and customer rewards updated.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end shrink-0">
            <button 
              onClick={() => handlePrint(false)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-500/10 hover:bg-indigo-700"
            >
              <Printer size={15} /> 
              {lang === 'bn' ? 'ক্যাশ মেমো প্রিন্ট' : 'Print Memo'}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all border border-gray-200 cursor-pointer"
              title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Layout & Dimension Selector - Hidden on Print */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between print:hidden flex-shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {lang === 'bn' ? 'মেমো সাইজ ও প্রিন্ট ফর্ম্যাট নির্বাচন করুন' : 'Select Memo Size & Print Format'}
            </span>
            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-fit">
              <button
                onClick={() => setSelectedLayout('classic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLayout === 'classic' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'bn' ? 'স্ট্যান্ডার্ড মেমো' : 'Classic Memo'}
              </button>
              <button
                onClick={() => setSelectedLayout('thermal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLayout === 'thermal' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'bn' ? 'থার্মাল স্লিপ (80mm)' : 'Thermal Slip (80mm)'}
              </button>
              <button
                onClick={() => setSelectedLayout('label')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLayout === 'label' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang === 'bn' ? 'কুরিয়ার স্টিকার' : 'Courier Label (Sticker)'}
              </button>
            </div>
          </div>

          {selectedLayout === 'label' && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {lang === 'bn' ? 'কুরিয়ার পার্টনার' : 'Courier Partner'}
              </span>
              <select
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
              >
                <option value="steadfast">SteadFast Courier</option>
                <option value="pathao">Pathao Delivery</option>
                <option value="redx">RedX Logistics</option>
                <option value="paperfly">Paperfly Go</option>
              </select>
            </div>
          )}
        </div>

        {/* Receipt Content Container */}
        <div id="printable-receipt" className="p-4 sm:p-10 font-sans text-sm print:p-0 overflow-y-auto bg-white print:overflow-visible relative flex-1">
          
          {/* 1. Classic Layout Block */}
          {selectedLayout === 'classic' && (
            <>
              {/* Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] print:opacity-[0.08] z-0">
                {shopInfo.logoUrl ? (
                  <img 
                    src={shopInfo.logoUrl} 
                    alt="Watermark" 
                    className="w-4/5 h-auto object-contain grayscale"
                  />
                ) : (
                  <span className="text-[200px] font-black italic tracking-tighter opacity-20 select-none grayscale uppercase">
                    {shopInfo.name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="relative z-10">
                {/* Header Section */}
                <div className="relative mb-8 pb-6 border-b-[3px]" style={{ borderColor: accentColor }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {shopInfo.logoUrl ? (
                        <img 
                          src={shopInfo.logoUrl} 
                          alt={shopInfo.name} 
                          className="h-24 w-auto object-contain mb-4" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-[28px] flex items-center justify-center text-white mb-6 shadow-xl relative overflow-hidden ring-4 ring-black/5" style={{ backgroundColor: accentColor }}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-60" />
                          <div className="relative z-10 flex flex-col items-center leading-none">
                            <span className="text-3xl font-black italic tracking-tighter">{shopInfo.name.charAt(0)}</span>
                            <div className="w-6 h-1 bg-white/30 rounded-full mt-1" />
                          </div>
                        </div>
                      )}
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2" style={{ color: accentColor }}>{shopInfo.name}</h2>
                      <div className="space-y-0.5">
                        <p className="text-black font-black text-xs leading-relaxed uppercase tracking-widest">{shopInfo.address}</p>
                        <div className="flex items-center">
                          <p className="text-black font-black text-sm">{t.mobile}: {shopInfo.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Centered INVOICE label */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-4">
                      <div className="border-2 bg-white px-6 py-1.5 rounded-xl whitespace-nowrap" style={{ borderColor: accentColor, color: accentColor }}>
                        <h1 className="text-xl font-black italic uppercase tracking-[0.2em] leading-none">{t.cashMemo}</h1>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-4">
                      <div className="space-y-1">
                        <p className="text-black font-black text-sm italic">{t.invoiceLabel}: #{sale.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] font-black text-black/60 uppercase tracking-widest italic">{format(new Date(sale.timestamp), 'dd/MM/yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}</p>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] italic mb-1 border-b-2 w-fit ml-auto pb-0.5" style={{ color: accentColor, borderColor: accentColor }}>{t.customerName}</h4>
                        {sale.customerName && <p className="text-lg font-black text-black leading-none uppercase">{sale.customerName}</p>}
                        <div className="flex flex-col gap-0.5 items-end">
                          {sale.customerPhone && <p className="text-[10px] font-black text-black">{t.mobile}: {sale.customerPhone}</p>}
                          {sale.customerAddress && <p className="text-[10px] font-black text-black leading-relaxed italic max-w-[200px]">{sale.customerAddress}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table - Tali Style with Vertical Lines */}
                <div className="mb-8 rounded-3xl border-2 overflow-x-auto shadow-sm" style={{ borderColor: accentColor }}>
                  <table className="w-full border-collapse font-sans">
                    <thead>
                      <tr className="bg-white border-b-[3px]" style={{ color: accentColor, borderColor: accentColor }}>
                        <th className="px-4 py-4 text-left italic text-[14px] font-black uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>#</th>
                        <th className="px-6 py-4 text-left italic text-[14px] font-black uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>{t.description}</th>
                        <th className="px-4 py-4 text-center italic text-[14px] font-black uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>{t.quantity}</th>
                        <th className="px-6 py-4 text-right italic text-[14px] font-black uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>{t.rate}</th>
                        <th className="px-6 py-4 text-right italic text-[14px] font-black uppercase tracking-widest">{t.total}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2" style={{ borderColor: `${accentColor}20` }}>
                      {sale.items.map((item, idx) => {
                        const rate = item.total / item.quantity;
                        return (
                          <tr key={idx} className="group transition-colors">
                            <td className="px-4 py-3 text-[12px] font-black text-black border-r-2" style={{ borderColor: `${accentColor}20` }}>{idx + 1}</td>
                            <td className="px-6 py-3 border-r-2" style={{ borderColor: `${accentColor}20` }}>
                              <p className="font-black text-black text-base leading-tight uppercase">{item.productName}</p>
                              {item.warranty && (
                                <p className="text-[10px] font-black text-slate-500 mt-1 italic tracking-tight">{t.warranty}: {item.warranty}</p>
                              )}
                              {item.serialNumbers && item.serialNumbers.filter(Boolean).length > 0 && (
                                <p className="text-[10px] font-black text-indigo-600 mt-1 italic tracking-tight">
                                  ⚙️ {lang === 'bn' ? 'সিরিয়াল/IMEI:' : 'Serial/IMEI:'} {item.serialNumbers.filter(Boolean).join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-black text-black text-base border-r-2" style={{ borderColor: `${accentColor}20` }}>{item.quantity}</td>
                            <td className="px-6 py-3 text-right font-black text-black border-r-2" style={{ borderColor: `${accentColor}20` }}>{formatCurrency(rate)}</td>
                            <td className="px-6 py-3 text-right font-black text-black text-base">{formatCurrency(item.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white text-black border-t-[3px]" style={{ borderColor: accentColor }}>
                        <td colSpan={2} className="px-6 py-4 text-right text-[12px] font-black italic uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>
                          {t.noOfItems}:
                        </td>
                        <td className="px-4 py-4 text-center font-black text-lg border-r-2 whitespace-nowrap" style={{ borderColor: `${accentColor}20` }}>
                          {sale.items.length} {t.itemQuantityCount}
                        </td>
                        <td className="px-6 py-4 text-right text-[12px] font-black italic uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>{t.subTotal}:</td>
                        <td className="px-6 py-4 text-right font-black text-xl whitespace-nowrap">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                      </tr>
                      {(sale.discount || 0) > 0 && (
                        <tr className="bg-white text-black">
                          <td colSpan={4} className="px-6 py-3 text-right text-[12px] font-black italic uppercase tracking-widest border-r-2" style={{ borderColor: `${accentColor}20` }}>{t.discount}:</td>
                          <td className="px-6 py-3 text-right font-black text-xl whitespace-nowrap text-red-500">
                            - {formatCurrency(sale.discount || 0)}
                          </td>
                        </tr>
                      )}
                      <tr className="text-white" style={{ backgroundColor: accentColor }}>
                        <td colSpan={4} className="px-6 py-4 text-right text-[14px] font-black italic uppercase tracking-widest border-r-2 border-white/20">{t.payable}:</td>
                        <td className="px-6 py-4 text-right font-black text-2xl whitespace-nowrap">
                          {formatCurrency(sale.payableAmount || (sale.totalAmount - (sale.discount || 0)))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Advanced Transactions & Rewards Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 rounded-2xl border bg-slate-50/50 print:bg-transparent text-xs" style={{ borderColor: `${accentColor}30` }}>
                  <div className="space-y-1.5 leading-relaxed text-slate-700 text-left">
                    <p className="font-black uppercase tracking-wide text-indigo-950 mb-2">💳 Transaction Details</p>
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                      <span className="font-bold">{lang === 'bn' ? 'পেমেন্ট পদ্ধতি:' : 'Payment Method:'}</span>
                      <span className="font-extrabold text-slate-900 uppercase">
                        {sale.paymentMethod === 'cash' ? (lang === 'bn' ? 'নগদ টাকা (Cash)' : 'Cash') :
                         sale.paymentMethod === 'card' ? (lang === 'bn' ? 'কার্ড (Card)' : 'Debit/Credit Card') :
                         sale.paymentMethod === 'bkash' ? (lang === 'bn' ? 'বিকাশ (bKash Mobile)' : 'bKash Mobile') :
                         sale.paymentMethod === 'nagad' ? (lang === 'bn' ? 'নগদ (Nagad Mobile)' : 'Nagad Mobile') :
                         sale.paymentMethod === 'rocket' ? (lang === 'bn' ? 'রকেট (Rocket Mobile)' : 'Rocket Mobile') :
                         sale.paymentMethod === 'qr' ? (lang === 'bn' ? 'কিউআর কোড (QR Scan)' : 'QR Code Payment') : (lang === 'bn' ? 'নগদ টাকা (Cash)' : 'Cash')}
                      </span>
                    </div>
                    {sale.promoCode && (
                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                        <span className="font-bold">{lang === 'bn' ? 'অ্যাক্টিভেটেড প্রোমো কোড:' : 'Active Promo Code:'}</span>
                        <span className="font-mono font-black text-indigo-600 bg-indigo-100 rounded px-1.5 py-0.2">{sale.promoCode}</span>
                      </div>
                    )}
                    <div className="flex justify-between pb-0.5">
                      <span className="font-bold">{lang === 'bn' ? 'ট্রান্সমিশন সিনক্রোনাইজেশন:' : 'Transmission Sync:'}</span>
                      <span className={`font-black ${sale.offline ? "text-amber-600" : "text-emerald-600"}`}>
                        {sale.offline 
                          ? (lang === 'bn' ? '✓ লোকাল স্টোরেজ (অফলাইন মোড)' : '✓ Local Database (Offline Mode)')
                          : (lang === 'bn' ? '⚡ ক্লাউড সিনক্রোনাইজড (অনলাইন)' : '⚡ Realtime Cloud Synced')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 leading-relaxed text-slate-700 text-left border-t md:border-t-0 md:border-l pl-0 md:pl-4" style={{ borderColor: `${accentColor}20` }}>
                    <p className="font-black uppercase tracking-wide text-indigo-950 mb-2">🌟 Rewards & Loyalty</p>
                    {sale.pointsRedeemed ? (
                      <div className="flex justify-between text-rose-600 border-b border-dashed border-slate-200 pb-1">
                        <span className="font-bold">{lang === 'bn' ? 'ব্যবহৃত লয়্যালটি পয়েন্ট (ছাড়):' : 'Points Redeemed (Discount):'}</span>
                        <span className="font-black">-{sale.pointsRedeemed} Point</span>
                      </div>
                    ) : null}
                    {sale.pointsEarned ? (
                      <div className="flex justify-between text-indigo-650 border-b border-dashed border-slate-200 pb-1">
                        <span className="font-bold">{lang === 'bn' ? 'অর্জিত লয়্যালটি পয়েন্ট:' : 'Loyalty Points Earned:'}</span>
                        <span className="font-black">+{sale.pointsEarned} Point</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-400 border-b border-dashed border-slate-200 pb-1">
                        <span className="font-medium">{lang === 'bn' ? 'অর্জিত লয়্যালটি পয়েন্ট:' : 'Loyalty Points Earned:'}</span>
                        <span>0 Point</span>
                      </div>
                    )}
                    {sale.digitalReceiptSent && (
                      <div className="flex justify-between text-emerald-650 pb-0.5">
                        <span className="font-bold">{lang === 'bn' ? 'ডিজিটাল রসিদ পাঠানো হয়েছে:' : 'Digital Receipt dispatched:'}</span>
                        <span className="font-black uppercase tracking-wider">⚡ {sale.receiptSentType} ({sale.receiptSentValue})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EMI Installments Contract Sheet */}
                {sale.isEMI && sale.emiDetails && (
                  <div className="mb-8 p-5 rounded-3xl border-2 bg-indigo-50/20 text-left space-y-3" style={{ borderColor: `${accentColor}50` }}>
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: `${accentColor}25` }}>
                      <h4 className="font-sans font-black text-indigo-950 text-xs uppercase tracking-widest flex items-center gap-1.5">
                        💳 {lang === 'bn' ? 'কিস্তি চুক্তির বিবরণ (EMI Contract Summary)' : 'Installment Agreement (EMI Details)'}
                      </h4>
                      <span className="bg-indigo-600 text-white text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                        Active Plan
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold leading-relaxed text-slate-700">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">{lang === 'bn' ? 'ডাউন পেমেন্ট' : 'Down Payment'}</p>
                        <p className="font-sans font-black text-sm text-slate-900">{formatCurrency(sale.emiDetails.downPayment)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">{lang === 'bn' ? 'কিস্তির সংখ্যা' : 'Installment Count'}</p>
                        <p className="font-black text-sm text-slate-900">{sale.emiDetails.totalInstallments} {lang === 'bn' ? 'টি কিস্তি' : 'Installments'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-700 uppercase font-black">{lang === 'bn' ? 'প্রতি কিস্তির পরিমাণ' : 'Installment Fee'}</p>
                        <p className="font-sans font-black text-sm text-indigo-700">{formatCurrency(sale.emiDetails.installmentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black">{lang === 'bn' ? 'কিস্তির ব্যবধান' : 'Billing Interval'}</p>
                        <p className="font-black text-sm text-slate-900 uppercase">{sale.emiDetails.installmentInterval === 'monthly' ? (lang === 'bn' ? 'মাসিক কিস্তি' : 'Monthly') : (lang === 'bn' ? 'সাপ্তাহিক কিস্তি' : 'Weekly')}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-dashed" style={{ borderColor: `${accentColor}20` }}>
                      <p className="font-bold">
                        {lang === 'bn' ? '* প্রতিটি কিস্তির জন্য ৩ কার্যদিবসের অতিরিক্ত সময় প্রদান করা হবে।' : '* Grace period of 3 business days applies on installment due dates.'}
                      </p>
                      <p className="font-black text-slate-800">
                        {lang === 'bn' ? 'প্রথম কিস্তির সম্ভাব্য তারিখ: ' : 'First Installment Due: '}
                        <span className="font-sans font-extrabold">{new Date(sale.emiDetails.nextInstallmentDate).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer & Signature Section */}
                <div className="mt-16 pt-8 grid grid-cols-2 gap-6 sm:gap-20">
                  <div className="text-center">
                    <div className="border-t-2 pt-3" style={{ borderColor: `${accentColor}30` }}>
                      <p className="text-xs font-black text-black uppercase tracking-widest italic">{t.customerSignature}</p>
                    </div>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <div className="mb-[-15px] h-20 flex items-end justify-center px-4 relative">
                      <p className="text-5xl font-normal text-blue-900 tracking-tighter transform -rotate-2 select-none opacity-90" style={{ fontFamily: '"Great Vibes", cursive' }}>
                        Rabbi
                      </p>
                      {/* Decorative underline for signature */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-[1px] bg-blue-900/40 rotate-[-1deg]" />
                    </div>
                    <div className="border-t-[3px] pt-3 w-full" style={{ borderColor: accentColor }}>
                      <p className="text-xs font-black text-black uppercase tracking-widest italic">{t.authoritySignature}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code and Digital Reference Banner */}
                <div className="mt-8 mb-4 border-2 border-dashed border-slate-300 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 print:bg-transparent print:border-black/30">
                  <div className="flex flex-col text-center sm:text-left gap-1">
                    <h4 className="text-sm font-black text-black tracking-tight flex items-center justify-center sm:justify-start gap-1.5 uppercase">
                      <span>✨</span> {lang === 'bn' ? 'ডিজিটাল ইনভয়েস কিউআর কোড' : 'Digital Invoice QR Code'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm print:text-black/80 font-sans">
                      {lang === 'bn' 
                        ? 'আপনার ফোনে ডিজিটাল কপি দেখতে এবং যেকোনো সময় অ্যাক্সেস করতে এই কিউআর কোডটি স্ক্যান করুন।' 
                        : 'Scan this QR code to view the digital copy on your phone and access it anytime.'}
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 rounded px-2 py-0.5 mt-1 w-fit mx-auto sm:mx-0 print:hidden">
                      ID: #{sale.id.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex-shrink-0 flex items-center justify-center print:border-black/40">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} className="w-24 h-24 object-contain" alt="Invoice QR Code" />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 animate-pulse rounded-xl" />
                    )}
                  </div>
                </div>

                <div className="mt-12 text-center space-y-3 print:mt-10">
                  <div className="w-full h-1 bg-black/5" />
                  <p className="text-xs font-bold text-black uppercase tracking-tight">{t.termsTitle}</p>
                  <p className="text-[10px] font-black text-black/60 italic uppercase tracking-widest leading-relaxed">
                    {t.termsText}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* 2. Compact Thermal POS Slip (80mm) Layout */}
          {selectedLayout === 'thermal' && (
            <div className="max-w-[340px] mx-auto text-black font-mono text-[11px] leading-tight p-2 bg-white print:p-0">
              <div className="text-center space-y-0.5 mb-3">
                {shopInfo.logoUrl && (
                  <img src={shopInfo.logoUrl} alt="Logo" className="h-10 mx-auto object-contain mb-1" referrerPolicy="no-referrer" />
                )}
                <h3 className="text-sm font-black uppercase tracking-tight leading-none mb-1">{shopInfo.name}</h3>
                <p className="text-[9px] uppercase font-bold leading-normal">{shopInfo.address}</p>
                <p className="text-[10px] font-bold">{t.mobile}: {shopInfo.phone}</p>
                <div className="border-b border-dashed border-black/45 my-1.5"></div>
                <p className="text-[10px] font-black uppercase tracking-wider bg-black text-white py-0.5 px-2 inline-block rounded">{t.cashMemo}</p>
              </div>

              {/* Metadata */}
              <div className="space-y-0.5 mb-2 text-left">
                <p className="font-bold">{t.invoiceLabel}: #{sale.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-bold text-[9px] text-black/70">
                  {format(new Date(sale.timestamp), 'dd/MM/yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                </p>
                {sale.customerName && (
                  <div className="border-t border-dashed border-black/25 pt-1 mt-1">
                    <p className="font-extrabold">{t.customerName}: {sale.customerName}</p>
                    {sale.customerPhone && <p>{t.mobile}: {sale.customerPhone}</p>}
                    {sale.customerAddress && <p className="italic text-[9px] leading-tight mt-0.5 max-w-full block font-medium">{sale.customerAddress}</p>}
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-black/45 my-2" />

              {/* Items Table */}
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="py-1 font-bold">{t.description}</th>
                    <th className="py-1 font-bold text-center w-8">{t.quantity}</th>
                    <th className="py-1 font-bold text-right w-16">{t.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-dashed border-black/20">
                      <td className="py-1.5 text-left">
                        <span className="font-black uppercase block leading-tight">{item.productName}</span>
                        {item.warranty && <span className="block text-[8px] text-slate-500 italic mt-0.5">({t.warranty}: {item.warranty})</span>}
                        {item.serialNumbers && item.serialNumbers.filter(Boolean).length > 0 && (
                          <span className="block text-[8px] text-indigo-600 font-bold mt-0.5">({lang === 'bn' ? 'সিরিয়াল' : 'SN'}: {item.serialNumbers.filter(Boolean).join(', ')})</span>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-1.5 text-right font-black">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-b border-dashed border-black/45 my-2" />

              {/* Summary calculations */}
              <div className="space-y-1 text-right text-[10px] pr-1">
                <div className="flex justify-between font-bold">
                  <span>{t.subTotal}:</span>
                  <span>{formatCurrency(sale.totalAmount)}</span>
                </div>
                {(sale.discount || 0) > 0 && (
                  <div className="flex justify-between font-bold text-black">
                    <span>{t.discount}:</span>
                    <span>- {formatCurrency(sale.discount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-black pt-1 mt-1">
                  <span>{t.payable}:</span>
                  <span>{formatCurrency(sale.payableAmount || (sale.totalAmount - (sale.discount || 0)))}</span>
                </div>
              </div>

              {/* Compact Thermal Transactions & Reward Metadata */}
              <div className="border-t border-dashed border-black/35 pt-1.5 mt-2 space-y-0.5 text-left text-[9px] font-mono leading-relaxed">
                <div className="flex justify-between">
                  <span>PAYMENT METHOD:</span>
                  <span className="font-extrabold uppercase">{sale.paymentMethod || 'CASH'}</span>
                </div>
                {sale.promoCode && (
                  <div className="flex justify-between">
                    <span>PROMO CODE:</span>
                    <span className="font-extrabold">{sale.promoCode}</span>
                  </div>
                )}
                {sale.pointsEarned ? (
                  <div className="flex justify-between">
                    <span>POINTS EARNED:</span>
                    <span className="font-extrabold">+{sale.pointsEarned} Pts</span>
                  </div>
                ) : null}
                {sale.pointsRedeemed ? (
                  <div className="flex justify-between">
                    <span>POINTS REDEEMED:</span>
                    <span className="font-extrabold">-{sale.pointsRedeemed} Pts</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-black/60 italic">
                  <span>SYNC STATUS:</span>
                  <span>{sale.offline ? 'OFFLINE LOCAL' : 'CLOUD SYNCED'}</span>
                </div>
              </div>

              {sale.isEMI && sale.emiDetails && (
                <div className="border-t border-dashed border-black/35 pt-1.5 mt-2 space-y-0.5 text-left text-[9px] font-mono">
                  <p className="text-center font-black">*** EMI AGREEMENT ***</p>
                  <div className="flex justify-between">
                    <span>DOWN PAYMENT:</span>
                    <span className="font-bold">{formatCurrency(sale.emiDetails.downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>INSTALLMENT TERMS:</span>
                    <span className="font-bold">{sale.emiDetails.totalInstallments} Terms ({sale.emiDetails.installmentInterval.toUpperCase()})</span>
                  </div>
                  <div className="flex justify-between text-indigo-600">
                    <span>PER INSTALLMENT:</span>
                    <span className="font-bold">{formatCurrency(sale.emiDetails.installmentAmount)}</span>
                  </div>
                </div>
              )}

              <div className="border-b border-dashed border-black/45 my-2.5" />

              {/* Dotted Slip Footer */}
              <div className="text-center space-y-1 text-[9px] leading-relaxed">
                <p className="font-bold tracking-normal uppercase">{t.termsTitle}</p>
                <p className="text-black/70 italic leading-snug uppercase">{t.termsText}</p>
                
                {qrCodeUrl && (
                  <div className="pt-2 flex flex-col items-center gap-1">
                    <img src={qrCodeUrl} className="w-14 h-14 object-contain" alt="QR Code" />
                    <p className="text-[7px] text-black font-mono tracking-widest">SCAN TO VIEW ONLINE</p>
                  </div>
                )}

                <p className="text-[9px] font-black text-black uppercase tracking-widest pt-2">*** {lang === 'bn' ? 'ধন্যবাদ ও আবার আসবেন' : 'Thank you. Visit again!'} ***</p>
              </div>
            </div>
          )}

          {/* 3. Courier Shipping Label / Sticker Layout (Perfect replica of the upload) */}
          {selectedLayout === 'label' && (
            <div className="max-w-[380px] mx-auto bg-white border-[3px] border-black p-4 rounded-xl text-black font-sans leading-tight shadow-sm print:p-0">
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black/40">
                <h2 className="text-lg font-black uppercase tracking-tight">{shopInfo.name}</h2>
                <p className="text-[10px] font-extrabold tracking-widest">
                  {lang === 'bn' ? 'মার্চেন্ট আইডি:' : 'MERCHANT ID:'} {sale.id.slice(0, 7).toUpperCase()}
                </p>
              </div>

              {/* Barcode component */}
              <div className="py-2.5 flex flex-col items-center">
                <SVGBarcode value={sale.id} />
                <span className="text-[10px] font-black tracking-widest text-center uppercase mt-1">*{sale.id.toUpperCase().slice(0, 10)}*</span>
              </div>

              {/* Split layout: QR Code on left, Courier Field Items on right */}
              <div className="border-y border-black py-2.5 my-1 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex justify-center border-r border-black pr-2">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} className="w-20 h-20 object-contain" alt="Invoice QR" />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded" />
                  )}
                </div>
                <div className="col-span-7 flex flex-col justify-center space-y-1 pl-2 text-[11px] font-extrabold text-left">
                  <p className="truncate">
                    <span className="text-slate-600 font-bold">{lang === 'bn' ? 'ইনভয়েস : ' : 'Invoice : '}</span>
                    <span className="font-black uppercase">SF-ID: {sale.id.toUpperCase().slice(0, 9)}</span>
                  </p>
                  <p>
                    <span className="text-slate-600 font-bold">{lang === 'bn' ? 'ডেলিভারি : ' : 'D. Type : '}</span>
                    <span className="font-black bg-slate-100 border border-slate-300 rounded px-1 py-0.1 select-none text-[9px] uppercase inline-block">
                      {lang === 'bn' ? 'হোম ডেলিভারি' : 'Home'}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600 font-bold">{lang === 'bn' ? 'ওজন : ' : 'WGT : '}</span>
                    <span className="font-black bg-slate-150 rounded px-1 py-0.1 ml-1 text-[10px] inline-block">{0.5 + Math.round(sale.items.length * 0.1 * 10) / 10} KG</span>
                  </p>
                </div>
              </div>

              {/* Rounded Border Box for Deliveries */}
              <div className="border border-black rounded-lg p-2.5 my-2.5 space-y-2 text-xs text-left">
                <p className="flex items-start gap-1">
                  <span className="text-slate-600 font-bold shrink-0 w-11 uppercase text-[10px] leading-relaxed">{lang === 'bn' ? 'নাম :' : 'Name :'}</span>
                  <span className="font-black text-black bg-slate-50 border border-slate-100 px-1 rounded truncate flex-1 block">{sale.customerName || (lang === 'bn' ? 'ক্রেতা' : 'Walk-in Customer')}</span>
                </p>
                <p className="flex items-start gap-1">
                  <span className="text-slate-600 font-bold shrink-0 w-11 uppercase text-[10px] leading-relaxed">{lang === 'bn' ? 'ফোন :' : 'Phone :'}</span>
                  <span className="font-black text-black bg-slate-50 border border-slate-100 px-1 rounded flex-1 block">{sale.customerPhone || '017XXXXXXXX'}</span>
                </p>
                <p className="flex items-start gap-1">
                  <span className="text-slate-600 font-bold shrink-0 w-11 uppercase text-[10px] leading-relaxed">{lang === 'bn' ? 'ঠিকানা :' : 'Address :'}</span>
                  <span className="font-bold text-black bg-slate-50 border border-slate-100 px-1 rounded text-[11px] leading-relaxed flex-1 block leading-normal min-h-[36px]">{sale.customerAddress || (lang === 'bn' ? 'ঠিকানা ও লোকেশন পাওয়া যায়নি' : 'No destination address')}</span>
                </p>
              </div>

              {/* COD Box divided into COD | Amount */}
              <div className="grid grid-cols-2 border border-black rounded-lg overflow-hidden mb-3.5 text-center">
                <div className="bg-slate-100/80 border-r border-black font-black uppercase py-1.5 text-[11px] tracking-widest text-slate-800 flex items-center justify-center">
                  COD
                </div>
                <div className="font-black py-1.5 text-base text-slate-950 bg-white flex items-center justify-center">
                  {Math.round(sale.payableAmount || (sale.totalAmount - (sale.discount || 0)))}
                </div>
              </div>

              {/* Timestamp and courier trademark website footer */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 leading-tight">
                <div className="flex flex-col items-start text-left">
                  <span>P {format(new Date(sale.timestamp), 'dd/MM/yy')}</span>
                  <span className="text-slate-400 text-[9px]">{format(new Date(sale.timestamp), 'hh:mm a')}</span>
                </div>
                
                <div className="flex flex-col items-end text-right">
                  <span className="font-black text-xs text-black italic flex items-center gap-1 select-none">
                    <span className="text-emerald-600 text-[13px]">✓</span> 
                    {courierPartner === 'steadfast' ? 'SteadFast' : 
                     courierPartner === 'pathao' ? 'Pathao Delivery' : 
                     courierPartner === 'redx' ? 'REDX Logistics' : 'PaperFly Go'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium tracking-tight">
                    {courierPartner === 'steadfast' ? 'www.steadfast.com.bd' : 
                     courierPartner === 'pathao' ? 'www.pathao.com' : 
                     courierPartner === 'redx' ? 'www.redx.com.bd' : 'www.paperfly.com.bd'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl max-w-sm w-max print:hidden"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={13} />
              </div>
              <p className="text-xs font-bold leading-tight tracking-wide">{toast.message}</p>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
