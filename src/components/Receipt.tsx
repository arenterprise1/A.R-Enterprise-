import React, { useEffect, useState } from 'react';
import { Sale, ShopInfo } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Printer, X } from 'lucide-react';
import { Language, translations } from '../translations';
import QRCode from 'qrcode';

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
      handlePrint();
    }, 500); // Small delay to let fonts/styles load
    return () => clearTimeout(timer);
  }, [sale.id]);

  const handlePrint = () => {
    try {
      const originalTitle = document.title;
      document.title = `${shopInfo.name} - Invoice`;
      window.print();
      document.title = originalTitle;
    } catch (e) {
      console.error("Print failed", e);
    }
  };

  return (
    <div id="printable-receipt-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Actions - Hidden on print */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center print:hidden flex-shrink-0">
          <div className="flex flex-col">
            <h3 className="font-bold italic text-gray-900">{t.receipt}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t.invoiceView}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="px-6 py-2.5 bg-black text-white rounded-2xl hover:scale-105 transition-all flex items-center gap-2 font-black text-sm italic tracking-wide"
            >
              <Printer size={16} /> {t.print}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all border border-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div id="printable-receipt" className="p-10 font-sans text-sm print:p-8 overflow-y-auto bg-white print:overflow-visible relative">
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
            <div className="mb-8 rounded-3xl border-2 overflow-hidden shadow-sm" style={{ borderColor: accentColor }}>
              <table className="w-full border-collapse">
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



            {/* Footer & Signature Section */}
            <div className="mt-20 pt-8 grid grid-cols-2 gap-20">
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
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm print:text-black/80">
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
        </div>
      </div>
    </div>
  );
}
