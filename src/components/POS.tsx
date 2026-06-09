import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingBag, Trash2, ChevronRight, CheckCircle2, User, Phone, MapPin, Package, Camera, X, LayoutGrid, List, Palette } from 'lucide-react';
import { Product, SaleItem, Customer, Sale, ShopInfo } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import Receipt from './Receipt';
import { Language, translations } from '../translations';

interface POSProps {
  products: Product[];
  customers: Customer[];
  shopInfo: ShopInfo;
  onCompleteSale: (items: SaleItem[], discount: number, customerInfo?: { name: string; phone: string; address: string; saveToDatabase?: boolean }) => Promise<Sale | null>;
  lang: Language;
}

export default function POS({ products, customers, shopInfo, onCompleteSale, lang }: POSProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  
  const [posLayout, setPosLayout] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('pos_layout') as 'grid' | 'list') || 'list';
    } catch {
      return 'list';
    }
  });

  const [posTheme, setPosTheme] = useState<'white' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('pos_theme');
      return saved === 'white' ? 'white' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pos_layout', posLayout);
    } catch (e) {}
  }, [posLayout]);

  useEffect(() => {
    try {
      localStorage.setItem('pos_theme', posTheme);
    } catch (e) {}
  }, [posTheme]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    saveToDatabase: true
  });

  const matchingCustomers = customerSearch.length >= 3 
    ? customers.filter(c => c.phone.includes(customerSearch) || c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    : [];

  const selectCustomer = (customer: Customer) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      saveToDatabase: false
    });
    setCustomerSearch('');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) && p.stock > 0
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        total: product.price,
        warranty: product.warranty
      }];
    });
  };

  const handleScanSuccess = (decodedText: string) => {
    const product = products.find(p => p.barcode === decodedText);
    if (product) {
      if (product.stock > 0) {
        addToCart(product);
        setIsScanning(false);
      } else {
        alert(t.outOfStock);
      }
    } else {
      setScannerError(`${t.productNotFound} (Barcode: ${decodedText})`);
      setTimeout(() => setScannerError(null), 3000);
    }
  };

  const isScanningRef = useRef(false);

  useEffect(() => {
    const handleAddDirect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.productName) return;
      const matchedProduct = products.find(p => 
        p.name.toLowerCase().includes(detail.productName.toLowerCase())
      );
      if (matchedProduct) {
        const quantityToAdd = detail.quantity || 1;
        setCart(prev => {
          const existing = prev.find(item => item.productId === matchedProduct.id);
          if (existing) {
            const newQty = Math.min(matchedProduct.stock, existing.quantity + quantityToAdd);
            return prev.map(item => 
              item.productId === matchedProduct.id 
                ? { ...item, quantity: newQty, total: newQty * item.price }
                : item
            );
          }
          return [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            price: matchedProduct.price,
            quantity: Math.min(matchedProduct.stock, quantityToAdd),
            total: matchedProduct.price * Math.min(matchedProduct.stock, quantityToAdd),
            warranty: matchedProduct.warranty
          }];
        });
      }
    };
    window.addEventListener('add-to-cart-direct', handleAddDirect);
    return () => window.removeEventListener('add-to-cart-direct', handleAddDirect);
  }, [products]);

  useEffect(() => {
    if (isScanning) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          
          const config = { fps: 10, qrbox: { width: 250, height: 150 } };
          
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            () => {} // Ignore scan failure (silent tracking)
          );
          isScanningRef.current = true;
        } catch (err: any) {
          console.error("Scanner error:", err);
          if (err?.name === 'NotFoundError' || err?.message?.includes('NotFoundError')) {
            setScannerError(lang === 'bn' ? 'আপনার ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি।' : 'No camera found on your device.');
          } else {
            setScannerError(t.cameraError);
          }
          setIsScanning(false);
          isScanningRef.current = false;
        }
      };
      
      startScanner();
    } else {
      const stop = async () => {
        if (scannerRef.current && isScanningRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (err) {
            console.error("Error stopping scanner:", err);
          } finally {
            scannerRef.current = null;
            isScanningRef.current = false;
          }
        }
      };
      stop();
    }

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(err => console.error("Unmount cleanup error:", err));
      }
    };
  }, [isScanning, products, lang, t.cameraError]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const newQuantity = Math.max(1, item.quantity + delta);
        if (product && newQuantity > product.stock && delta > 0) return item;
        return { ...item, quantity: newQuantity, total: newQuantity * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const sale = await onCompleteSale(cart, discount, customerInfo.name || customerInfo.phone || customerInfo.address ? customerInfo : undefined);
    if (sale) {
      setCompletedSale(sale);
      setCart([]);
      setDiscount(0);
      setCustomerInfo({ name: '', phone: '', address: '', saveToDatabase: true });
      setCustomerSearch('');
      setShowCustomerForm(false);
    }
  };

  const labelText = {
    bn: {
      layout: 'লেআউট:',
      theme: 'ব্যাকগ্রাউন্ড:',
      list: 'রেকট্যাঙ্গেল (লিস্ট)',
      grid: 'বক্স (গ্রিড)',
      white: 'সাদা',
      dark: 'ডার্ক'
    },
    en: {
      layout: 'Layout:',
      theme: 'Background:',
      list: 'Rectangle (List)',
      grid: 'Box (Grid)',
      white: 'White',
      dark: 'Dark'
    }
  }[lang];

  const theme = {
    white: {
      searchBg: "bg-white border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500",
      card: "bg-white border border-slate-200/80 text-slate-900 hover:border-slate-300 hover:bg-slate-50/50 shadow-sm",
      cardText: "text-slate-900",
      cardSec: "text-slate-500",
      categoryBadge: "bg-slate-100 text-slate-800 border border-slate-200/50",
      stock: "bg-indigo-50/80 text-indigo-600 border border-indigo-100",
      price: "text-slate-900",
      panel: "bg-slate-100/50"
    },
    dark: {
      searchBg: "bg-[#1e293b]/90 border-slate-700/80 text-slate-100 focus:ring-indigo-400 focus:border-indigo-400 placeholder-slate-400/70",
      card: "bg-[#1e293b] border border-slate-800/80 text-slate-150 hover:bg-[#334155]/60 hover:border-indigo-500/40 shadow-md",
      cardText: "text-slate-100",
      cardSec: "text-slate-400",
      categoryBadge: "bg-slate-800/60 text-indigo-300 border border-indigo-500/10",
      stock: "bg-indigo-950/40 text-indigo-300 border border-indigo-550/10",
      price: "text-indigo-400",
      panel: "bg-[#0f172a]"
    }
  }[posTheme];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full lg:h-[calc(100vh-14rem)] overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0">
      {/* Receipt Modal */}
      {completedSale && (
        <Receipt 
          sale={completedSale} 
          shopInfo={shopInfo} 
          onClose={() => setCompletedSale(null)} 
          lang={lang}
        />
      )}
      
      {/* Product Selection */}
      <div className={cn(
        "lg:col-span-7 xl:col-span-8 flex flex-col space-y-5 lg:overflow-hidden min-h-[400px] p-4 sm:p-5 rounded-[32px] transition-all duration-300",
        posTheme === 'white' && "bg-[#F8FAFC]/50 border border-slate-200/50",
        posTheme === 'dark' && "bg-[#0f172a] border border-slate-800/80 shadow-inner"
      )}>
        <div className={cn(
          "flex gap-4 sticky top-0 z-10 pb-2 transition-all duration-300",
          posTheme === 'white' && "bg-[#F8FAFC]/20 backdrop-blur-md",
          posTheme === 'dark' && "bg-[#0f172a]/90 backdrop-blur-md"
        )}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t.searchProducts}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pro-input pl-12 text-lg shadow-sm border focus:ring-2 transition-all", theme.searchBg)}
            />
          </div>
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className={cn(
              "pro-btn-primary flex flex-col items-center justify-center min-w-[70px] transition-all",
              isScanning && "bg-red-500 hover:bg-red-600 shadow-red-100"
            )}
          >
            {isScanning ? <X size={24} /> : <Camera size={24} />}
          </button>
        </div>

        {/* Layout & Background Options Bar */}
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-300",
          posTheme === 'white' && "bg-white border-slate-200/85 shadow-sm",
          posTheme === 'dark' && "bg-slate-800/35 border-slate-800/60"
        )}>
          {/* Layout Toggle */}
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", theme.cardSec)}>
              {labelText.layout}
            </span>
            <div className="flex bg-slate-200/40 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setPosLayout('list')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                  posLayout === 'list' 
                    ? "bg-indigo-600 text-white shadow-sm"
                    : cn("text-slate-600 hover:text-slate-900", posTheme !== 'white' && "text-slate-400 hover:text-white")
                )}
              >
                <List size={14} />
                <span>{labelText.list}</span>
              </button>
              <button
                type="button"
                onClick={() => setPosLayout('grid')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                  posLayout === 'grid' 
                    ? "bg-indigo-600 text-white shadow-sm"
                    : cn("text-slate-600 hover:text-slate-900", posTheme !== 'white' && "text-slate-400 hover:text-white")
                )}
              >
                <LayoutGrid size={14} />
                <span>{labelText.grid}</span>
              </button>
            </div>
          </div>

          {/* Theme / Background Options */}
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", theme.cardSec)}>
              <Palette size={13} />
              {labelText.theme}
            </span>
            <div className="flex gap-2">
              {/* White Option */}
              <button
                type="button"
                onClick={() => setPosTheme('white')}
                className={cn(
                  "px-2.5 py-1 text-xs font-black rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer",
                  posTheme === 'white'
                    ? "bg-white text-slate-900 border-indigo-600 ring-2 ring-indigo-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-white border border-slate-300" />
                <span>{labelText.white}</span>
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => setPosTheme('dark')}
                className={cn(
                  "px-2.5 py-1 text-xs font-black rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer",
                  posTheme === 'dark'
                    ? "bg-slate-800 text-slate-100 border-indigo-500 ring-2 ring-indigo-500/25"
                    : "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-750"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span>{labelText.dark}</span>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative overflow-hidden pro-card bg-slate-900 border-none rounded-3xl"
            >
              <div id="reader" className="w-full h-64 md:h-80"></div>
              {scannerError && (
                <div className="absolute top-4 left-4 right-4 p-4 bg-red-500 text-white font-bold rounded-2xl text-center shadow-2xl animate-bounce">
                  {scannerError}
                </div>
              )}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <p className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-xs font-medium tracking-tight">
                  {t.scanInstruction}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(
          "flex-1 lg:overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300/35",
          posLayout === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" 
            : "flex flex-col gap-3"
        )}>
          <AnimatePresence>
            {filteredProducts.map((product) => {
              if (posLayout === 'list') {
                return (
                  <motion.button
                    layout
                    key={product.id}
                    onClick={() => addToCart(product)}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "group text-left flex flex-row items-center p-3 rounded-2xl transition-all border duration-200 gap-4 cursor-pointer",
                      theme.card
                    )}
                  >
                    {/* Rectangle Thumbnail on Left */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-100/50 flex items-center justify-center text-slate-300 overflow-hidden relative rounded-xl border border-slate-200/20">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <Package size={24} className="opacity-20 text-slate-400" />
                      )}
                    </div>

                    {/* Product Metadata Right Section */}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={cn("font-bold transition-all text-base leading-tight", theme.cardText)}>{product.name}</h4>
                          <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tight", theme.categoryBadge)}>
                            {product.category || t.uncategorized}
                          </span>
                        </div>
                        <p className={cn("text-[9px] font-mono uppercase tracking-wider", theme.cardSec)}>{t.code}: #{product.id.slice(0, 8).toUpperCase()}</p>
                      </div>

                      <div className="flex items-center gap-5 shrink-0 justify-between sm:justify-end">
                        <span className={cn("text-lg font-black", theme.price)}>{formatCurrency(product.price)}</span>
                        <div>
                          <span className={cn("block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", theme.stock)}>
                            {t.stock}: {product.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              }

              return (
                <motion.button
                  layout
                  key={product.id}
                  onClick={() => addToCart(product)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "group text-left flex flex-col hover:-translate-y-1 transition-all border rounded-3xl overflow-hidden cursor-pointer",
                    theme.card
                  )}
                >
                  <div className="h-40 bg-slate-100/30 flex items-center justify-center text-slate-300 overflow-hidden relative border-b border-slate-100/10">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <Package size={48} className="opacity-20 text-slate-400" />
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm text-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm border border-slate-200">
                      {product.category || t.uncategorized}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className={cn("font-bold transition-all text-base line-clamp-1", theme.cardText)}>{product.name}</h4>
                      <p className={cn("text-[10px] font-medium mt-1 uppercase", theme.cardSec)}>{t.code}: #{product.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <span className={cn("text-lg font-bold", theme.price)}>{formatCurrency(product.price)}</span>
                      <div className="text-right">
                        <span className={cn("block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", theme.stock)}>
                          {t.stock}: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {filteredProducts.length === 0 && (
            <div className={cn(
              "col-span-full flex flex-col items-center justify-center p-12 italic rounded-3xl border border-dashed transition-all",
              posTheme === 'white' && "bg-white border-slate-200 text-slate-400",
              posTheme === 'dark' && "bg-[#1e293b] border-slate-800 text-slate-400"
            )}>
               <ShoppingBag size={48} className="mb-4 opacity-20" />
               {t.noSalesYet}
            </div>
          )}
        </div>
      </div>

      {/* Cart Checkout */}
      <div className="lg:col-span-5 xl:col-span-4 pro-card flex flex-col lg:overflow-hidden relative bg-white min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <h3 className="text-xl font-bold flex items-center gap-3 text-slate-900">
            {t.cartLabel}
            <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-sm shadow-indigo-200">{cart.length}</span>
          </h3>
          <button onClick={() => setCart([])} className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight">{t.clearCart}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          <div className="mb-2">
            <button 
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className={cn(
                "w-full px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-tight flex items-center justify-between transition-all border",
                showCustomerForm ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-slate-50 shadow-sm"
              )}
            >
              <span>{showCustomerForm ? t.hideCustomerInfo : t.addCustomerInfo}</span>
              <User size={16} />
            </button>
            <AnimatePresence>
              {showCustomerForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t.searchCustomers}
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pro-input pl-10 py-2"
                      />
                      {matchingCustomers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto overflow-hidden">
                          {matchingCustomers.map(c => (
                            <button
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className="w-full text-left p-3 hover:bg-indigo-50 border-b last:border-0 border-slate-50 flex flex-col gap-0.5 transition-colors"
                            >
                              <span className="text-sm font-bold text-slate-800">{c.name}</span>
                              <span className="text-[10px] font-medium text-slate-500">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t.customerName}
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        className="pro-input pl-10 py-2"
                      />
                    </div>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t.phone}
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="pro-input pl-10 py-2"
                      />
                    </div>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-4 top-3 text-slate-400" />
                      <textarea
                        placeholder={t.address}
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                        className="pro-input pl-10 py-2 resize-none h-20"
                      />
                    </div>
                    {!customers.find(c => c.phone === customerInfo.phone) && customerInfo.phone && (
                      <label className="flex items-center gap-2 p-1 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={customerInfo.saveToDatabase}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, saveToDatabase: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                          {t.saveToDb}
                        </span>
                      </label>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.productId}
                className="relative group bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">{item.productName}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-tight">{t.rate}: {formatCurrency(item.price)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                    <button 
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all font-bold text-lg"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-[13px] text-slate-800">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-bold text-base text-slate-900">{formatCurrency(item.total)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-8 text-center text-gray-400 gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag size={24} className="opacity-20" />
              </div>
              <p className="italic text-sm">{t.emptyCart}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4 shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between group">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                {t.discount}
              </label>
              <div className="relative w-32">
                <input
                  type="number"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="pro-input py-1.5 text-right font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">{t.subTotal}</span>
              <span className="text-lg font-bold text-slate-500">{formatCurrency(cartTotal)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{t.payable}</span>
              <span className="text-3xl font-bold text-indigo-600 tracking-tight">
                {formatCurrency(Math.max(0, cartTotal - discount))}
              </span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={cn(
              "pro-btn-primary w-full py-4 text-lg shadow-lg",
              cart.length === 0 && "opacity-50 grayscale pointer-events-none"
            )}
          >
            {t.confirmSale} <ChevronRight size={24} className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
