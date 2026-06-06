import React, { useState, useRef, useEffect } from 'react';
import { ShopInfo } from '../types';
import { Save, Building2, MapPin, Phone, CheckCircle2, Image as ImageIcon, Trash2, Lock, Camera, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { UserProfile } from '../types';
import { Language, translations } from '../translations';

interface SettingsProps {
  shopInfo: ShopInfo;
  onUpdateShopInfo: (info: ShopInfo) => void;
  userProfile: UserProfile | null;
  lang: Language;
}

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#4f46e5', labelBangla: 'ইন্ডিগো', labelEnglish: 'Indigo' },
  { name: 'Emerald', value: '#059669', labelBangla: 'সবুজ', labelEnglish: 'Emerald' },
  { name: 'Rose', value: '#e11d48', labelBangla: 'গোলাপী', labelEnglish: 'Rose' },
  { name: 'Amber', value: '#d97706', labelBangla: 'কমলা', labelEnglish: 'Amber' },
  { name: 'Slate', value: '#475569', labelBangla: 'ধূসর', labelEnglish: 'Slate' },
  { name: 'Blue', value: '#2563eb', labelBangla: 'নীল', labelEnglish: 'Blue' },
];

export default function Settings({ shopInfo, onUpdateShopInfo, userProfile, lang }: SettingsProps) {
  const t = translations[lang];
  const [formData, setFormData] = useState(shopInfo);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Live Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isOwner = userProfile?.role === 'owner';

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
    </div>
  );
}
