import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ShoppingCart, History, Store, Menu, X, Settings as SettingsIcon, Users, Wifi, WifiOff, Calculator as CalculatorIcon, Camera, Upload, Image as ImageIcon, Save, Phone, MapPin, Edit, Sparkles, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { View, UserProfile, UserRole, ShopInfo } from '../types';
import { UserMenu, AR_LOGO_BASE64 } from './Auth';
import { Calculator } from './Calculator';
import { Language, translations } from '../translations';
import { Globe } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  userProfile: UserProfile | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  shopInfo?: ShopInfo;
  onUpdateShopInfo?: (info: ShopInfo) => void;
  onUpgradeClick?: () => void;
}

export default function Layout({ children, activeView, onViewChange, userProfile, lang, onLanguageChange, shopInfo, onUpdateShopInfo, onUpgradeClick }: LayoutProps) {
  const [appTheme, setAppTheme] = useState<'white' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return saved === 'white' ? 'white' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', appTheme);
    } catch {}
  }, [appTheme]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const [isShopEditOpen, setIsShopEditOpen] = useState(false);
  const [modalShopName, setModalShopName] = useState('');
  const [modalShopPhone, setModalShopPhone] = useState('');
  const [modalShopAddress, setModalShopAddress] = useState('');
  const [modalLogoUrl, setModalLogoUrl] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalUploading, setModalUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isShopEditOpen && shopInfo) {
      setModalShopName(shopInfo.name || '');
      setModalShopPhone(shopInfo.phone || '');
      setModalShopAddress(shopInfo.address || '');
      setModalLogoUrl(shopInfo.logoUrl || '');
    }
  }, [isShopEditOpen, shopInfo]);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access failed:', err);
      alert(lang === 'bn' ? 'ক্যামেরা চালু করতে ব্যর্থ হয়েছে!' : 'Could not access the camera.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 300;
      canvas.height = videoRef.current.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setModalLogoUrl(dataUrl);
      }
      stopCamera();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 500) {
      alert(lang === 'bn' ? 'ছবিটি অনেক বড়! দয়া করে ৫০০কেবি কম সাইজের লোগো দিন।' : 'Image too large! Under 500KB.');
      return;
    }
    setModalUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setModalLogoUrl(reader.result as string);
      setModalUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModal = async () => {
    if (!modalShopName.trim()) {
      alert(lang === 'bn' ? 'দোকানের নাম লিখুন' : 'Please enter shop name');
      return;
    }
    setModalSaving(true);
    try {
      if (onUpdateShopInfo && shopInfo) {
        await onUpdateShopInfo({
          ...shopInfo,
          name: modalShopName,
          phone: modalShopPhone,
          address: modalShopAddress,
          logoUrl: modalLogoUrl
        });
      }
      setIsShopEditOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setModalSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const t = translations[lang];

  const menuItemsList: { id: View; label: string; icon: any; roles: UserRole[] }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['owner', 'inventory_manager', 'cashier'] },
    { id: 'pos', label: t.pos, icon: ShoppingCart, roles: ['owner', 'cashier'] },
    { id: 'inventory', label: t.inventory, icon: Package, roles: ['owner', 'inventory_manager'] },
    { id: 'customers', label: t.customers, icon: Users, roles: ['owner', 'cashier'] },
    { id: 'history', label: t.history, icon: History, roles: ['owner', 'inventory_manager', 'cashier'] },
    { id: 'staff', label: t.staff, icon: Store, roles: ['owner'] },
    { id: 'settings', label: t.settings, icon: SettingsIcon, roles: ['owner', 'inventory_manager', 'cashier'] },
  ];

  const filteredMenuItems = menuItemsList.filter(item => 
    !userProfile || item.roles.includes(userProfile.role)
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn(
      "flex h-screen font-sans selection:bg-indigo-600 selection:text-white overflow-hidden transition-colors duration-300",
      appTheme === 'white' && "app-theme-white bg-slate-50 text-slate-900",
      appTheme === 'dark' && "app-theme-dark bg-[#0b111e] text-slate-100"
    )}>
      {/* Network Status Toast */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 20 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-bold shadow-2xl"
          >
            <WifiOff size={20} className="animate-pulse" />
            {t.offline}
          </motion.div>
        )}
        {isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-20 right-8 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-md text-emerald-600 p-1.5 rounded-full border border-emerald-100 shadow-lg shadow-emerald-500/5 transition-all hover:bg-emerald-50 group"
            title={t.online}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              {t.online}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 100 }}
        className="hidden lg:flex bg-white border-r border-slate-200 flex-col transition-all duration-300 z-30"
      >
        <div className="p-6 flex items-center justify-between">
          <div 
            onClick={() => {
              if (userProfile?.role === 'owner') {
                setIsShopEditOpen(true);
              } else {
                alert(lang === 'bn' ? 'শুধুমাত্র শপ অনার দোকানের তথ্য পরিবর্তন করতে পারবেন।' : 'Only shop owners can edit.');
              }
            }}
            className={cn(
              "flex items-center gap-3 overflow-hidden whitespace-nowrap cursor-pointer group hover:bg-slate-50 p-1.5 rounded-2xl transition-all border border-transparent hover:border-slate-100", 
              !isSidebarOpen && "hidden"
            )}
            title={lang === 'bn' ? 'দোকানের নাম ও লোগো পরিবর্তন করুন' : 'Edit Shop Logo & Name'}
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 shadow-md p-1 border border-slate-100 overflow-hidden relative group-hover:ring-2 group-hover:ring-indigo-500/20">
              <img 
                src={shopInfo?.logoUrl || AR_LOGO_BASE64} 
                alt={shopInfo?.name || "A.R Enterprise"} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-sm tracking-tight text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                {shopInfo?.name || (lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise')}
              </span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5 block">{lang === 'bn' ? 'সম্পাদন করুন' : 'Edit Info'}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all flex-shrink-0"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-3">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "nav-link",
                activeView === item.id ? "nav-link-active" : "nav-link-inactive"
              )}
            >
              <item.icon size={22} className={cn(activeView === item.id ? "text-white" : "text-gray-400 group-hover:text-black")} />
              <span className={cn("whitespace-nowrap transition-opacity", !isSidebarOpen && "opacity-0 invisible absolute")}>
                {item.label}
              </span>
              {activeView === item.id && isSidebarOpen && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* Mobile Sidebar (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden border-r-4 border-black flex flex-col shadow-2xl"
            >
              <div className="p-8 flex items-center justify-between border-b-2 border-black/5">
                <div 
                  onClick={() => {
                    if (userProfile?.role === 'owner') {
                      setIsShopEditOpen(true);
                      setIsMobileMenuOpen(false);
                    } else {
                      alert(lang === 'bn' ? 'শুধুমাত্র শপ অনার দোকানের তথ্য পরিবর্তন করতে পারবেন।' : 'Only shop owners can edit.');
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer group hover:opacity-80"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center p-1 border border-slate-100 overflow-hidden">
                    <img 
                      src={shopInfo?.logoUrl || AR_LOGO_BASE64} 
                      alt={shopInfo?.name || "A.R Enterprise"} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="font-black text-xl tracking-tighter uppercase italic text-indigo-600 block max-w-[120px] truncate">
                    {shopInfo?.name || (lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise')}
                  </span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 border-2 border-black rounded-xl">
                  <X size={20} />
                </button>
              </div>
              <nav className="p-4 space-y-3 flex-1 overflow-auto custom-scrollbar">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "nav-link",
                      activeView === item.id ? "nav-link-active" : "nav-link-inactive"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 lg:hidden bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              {filteredMenuItems.find(m => m.id === activeView)?.label}
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full opacity-40 shrink-0" />
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm font-medium"
              title={t.refresh}
            >
              <Wifi size={18} className={cn(isOnline ? "text-emerald-500" : "text-slate-400")} />
              <span className="hidden md:inline">{t.refresh}</span>
            </button>
            {userProfile?.subscriptionStatus === 'trial' && (
              <button
                onClick={onUpgradeClick}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black rounded-xl text-xs flex items-center gap-2 animate-pulse cursor-pointer group shadow-sm transition-all"
                title={lang === 'bn' ? 'প্রিমিয়াম সাবস্ক্রিপশনে আপগ্রেড করুন' : 'Upgrade to Premium Subscription'}
              >
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                <span>
                  {(() => {
                    const daysLeft = Math.max(0, Math.ceil(3 - (Date.now() - (userProfile.subscriptionDate || Date.now())) / (1000 * 60 * 60 * 24)));
                    return lang === 'bn' ? `ফ্রি ট্রায়াল (${daysLeft} দিন অবশিষ্ট)` : `Free Trial (${daysLeft}d left)`;
                  })()}
                </span>
                <Sparkles size={11} className="group-hover:rotate-12 transition-transform text-amber-500 shrink-0" />
              </button>
            )}

            <button 
              onClick={() => onLanguageChange(lang === 'bn' ? 'en' : 'bn')}
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm font-medium"
              title={t.changeLanguage}
            >
              <Globe size={18} />
              <span className="hidden md:inline">{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Premium 2-option background theme switch */}
            <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/20 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
              <button
                type="button"
                onClick={() => setAppTheme('white')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-black tracking-tight rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                  appTheme === 'white' 
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200 ring-2 ring-slate-100" 
                    : "text-slate-500 hover:text-slate-800"
                )}
                title={lang === 'bn' ? 'সাদা মোড' : 'White Theme'}
              >
                <div className="w-2 h-2 rounded-full bg-slate-200 border border-slate-350" />
                <span className="hidden md:inline">{lang === 'bn' ? 'সাদা' : 'White'}</span>
              </button>
              <button
                type="button"
                onClick={() => setAppTheme('dark')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-black tracking-tight rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                  appTheme === 'dark' 
                    ? "bg-[#17243c] text-white shadow-sm border border-[#233454] ring-2 ring-indigo-500/10" 
                    : "text-slate-400 hover:text-indigo-400"
                )}
                title={lang === 'bn' ? 'ডার্ক মোড' : 'Dark Theme'}
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" />
                <span className="hidden md:inline">{lang === 'bn' ? 'ডার্ক' : 'Dark'}</span>
              </button>
            </div>

            <button 
              onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center gap-2 text-sm font-medium",
                isCalculatorOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <CalculatorIcon size={18} />
              <span className="hidden sm:inline">{lang === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}</span>
            </button>
            
            <button 
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-150 shrink-0"
              title={lang === 'bn' ? 'ইউজার অ্যাকাউন্ট ও সেটিংস' : 'User Account & Settings'}
            >
              <div className="text-right hidden sm:flex flex-col items-end leading-none">
                <span className="text-xs font-extrabold text-slate-800">{userProfile?.name || auth.currentUser?.displayName || 'দোকানদার'}</span>
                <span className="text-[9px] text-[#9b59b6] uppercase tracking-wider font-black mt-1">
                  {userProfile?.role === 'owner' ? (lang === 'bn' ? 'মালিক' : 'Owner') : (userProfile?.role === 'inventory_manager' ? (lang === 'bn' ? 'ম্যানেজার' : 'Manager') : (lang === 'bn' ? 'ক্যাশিয়ার' : 'Cashier'))}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm border border-slate-850">
                {(userProfile?.name || auth.currentUser?.displayName || auth.currentUser?.email || '?')[0].toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {/* Elegant background brand watermark */}
          <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none select-none overflow-hidden z-0 opacity-[0.035]">
            <img 
              src={shopInfo?.logoUrl || AR_LOGO_BASE64} 
              alt="Watermark Brand Logo" 
              className="w-[min(480px,80vw)] h-auto max-h-[70vh] object-contain filter grayscale select-none pointer-events-none animate-pulse" 
              style={{ animationDuration: '8s' }}
            />
          </div>

          <div className="p-4 lg:p-8 max-w-7xl mx-auto relative z-[1]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

      {/* Shop Info Quick Edit Modal */}
      <AnimatePresence>
        {isShopEditOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                stopCamera();
                setIsShopEditOpen(false);
              }}
              className="absolute inset-0 bg-slate-955/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[28px] border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {lang === 'bn' ? 'দোকানের লোগো ও নাম পরিবর্তন' : 'Edit Shop Info'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {lang === 'bn' ? 'আপনার ক্যাশ মেমোতে এই লোগো ও নাম প্রদর্শিত হবে' : 'This logo and name will be shown on cash memos'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    stopCamera();
                    setIsShopEditOpen(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                {/* Shop Name Input */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    {lang === 'bn' ? 'দোকানের নাম' : 'Shop Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalShopName}
                    onChange={(e) => setModalShopName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: ভাই ভাই এন্টারপ্রাইজ' : 'e.g. Bhai Bhai Enterprise'}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                  />
                </div>

                {/* Shop Phone */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={modalShopPhone}
                    onChange={(e) => setModalShopPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                  />
                </div>

                {/* Shop Address */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                    {lang === 'bn' ? 'ঠিকানা' : 'Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={modalShopAddress}
                    onChange={(e) => setModalShopAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold resize-none text-slate-700"
                  />
                </div>

                {/* Shop Logo upload & Camera */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-2">
                    {lang === 'bn' ? 'দোকানের লোগো' : 'Shop Logo'}
                  </label>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-2 overflow-hidden shadow-inner shrink-0">
                      {modalLogoUrl ? (
                        <img src={modalLogoUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                      {cameraActive ? (
                        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover -scale-x-100" />
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                          >
                            <Camera size={14} /> {lang === 'bn' ? 'ছবি তুলুন' : 'Capture'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <label className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
                            <Upload size={14} />
                            {modalUploading ? 'Uploading...' : (lang === 'bn' ? 'আপলোড করুন' : 'Upload Logo')}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Camera size={14} />
                            {lang === 'bn' ? 'ক্যামেরা' : 'Camera'}
                          </button>
                        </div>
                      )}
                      
                      {modalLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setModalLogoUrl('')}
                          className="text-[10px] text-red-500 font-bold hover:underline text-left cursor-pointer"
                        >
                          {lang === 'bn' ? 'লোগো মুছে ফেলুন' : 'Remove Logo'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setIsShopEditOpen(false);
                  }}
                  className="px-5 py-2.5 border border-slate-200 bg-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={modalSaving || modalUploading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  {modalSaving ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
