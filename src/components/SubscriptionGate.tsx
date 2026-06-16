import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { CreditCard, Calendar, Lock, User, Sparkles, Clock, ArrowRight, Check, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../translations';
import { UserProfile } from '../types';

interface SubscriptionGateProps {
  userProfile: UserProfile;
  lang: Language;
  onActivated: () => void;
  onClose?: () => void;
}

export default function SubscriptionGate({ userProfile, lang, onActivated, onClose }: SubscriptionGateProps) {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>(
    (userProfile.subscriptionPlan as 'basic' | 'standard' | 'premium') || 'standard'
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Payment Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<'card' | 'bkash' | 'nagad'>('card');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobilePin, setMobilePin] = useState('');
  const [showSandboxHelp, setShowSandboxHelp] = useState(true);

  const fillDemoCredentials = (gateway: 'card' | 'bkash' | 'nagad') => {
    setSelectedGateway(gateway);
    if (gateway === 'card') {
      setCardName('Test Customer');
      setCardNumber('4111 2222 3333 4444');
      setExpiry('12/28');
      setCvv('123');
    } else if (gateway === 'bkash') {
      setMobileNumber('01712345678');
      setMobilePin('12345');
    } else if (gateway === 'nagad') {
      setMobileNumber('01887654321');
      setMobilePin('54321');
    }
  };

  // Determine if this is an expired trial vs fresh account selection screen
  const isTrial = userProfile.subscriptionStatus === 'trial';
  const trialExpired = isTrial && (
    !userProfile.subscriptionDate || 
    (Date.now() - userProfile.subscriptionDate) > 3 * 24 * 60 * 60 * 1000
  );
  
  const isFresh = !userProfile.subscriptionStatus || userProfile.subscriptionStatus === 'pending';

  const handleStartTrial = async () => {
    setLoading(true);
    setError('');
    try {
      const updatedProfile = {
        ...userProfile,
        subscriptionStatus: 'trial',
        subscriptionPlan: 'trial',
        subscriptionDate: Date.now()
      };
      await setDoc(doc(db, 'users', userProfile.uid), updatedProfile, { merge: true });
      onActivated();
    } catch (err: any) {
      console.error(err);
      setError(lang === 'bn' ? 'ফ্রি ট্রায়াল চালু করতে সমস্যা হয়েছে।' : 'Failed to activate free trial.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Form Validations
    if (selectedGateway === 'card') {
      if (!cardNumber || !expiry || !cvv || !cardName) {
        setError(lang === 'bn' ? 'অনুগ্রহ করে কার্ডের সব তথ্য সঠিকভাবে পূরণ করুন।' : 'Please fill all credit card fields.');
        setLoading(false);
        return;
      }
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setError(lang === 'bn' ? 'কার্ড নম্বর ১৬ ডিজিটের হতে হবে।' : 'Card number must be 16 digits.');
        setLoading(false);
        return;
      }
    } else {
      if (!mobileNumber || !mobilePin) {
        setError(lang === 'bn' ? 'অনুগ্রহ করে মোবাইল ওয়ালেট ও পিন কোড প্রদান করুন।' : 'Please fill wallet details & PIN.');
        setLoading(false);
        return;
      }
    }

    try {
      // Simulate real-time secure gateway connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedProfile = {
        ...userProfile,
        subscriptionStatus: 'active',
        subscriptionPlan: selectedPlan,
        subscriptionDate: Date.now(),
        paymentMethod: {
          gateway: selectedGateway,
          last4: selectedGateway === 'card' 
            ? cardNumber.trim().slice(-4) 
            : mobileNumber.trim().slice(-4),
          holderName: selectedGateway === 'card' ? cardName : 'Wallet Holder'
        }
      };

      await setDoc(doc(db, 'users', userProfile.uid), updatedProfile, { merge: true });
      setSuccess(true);
      setTimeout(() => {
        onActivated();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(lang === 'bn' ? 'পেমেন্ট সম্পন্ন করা সম্ভব হয়নি।' : 'Payment processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'basic' as const,
      nameBN: 'বেসিক লাইট (Basic)',
      nameEN: 'Basic Lite Plan',
      priceBN: '৳০ (ফ্রি)',
      priceEN: '৳0 (Free)',
      featuresBN: '১৫০টি প্রোডাক্ট • ১টি স্টাফ সুবিধা • সাধারণ হিসেব মেকার',
      featuresEN: '150 Products • 1 Staff Account • Basic Ledger',
    },
    {
      id: 'standard' as const,
      nameBN: 'স্ট্যান্ডার্ড গ্রো (Standard)',
      nameEN: 'Standard Grow Plan',
      priceBN: '৳৪৯৯/মাস',
      priceEN: '৳499/month',
      featuresBN: 'আনলিমিটেড প্রোডাক্ট • ৫টি স্টাফ অ্যাক্সেস • এআই রিপোর্ট সামারি',
      featuresEN: 'Unlimited Products • 5 Staff Entries • Gemini AI Reports',
      popular: true
    },
    {
      id: 'premium' as const,
      nameBN: 'প্রিমিয়াম এন্টারপ্রাইজ (Premium)',
      nameEN: 'Premium Enterprise Plan',
      priceBN: '৳৯৯৯/মাস',
      priceEN: '৳999/month',
      featuresBN: 'সব আনলিমিটেড • ভিআইপি সাপোর্ট • ইনস্ট্যান্ট ক্লাউড ব্যাকআপ',
      featuresEN: 'Everything Unlimited • Priority Support • Instantly Backed-up',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 lg:p-6 overflow-y-auto select-none font-sans text-white relative">
      {/* Dynamic Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Light glow balls */}
      <div className="absolute top-1/4 left-1/3 w-[30vw] h-[30vw] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[30vw] h-[30vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-4xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-[32px] p-6 lg:p-10 shadow-2xl flex flex-col gap-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer z-50 font-black text-sm"
            title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          >
            ✕
          </button>
        )}
        
        {/* Verification Status Heading */}
        <div className="text-center flex flex-col items-center gap-1.5 border-b border-slate-800/60 pb-6">
          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-white mb-2 shadow-sm">
            <span className="font-black text-xs text-purple-400">A.R</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent tracking-tight">
            {trialExpired 
              ? (lang === 'bn' ? 'আপনার ট্রায়াল মেয়াদ শেষ হয়েছে' : 'Your Free Trial Has Expired')
              : (lang === 'bn' ? 'একাউন্ট অ্যাক্টিভেশন এবং সাবস্ক্রিপশন' : 'Account Activation & Subscriptions')}
          </h2>
          <p className="text-slate-400 text-xs md:text-sm font-semibold max-w-lg mt-1">
            {trialExpired
              ? (lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ ড্যাশবোর্ডের কাজ চালিয়ে যেতে নিচে একটি পেমেন্ট মেথড যুক্ত করে পছন্দমত সাবস্ক্রিপশন প্ল্যান সক্রিয় করুন।' : 'To continue viewing and managing your shop ledger logs, please activate an active plan with a payment method.')
              : (lang === 'bn' ? 'দোকানের ক্যাশ মেমো, স্টক হিসেব এবং ড্যাশবোর্ড ব্যবহারের জন্য অ্যাকাউন্ট সক্রিয় করুন।' : 'Unlock instant POS invoicing receipt management, real-time products lists, and financial statistics.')}
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">
              {lang === 'bn' ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Activated successfully!'}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-bold">
              {lang === 'bn' ? 'আপনার সাবস্ক্রিপশন সক্রিয় করা হয়েছে। আপনাকে ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...' : 'Your subscription package is fully active now. Redirecting you to the portal...'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Trial Option (Only shown if fresh/pending AND not expired yet) */}
            {isFresh && !trialExpired ? (
              <div className="md:col-span-5 border border-slate-800/80 bg-slate-900/45 p-6 rounded-3xl flex flex-col justify-between h-full min-h-[380px]">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black uppercase text-purple-300 max-w-max">
                    <Clock size={11} />
                    {lang === 'bn' ? '৩ দিন সম্পূর্ণ ফ্রি' : '3 Days Free'}
                  </div>
                  
                  <h3 className="text-lg font-black text-white">
                    {lang === 'bn' ? '৩ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 3-Day Free Trial'}
                  </h3>
                  
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                    {lang === 'bn' 
                      ? 'কোনো ক্রেডিট কার্ড বা পেমেন্ট গেটওয়ে অ্যাড না করেই ৩ দিন আমাদের ফুল সফটওয়্যার ফ্রিতে ব্যবহার করুন। ট্রায়াল শেষে যেকোনো সময় পেইড প্ল্যানে শিফট হতে পারবেন।' 
                      : 'Explore every single feature, including Gemini AI helper, unlimited staff, POS checkout, printer memo, and invoice sharing without typing any billing credentials.'}
                  </p>

                  <ul className="space-y-2 mt-2">
                    {[
                      lang === 'bn' ? 'পেমেন্ট মেথড দরকার নেই' : 'No credit card input needed',
                      lang === 'bn' ? 'সব ফিচার সচল থাকবে' : 'Full system privileges',
                      lang === 'bn' ? 'যেকোনো সময় বাতিলযোগ্য' : 'Cancel or upgrade anytime'
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Check size={14} className="text-purple-400 shrink-0 stroke-[3]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleStartTrial}
                  disabled={loading}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : (
                    <>
                      <span>{lang === 'bn' ? 'ফ্রি ট্রায়াল চালু করুন' : 'Activate Free Trial'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="md:col-span-5 border border-slate-800/80 bg-slate-900/40 p-6 rounded-3xl flex flex-col gap-4 text-left">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-black text-white">
                  {lang === 'bn' ? 'ট্রায়াল মেয়াদ শেষ' : 'Trial Expired'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  {lang === 'bn' 
                    ? 'আপনার ৩ দিনের ফ্রি ট্রায়ালটি শেষ হয়ে গিয়েছে। দোকানের নতুন বিক্রয় ইনভয়েস, ক্যাশ মেমো এবং কাস্টমার হিসেব সুরক্ষিত রাখতে অনুগ্রহ করে আপনার পেমেন্ট গেটওয়ে যুক্ত করে স্টোরটি সচল করুন।' 
                    : 'The trial lifecycle has run its course. To continue using POS transactions, digital receipts and staff records, please configure a diagnostic billing gateway below.'}
                </p>
                <div className="p-3 bg-red-950/25 border border-red-900/30 rounded-xl text-[11px] font-semibold text-red-200">
                  {lang === 'bn' 
                    ? 'কোনো ডাটা বা প্রোডাক্টের হিসেব ডিলিট হবে না। পেমেন্ট করার সাথে সাথে পূর্বের সকল তথ্য ফিরে আসবে।' 
                    : 'No records are deleted. Adding a payment method will instantly restore complete dashboard stats.'}
                </div>
              </div>
            )}

            {/* Right Column: Premium Active Subscription Form */}
            <div className={`md:col-span-7 border border-slate-800/85 bg-slate-950 p-6 rounded-3xl ${lang === 'bn' ? 'text-right' : 'text-left'}`}>
              <div className="flex flex-col gap-4">
                
                {/* Plan Chooser Title */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#9b59b6]">
                    {lang === 'bn' ? '১. সাবস্ক্রিপশন প্ল্যান নির্বাচন' : '1. SELECT PREFERRED PLAN'}
                  </span>
                </div>

                {/* Grid of Plans */}
                <div className="space-y-2.5">
                  {plans.map((p) => {
                    const isSel = selectedPlan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex justify-between items-center ${
                          isSel 
                            ? 'border-purple-600 bg-purple-500/5' 
                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSel ? 'border-purple-500 bg-purple-500' : 'border-slate-600 bg-slate-800'
                          }`}>
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black text-white">
                              {lang === 'bn' ? p.nameBN : p.nameEN}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {lang === 'bn' ? p.featuresBN : p.featuresEN}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs font-black text-purple-400 whitespace-nowrap bg-purple-950/40 border border-purple-900/50 px-2 py-0.5 rounded-lg select-all">
                          {lang === 'bn' ? p.priceBN : p.priceEN}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Sandbox & Live Integration Help helper panel */}
                <div className="border border-indigo-900/40 bg-indigo-950/20 rounded-2xl p-4 mt-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black tracking-wider text-indigo-400 uppercase flex items-center gap-1.5">
                      <Sparkles size={12} className="text-purple-400 animate-spin-slow" />
                      {lang === 'bn' ? 'টেস্ট/ডেমো পেমেন্ট ও লাইভ গাইড' : 'TEST/DEMO GATEWAY & LIVE INTEGRATION GUIDE'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSandboxHelp(!showSandboxHelp)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      {showSandboxHelp ? (lang === 'bn' ? 'লুকান' : 'Hide') : (lang === 'bn' ? 'দেখুন' : 'Show')}
                    </button>
                  </div>

                  {showSandboxHelp && (
                    <div className="text-xs space-y-3">
                      <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                        {lang === 'bn' 
                          ? 'সরাসরি টেস্ট করার জন্য নিচের যেকোনো বাটন চাপলে ডেমো ডাটা স্বয়ংক্রিয়ভাবে ফর্মের মধ্যে লোড হয়ে যাবে:'
                          : 'For immediate sandboxed software previews, click any button below to autofill mock details:'}
                      </p>

                      {/* Demo filling tools */}
                      <div className="flex flex-wrap gap-2 pb-1 border-b border-indigo-950/40">
                        <button
                          type="button"
                          onClick={() => fillDemoCredentials('card')}
                          className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] font-extrabold text-slate-200 transition cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                        >
                          💳 {lang === 'bn' ? 'টেস্ট কার্ড লোড করুন' : 'Autofill Test Card'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fillDemoCredentials('bkash')}
                          className="px-2.5 py-1 bg-[#e2125f]/10 border border-[#e2125f]/30 hover:bg-[#e2125f]/20 rounded-lg text-[10px] font-extrabold text-[#e2125f] transition cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                        >
                          📱 {lang === 'bn' ? 'বিকাশ ডেমো' : 'Autofill bKash'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fillDemoCredentials('nagad')}
                          className="px-2.5 py-1 bg-[#f69220]/10 border border-[#f69220]/30 hover:bg-[#f69220]/20 rounded-lg text-[10px] font-extrabold text-[#f69220] transition cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                        >
                          📱 {lang === 'bn' ? 'নগদ ডেমো' : 'Autofill Nagad'}
                        </button>
                      </div>

                      {/* How to obtain original live options */}
                      <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-[10px] text-slate-400 space-y-1.5 leading-relaxed">
                        <p className="font-extrabold text-[11px] text-indigo-300">
                          ℹ️ {lang === 'bn' ? 'আসল পেমেন্ট মার্চেন্ট একাউন্ট পাওয়ার গাইড:' : 'Merchant Portal Registration & Setup:'}
                        </p>
                        <ul className="list-disc pl-3.5 space-y-1">
                          <li>
                            <strong>Stripe Live:</strong> {lang === 'bn' 
                              ? 'stripe.com এ ব্যবসায়ের ট্যাক্স ডকুমেন্ট সাবমিট করতে হবে এবং API Secret কী আপনার ড্যাশবোর্ডে লিংক করতে হবে।' 
                              : 'Create a business profile at dashboard.stripe.com. Verify identity & claim live API Keys.'}
                          </li>
                          <li>
                            <strong>bKash merchant:</strong> {lang === 'bn'
                              ? 'বিকাশ মার্চেন্ট ফর্ম পূরণ করুন। bKash PGW (Payment Gateway) পোর্টালের মাধ্যমে App Key, App Secret, Username ও Password সংগ্রহ করুন।'
                              : 'Submit trade license to bkash.com online. You will get PGW merchant App Key, Secret, and Password.'}
                          </li>
                          <li>
                            <strong>Nagad & SSLCommerz:</strong> {lang === 'bn'
                              ? 'SSLCommerz মার্চেন্ট একাউন্টারদের গেটওয়ে ইন্টিগ্রেশন এপিআই বা নগদের সরাসরি পেমেন্ট গেটওয়ে এপিআই ব্যবহার করে রিয়েল-টাইম রিসিভ করতে পারবেন।'
                              : 'Register commercial merchant details at sslcommerz.com or Nagad corporate desk to initiate direct production gateway APIs.'}
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Gateway Tabs */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mt-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#9b59b6]">
                    {lang === 'bn' ? '২. পেমেন্ট মেথড বিবরণ' : '2. BILLING METHOD GATEWAY'}
                  </span>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('card')}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedGateway === 'card' 
                        ? 'border-purple-600 bg-purple-500/10 text-purple-300' 
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CreditCard size={13} />
                    {lang === 'bn' ? 'কার্ড' : 'Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('bkash')}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedGateway === 'bkash' 
                        ? 'border-[#e2125f]/40 bg-[#e2125f]/5 text-[#e2125f]' 
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-extrabold text-[10px]">bKash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('nagad')}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedGateway === 'nagad' 
                        ? 'border-[#f69220]/40 bg-[#f69220]/5 text-[#f69220]' 
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-extrabold text-[10px]">Nagad</span>
                  </button>
                </div>

                {/* Gateway Specific Input Fields */}
                <form onSubmit={handleProcessPayment} className="space-y-3.5 text-left">
                  {selectedGateway === 'card' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                          {lang === 'bn' ? 'কার্ডহোল্ডারের নাম ' : 'CARDHOLDER NAME'}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600"
                          />
                          <User size={13} className="text-slate-500 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                          {lang === 'bn' ? 'ক্রেডিট/ডেবিট কার্ড নম্বর' : 'CARD NUMBER'}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="4111 2222 3333 4444"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
                              // Format pattern: XXXX XXXX XXXX XXXX
                              const formatted = v.match(/.{1,4}/g)?.join(' ') || v;
                              setCardNumber(formatted);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600 font-mono tracking-wider"
                          />
                          <CreditCard size={13} className="text-slate-500 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1 font-mono">
                            {lang === 'bn' ? 'মেয়াদ (MM/YY)' : 'EXPIRY (MM/YY)'}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="12/28"
                              maxLength={5}
                              value={expiry}
                              onChange={(e) => {
                                let v = e.target.value.replace(/[^0-9]/g, '');
                                if (v.length > 2) {
                                  v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                }
                                setExpiry(v);
                              }}
                              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600 font-mono"
                            />
                            <Calendar size={13} className="text-slate-500 absolute left-3 top-3" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                            {lang === 'bn' ? 'সিভিভি নম্বর' : 'CVV CODE'}
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              placeholder="***"
                              maxLength={3}
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600 font-mono tracking-widest"
                            />
                            <Lock size={13} className="text-slate-500 absolute left-3 top-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                          {selectedGateway === 'bkash' ? (lang === 'bn' ? 'বিকাশ নম্বর' : 'bKash Wallet Number') : (lang === 'bn' ? 'নগদ নম্বর' : 'Nagad Wallet Number')}
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            placeholder="017XXXXXXXX"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600 font-mono tracking-wide"
                          />
                          <User size={13} className="text-slate-500 absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block mb-1">
                          {lang === 'bn' ? 'অ্যাকাউন্ট পিন কোড' : 'WALLET SECURITY PIN'}
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            required
                            placeholder="*****"
                            maxLength={5}
                            value={mobilePin}
                            onChange={(e) => setMobilePin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl focus:outline-none transition text-xs font-bold text-white placeholder-slate-600 font-mono tracking-widest"
                          />
                          <Lock size={13} className="text-slate-500 absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] font-bold text-red-400 flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : (
                      <>
                        <span>{lang === 'bn' ? 'পেমেন্ট সম্পন্ন ও একটিভেট করুন' : 'Process Payment & Activate'}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
