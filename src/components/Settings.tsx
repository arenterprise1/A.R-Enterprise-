import React, { useState } from 'react';
import { ShopInfo } from '../types';
import { Save, Building2, MapPin, Phone, CheckCircle2, Image as ImageIcon, Trash2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { Language, translations } from '../translations';

interface SettingsProps {
  shopInfo: ShopInfo;
  onUpdateShopInfo: (info: ShopInfo) => void;
  userProfile: UserProfile | null;
  lang: Language;
}

export default function Settings({ shopInfo, onUpdateShopInfo, userProfile, lang }: SettingsProps) {
  const t = translations[lang];
  const [formData, setFormData] = useState(shopInfo);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isOwner = userProfile?.role === 'owner';

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
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center leading-none text-slate-200">
                  <span className="text-5xl font-bold uppercase tracking-tight">{formData.name.charAt(0) || 'D'}</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
                  <ImageIcon size={14} className="text-slate-400" /> {lang === 'bn' ? 'শপ লোগো' : 'Shop Logo'}
                </label>
                <div className="flex gap-3">
                  <label className={cn(
                    "flex-1 pro-btn-secondary h-11",
                    (!isOwner || uploading) ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
                  )}>
                    <ImageIcon size={18} className="mr-2" /> 
                    {uploading ? (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (lang === 'bn' ? 'ছবি আপলোড' : 'Upload Image')}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                      disabled={!isOwner || uploading}
                    />
                  </label>
                  {formData.logoUrl && isOwner && (
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="p-3 pro-btn-secondary text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-tight ml-1">
                  {lang === 'bn' ? 'অথবা লোগো লিঙ্ক (URL)' : 'Or Logo URL'}
                </label>
                <input
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="pro-input py-2 text-sm"
                  placeholder="https://example.com/logo.png"
                />
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
              className="pro-input text-lg font-bold text-slate-800 disabled:bg-slate-100/50"
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
              className="pro-input resize-none h-28 disabled:bg-slate-100/50"
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
              className="pro-input font-bold text-slate-800 disabled:bg-slate-100/50"
              placeholder="০১৭XXXXXXXX"
            />
          </div>
        </div>

        {isOwner ? (
          <button
            type="submit"
            className="pro-btn-primary w-full py-4 text-lg shadow-indigo-100"
          >
            <Save size={22} className="mr-2" /> {t.save}
          </button>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 text-amber-800 text-sm font-medium">
            <Lock size={18} className="text-amber-600" />
            {lang === 'bn' 
              ? 'শুধুমাত্র শপ অনার (Shop Owner) দোকানের তথ্য পরিবর্তন করতে পারবেন।' 
              : 'Only Shop Owners can modify shop settings.'}
          </div>
        )}
      </form>
    </div>
  );
}
