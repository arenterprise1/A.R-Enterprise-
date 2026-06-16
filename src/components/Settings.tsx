import React, { useState, useRef, useEffect } from 'react';
import { ShopInfo } from '../types';
import { Save, Building2, MapPin, Phone, CheckCircle2, Image as ImageIcon, Trash2, Lock, Camera, Palette, User as UserIcon, LogOut, Mail, ShieldAlert, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { UserProfile } from '../types';
import { Language, translations } from '../translations';
import { auth, db } from '../lib/firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  shopInfo: ShopInfo;
  onUpdateShopInfo: (info: ShopInfo) => void;
  userProfile: UserProfile | null;
  lang: Language;
  onUpgradeClick?: () => void;
}

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#4f46e5', labelBangla: 'ইন্ডিগো', labelEnglish: 'Indigo' },
  { name: 'Emerald', value: '#059669', labelBangla: 'সবুজ', labelEnglish: 'Emerald' },
  { name: 'Rose', value: '#e11d48', labelBangla: 'গোলাপী', labelEnglish: 'Rose' },
  { name: 'Amber', value: '#d97706', labelBangla: 'কমলা', labelEnglish: 'Amber' },
  { name: 'Slate', value: '#475569', labelBangla: 'ধূসর', labelEnglish: 'Slate' },
  { name: 'Blue', value: '#2563eb', labelBangla: 'নীল', labelEnglish: 'Blue' },
];

