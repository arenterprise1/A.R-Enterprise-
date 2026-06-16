import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingBag, ShoppingCart, Trash2, ChevronRight, ChevronDown, CheckCircle2, 
  User, UserPlus, Phone, MapPin, Package, Camera, X, LayoutGrid, List, Palette,
  CreditCard, QrCode, Percent, Tag, Award, Send, Check, CheckCircle,
  PhoneCall, Mail, Smile, Sparkles, Network, RefreshCw
} from 'lucide-react';
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
  onCompleteSale: (
    items: SaleItem[], 
    discount: number, 
    customerInfo?: { name: string; phone: string; address: string; saveToDatabase?: boolean },
    paymentDetails?: {
      paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'qr';
      pointsEarned: number;
      pointsRedeemed: number;
      discountType: 'percentage' | 'fixed' | 'promo' | 'loyalty';
      promoCode?: string;
      digitalReceiptSent?: boolean;
      receiptSentType?: 'sms' | 'email';
      receiptSentValue?: string;
      offline?: boolean;
    }
  ) => Promise<Sale | null>;
  lang: Language;
}

export default function POS({ products, customers, shopInfo, onCompleteSale, lang }: POSProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  
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

  // Extended Advanced POS State Variables
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'qr'>('cash');
  const [discountVal, setDiscountVal] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  
  const [digitalReceiptType, setDigitalReceiptType] = useState<'sms' | 'email' | 'none'>('none');
  const [receiptValue, setReceiptValue] = useState('');
  const [digitalReceiptSent, setDigitalReceiptSent] = useState(false);
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [receiptStatusMsg, setReceiptStatusMsg] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Barcode search simulation
  const [barcodeInput, setBarcodeInput] = useState('');

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
    
    const baseDiscount = discountType === 'percentage' ? (discountVal / 100) * cartTotal : discountVal;
    
    // Promo validation (EID50 / NEWYEAR / SPECIAL20)
    let promoDiscount = 0;
    if (appliedPromo === 'EID50') {
      promoDiscount = 50;
    } else if (appliedPromo === 'NEWYEAR') {
      promoDiscount = Math.floor(0.15 * cartTotal);
    } else if (appliedPromo === 'SPECIAL20') {
      promoDiscount = Math.floor(0.20 * cartTotal);
    }

    const currentCustomer = customers.find(c => c.phone === customerInfo.phone);
    const customerPoints = currentCustomer?.points || 0;
    const remainingBalanceForLoyalty = Math.max(0, cartTotal - baseDiscount - promoDiscount);
    const loyaltyDiscount = isRedeemingPoints ? Math.min(remainingBalanceForLoyalty, customerPoints) : 0;
    
    const totalDiscount = Math.min(cartTotal, baseDiscount + promoDiscount + loyaltyDiscount);
    const payableAmount = Math.max(0, cartTotal - totalDiscount);
    const pointsValueEarned = Math.floor(payableAmount / 100);

    const sale = await onCompleteSale(
      cart, 
      totalDiscount, 
      customerInfo.name || customerInfo.phone || customerInfo.address ? customerInfo : undefined,
      {
        paymentMethod,
        pointsEarned: pointsValueEarned,
        pointsRedeemed: loyaltyDiscount,
        discountType: isRedeemingPoints ? 'loyalty' : (appliedPromo ? 'promo' : (discountType === 'percentage' ? 'percentage' : 'fixed')),
        promoCode: appliedPromo || undefined,
        digitalReceiptSent: digitalReceiptType !== 'none' && digitalReceiptSent,
        receiptSentType: digitalReceiptType !== 'none' ? digitalReceiptType : undefined,
        receiptSentValue: digitalReceiptType !== 'none' ? receiptValue : undefined,
        offline: !navigator.onLine
      }
    );

    if (sale) {
      setCompletedSale(sale);
      setCart([]);
      setDiscountVal(0);
      setAppliedPromo(null);
      setPromoInput('');
      setIsRedeemingPoints(false);
      setDigitalReceiptType('none');
      setReceiptValue('');
      setDigitalReceiptSent(false);
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
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Mobile View Tab Switcher */}
      <div className="flex lg:hidden bg-slate-150/40 dark:bg-slate-800/20 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 sticky top-0 z-20 shadow-sm shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          className={cn(
            "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
            mobileTab === 'products'
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-600/50"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <Package size={16} />
          <span>{lang === 'bn' ? 'প্রোডাক্টস' : 'Products'} ({products.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={cn(
            "flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 relative cursor-pointer",
            mobileTab === 'cart'
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-600/50"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <ShoppingBag size={16} />
          <span>{t.cartLabel}</span>
          {cart.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center animate-bounce">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full lg:h-[calc(100vh-14rem)] overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0">
        {/* Receipt Modal */}
        {completedSale && (
          <Receipt 
            sale={completedSale} 
            shopInfo={shopInfo} 
            onClose={() => {
              setCompletedSale(null);
              setMobileTab('products');
            }} 
            lang={lang}
          />
        )}
        
        {/* Product Selection */}
        <div className={cn(
          "lg:col-span-6 xl:col-span-7 flex flex-col space-y-5 lg:overflow-hidden min-h-[400px] p-4 sm:p-5 rounded-[32px] transition-all duration-300",
          mobileTab !== 'products' && "hidden lg:flex",
          posTheme === 'white' && "bg-[#F8FAFC]/50 border border-slate-200/50",
          posTheme === 'dark' && "bg-[#0f172a] border border-slate-800/80 shadow-inner"
        )}>
        <div className="space-y-3 shrink-0">
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
                "pro-btn-primary flex items-center justify-center gap-2 px-4 transition-all shrink-0",
                isScanning && "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
              )}
            >
              {isScanning ? <X size={20} /> : <Camera size={20} />}
              <span className="hidden sm:inline text-xs font-bold">{isScanning ? (lang === 'bn' ? 'ক্যামেরা বন্ধ' : 'Close Camera') : (lang === 'bn' ? 'ক্যামেরা স্ক্যান' : 'Camera Scan')}</span>
            </button>
          </div>

          {/* Barcode Simulator Row */}
          <div className={cn(
            "p-3 rounded-2xl border flex flex-col md:flex-row items-center gap-3 transition-colors",
            posTheme === 'white' ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700/60"
          )}>
            <div className="flex items-center gap-2 shrink-0">
              <QrCode size={15} className="text-indigo-500" />
              <span className={cn("text-xs font-black uppercase tracking-wider", posTheme === 'white' ? "text-slate-600" : "text-slate-350")}>
                {lang === 'bn' ? 'বারকোড স্ক্যানার সিমুলেটর' : 'Barcode Scan Emulation'}
              </span>
            </div>
            <div className="flex-1 w-full flex gap-2">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'বারকোড বা প্রোডাক্ট কোড লিখুন / স্ক্যানার সিমুলেট করুন...' : 'Type product barcode to simulate external scanning...'}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && barcodeInput.trim()) {
                    handleScanSuccess(barcodeInput.trim());
                    setBarcodeInput('');
                  }
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all",
                  posTheme === 'white' 
                    ? "bg-white border-slate-200 text-slate-800 focus:border-indigo-500" 
                    : "bg-[#1e293b] border-[#334155] text-slate-100 focus:border-indigo-400"
                )}
              />
              <button
                onClick={() => {
                  if (barcodeInput.trim()) {
                    handleScanSuccess(barcodeInput.trim());
                    setBarcodeInput('');
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'স্ক্যান করুন' : 'Scan'}
              </button>
            </div>
            
            {/* Quick Test Barcodes */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-end">
              {products.filter(p => p.barcode).slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleScanSuccess(p.barcode!)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer active:scale-95",
                    posTheme === 'white' 
                      ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-500" 
                      : "bg-[#1e293b] hover:bg-slate-700 border-slate-700 text-slate-400"
                  )}
                  title={`Quick-scan: ${p.name}`}
                >
                  📟 {p.barcode}
                </button>
              ))}
            </div>
          </div>
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
      <div className={cn(
        "lg:col-span-6 xl:col-span-5 flex flex-col lg:overflow-hidden relative min-h-[500px] rounded-[32px] border transition-all duration-300 shadow-xl",
        posTheme === 'white' 
          ? "bg-white border-slate-200/80 hover:shadow-2xl hover:border-slate-250" 
          : "bg-[#0f172a] border-slate-800 shadow-inner",
        mobileTab !== 'cart' && "hidden lg:flex"
      )}>
        <div className={cn(
          "p-6 border-b flex items-center justify-between shrink-0 transition-colors duration-300",
          posTheme === 'white' 
            ? "border-slate-100 bg-gradient-to-r from-slate-50 to-white" 
            : "border-slate-805 bg-gradient-to-r from-slate-900 to-slate-850"
        )}>
          <h3 className={cn("text-xl font-black font-heading flex items-center gap-3",
            posTheme === 'white' ? "text-slate-900" : "text-white"
          )}>
            <ShoppingBag className="text-indigo-500 animate-pulse" size={22} />
            <span>{t.cartLabel}</span>
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-black shadow-sm ring-4 ring-indigo-500/10">
              {cart.length}
            </span>
          </h3>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])} 
              className="text-xs font-bold text-rose-500 hover:text-rose-605 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg active:scale-95 transition-all uppercase tracking-wider"
            >
              {t.clearCart}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          <div className="mb-2">
            <button 
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className={cn(
                "w-full px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all border cursor-pointer",
                showCustomerForm 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-lg shadow-indigo-500/15" 
                  : posTheme === 'white'
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-705 text-slate-300 border-slate-700 shadow-sm"
              )}
            >
              <span className="flex items-center gap-2">
                <UserPlus size={15} />
                {showCustomerForm ? t.hideCustomerInfo : t.addCustomerInfo}
              </span>
              <ChevronDown size={14} className={cn("transition-transform duration-300", showCustomerForm && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showCustomerForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-404 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t.searchCustomers}
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className={cn("pro-input pl-10 py-2.5",
                          posTheme === 'dark' && "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        )}
                      />
                      {matchingCustomers.length > 0 && (
                        <div className={cn(
                          "absolute top-full left-0 right-0 mt-1.5 border rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto overflow-hidden divide-y",
                          posTheme === 'white' 
                            ? "bg-white border-slate-200 divide-slate-100" 
                            : "bg-slate-800 border-slate-700 divide-slate-700"
                        )}>
                          {matchingCustomers.map(c => (
                            <button
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className={cn(
                                "w-full text-left p-3.5 flex flex-col gap-0.5 transition-all duration-150 cursor-pointer",
                                posTheme === 'white' ? "hover:bg-indigo-50/50" : "hover:bg-slate-700/80"
                              )}
                            >
                              <span className={cn("text-xs font-black", posTheme === 'white' ? "text-slate-800" : "text-slate-100")}>{c.name}</span>
                              <span className="text-[10px] font-bold text-indigo-550 dark:text-indigo-305">{c.phone}</span>
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
                        className={cn("pro-input pl-10 py-2.5",
                          posTheme === 'dark' && "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        )}
                      />
                    </div>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t.phone}
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className={cn("pro-input pl-10 py-2.5",
                          posTheme === 'dark' && "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        )}
                      />
                    </div>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-4 top-3 text-slate-400" />
                      <textarea
                        placeholder={t.address}
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                        className={cn("pro-input pl-10 py-2.5 resize-none h-20",
                          posTheme === 'dark' && "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        )}
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
                        <span className={cn("text-[11px] font-black group-hover:text-indigo-600 transition-colors uppercase tracking-wider",
                          posTheme === 'white' ? "text-slate-500" : "text-slate-400"
                        )}>
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
            {cart.map((item) => {
              const prod = products.find(p => p.id === item.productId);
              const remainingStock = prod ? prod.stock : 0;
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.productId}
                  className={cn(
                    "relative group border p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300",
                    posTheme === 'white' 
                      ? "bg-white border-slate-100/80 hover:border-slate-205" 
                      : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600"
                  )}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                          posTheme === 'white' ? "bg-slate-100 text-slate-650" : "bg-slate-800 text-slate-400"
                        )}>
                          {prod?.category || (lang === 'bn' ? 'সাধারণ' : 'General')}
                        </span>
                        {remainingStock <= 3 && (
                          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 animate-pulse">
                            ⚠️ {lang === 'bn' ? 'স্টক কম' : 'Low Stock'} ({remainingStock})
                          </span>
                        )}
                      </div>
                      <h4 className={cn("font-bold text-sm mt-1.5 leading-tight transition-colors",
                        posTheme === 'white' ? "text-slate-850 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-400"
                      )}>
                        {item.productName}
                      </h4>
                      <p className={cn("text-[10px] font-semibold mt-1 tracking-tight",
                        posTheme === 'white' ? "text-slate-400" : "text-slate-500"
                      )}>
                        {t.rate}: <span className="font-sans font-extrabold">{formatCurrency(item.price)}</span>
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className={cn(
                        "p-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                        posTheme === 'white' ? "text-slate-300 hover:text-rose-500 hover:bg-rose-50" : "text-slate-600 hover:text-rose-400 hover:bg-rose-955/20"
                      )}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/50 dark:border-slate-705">
                    <div className={cn(
                      "flex items-center rounded-xl p-1 border",
                      posTheme === 'white' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-700"
                    )}>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg transition-all font-black text-base cursor-pointer",
                          posTheme === 'white' 
                            ? "text-slate-650 hover:bg-white hover:text-indigo-600 hover:shadow-sm" 
                            : "text-slate-500 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        -
                      </button>
                      <span className={cn("w-10 text-center font-black text-sm select-none",
                        posTheme === 'white' ? "text-slate-800" : "text-white"
                      )}>
                        {item.quantity}
                      </span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg transition-all font-black text-base cursor-pointer",
                          posTheme === 'white' 
                            ? "text-slate-650 hover:bg-white hover:text-indigo-600 hover:shadow-sm" 
                            : "text-slate-500 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className={cn("text-[8px] uppercase font-black tracking-widest",
                        posTheme === 'white' ? "text-slate-400" : "text-slate-550"
                      )}>
                        {lang === 'bn' ? 'মোট মূল্য' : 'Subtotal'}
                      </p>
                      <p className={cn("font-black text-base mt-2",
                        posTheme === 'white' ? "text-slate-900" : "text-indigo-400 text-white"
                      )}>
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center text-gray-400 gap-4">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                posTheme === 'white' ? "bg-gray-50" : "bg-slate-805"
              )}>
                <ShoppingBag size={24} className="opacity-20 text-indigo-500" />
              </div>
              <p className="italic text-xs font-semibold tracking-wide">{t.emptyCart}</p>
            </div>
          )}
        </div>

        <div className={cn(
          "p-6 border-t space-y-6 shrink-0 overflow-y-auto max-h-[50vh] custom-scrollbar transition-colors duration-300",
          posTheme === 'white' ? "bg-slate-50/75 border-slate-200" : "bg-slate-900/90 border-slate-850"
        )}>
          {/* Dynamic calculations block for local visual state */}
          {(() => {
            const currentCustomerObj = customers.find(c => c.phone === customerInfo.phone);
            const customerPoints = currentCustomerObj?.points || 0;
            const baseDiscount = discountType === 'percentage' ? (discountVal / 100) * cartTotal : discountVal;
            
            let promoDiscountAmt = 0;
            if (appliedPromo === 'EID50') {
              promoDiscountAmt = 50;
            } else if (appliedPromo === 'NEWYEAR') {
              promoDiscountAmt = Math.round(0.15 * cartTotal);
            } else if (appliedPromo === 'SPECIAL20') {
              promoDiscountAmt = Math.round(0.20 * cartTotal);
            }
            
            const remainingForLoyalty = Math.max(0, cartTotal - baseDiscount - promoDiscountAmt);
            const pointsRedeemedAmt = isRedeemingPoints ? Math.min(remainingForLoyalty, customerPoints) : 0;
            const totalAccumulatedDiscount = Math.min(cartTotal, baseDiscount + promoDiscountAmt + pointsRedeemedAmt);
            const calculatedPayable = Math.max(0, cartTotal - totalAccumulatedDiscount);
            const potentialPointsEarned = Math.floor(calculatedPayable / 100);

            const handleApplyPromo = () => {
              setPromoError(null);
              const p = promoInput.trim().toUpperCase();
              if (p === 'EID50' || p === 'NEWYEAR' || p === 'SPECIAL20') {
                setAppliedPromo(p);
                setPromoInput('');
              } else {
                setPromoError(lang === 'bn' ? 'অকার্যকর প্রোমো কোড!' : 'Invalid Promo Code!');
              }
            };

            const triggerReceiptSendSim = () => {
              if (!receiptValue.trim()) {
                alert(lang === 'bn' ? 'অনুগ্রহ করে নম্বর বা ইমেইল ইনপুট দিন।' : 'Please specify a sending address.');
                return;
              }
              setIsSendingReceipt(true);
              setReceiptStatusMsg(lang === 'bn' ? 'রসিদ ট্র্যান্সমিট করা হচ্ছে...' : 'Transmitting digital invoice...');
              setTimeout(() => {
                setDigitalReceiptSent(true);
                setIsSendingReceipt(false);
                setReceiptStatusMsg(lang === 'bn' ? '✓ রসিদ সফলভাবে পাঠানো হয়েছে!' : '✓ Digital Invoice sent successfully!');
                setTimeout(() => setReceiptStatusMsg(''), 4000);
              }, 1800);
            };

            return (
              <div className="space-y-5">
                {/* 1. Discounts & Offers Block */}
                <div className={cn(
                  "border p-4.5 rounded-2xl shadow-sm space-y-4 transition-colors duration-300",
                  posTheme === 'white' ? "bg-white border-slate-200/60" : "bg-slate-800/30 border-slate-750"
                )}>
                  <div className={cn(
                    "flex items-center justify-between text-xs font-black uppercase tracking-wider border-b pb-2",
                    posTheme === 'white' ? "text-slate-700 border-slate-100" : "text-indigo-300 border-slate-750"
                  )}>
                    <span className="flex items-center gap-1.5 font-heading">✨ {lang === 'bn' ? 'ডিসকাউন্ট ও অফারস' : 'Discounts & Offers'}</span>
                    <Percent size={14} className="text-indigo-500 animate-pulse" />
                  </div>

                  {/* Manual Discount Toggle / Fields */}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex rounded-xl p-0.5 shrink-0 border transition-all duration-150",
                      posTheme === 'white' ? "bg-slate-105 bg-slate-100 border-slate-200/80" : "bg-slate-900 border-slate-705 border-slate-700"
                    )}>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('fixed'); setDiscountVal(0); }}
                        className={cn("px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer", 
                          discountType === 'fixed' 
                            ? "bg-indigo-600 text-white shadow-sm font-sans" 
                            : posTheme === 'white' ? "text-slate-400 hover:text-slate-600" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        ৳
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('percentage'); setDiscountVal(0); }}
                        className={cn("px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer", 
                          discountType === 'percentage' 
                            ? "bg-indigo-600 text-white shadow-sm font-sans" 
                            : posTheme === 'white' ? "text-slate-400 hover:text-slate-600" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        %
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder={lang === 'bn' ? 'ছাড়ের পরিমাণ...' : 'Discount value...'}
                        value={discountVal === 0 ? '' : discountVal}
                        onChange={(e) => setDiscountVal(Math.max(0, parseFloat(e.target.value) || 0))}
                        className={cn(
                          "w-full px-3.5 py-2.5 text-right font-black text-xs rounded-xl border focus:outline-none transition-all duration-150",
                          posTheme === 'white' 
                            ? "bg-white border-slate-200 focus:border-indigo-505 focus:ring-2 focus:ring-indigo-100 text-slate-900 font-sans" 
                            : "bg-slate-900 border-slate-700 focus:border-indigo-505 focus:ring-2 focus:ring-indigo-950/50 text-white font-sans"
                        )}
                      />
                    </div>
                  </div>

                  {/* Promo Code Fields */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="text"
                          placeholder={lang === 'bn' ? 'প্রোমো কোড (যেমন: EID50, NEWYEAR)' : 'Promo Code (e.g., EID50, NEWYEAR)'}
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          className={cn(
                            "w-full pl-8 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none transition-all uppercase",
                            posTheme === 'white'
                              ? "bg-white border-slate-200 focus:border-indigo-500 text-slate-800"
                              : "bg-slate-900 border-slate-700 focus:border-indigo-500 text-white placeholder:text-slate-600"
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold rounded-xl active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        {lang === 'bn' ? 'প্রয়োগ' : 'Apply'}
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[10px] text-rose-500 font-bold">{promoError}</p>
                    )}

                    {appliedPromo && (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                          <span>🎉</span>
                          <span>{appliedPromo} {lang === 'bn' ? 'কোড অ্যাক্টিভ!' : 'Applied'} ({appliedPromo === 'EID50' ? '৳৫০' : '১৫%'} {lang === 'bn' ? 'ছাড়' : 'discount'})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppliedPromo(null)}
                          className="text-rose-550 text-rose-500 hover:text-rose-750 text-xs font-black px-1.5 py-0.5 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Customer Loyalty Points Redemption Section */}
                  {currentCustomerObj && (
                    <div className={cn(
                      "p-3.5 rounded-xl border space-y-2.5 transition-colors duration-305",
                      posTheme === 'white' ? "bg-indigo-50/50 border-indigo-100/80" : "bg-indigo-950/20 border-indigo-900/40"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award size={15} className="text-indigo-500 animate-pulse shrink-0" />
                          <div>
                            <p className={cn("text-[11px] font-black uppercase tracking-tight",
                              posTheme === 'white' ? "text-indigo-950" : "text-indigo-300"
                            )}>{lang === 'bn' ? 'কাস্টমার লয়্যালটি পয়েন্ট' : 'Customer Loyalty Program'}</p>
                            <p className={cn("text-[9px] font-bold mt-0.5",
                              posTheme === 'white' ? "text-indigo-600" : "text-indigo-400"
                            )}>
                              <span className="font-sans font-extrabold">{customerPoints}</span> {lang === 'bn' ? 'পয়েন্ট রয়েছে (৳' : 'points available (Value: ৳'}
                              <span className="font-sans font-extrabold">{customerPoints}</span>)
                            </p>
                          </div>
                        </div>
                        {customerPoints > 0 && (
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isRedeemingPoints}
                              onChange={(e) => setIsRedeemingPoints(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className={cn("text-[10px] font-black uppercase tracking-wider",
                              posTheme === 'white' ? "text-indigo-950" : "text-indigo-200"
                            )}>{lang === 'bn' ? 'রিডিম' : 'Redeem'}</span>
                          </label>
                        )}
                      </div>
                      {isRedeemingPoints && (
                        <div className="p-2 bg-indigo-600/10 text-indigo-800 dark:text-indigo-350 font-black rounded-lg text-[9px] uppercase tracking-wide flex items-center justify-between border border-indigo-500/15">
                          <span>🎁 {lang === 'bn' ? 'পয়েন্ট ডিসকাউন্ট যুক্ত:' : 'Redeemed Discount:'}</span>
                          <span className="font-sans text-xs">{formatCurrency(pointsRedeemedAmt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Multiple Payment Methods Row */}
                <div className="space-y-3">
                  <label className={cn(
                    "text-[10px] font-extrabold uppercase tracking-widest block",
                    posTheme === 'white' ? "text-slate-500" : "text-slate-400"
                  )}>{lang === 'bn' ? 'পেমেন্ট গেটওয়ে এবং মেথড' : 'Payment Method Selection'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'cash' 
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 shadow-sm ring-2 ring-emerald-500/20" 
                          : posTheme === 'white' ? "border-slate-205 border-slate-200 bg-white text-slate-600 hover:border-slate-350" : "border-slate-700/65 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <CheckCircle size={16} className={cn("transition-transform group-hover/pay:scale-110", paymentMethod === 'cash' ? 'text-emerald-500' : 'opacity-40')} />
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'নগদ টাকা' : 'Cash'}</span>
                    </button>

                    {/* Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'card' 
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/20" 
                          : posTheme === 'white' ? "border-slate-200 bg-white text-slate-600 hover:border-slate-355" : "border-slate-700/65 bg-slate-800/40 text-slate-305 hover:border-slate-600"
                      )}
                    >
                      <CreditCard size={16} className={cn("transition-transform group-hover/pay:scale-110", paymentMethod === 'card' ? 'text-blue-505' : 'opacity-40')} />
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'কার্ড' : 'Card'}</span>
                    </button>

                    {/* bKash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bkash')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'bkash' 
                          ? "border-pink-500 bg-pink-50 dark:bg-pink-955 text-pink-700 dark:text-pink-400 shadow-sm ring-2 ring-pink-500/20" 
                          : posTheme === 'white' ? "border-slate-200 bg-white text-slate-600 hover:border-slate-355" : "border-slate-700/65 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <span className="w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] select-none group-hover/pay:scale-110 transition-transform font-sans">b</span>
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'বিকাশ' : 'bKash'}</span>
                    </button>

                    {/* Nagad */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('nagad')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'nagad' 
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-955 text-orange-750 dark:text-orange-400 shadow-sm ring-2 ring-orange-500/20" 
                          : posTheme === 'white' ? "border-slate-200 bg-white text-slate-600 hover:border-slate-355" : "border-slate-700/65 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] select-none group-hover/pay:scale-110 transition-transform font-sans">n</span>
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'নগদ অ্যাপ' : 'Nagad'}</span>
                    </button>

                    {/* Rocket */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('rocket')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'rocket' 
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-955 text-purple-700 dark:text-purple-400 shadow-sm ring-2 ring-purple-500/20" 
                          : posTheme === 'white' ? "border-slate-200 bg-white text-slate-600 hover:border-slate-355" : "border-slate-700/65 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <span className="w-5 h-5 bg-purple-650 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-[10px] select-none group-hover/pay:scale-110 transition-transform font-sans">R</span>
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'রকেট' : 'Rocket'}</span>
                    </button>

                    {/* QR SCAN */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qr')}
                      className={cn(
                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer relative overflow-hidden group/pay",
                        paymentMethod === 'qr' 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-900 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20" 
                          : posTheme === 'white' ? "border-slate-200 bg-white text-slate-500 hover:border-slate-355" : "border-slate-700/65 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                      )}
                    >
                      <QrCode size={16} className={cn("transition-transform group-hover/pay:scale-110", paymentMethod === 'qr' ? 'text-indigo-650' : 'opacity-40')} />
                      <span className="text-[10px] font-black tracking-wide">{lang === 'bn' ? 'কিউআর কোড' : 'QR Scan'}</span>
                    </button>
                  </div>

                  {/* QR Scan Simulated Helper details */}
                  {paymentMethod === 'qr' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col items-center text-center gap-2"
                    >
                      <p className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">{lang === 'bn' ? 'পেমেন্ট কিউআর কোড (স্ক্যান করুন)' : 'Dynamic Digital QR Code Payment'}</p>
                      
                      <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl">
                        <QrCode size={96} className="text-slate-900" />
                        <div className="absolute inset-x-3 bottom-3 h-1 bg-lime-500 animate-bounce" />
                      </div>
                      
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">{lang === 'bn' ? 'বিকাশ, রকেট বা ব্যাংক অ্যাপ দিয়ে স্ক্যান করুন।' : 'Scan this code using any local banking App.'}</p>
                        <p className="text-xs font-black text-indigo-600 font-sans mt-0.5">{formatCurrency(calculatedPayable)}</p>
                      </div>
                      <span className="text-[9px] bg-indigo-200/50 text-indigo-800 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider animate-pulse">{lang === 'bn' ? '৩টি ব্যাংক এবং সকল মোবাইল ব্যাংকিং সমর্থিত' : 'Fully supports bKash, SSL & EMVCo QR'}</span>
                    </motion.div>
                  )}
                </div>

                {/* 3. SMS or Email Receipt Sender */}
                <div className={cn(
                  "border p-4.5 rounded-2xl shadow-sm space-y-3 transition-colors duration-150",
                  posTheme === 'white' ? "bg-white border-slate-200/60" : "bg-slate-800/30 border-slate-700/60"
                )}>
                  <div className={cn(
                    "flex items-center justify-between text-xs font-black uppercase tracking-wider border-b pb-2",
                    posTheme === 'white' ? "text-slate-700 border-slate-100" : "text-slate-300 border-slate-700/50"
                  )}>
                    <span className="flex items-center gap-1.5 font-heading">📨 {lang === 'bn' ? 'ডিজিটাল রসিদ পাঠান' : 'Digital Receipt Dispatch'}</span>
                    {digitalReceiptSent && <span className="bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse">SENT</span>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDigitalReceiptType('sms');
                        setReceiptValue(customerInfo.phone || '');
                        setDigitalReceiptSent(false);
                      }}
                      className={cn(
                        "flex-1 py-1.5 py-2 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        digitalReceiptType === 'sms' 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                          : posTheme === 'white' ? "bg-white text-slate-650 hover:bg-slate-50 border-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                      )}
                    >
                      <PhoneCall size={12} />
                      {lang === 'bn' ? 'SMS রসিদ' : 'SMS Receipt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDigitalReceiptType('email');
                        setReceiptValue('');
                        setDigitalReceiptSent(false);
                      }}
                      className={cn(
                        "flex-1 py-1.5 py-2 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        digitalReceiptType === 'email' 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                          : posTheme === 'white' ? "bg-white text-slate-655 hover:bg-slate-50 border-slate-205" : "bg-slate-800 text-slate-300 hover:bg-slate-705 border-slate-700"
                      )}
                    >
                      <Mail size={12} />
                      {lang === 'bn' ? 'Email রসিদ' : 'Email Receipt'}
                    </button>
                    {digitalReceiptType !== 'none' && (
                      <button
                        type="button"
                        onClick={() => { setDigitalReceiptType('none'); setReceiptValue(''); setDigitalReceiptSent(false); }}
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955 px-2 rounded-xl text-xs font-black transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {digitalReceiptType !== 'none' && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type={digitalReceiptType === 'email' ? 'email' : 'text'}
                          placeholder={digitalReceiptType === 'email' ? (lang === 'bn' ? 'কাস্টমারের ইমেইল...' : 'Customer email...') : (lang === 'bn' ? 'কাস্টমারের মোবাইল নম্বর...' : 'Customer mobile number...')}
                          value={receiptValue}
                          onChange={(e) => setReceiptValue(e.target.value)}
                          className={cn(
                            "flex-1 px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none transition-all",
                            posTheme === 'white'
                              ? "bg-white border-slate-200 focus:border-indigo-505 text-slate-800 font-sans"
                              : "bg-slate-900 border-slate-700 focus:border-indigo-505 text-white placeholder:text-slate-600 font-sans"
                          )}
                        />
                        <button
                          type="button"
                          disabled={isSendingReceipt}
                          onClick={triggerReceiptSendSim}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          {isSendingReceipt ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          <span>{lang === 'bn' ? 'পাঠান' : 'Send'}</span>
                        </button>
                      </div>
                      
                      {receiptStatusMsg && (
                        <p className={cn("text-[10px] font-black mt-1.5", digitalReceiptSent ? "text-emerald-500 animate-pulse" : "text-amber-500")}>
                          {receiptStatusMsg}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Total calculation details */}
                <div className={cn(
                  "border-t pt-4 space-y-2.5 transition-colors duration-150",
                  posTheme === 'white' ? "border-slate-200 text-slate-600" : "border-slate-700/50 text-slate-350"
                )}>
                  <div className={cn("flex items-center justify-between text-xs font-semibold",
                    posTheme === 'white' ? "text-slate-500" : "text-slate-400"
                  )}>
                    <span>{t.subTotal}</span>
                    <span className="font-sans font-bold text-slate-800 dark:text-slate-200">{formatCurrency(cartTotal)}</span>
                  </div>

                  {/* Discount details breakdown */}
                  {baseDiscount > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-500 font-bold">
                      <span>{lang === 'bn' ? 'তাত্ক্ষণিক ছাড়' : 'Standard Discount'} {discountType === 'percentage' && `(${discountVal}%)`}:</span>
                      <span className="font-sans font-black">- {formatCurrency(baseDiscount)}</span>
                    </div>
                  )}
                  {promoDiscountAmt > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-500 font-bold">
                      <span>{lang === 'bn' ? 'প্রোমো কোড ছাড়' : 'Promo discount'} ({appliedPromo}):</span>
                      <span className="font-sans font-black">- {formatCurrency(promoDiscountAmt)}</span>
                    </div>
                  )}
                  {pointsRedeemedAmt > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-500 font-bold">
                      <span>{lang === 'bn' ? 'লয়্যালটি পয়েন্টস রিডিম' : 'Loyalty points redeemed'}:</span>
                      <span className="font-sans font-black">- {formatCurrency(pointsRedeemedAmt)}</span>
                    </div>
                  )}

                  {currentCustomerObj && (
                    <div className={cn(
                      "p-1.5 px-3 border rounded-xl text-[10px] font-black tracking-wide flex items-center justify-between transition-colors",
                      posTheme === 'white' ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-indigo-950/20 border-indigo-900/40 text-indigo-300"
                    )}>
                      <span className="flex items-center gap-1.5">🌟 {lang === 'bn' ? 'অর্ডার থেকে কাস্টমার অর্জন করবে:' : 'Points earned on order:'}</span>
                      <span className="text-xs bg-indigo-600 text-white rounded px-1.5 py-0.2 select-none font-sans font-black">+{potentialPointsEarned} Point</span>
                    </div>
                  )}

                  <div className={cn(
                    "flex items-center justify-between border-t pt-4 mt-2 transition-colors",
                    posTheme === 'white' ? "border-slate-200" : "border-slate-700/60"
                  )}>
                    <span className={cn("text-xs font-black uppercase tracking-wider",
                      posTheme === 'white' ? "text-slate-700" : "text-slate-300"
                    )}>{t.payable}</span>
                    <span className={cn("text-3xl font-black tracking-tighter transition-all font-sans",
                      posTheme === 'white' ? "text-indigo-600" : "text-indigo-400"
                    )}>
                      {formatCurrency(calculatedPayable)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Checkout Submit CTA button */}
          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className={cn(
              "pro-btn-primary w-full py-4 text-lg shadow-xl flex items-center justify-center gap-2.5 cursor-pointer mt-5 font-black uppercase tracking-wider transition-all duration-150 rounded-2xl",
              cart.length === 0 && "opacity-40 grayscale pointer-events-none"
            )}
          >
            <span>{t.confirmSale}</span> 
            <ChevronRight size={22} className="animate-pulse" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
