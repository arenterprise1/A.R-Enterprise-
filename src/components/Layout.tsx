import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingCart, History, Store, Menu, X, Settings as SettingsIcon, Users, Wifi, WifiOff, Calculator as CalculatorIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { View, UserProfile, UserRole } from '../types';
import { UserMenu, AR_LOGO_BASE64 } from './Auth';
import { Calculator } from './Calculator';
import { Language, translations } from '../translations';
import { Globe } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange: (view: View) => void;
  userProfile: UserProfile | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function Layout({ children, activeView, onViewChange, userProfile, lang, onLanguageChange }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

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
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-600 selection:text-white overflow-hidden text-slate-900">
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
          <div className={cn("flex items-center gap-3 overflow-hidden whitespace-nowrap", !isSidebarOpen && "hidden")}>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 shadow-md p-1 border border-slate-100 overflow-hidden">
              <img 
                src={AR_LOGO_BASE64} 
                alt="A.R Enterprise" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">{lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise'}</span>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center p-1 border border-slate-100 overflow-hidden">
                    <img 
                      src={AR_LOGO_BASE64} 
                      alt="A.R Enterprise" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="font-black text-xl tracking-tighter uppercase italic">{lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise'}</span>
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
            <button 
              onClick={() => onLanguageChange(lang === 'bn' ? 'en' : 'bn')}
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm font-medium"
              title={t.changeLanguage}
            >
              <Globe size={18} />
              <span className="hidden md:inline">{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
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
            <UserMenu />
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
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
    </div>
  );
}
