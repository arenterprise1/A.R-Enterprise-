import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc
} from 'firebase/firestore';
import { UserProfile, StaffMember, UserRole } from '../types';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Language, translations } from '../translations';

interface StaffManagementProps {
  userProfile: UserProfile;
  lang: Language;
}

export default function StaffManagement({ userProfile, lang }: StaffManagementProps) {
  const t = translations[lang];
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('cashier');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile.shopId) return;

    const qUsers = query(collection(db, 'users'), where('shopId', '==', userProfile.shopId));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });

    const qInvites = query(collection(db, 'invitations'), where('shopId', '==', userProfile.shopId));
    const unsubInvites = onSnapshot(qInvites, (snapshot) => {
      setInvitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, [userProfile.shopId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = invitePhone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || invitePassword.length < 6) {
      alert(lang === 'bn' ? 'সঠিক মোবাইল নম্বর এবং কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।' : 'Enter a valid phone and at least 6 characters password.');
      return;
    }
    setInviteLoading(true);
    try {
      await setDoc(doc(db, 'invitations', cleanPhone), {
        phone: cleanPhone,
        password: invitePassword,
        role: inviteRole,
        shopId: userProfile.shopId,
        invitedBy: userProfile.uid,
        createdAt: Date.now()
      });
      setIsInviting(false);
      setShowInviteLink(cleanPhone);
      setInvitePhone('');
      setInvitePassword('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invitations');
    } finally {
      setInviteLoading(false);
    }
  };

  const removeStaff = async (uid: string) => {
    if (uid === userProfile.uid) return;
    if (!confirm(t.confirmDeleteStaff)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const cancelInvite = async (phone: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', phone));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invitations/${phone}`);
    }
  };

  const appLink = window.location.origin;

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{t.teamManagement}</h2>
        {userProfile.role === 'owner' && (
          <button
            onClick={() => {
              setIsInviting(!isInviting);
              setShowInviteLink(null);
            }}
            className="pro-btn-primary h-11"
          >
            {isInviting ? <X size={20} /> : <><Plus size={20} className="mr-1" /> {t.addStaff}</>}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showInviteLink && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pro-card p-6 border-emerald-100 bg-emerald-50/30 ring-1 ring-emerald-500/10 shadow-xl space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Check size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-emerald-900 font-bold text-sm leading-tight">{t.invitationSent}</h3>
                <p className="font-medium text-[10px] text-emerald-600/70 truncate max-w-[200px]">{appLink}</p>
              </div>
            </div>
            <div className="flex gap-1.5 font-bold uppercase">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(appLink);
                  alert('Link copied!');
                }}
                className="flex-1 h-9 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all"
              >
                <Plus size={14} /> {t.copyLink}
              </button>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(t.invitationSent + '\n' + appLink)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-9 bg-emerald-500 text-white rounded-xl text-[10px] flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all shadow-sm"
              >
                 {t.shareOnWhatsapp}
              </a>
              <a 
                href={`sms:?body=${encodeURIComponent(t.invitationSent + ' ' + appLink)}`}
                className="flex-1 h-10 bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-tight flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all"
              >
                 SMS
              </a>
            </div>
          </motion.div>
        )}

        {isInviting && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleInvite}
            className="pro-card p-6 border-none ring-1 ring-slate-200 shadow-xl space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.staffPhone}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder={t.phonePlaceholder}
                    className="pro-input pl-10 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.staffPassword}</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="pro-input pl-10 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.role}</label>
                <div className="relative">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="pro-input pl-10 h-11 appearance-none"
                  >
                    <option value="cashier">{t.cashier}</option>
                    <option value="inventory_manager">{t.inventoryManager}</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              disabled={inviteLoading}
              type="submit"
              className="pro-btn-primary w-full py-3 shadow-indigo-100"
            >
              {inviteLoading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} className="mr-2" /> {t.sendInvite}</>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pro-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">{t.staffList}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {staff.map((member) => (
              <div key={member.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                    member.role === 'owner' ? "bg-indigo-600" : "bg-slate-400"
                  )}>
                    {member.name ? member.name[0].toUpperCase() : (member.phone || member.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{member.name || t.unknownStaff}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{member.phone || member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full",
                    member.role === 'owner' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {member.role === 'owner' ? t.owner : member.role === 'cashier' ? t.cashier : (lang === 'bn' ? 'ইনভেন্টরি' : 'Inventory')}
                  </span>
                  {userProfile.role === 'owner' && member.uid !== userProfile.uid && (
                    <button
                      onClick={() => removeStaff(member.uid)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title={t.actions_delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pro-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">{t.pendingInvites}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {invitations.length > 0 ? invitations.map((invite) => (
              <div key={invite.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{invite.phone}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.role}: {invite.role === 'cashier' ? t.cashier : (lang === 'bn' ? 'ইনভেন্টরি' : 'Inventory')}</p>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-tight mt-0.5">Pass: {invite.password}</p>
                  </div>
                </div>
                {userProfile.role === 'owner' && (
                  <button
                    onClick={() => cancelInvite(invite.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title={t.actions_delete}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )) : (
              <div className="p-12 text-center text-slate-300">
                <p className="text-xs font-bold uppercase tracking-tight">{t.noPendingInvites}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