export default function Settings({ shopInfo, onUpdateShopInfo, userProfile, lang, onUpgradeClick }: SettingsProps) {
  const t = translations[lang];
  const [formData, setFormData] = useState(shopInfo);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Live Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = userProfile?.role === 'owner';

  // User profile settings states
  const currentUser = auth.currentUser;
  const [profileName, setProfileName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name || currentUser?.displayName || '');
    }
  }, [userProfile, currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileName.trim()) {
      alert(lang === 'bn' ? 'দয়া করে আপনার নাম লিখুন।' : 'Please enter your name.');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile(currentUser, { displayName: profileName });
      await setDoc(doc(db, 'users', currentUser.uid), { name: profileName }, { merge: true });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update user profile from settings:', err);
      alert(lang === 'bn' ? 'প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে!' : 'Failed to update user profile!');
    } finally {
      setProfileSaving(false);
    }
  };

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
      alert(lang === 'bn' ? 'ক্যামেরা চালু করতে ব্যর্থ হয়েছে! অনুগ্রহ করে পারমিশন চেক করুন।' : 'Could not access the camera. Please verify permissions.');
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
        // Apply mirror horizontal inversion so image captures exactly of mirrored camera view
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setFormData({ ...formData, logoUrl: dataUrl });
      }
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 500) { // 500KB limit
      alert(lang === 'bn' ? 'ছবিটি অনেক বড়! দয়া করে ৫০০কেবি' : 'Image too large! Please upload under 500KB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({ ...formData, logoUrl: base64String });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    onUpdateShopInfo(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <form onSubmit={handleSubmit} className="pro-card p-8 sm:p-10 space-y-10 shadow-xl border-none ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {lang === 'bn' ? 'দোকানের সেটিংস' : 'Shop Settings'}
            {!isOwner && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded uppercase flex items-center gap-1 font-bold">
              <Lock size={10} /> {lang === 'bn' ? 'শুধুমাত্র ভিউ' : 'View Only'}
            </span>}
          </h3>
          <AnimatePresence>
            {saved && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-green-600 text-sm font-bold"
              >
                <CheckCircle2 size={18} /> {lang === 'bn' ? 'সেভ হয়েছে!' : 'Saved!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-32 h-32 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 flex items-center justify-center relative overflow-hidden shrink-0">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" registrar-role="shop-logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center leading-none text-slate-300">
                  <span className="text-5xl font-bold uppercase tracking-tight">{formData.name.charAt(0) || 'D'}</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
                  <ImageIcon size={14} className="text-slate-400" /> {lang === 'bn' ? 'শপ লোগো' : 'Shop Logo'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={cn(
                    "flex-1 pro-btn-secondary h-11 cursor-pointer text-xs justify-center",
                    (!isOwner || uploading) && "opacity-50 cursor-not-allowed pointer-events-none"
                  )}>
                    <ImageIcon size={16} className="mr-1.5 shrink-0" /> 
                    {uploading ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'ফাইল আপলোড' : 'Upload File')}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                      disabled={!isOwner || uploading}
                    />
                  </label>
                  
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={!isOwner || uploading || cameraActive}
                    className="pro-btn-secondary h-11 text-xs justify-center"
                  >
                    <Camera size={16} className="mr-1.5 shrink-0" />
                    {lang === 'bn' ? 'ক্যামেরা দিয়ে তুলুন' : 'Use Camera'}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
                  {lang === 'bn' ? 'অথবা লোগো লিঙ্ক (URL)' : 'Or Logo URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="pro-input py-2 text-xs flex-1"
                    placeholder="https://example.com/logo.png"
                    disabled={!isOwner}
                  />
                  {formData.logoUrl && isOwner && (
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Camera Section Panel */}
          {cameraActive && (
            <div className="p-6 bg-slate-900 border border-slate-800 text-white rounded-2xl flex flex-col items-center gap-4 animate-fadeIn">
              <div className="relative w-48 h-48 bg-black rounded-2xl overflow-hidden shadow-inner ring-4 ring-slate-800 shrink-0">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-6 border-2 border-white/20 border-dashed rounded-full pointer-events-none flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white/40" />
                </div>
              </div>
              <div className="flex gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-xs font-black italic tracking-wide rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Camera size={14} />
                  {lang === 'bn' ? 'ছবি তুলুন' : 'Capture Logo'}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-[11px] font-bold rounded-xl text-slate-300"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Accent Color Section */}
          <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <Palette size={14} className="text-slate-400" /> {lang === 'bn' ? 'মেমোর ব্র্যান্ড অ্যাকসেন্ট কালার' : 'Receipt Brand Accent Color'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = (formData.accentColor || '#4f46e5') === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, accentColor: preset.value })}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-extrabold transition-all active:scale-95 text-left",
                      isSelected 
                        ? "bg-white border-slate-950 ring-2 ring-slate-950/10 text-slate-950" 
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                    disabled={!isOwner}
                  >
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0 animate-scaleIn" 
                      style={{ backgroundColor: preset.value }}
                    />
                    <span>{lang === 'bn' ? preset.labelBangla : preset.labelEnglish}</span>
                  </button>
                );
              })}
              
              {/* Custom Color Selector */}
              <div className="col-span-2 flex items-center gap-2 p-1.5 px-3 bg-white border border-slate-200 rounded-xl">
                <input
                  type="color"
                  value={formData.accentColor || '#4f46e5'}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                  title={lang === 'bn' ? 'কাস্টম কালার সিলেক্ট করুন' : 'Pick a Custom Color'}
                  disabled={!isOwner}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-none">{lang === 'bn' ? 'কাস্টম কালার' : 'Custom Hex'}</p>
                  <input
                    type="text"
                    value={formData.accentColor || '#4f46e5'}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 leading-none mt-1"
                    placeholder="#4f46e5"
                    disabled={!isOwner}
                  />
                </div>
              </div>
            </div>

            {/* Live Interactive Receipt Preview Mockup */}
            <div className="overflow-hidden bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm mt-3 relative">
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 rounded border border-slate-100">
                {lang === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Mockup'}
              </div>
              <div className="flex items-start gap-3 pb-3 border-b border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white relative overflow-hidden shrink-0 shadow-sm border border-slate-100" style={{ backgroundColor: formData.accentColor || '#4f46e5' }}>
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5 select-none" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-lg font-black italic select-none">{(formData.name || 'D').charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black truncate leading-none uppercase mt-1" style={{ color: formData.accentColor || '#4f46e5' }}>
                    {formData.name || (lang === 'bn' ? 'আমাদের দোকান' : 'My Brand Shop')}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-1.5">{formData.address || 'MIRPUR, DHAKA'} • {formData.phone || '০১৭XXXXXXXX'}</p>
                </div>
              </div>
              <div className="mt-3.5 flex justify-between items-center bg-slate-50 rounded-lg p-2.5 text-xs text-white" style={{ backgroundColor: formData.accentColor || '#4f46e5' }}>
                <span className="font-bold italic uppercase tracking-wider">{lang === 'bn' ? 'পরিশোধযোগ্য মোট' : 'PAYABLE TOTAL'}</span>
                <span className="font-extrabold text-sm">{formatCurrency(1250)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <Building2 size={14} className="text-slate-400" /> {t.shopName}
            </label>
            <input
              required
              disabled={!isOwner}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="pro-input text-lg font-bold text-slate-800 disabled:bg-slate-100/50 hover:bg-slate-50 border-slate-200 focus:border-slate-500 rounded-2xl h-11"
              placeholder={lang === 'bn' ? 'দোকানের নাম লিখুন' : 'Enter shop name'}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <MapPin size={14} className="text-slate-400" /> {t.shopAddress}
            </label>
            <textarea
              required
              disabled={!isOwner}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="pro-input resize-none h-24 disabled:bg-slate-100/50 hover:bg-slate-50 border-slate-200 focus:border-slate-500 rounded-2xl"
              placeholder={lang === 'bn' ? 'দোকানের ঠিকানা লিখুন' : 'Enter shop address'}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <Phone size={14} className="text-slate-400" /> {t.shopPhone}
            </label>
            <input
              required
              disabled={!isOwner}
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="pro-input font-bold text-slate-800 disabled:bg-slate-100/50 hover:bg-slate-50 border-slate-200 focus:border-slate-500 rounded-2xl h-11"
              placeholder="০১৭XXXXXXXX"
            />
          </div>
        </div>

        {/* Active Subscription Section */}
        <div className="p-6 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1.5">
              {lang === 'bn' ? 'অ্যাক্টিভ সাবস্ক্রিপশন প্ল্যান' : 'ACTIVE SUBSCRIPTION PLAN'}
            </p>
            <h4 className="text-lg font-black text-[#9b59b6] flex items-center gap-1.5 leading-none">
              {userProfile?.subscriptionStatus === 'trial' ? (lang === 'bn' ? '৩ দিনের ফ্রি ট্রায়াল' : '3 Days Free Trial') :
               userProfile?.subscriptionPlan === 'premium' ? (lang === 'bn' ? 'প্রিমিয়াম - পাওয়ার দোকানদার' : 'Premium - Power Retail') :
               userProfile?.subscriptionPlan === 'basic' ? (lang === 'bn' ? 'বেসিক - স্টার্টার' : 'Basic - Starter Plan') :
               (lang === 'bn' ? 'স্ট্যান্ডার্ড - সেরা পছন্দ' : 'Standard - Recommended')}
              <span className={`text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                userProfile?.subscriptionStatus === 'trial' 
                  ? 'text-amber-600 bg-amber-50 border-amber-200' 
                  : 'text-emerald-600 bg-emerald-50 border-emerald-200'
              }`}>
                {userProfile?.subscriptionStatus === 'trial' ? (lang === 'bn' ? 'ট্রায়াল সচল' : 'In Trial') : (lang === 'bn' ? 'সক্রিয়' : 'Active')}
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-2">
              {userProfile?.subscriptionStatus === 'trial' ? (
                lang === 'bn' 
                  ? `আপনি ফ্রি ডেমো সম্পন্ন করতে ৩ দিন ট্রায়াল মেয়াদের মধ্যে ব্যবহার করছেন।` 
                  : `Currently utilizing the 3-day premium demo trial. Upgrade anytime to avoid interruptions.`
              ) : (
                lang === 'bn' ? 'রিনিউ ডেট: ৩০ দিন পর (অটো ট্রান্সফার)' : 'Renewal Date: Auto-renews in 30 days.'
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white border border-purple-100 px-3.5 py-2.5 rounded-xl shadow-xs text-right hidden sm:block shrink-0">
              <span className="text-[10px] text-slate-400 font-bold block leading-none mb-1 uppercase">
                {lang === 'bn' ? 'বিলিং সাইকেল' : 'BILLING'}
              </span>
              <span className="text-xs font-black text-slate-800">
                {userProfile?.subscriptionStatus === 'trial' ? (lang === 'bn' ? '৳০ (ফ্রি)' : '৳0 (Free)') :
                 userProfile?.subscriptionPlan === 'premium' ? '৳৯৯৯ / মাস' :
                 userProfile?.subscriptionPlan === 'basic' ? '৳০ / ফ্রি' :
                 '৳৪৯৯ / মাস'}
              </span>
            </div>
            
            {isOwner && onUpgradeClick && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap hover:scale-[1.01]"
              >
                {userProfile?.subscriptionStatus === 'trial' 
                  ? (lang === 'bn' ? 'পেইড প্ল্যানে আপগ্রেড' : 'Upgrade to Paid Plan') 
                  : (lang === 'bn' ? 'প্ল্যান পরিবর্তন করুন' : 'Change Subscription')}
              </button>
            )}
          </div>
        </div>

        {isOwner ? (
          <button
            type="submit"
            className="pro-btn-primary w-full py-4 text-base shadow-indigo-100 font-black tracking-wide pr-6 uppercase italic rounded-[20px]"
          >
            <Save size={20} className="mr-1.5" /> {t.save}
          </button>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 text-amber-800 text-sm font-medium animate-fadeIn">
            <Lock size={18} className="text-amber-600 animate-scaleIn" />
            {lang === 'bn' 
              ? 'শুধুমাত্র শপ অনার (Shop Owner) দোকানের তথ্য পরিবর্তন করতে পারবেন।' 
              : 'Only Shop Owners can modify shop settings.'}
          </div>
        )}
      </form>

      {/* User Account & Authentication Settings Card */}
      <form onSubmit={handleUpdateProfile} className="pro-card p-8 sm:p-10 space-y-10 shadow-xl border-none ring-1 ring-slate-200 mt-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="text-slate-500" size={24} />
              {lang === 'bn' ? 'ইউজার অ্যাকাউন্ট ও নিরাপত্তা' : 'User Account & Security'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {lang === 'bn' 
                ? 'আপনার ব্যক্তিগত প্রোফাইল আপডেট করুন এবং সেশন নিরাপত্তা সেটিংস পরিচালনা করুন।' 
                : 'Update your personal details and manage your session security here.'}
            </p>
          </div>
          <AnimatePresence>
            {profileSaved && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-green-600 text-sm font-bold"
              >
                <CheckCircle2 size={18} /> {lang === 'bn' ? 'সংরক্ষিত হয়েছে!' : 'Updated!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          {/* User Display Initial representation */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md border border-slate-850 select-none">
              {(profileName || currentUser?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 leading-none">
                {userProfile?.name || currentUser?.displayName || (lang === 'bn' ? 'দোকানদার' : 'Store User')}
              </h4>
              <p className="text-[11px] text-[#9b59b6] uppercase tracking-wider font-extrabold mt-1.5 flex items-center gap-1.5 leading-none">
                <Key size={11} />
                {userProfile?.role === 'owner' ? (lang === 'bn' ? 'মালিক (Shop Owner) - ফুল অ্যাক্সেস' : 'Owner (Full Control)') : 
                 userProfile?.role === 'inventory_manager' ? (lang === 'bn' ? 'ম্যানেজার - ইনভেন্টরি কন্ট্রোল' : 'Manager (Inventory)') : 
                 (lang === 'bn' ? 'ক্যাশিয়ার - পয়েন্ট অফ সেলস' : 'Cashier (Sales Only)')}
              </p>
            </div>
          </div>

          {/* Edit Display Name input field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <UserIcon size={14} className="text-slate-400" /> {lang === 'bn' ? 'সম্পূর্ণ নাম' : 'Full Name'}
            </label>
            <input
              required
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="pro-input text-base font-bold text-slate-800 hover:bg-slate-50 border-slate-200 focus:border-slate-500 rounded-2xl h-11"
              placeholder={lang === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your full name'}
            />
          </div>

          {/* Email read-only input field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
              <Mail size={14} className="text-slate-400" /> {lang === 'bn' ? 'ইমেল অ্যাড্রেস (পরিবর্তন অযোগ্য)' : 'Email (Read Only)'}
            </label>
            <div className="relative">
              <input
                disabled
                type="email"
                value={currentUser?.email || ''}
                className="pro-input font-bold text-slate-400 bg-slate-100/50 border-slate-200 rounded-2xl h-11 cursor-not-allowed select-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-450 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md uppercase tracking-wider leading-none">
                {lang === 'bn' ? 'সুরক্ষিত' : 'Secured'}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons for Save and Log Out */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {profileSaving ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'প্রোফাইল তথ্য আপডেট করুন' : 'Update Profile Name')}
          </button>

          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mt-0.5 shrink-0">
                <ShieldAlert size={16} />
              </div>
              <div>
                <p className="text-[11px] text-red-700 font-extrabold uppercase tracking-wide leading-none">
                  {lang === 'bn' ? 'ডিভাইস সেশন কন্ট্রোল' : 'DEVICE SESSION SECURITY'}
                </p>
                <p className="text-[10px] text-red-600 font-semibold mt-1.5 leading-relaxed">
                  {lang === 'bn' 
                    ? 'আপনার কাজ শেষ হলে বা অন্য অ্যাকাউন্টে প্রবেশ করতে চাইলে ডানপাশের বাটনে চাপ দিন।' 
                    : 'Log out when finished to secure your store data from unauthorized local access.'}
                </p>
              </div>
            </div>

            {!showLogoutConfirm ? (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap hover:scale-[1.01] flex items-center justify-center gap-1.5 leading-none shrink-0"
              >
                <LogOut size={13} />
                {lang === 'bn' ? 'লগআউট করুন' : 'Log Out Account'}
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1"
                >
                  <LogOut size={12} />
                  {lang === 'bn' ? 'হ্যাঁ, লগআউট' : 'Yes, Log Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
