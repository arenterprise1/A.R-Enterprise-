/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  serverTimestamp,
  orderBy,
  setDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import History from './components/History';
import Settings from './components/Settings';
import Customers from './components/Customers';
import StaffManagement from './components/StaffManagement';
import Auth from './components/Auth';
import Receipt from './components/Receipt';
import GeminiAssistant from './components/GeminiAssistant';
import { Product, Sale, View, SaleItem, ShopInfo, Customer, UserProfile } from './types';
import { Language, translations } from './translations';
import { formatCurrency } from './lib/utils';
import { AR_LOGO_BASE64 } from './components/Auth';
import { CheckCircle2, Share2, PhoneCall, MapPin, Calendar, DollarSign, FileText, Download, AlertCircle, Globe, Printer, Image, FileImage, Sparkles, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { toPng } from 'html-to-image';

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'এ.আর এন্টারপ্রাইজ',
  address: 'মিরপুর, ঢাকা',
  phone: '০১৭XXXXXXXX',
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [lang, setLang] = useState<Language>('bn');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP_INFO);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Public Guest invoice sharing states
  const [publicSale, setPublicSale] = useState<Sale | null>(null);
  const [publicShop, setPublicShop] = useState<ShopInfo | null>(null);
  const [publicLoading, setPublicLoading] = useState<boolean>(false);
  const [publicError, setPublicError] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // States for generating and downloading PNG invoice images
  const [generatedPNG, setGeneratedPNG] = useState<string>('');
  const [isGeneratingPNG, setIsGeneratingPNG] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const memoRef = useRef<HTMLDivElement>(null);

  const user = auth.currentUser;
  const t = translations[lang];

  // Load public invoice if query params are present in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoice');
    const shopId = params.get('shop');

    if (!invoiceId) return;

    const fetchPublicInvoice = async () => {
      setPublicLoading(true);
      setPublicError('');
      try {
        const saleDoc = await getDoc(doc(db, 'sales', invoiceId));
        if (saleDoc.exists()) {
          setPublicSale({ id: saleDoc.id, ...saleDoc.data() } as Sale);
        } else {
          setPublicError(lang === 'bn' ? 'দুঃখিত, এই ইনভয়েসটি পাওয়া যায়নি।' : 'Sorry, this invoice was not found.');
        }

        if (shopId) {
          const shopDoc = await getDoc(doc(db, 'shops', shopId));
          if (shopDoc.exists()) {
            setPublicShop(shopDoc.data() as ShopInfo);
          }
        }
      } catch (err) {
        console.error('Error fetching public invoice:', err);
        setPublicError(lang === 'bn' ? 'ইনভয়েস লোড করতে সমস্যা হয়েছে।' : 'Failed to load invoice details.');
      } finally {
        setPublicLoading(false);
      }
    };

    fetchPublicInvoice();
  }, [lang]);

  // Handle User Profile Initialization
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        setUserProfile({ uid: snap.id, ...snap.data() } as UserProfile);
        setProfileLoading(false);
      } else {
        // Only run initialization if profile truly doesn't exist
        try {
          // Check for invitation
          const inviteDoc = await getDoc(doc(db, 'invitations', user.email?.toLowerCase() || ''));
          if (inviteDoc.exists()) {
            const inviteData = inviteDoc.data();
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              role: inviteData.role,
              shopId: inviteData.shopId,
              name: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            await deleteDoc(doc(db, 'invitations', user.email!.toLowerCase()));
            // onSnapshot will trigger again with the new data
          } else {
            // Create as fresh owner
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              role: 'owner',
              shopId: user.uid,
              name: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            // onSnapshot will trigger again
          }
        } catch (error) {
          console.error("Profile Creation Error:", error);
          setProfileLoading(false);
        }
      }
    });

    return () => unsub();
  }, [user]);

  // Listen to Shop Info
  useEffect(() => {
    if (!userProfile?.shopId) return;
    return onSnapshot(doc(db, 'shops', userProfile.shopId), (doc) => {
      if (doc.exists()) {
        setShopInfo(doc.data() as ShopInfo);
      }
    });
  }, [userProfile?.shopId]);

  // Listen to Products
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'products'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(pData);
    });
  }, [userProfile?.shopId]);

  // Listen to Sales
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'sales'), 
      where('shopId', '==', userProfile.shopId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const sData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      setSales(sData);
    });
  }, [userProfile?.shopId]);

  // Listen to Customers
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'customers'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(cData);
    });
  }, [userProfile?.shopId]);

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'shopId'>) => {
    if (!userProfile) return;
    try {
      // Sanitize undefined fields
      const sanitizedProduct = JSON.parse(JSON.stringify(newProduct));
      await addDoc(collection(db, 'products'), {
        ...sanitizedProduct,
        shopId: userProfile.shopId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    if (!userProfile) return;
    const { id, ...data } = product;
    try {
      // Sanitize undefined fields
      const sanitizedData = JSON.parse(JSON.stringify(data));
      await updateDoc(doc(db, 'products', id), sanitizedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${id}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!userProfile || userProfile.role !== 'owner') return;
    try {
      await deleteDoc(doc(db, 'sales', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${id}`);
    }
  };

  const handleAddCustomer = async (newCustomer: Omit<Customer, 'id' | 'shopId'>) => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        shopId: userProfile.shopId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'customers');
    }
  };

  const handleUpdateCustomer = async (id: string, data: Partial<Customer>) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'customers', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customers/${id}`);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!userProfile || userProfile.role !== 'owner') return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  const handleUpdateShopInfo = async (info: ShopInfo) => {
    if (!userProfile || userProfile.role !== 'owner') return;
    try {
      await setDoc(doc(db, 'shops', userProfile.shopId), info);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `shops/${userProfile.shopId}`);
    }
  };

  const handleCompleteSale = async (items: SaleItem[], discount: number, customerInfo?: { name: string; phone: string; address: string; saveToDatabase?: boolean }) => {
    if (!userProfile) return;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const payableAmount = Math.max(0, totalAmount - discount);
    
    // Sanitize items - remove undefined fields (like warranty)
    const sanitizedItems = items.map(item => JSON.parse(JSON.stringify(item)));

    // Create Sale record
    const saleData = {
      timestamp: Date.now(),
      items: sanitizedItems,
      totalAmount,
      discount,
      payableAmount,
      customerName: customerInfo?.name || '',
      customerPhone: customerInfo?.phone || '',
      customerAddress: customerInfo?.address || '',
      shopId: userProfile.shopId,
      createdBy: userProfile.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'sales'), saleData);
      const completedSale = { id: docRef.id, ...saleData } as Sale;
      setLastSale(completedSale);
      
      // Update stock 
      for (const item of items) {
        const productRef = doc(db, 'products', item.productId);
        await updateDoc(productRef, {
          stock: increment(-item.quantity)
        });
      }

      // Update Customer Stats
      if (customerInfo?.phone) {
        const existingCustomer = customers.find(c => c.phone === customerInfo.phone);
        if (existingCustomer) {
          await updateDoc(doc(db, 'customers', existingCustomer.id), {
            totalSales: increment(payableAmount),
            lastPurchaseDate: Date.now(),
            address: customerInfo.address || existingCustomer.address,
            name: customerInfo.name || existingCustomer.name
          });
        } else if (customerInfo.saveToDatabase) {
          await addDoc(collection(db, 'customers'), {
            name: customerInfo.name || 'Anonymous',
            phone: customerInfo.phone,
            address: customerInfo.address || '',
            totalSales: payableAmount,
            lastPurchaseDate: Date.now(),
            shopId: userProfile.shopId
          });
        }
      }
      return completedSale;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales-completion-batch');
    }
  };

  // Render Public Guest Invoice view if "invoice" URL search parameter is present
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isInvoiceQuery = urlParams.has('invoice');

  if (isInvoiceQuery) {
    if (publicLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-bounce">
            {lang === 'bn' ? 'ডিজিটাল ইনভয়েস লোড হচ্ছে...' : 'Loading Digital Invoice...'}
          </p>
        </div>
      );
    }

    if (publicError || !publicSale) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-4 border border-red-100 shadow-sm animate-pulse">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-slate-900 mb-2">
            {publicError || (lang === 'bn' ? 'ইনভয়েসটি পাওয়া যায়নি' : 'Invoice Not Found')}
          </h2>
          <p className="text-slate-500 max-w-md text-sm mb-6">
            {lang === 'bn' 
              ? 'অনুগ্রহ করে নিশ্চিত হোন যে আপনার কিউআর কোড লিংকটি সঠিক অথবা আমাদের সাপোর্ট নাম্বারে যোগাযোগ করুন।' 
              : 'Please make sure your QR Code link is correct, or contact support for assistance.'}
          </p>
          <a 
            href="/"
            className="px-6 py-2.5 bg-black text-white hover:scale-105 rounded-2xl font-black text-sm italic tracking-wide transition-all shadow-lg"
          >
            {lang === 'bn' ? 'হোম পেজে যান' : 'Go to Homepage'}
          </a>
        </div>
      );
    }

    const currentShop = publicShop || shopInfo || DEFAULT_SHOP_INFO;

    const handleCopyLink = () => {
      try {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    };

    const handlePrintInvoice = () => {
      window.print();
    };

    return (
      <div className="min-h-screen bg-slate-100/80 py-8 md:py-16 px-4 md:px-6 font-sans relative antialiased print:p-0 print:bg-white selection:bg-indigo-500 selection:text-white">
        
        {/* Top Navbar actions - Hidden on print */}
        <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src={AR_LOGO_BASE64} alt="A.R Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-extrabold text-sm text-slate-700 tracking-tight">{lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button 
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-sm"
            >
              <Globe size={14} />
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>

            <button 
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                copiedLink 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Share2 size={14} />
              {copiedLink ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'শেয়ার লিংক' : 'Share Link')}
            </button>
            <button 
              onClick={handlePrintInvoice}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100"
            >
              <Printer size={14} />
              {lang === 'bn' ? 'প্রিন্ট / পিডিএফ' : 'Print / PDF'}
            </button>
          </div>
        </div>

        {/* Outer Receipt Document Paper Wrapper */}
        <div className="max-w-2xl mx-auto bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200/60 print:shadow-none print:border-none relative">
          
          {/* Top Banner indicating verified official transaction status */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/20 px-6 md:px-8 py-3.5 flex items-center justify-between gap-4 print:hidden animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-wider">
                {lang === 'bn' ? 'অফিসিয়াল ডিজিটাল ভেরিফাইড মেমো' : 'Official Digitally Verified Memo'}
              </p>
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
              TOKEN OK
            </div>
          </div>

          <div className="p-8 md:p-12 relative overflow-hidden">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:opacity-[0.06] z-0">
              <img 
                src={AR_LOGO_BASE64} 
                alt="Watermark Logo" 
                className="w-4/5 h-auto object-contain grayscale"
              />
            </div>

            <div className="relative z-10">
              {/* Receipt Header Section */}
              <div className="relative mb-8 pb-6 border-b-2 border-slate-900/10 flex flex-col sm:flex-row justify-between items-start gap-6">
                <div>
                  <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center p-1.5 border border-slate-100 shadow-md ring-4 ring-slate-100/50 mb-4 overflow-hidden">
                    <img src={AR_LOGO_BASE64} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none mb-1.5">{currentShop.name}</h1>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider leading-relaxed pr-6">{currentShop.address}</p>
                </div>

                <div className="sm:text-right mt-2 sm:mt-0 flex flex-col gap-1 sm:items-end">
                  <div className="border border-slate-900 bg-slate-900 text-white font-extrabold text-xs tracking-widest px-4 py-1 rounded-xl w-fit">
                    {lang === 'bn' ? 'ক্যাশ মেমো' : 'CASH MEMO'}
                  </div>
                  <div className="mt-4 text-slate-600 font-bold text-xs italic">
                    {lang === 'bn' ? 'ইনভয়েস নং' : 'Invoice'}: #{publicSale.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                    {format(new Date(publicSale.timestamp), 'dd MMMM yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                  </div>
                </div>
              </div>

              {/* Customer and Contact Actions Row */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 border border-slate-100 rounded-3xl p-6 print:bg-transparent print:border-none print:p-0 print:mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{lang === 'bn' ? 'ক্রেতার বিবরণ' : 'Customer Details'}</span>
                  {publicSale.customerName ? (
                    <p className="text-lg font-black text-slate-800 leading-none uppercase">{publicSale.customerName}</p>
                  ) : (
                    <p className="text-lg font-extrabold text-slate-400 leading-none italic">{lang === 'bn' ? 'বেনামী ক্রেতা' : 'Anonymous Customer'}</p>
                  )}
                  {publicSale.customerPhone && <p className="text-xs text-slate-500 font-bold">{lang === 'bn' ? 'ফোন' : 'Mobile'}: {publicSale.customerPhone}</p>}
                  {publicSale.customerAddress && <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed italic">{publicSale.customerAddress}</p>}
                </div>

                <div className="flex flex-col gap-2.5 md:items-end justify-center print:hidden">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block self-start md:self-auto">{lang === 'bn' ? 'সাহায্য ও যোগাযোগ' : 'Support & Contact'}</span>
                  <div className="flex gap-2">
                    <a 
                      href={`tel:${currentShop.phone}`}
                      className="px-3.5 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <PhoneCall size={12} />
                      {lang === 'bn' ? 'কল করুন' : 'Call Shop'}
                    </a>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(currentShop.address)}`}
                      target="_blank"
                      rel="referrer noopener"
                      className="px-3.5 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <MapPin size={12} />
                      {lang === 'bn' ? 'ঠিকানা দেখুন' : 'Get Location'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8 rounded-3xl border-2 border-slate-900 overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3.5 text-left italic text-xs font-black uppercase tracking-wider border-r border-slate-800">#</th>
                      <th className="px-6 py-3.5 text-left italic text-xs font-black uppercase tracking-wider border-r border-slate-800">{lang === 'bn' ? 'বিবরণ' : 'Description'}</th>
                      <th className="px-4 py-3.5 text-center italic text-xs font-black uppercase tracking-wider border-r border-slate-800">{lang === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                      <th className="px-6 py-3.5 text-right italic text-xs font-black uppercase tracking-wider border-r border-slate-800">{lang === 'bn' ? 'দর' : 'Rate'}</th>
                      <th className="px-6 py-3.5 text-right italic text-xs font-black uppercase tracking-wider">{lang === 'bn' ? 'মোট' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-900/10">
                    {publicSale.items.map((item, idx) => {
                      const rate = item.total / item.quantity;
                      return (
                        <tr key={idx} className="bg-white">
                          <td className="px-4 py-3 text-xs font-bold text-slate-500 border-r border-slate-100">{idx + 1}</td>
                          <td className="px-6 py-3 border-r border-slate-100">
                            <p className="font-extrabold text-slate-900 text-sm leading-tight uppercase">{item.productName}</p>
                            {item.warranty && (
                              <p className="text-[10px] font-black text-rose-500 mt-0.5 italic tracking-tight uppercase">🛡️ {lang === 'bn' ? 'ওয়ারেন্টি' : 'Warranty'}: {item.warranty}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-extrabold text-slate-700 border-r border-slate-100">{item.quantity}</td>
                          <td className="px-6 py-3 text-right font-bold text-slate-700 border-r border-slate-100">{formatCurrency(rate)}</td>
                          <td className="px-6 py-3 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-[3px] border-slate-900">
                      <td colSpan={2} className="px-6 py-3.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">
                        {lang === 'bn' ? 'মোট পণ্য সংখ্যা' : 'No of Items'}:
                      </td>
                      <td className="px-4 py-3.5 text-center font-black border-r border-slate-100 text-slate-800">
                        {publicSale.items.length}
                      </td>
                      <td className="px-6 py-3.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}:</td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-900 text-base">
                        {formatCurrency(publicSale.totalAmount)}
                      </td>
                    </tr>
                    {(publicSale.discount || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="px-6 py-2.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">{lang === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}:</td>
                        <td className="px-6 py-2.5 text-right font-black text-red-500 text-base">
                          - {formatCurrency(publicSale.discount)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={4} className="px-6 py-4 text-right text-xs font-black italic uppercase leading-none tracking-widest">{lang === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Payable Total'}:</td>
                      <td className="px-6 py-4 text-right font-black text-xl whitespace-nowrap leading-none text-amber-300">
                        {formatCurrency(publicSale.payableAmount || (publicSale.totalAmount - (publicSale.discount || 0)))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Digital Footer signatures and thank messages */}
              <div className="mt-16 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-black uppercase text-slate-800 mb-1 tracking-tight">📜 {lang === 'bn' ? 'ক্রয় নীতিমালা' : 'Return Policy'}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic uppercase font-medium">
                    {lang === 'bn' 
                      ? 'ক্রয়কৃত পণ্য ক্রয়ের ৭ দিনের মধ্যে ওয়ারেন্টি এবং পরিবর্তনের যোগ্য। পরিবর্তনের সময় অবশ্যই এই মেমো প্রদর্শন করতে হবে।'
                      : 'Purchased hardware components are eligible for warranty within 7 days of purchase. Invoice copy must be presented.'}
                  </p>
                </div>
                
                <div className="flex flex-col items-center justify-end text-center p-2">
                  <p className="text-sm font-black text-slate-800 leading-relaxed italic">{lang === 'bn' ? 'আমাদের দোকানে কেনাকাটার জন্য আপনাকে ধন্যবাদ।' : 'Thank you for choosing A.R Enterprise!'}</p>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                    {lang === 'bn' ? 'ডিজিটাল কপি • সুরক্ষিত ডেটা' : 'ORIGINAL SECURED MEMO'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <Auth>
      <Layout 
        activeView={activeView} 
        onViewChange={setActiveView} 
        userProfile={userProfile}
        lang={lang}
        onLanguageChange={setLang}
      >
        {activeView === 'dashboard' && <Dashboard products={products} sales={sales} lang={lang} />}
        {activeView === 'pos' && (
          <POS 
            products={products} 
            customers={customers} 
            shopInfo={shopInfo}
            onCompleteSale={handleCompleteSale} 
            lang={lang}
          />
        )}
        {activeView === 'inventory' && (
          <Inventory 
            products={products} 
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            userProfile={userProfile!}
            lang={lang}
          />
        )}
        {activeView === 'customers' && (
          <Customers 
            customers={customers} 
            onAddCustomer={handleAddCustomer} 
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            userProfile={userProfile!}
            lang={lang}
          />
        )}
        {activeView === 'history' && (
           <History 
            sales={sales} 
            shopInfo={shopInfo} 
            onDeleteSale={handleDeleteSale} 
            userProfile={userProfile!}
            lang={lang}
           />
        )}
        {activeView === 'settings' && (
          <Settings 
            shopInfo={shopInfo} 
            onUpdateShopInfo={handleUpdateShopInfo} 
            userProfile={userProfile!}
            lang={lang}
          />
        )}
        {activeView === 'staff' && userProfile && (
           <StaffManagement userProfile={userProfile} lang={lang} />
        )}
      </Layout>

      <GeminiAssistant products={products} sales={sales} lang={lang} />

      {lastSale && (
        <Receipt sale={lastSale} shopInfo={shopInfo} onClose={() => setLastSale(null)} lang={lang} />
      )}
    </Auth>
  );
}

