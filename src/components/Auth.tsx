import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Store, LogIn, UserPlus, LogOut, ArrowRight, Loader2, Chrome, Phone, Lock, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../translations';

export const AR_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAQAElEQVR4AeydB4BUtdbHT5Lbpm6nNxUUFbH3il0Q6xN7wYaCgCBFirCoIIqAgg0bimJZbIiiKIgKYkMRRaS3pWwvU2/PdzK4PPTzvWdhlZJxMrclJ7";

interface FloatingInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

function FloatingInput({ label, type, value, onChange, placeholder = "" }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className="relative mb-6">
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ""}
        className="w-full py-2 bg-transparent text-slate-800 text-base border-b-2 border-slate-300 focus:border-[#9b59b6] focus:outline-none transition-all duration-300"
      />
      <label 
        className={`absolute left-0 pointer-events-none transition-all duration-300 font-medium ${
          focused || value 
            ? "-top-5 text-sm text-[#9b59b6] font-bold" 
            : "top-2 text-base text-slate-400"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

export default function Auth({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('bn');
  const t = translations[lang];

  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [loginMode, setLoginMode] = useState<'owner' | 'staff'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  useEffect(() => {
    // Sync language from localStorage if exists
    const savedLang = localStorage.getItem('dokan_lang') as Language;
    if (savedLang) setLang(savedLang);

    const checkTimeout = () => {
      const loginTime = localStorage.getItem('dokan_login_time');
      const now = Date.now();
      const timeout = 12 * 60 * 60 * 1000;
      if (loginTime && now - parseInt(loginTime) > timeout) {
        signOut(auth);
        localStorage.removeItem('dokan_login_time');
      }
    };

    // Check every minute
    const interval = setInterval(checkTimeout, 60000);

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const loginTime = localStorage.getItem('dokan_login_time');
        const now = Date.now();
        const timeout = 12 * 60 * 60 * 1000;

        if (loginTime) {
          if (now - parseInt(loginTime) > timeout) {
            signOut(auth);
            localStorage.removeItem('dokan_login_time');
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          localStorage.setItem('dokan_login_time', now.toString());
        }
      } else {
        localStorage.removeItem('dokan_login_time');
      }

      setUser(u);
      setLoading(false);
    });

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(lang === 'bn' ? 'লগইন উইন্ডোটি বন্ধ করা হয়েছে।' : 'Login popup was closed.');
      } else {
        setError(lang === 'bn' ? 'গুগল লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Google login failed. Try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || !password) return;
    setAuthLoading(true);
    setError('');
    
    try {
      // 1. Verify credentials in invitations
      const inviteRef = doc(db, 'invitations', cleanPhone);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists() || inviteSnap.data().password !== password) {
        setError(t.invalidStaffCredentials);
        setAuthLoading(false);
        return;
      }

      const inviteData = inviteSnap.data();
      const staffEmail = `staff_${cleanPhone}@dokan.com`;

      try {
        // 2. Try to sign in
        await signInWithEmailAndPassword(auth, staffEmail, password);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          // 3. Auto-create user if first time
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, staffEmail, password);
            await updateProfile(userCredential.user, { displayName: `Staff ${cleanPhone}` });
            
            // 4. Create user profile in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              name: `Staff ${cleanPhone}`,
              email: staffEmail,
              phone: cleanPhone,
              role: inviteData.role,
              shopId: inviteData.shopId,
              status: 'active',
              createdAt: Date.now()
            });
          } catch (createErr: any) {
            if (createErr.code === 'auth/operation-not-allowed') {
              setError(lang === 'bn' 
                ? 'ইমেইল/পাসওয়ার্ড লগইন অপশনটি বন্ধ আছে। দয়া করে এডমিনকে বলুন Firebase Console থেকে এটি চালু করতে।' 
                : 'Email/Password login is not enabled. Please ask admin to enable it in Firebase Console.');
            } else if (createErr.code === 'auth/email-already-in-use') {
              // This implies the previous signIn failed with invalid-credential because of wrong password
              setError(t.invalidStaffCredentials);
            } else {
              throw createErr;
            }
          }
        } else if (signInErr.code === 'auth/wrong-password') {
          setError(t.invalidStaffCredentials);
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(lang === 'bn' 
          ? 'ফায়ারবেসে ইমেইল/পাসওয়ার্ড লগইন অপশনটি বন্ধ আছে। এটি ফায়ারবেস কনসোল থেকে চালু করুন।' 
          : 'Email/Password authentication is disabled. Please enable it in Firebase Console.');
      } else {
        setError(err.message || 'Error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (loginMode === 'staff') {
      await handleStaffLogin();
      return;
    }

    if (password.length < 6) {
      setError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(lang === 'bn' ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে।' : 'Email already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError(lang === 'bn' ? 'পাসওয়ার্ডটি খুব দুর্বল।' : 'Weak password.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(lang === 'bn' ? 'ইমেইল বা পাসওয়ার্ড ভুল।' : 'Invalid email or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError(lang === 'bn' ? 'ইমেইলটি সঠিক নয়।' : 'Invalid email.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(lang === 'bn' 
          ? 'ইমেইল/পাসওয়ার্ড লগইন অপশনটি বন্ধ আছে। এটি ফায়ারবেস কনসোল থেকে চালু করুন।' 
          : 'Email/Password login is not enabled in Firebase Console.');
      } else {
        setError(err.message || 'Error occurred');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  if (!user) {
    if (!showLoginOptions) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#71b7e6] to-[#9b59b6] p-4 lg:p-6 overflow-hidden relative select-none">
          <style>{`
            @keyframes floatMascot {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-12px) rotate(1.5deg); }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.15; transform: scale(1); }
              50% { opacity: 0.35; transform: scale(1.08); }
            }
            @keyframes spinSlow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes blinkFace {
              0%, 90%, 100% { transform: scaleY(1); }
              95% { transform: scaleY(0.1); }
            }
            .animate-float-mascot {
              animation: floatMascot 4s ease-in-out infinite;
            }
            .animate-pulse-glow {
              animation: pulseGlow 3s ease-in-out infinite;
            }
            .animate-spin-slow {
              animation: spinSlow 30s linear infinite;
            }
            .animate-blink-face {
              animation: blinkFace 4s ease-in-out infinite;
              transform-origin: center;
            }
          `}</style>

          {/* Animated Ambient Background Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/20 blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-indigo-300/30 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="z-10 flex flex-col items-center max-w-[420px] w-full text-center px-4">
            {/* Premium Brand Logo Header */}
            <div className="mb-2 flex flex-col items-center gap-1.5 animate-fadeIn">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl border-2 border-white/30 flex items-center justify-center text-white p-2 shadow-2xl overflow-hidden">
                <img 
                  src={AR_LOGO_BASE64} 
                  alt="A.R Enterprise Logo" 
                  className="w-full h-full object-contain filter drop-shadow-md rounded-lg"
                />
              </div>
              <span className="text-white/60 font-black text-[10px] tracking-widest uppercase mt-1">A.R ENTERPRISE</span>
            </div>

            {/* Language Switch */}
            <button 
              type="button"
              onClick={() => {
                const newLang = lang === 'bn' ? 'en' : 'bn';
                setLang(newLang);
                localStorage.setItem('dokan_lang', newLang);
              }}
              className="absolute top-6 right-6 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-black uppercase text-white hover:bg-white/25 transition-all shadow-sm cursor-pointer"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>

            {/* Glowing Mascot Ring / Platform */}
            <div className="relative w-72 h-72 flex items-center justify-center mb-8">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-white animate-pulse-glow" />
              
              <svg className="absolute w-64 h-64 text-white/30 animate-spin-slow select-none pointer-events-none" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8 16 8" />
              </svg>

              {/* mascot clickable node */}
              <div 
                onClick={() => setShowLoginOptions(true)}
                className="relative z-10 w-48 h-48 rounded-full bg-white/95 backdrop-blur-sm border-4 border-white shadow-2xl flex items-center justify-center cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-300 group overflow-hidden p-4"
              >
                {/* Premium Animated App Logo */}
                <div className="w-32 h-32 flex items-center justify-center relative animate-float-mascot">
                  <img 
                    src={AR_LOGO_BASE64} 
                    alt="A.R Enterprise Logo" 
                    className="w-full h-full object-contain rounded-full filter drop-shadow-xl"
                  />
                  {/* Subtle pulsing background behind the logo for premium asset integration */}
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full select-none pointer-events-none -z-10 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
                </div>
                
                {/* Guide overlay */}
                <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none">
                  <span className="text-[10px] font-black tracking-widest text-[#9b59b6]/70 uppercase animate-pulse">
                    {lang === 'bn' ? 'ক্লিক করুন' : 'CLICK ME'}
                  </span>
                </div>
              </div>
            </div>

            {/* Title / Greetings */}
            <h1 className="text-3xl font-black italic tracking-tight text-white mb-3">
              {lang === 'bn' ? 'এ.আর এন্টারপ্রাইজে স্বাগতম' : 'Welcome to A.R Enterprise'}
            </h1>
            <p className="text-white/85 text-sm mb-10 max-w-sm leading-relaxed font-semibold">
              {lang === 'bn' 
                ? 'রিয়েল-টাইম হিসাবের সবচেয়ে সহজ সমাধান। শুরু করতে মাঝখানে অথবা নিচের বাটনে ক্লিক করুন!' 
                : 'Smart digital manager for your shop. Click in the center or the button below to get started!'
              }
            </p>

            {/* Center Call To Action Button */}
            <button
              onClick={() => setShowLoginOptions(true)}
              className="w-full max-w-xs py-4 bg-white text-[#9b59b6] font-extrabold text-lg rounded-full flex items-center justify-center gap-3 transition-all duration-300 hover:tracking-[2px] shadow-2xl hover:bg-slate-50 active:scale-95 animate-bounce cursor-pointer border-none outline-none"
            >
              <span>{lang === 'bn' ? 'প্রবেশ করুন' : 'Click to Login'}</span>
              <ArrowRight size={22} className="stroke-[3]" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#71b7e6] to-[#9b59b6] p-4 lg:p-6 overflow-y-auto py-12 relative animate-fadeIn">
        {/* Back button to return to mascot */}
        <button
          onClick={() => setShowLoginOptions(false)}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-all shadow-sm cursor-pointer z-10"
        >
          &larr; {lang === 'bn' ? 'ফিরে যান' : 'Back'}
        </button>

        {/* Login Mode Toggle */}
        <div className="mb-8 p-1 bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg flex gap-1">
          <button
            onClick={() => { setLoginMode('owner'); setIsLogin(true); setError(''); }}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginMode === 'owner' ? 'bg-[#9b59b6] text-white shadow-md' : 'text-slate-500 hover:text-black'}`}
          >
            {t.owner}
          </button>
          <button
            onClick={() => { setLoginMode('staff'); setIsLogin(true); setError(''); }}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginMode === 'staff' ? 'bg-[#9b59b6] text-white shadow-md' : 'text-slate-500 hover:text-black'}`}
          >
            {t.staff}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[420px] bg-white p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#71b7e6] to-[#9b59b6] rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#9b59b6]/20 p-2 overflow-hidden">
              <img 
                src={AR_LOGO_BASE64} 
                alt="A.R Enterprise Logo" 
                className="w-full h-full object-contain filter drop-shadow-md rounded-xl"
              />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-gray-900">
              {lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise'}
            </h1>
            <p className="text-gray-400 text-sm mt-2 font-medium tracking-wide">
              {loginMode === 'staff' 
                ? t.loginAsStaff
                : (isLogin ? (lang === 'bn' ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'Login to your account') : (lang === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create new account'))
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMode === 'staff' ? (
              <>
                <FloatingInput
                  label={t.staffPhone}
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder={t.phonePlaceholder}
                />
                <FloatingInput
                  label={t.staffPassword}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />
              </>
            ) : (
              <>
                {!isLogin && (
                  <FloatingInput
                    label={lang === 'bn' ? 'আপনার নাম' : 'Your Name'}
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder={lang === 'bn' ? 'রশিদ আহমেদ' : 'John Doe'}
                  />
                )}
                <FloatingInput
                  label={lang === 'bn' ? 'ইমেইল' : 'Email'}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="shop@example.com"
                />
                
                <div>
                  <FloatingInput
                    label={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                  />
                  {isLogin && (
                    <div className="flex justify-end -mt-3 mb-4">
                      <button type="button" className="text-xs font-bold text-gray-400 hover:text-[#9b59b6] transition-colors uppercase tracking-wider">
                        {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-xs italic bg-red-50 p-4 rounded-xl border border-red-100 font-bold"
              >
                {error}
              </motion.div>
            )}

            <button
              disabled={authLoading}
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#71b7e6] to-[#9b59b6] text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:tracking-[2px] hover:shadow-lg hover:shadow-[#9b59b6]/30 active:scale-[0.98] disabled:opacity-50 mt-6 min-h-[56px]"
            >
              {authLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  {loginMode === 'staff' ? t.loginAsStaff : (isLogin ? (lang === 'bn' ? 'অ্যাপে প্রবেশ করুন' : 'Sign In') : (lang === 'bn' ? 'সাইনআপ করুন' : 'Sign Up'))}
                  <ArrowRight size={22} />
                </>
              )}
            </button>

            {loginMode === 'owner' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase italic font-black">
                    <span className="bg-white px-4 text-gray-400 tracking-widest">{lang === 'bn' ? 'অথবা' : 'OR'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={authLoading}
                  className="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] filter drop-shadow-sm"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-sm tracking-wide">
                    {lang === 'bn' ? 'গুগল দিয়ে প্রবেশ করুন' : 'Sign in with Google'}
                  </span>
                </button>

                <p className="mt-8 text-center text-sm font-bold italic text-gray-400">
                  {isLogin ? (lang === 'bn' ? 'অ্যাকাউন্ট নেই?' : 'Don\'t have an account?') : (lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?')}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-2 font-black text-[#9b59b6] hover:text-[#71b7e6] transition-colors underline underline-offset-4 decoration-2"
                  >
                    {isLogin ? (lang === 'bn' ? 'নতুন একাউন্ট' : 'Join Now') : (lang === 'bn' ? 'লগইন করুন' : 'Sign In')}
                  </button>
                </p>
              </>
            )}
          </form>

          {/* Language Switch */}
          <button 
            type="button"
            onClick={() => {
              const newLang = lang === 'bn' ? 'en' : 'bn';
              setLang(newLang);
              localStorage.setItem('dokan_lang', newLang);
            }}
            className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#9b59b6] hover:text-gray-900 transition-colors"
          >
            {lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

export function UserMenu() {
  const user = auth.currentUser;
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-2xl transition-colors"
      >
        <div className="text-right flex flex-col items-end">
          <p className="text-sm font-bold">{user.displayName || 'দোকানদার'}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">এডমিন</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg">
          {(user.displayName || user.email || '?')[0].toUpperCase()}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30 overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-gray-50 mb-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic truncate">{user.email}</p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors italic"
              >
                <LogOut size={16} /> লগআউট করুন
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
