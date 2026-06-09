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
import { Store, LogIn, UserPlus, LogOut, ArrowRight, Loader2, Chrome, Phone, Lock, User as UserIcon, X, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../translations';
import { MascotCharacter } from './MascotCharacter';

export const AR_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAQAElEQVR4AeydB4BUtdbHT5Lbpm6nNxUUFbH3il0Q6xN7wYaCgCBFirCoIIqAgg0bimJZbIiiKIgKYkMRRaS3pWwvU2/PdzK4PPTzvWdhlZJxMrclJ7";

interface ElegantInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (val: string) => void;
  icon: React.ReactNode;
}

function ElegantInput({ label, type, value, onChange, icon }: ElegantInputProps) {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className="relative w-full mb-6 text-left">
      <div className={`absolute left-0 bottom-2.5 transition-colors duration-300 ${focused ? 'text-[#9b59b6]' : 'text-slate-400'}`}>
        {icon}
      </div>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full pl-8 pr-1 py-1.5 bg-transparent text-slate-850 text-sm border-b border-slate-200 focus:border-[#9b59b6] focus:outline-none transition-all duration-300 font-semibold"
      />
      <label 
        className={`absolute pointer-events-none transition-all duration-300 ${
          focused || value 
            ? "left-0 -top-3.5 text-xs text-[#9b59b6] font-black" 
            : "left-8 bottom-2 text-sm text-slate-400 font-semibold"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

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
  const [showLoginOptions, setShowLoginOptions] = useState(true);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // States for intro 2D walking animation sequence
  const [introPassed, setIntroPassed] = useState(() => {
    return safeStorage.getItem('dokan_intro_passed') === 'true';
  });
  const [characterWalking, setCharacterWalking] = useState(true);
  const [characterWaving, setCharacterWaving] = useState(false);
  const [pobesVisible, setPobesVisible] = useState(false);

  // States for interactive 3D Mascot Sphere
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;
    
    const rX = -(dy / yc) * 20;
    const rY = (dx / xc) * 20;
    
    setRotateX(rX);
    setRotateY(rY);
    setShadowX(-rY * 1.5);
    setShadowY(-rX * 1.5);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setShadowX(0);
    setShadowY(0);
  };

  useEffect(() => {
    // Sync language from localStorage if exists
    const savedLang = safeStorage.getItem('dokan_lang') as Language;
    if (savedLang) setLang(savedLang);

    const checkTimeout = () => {
      const loginTime = safeStorage.getItem('dokan_login_time');
      const now = Date.now();
      const timeout = 12 * 60 * 60 * 1000;
      if (loginTime && now - parseInt(loginTime) > timeout) {
        signOut(auth);
        safeStorage.removeItem('dokan_login_time');
      }
    };

    // Check every minute
    const interval = setInterval(checkTimeout, 60000);

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const loginTime = safeStorage.getItem('dokan_login_time');
        const now = Date.now();
        const timeout = 12 * 60 * 60 * 1000;

        if (loginTime) {
          if (now - parseInt(loginTime) > timeout) {
            signOut(auth);
            safeStorage.removeItem('dokan_login_time');
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          safeStorage.setItem('dokan_login_time', now.toString());
        }
      } else {
        safeStorage.removeItem('dokan_login_time');
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
      // 1. Verify credentials in invitations using a secure unguessable composite key
      const inviteRef = doc(db, 'invitations', `${cleanPhone}_${password}`);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists()) {
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

  const renderSignInForm = (isMobile = false) => {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-[325px] flex flex-col text-left">
        <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tight">
          {loginMode === 'staff' 
            ? t.loginAsStaff 
            : (lang === 'bn' ? 'অ্যাকাউন্টে লগইন' : 'Owner Login')}
        </h2>
        
        {/* Switch for Owner vs Staff Login */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full mb-6 mt-2 border border-slate-200/50">
          <button
            type="button"
            onClick={() => { setLoginMode('owner'); setIsLogin(true); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${loginMode === 'owner' ? 'bg-[#9b59b6] text-white shadow-sm' : 'text-slate-500 hover:text-slate-805'}`}
          >
            {t.owner}
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('staff'); setIsLogin(true); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${loginMode === 'staff' ? 'bg-[#9b59b6] text-white shadow-sm' : 'text-slate-500 hover:text-slate-805'}`}
          >
            {t.staff}
          </button>
        </div>

        {loginMode === 'staff' ? (
          <div className="space-y-1">
            <ElegantInput
              label={t.staffPhone}
              type="tel"
              value={phone}
              onChange={setPhone}
              icon={<Phone size={16} />}
            />
            <ElegantInput
              label={t.staffPassword}
              type="password"
              value={password}
              onChange={setPassword}
              icon={<Lock size={16} />}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <ElegantInput
              label={lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
              type="email"
              value={email}
              onChange={setEmail}
              icon={<Mail size={16} />}
            />
            <ElegantInput
              label={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              icon={<Lock size={16} />}
            />
            <div className="flex justify-end -mt-3 mb-4">
              <button 
                type="button" 
                onClick={() => alert(lang === 'bn' ? 'অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন পাসওয়ার্ড রিসেট করার জন্য।' : 'Please contact site admin to reset password.')}
                className="text-xs font-black text-slate-400 hover:text-[#9b59b6] transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none"
              >
                {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-xs italic bg-red-50 p-3.5 rounded-2xl border border-red-100 font-bold mb-4 leading-relaxed">
            {error}
          </div>
        )}

        <button
          disabled={authLoading}
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-[#71b7e6] to-[#9b59b6] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:tracking-[1px] hover:shadow-lg hover:shadow-[#9b59b6]/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[48px]"
        >
          {authLoading ? <Loader2 className="animate-spin" size={18} /> : (
            <>
              <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
              <ArrowRight size={16} className="stroke-[3]" />
            </>
          )}
        </button>

        {loginMode === 'owner' && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase italic font-black">
                <span className="bg-white px-3 text-slate-400 tracking-widest">{lang === 'bn' ? 'অথবা' : 'OR'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full h-11 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm text-xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{lang === 'bn' ? 'গুগল দিয়ে প্রবেশ করুন' : 'Sign in with Google'}</span>
            </button>
          </>
        )}

        {isMobile && loginMode !== 'staff' && (
          <p className="mt-6 text-center text-xs font-bold text-slate-400">
            {lang === 'bn' ? 'অ্যাকাউন্ট নেই?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className="ml-2 font-black text-[#9b59b6] hover:underline cursor-pointer"
            >
              {lang === 'bn' ? 'নতুন একাউন্ট খুলুন' : 'Join Now'}
            </button>
          </p>
        )}
      </form>
    );
  };

  const renderSignUpForm = (isMobile = false) => {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-[325px] flex flex-col text-left">
        <h2 className="text-2xl font-black text-slate-800 leading-tight mb-4 tracking-tight">
          {lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Account'}
        </h2>

        <div className="space-y-1">
          <ElegantInput
            label={lang === 'bn' ? 'আপনার নাম' : 'Your Name'}
            type="text"
            value={name}
            onChange={setName}
            icon={<UserIcon size={16} />}
          />
          <ElegantInput
            label={lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
            type="email"
            value={email}
            onChange={setEmail}
            icon={<Mail size={16} />}
          />
          <ElegantInput
            label={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            type="password"
            value={password}
            onChange={setPassword}
            icon={<Lock size={16} />}
          />
        </div>

        {error && (
          <div className="text-red-500 text-xs italic bg-red-50 p-3.5 rounded-2xl border border-red-100 font-bold mb-4 leading-relaxed">
            {error}
          </div>
        )}

        <button
          disabled={authLoading}
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-[#71b7e6] to-[#9b59b6] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:tracking-[1px] hover:shadow-lg hover:shadow-[#9b59b6]/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer min-h-[48px]"
        >
          {authLoading ? <Loader2 className="animate-spin" size={18} /> : (
            <>
              <span>{lang === 'bn' ? 'সাইনআপ করুন' : 'Sign Up'}</span>
              <ArrowRight size={16} className="stroke-[3]" />
            </>
          )}
        </button>

        {isMobile && (
          <p className="mt-6 text-center text-xs font-bold text-slate-400">
            {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className="ml-2 font-black text-[#9b59b6] hover:underline cursor-pointer"
            >
              {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
            </button>
          </p>
        )}
      </form>
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  if (!user) {
    if (!introPassed) {
      return (
        <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#121829] to-[#2e1065] p-6 overflow-hidden relative select-none font-sans text-white">
          {/* Subtle grid pattern background overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          
          {/* Glowing colorful light sources */}
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] rounded-full bg-fuchsia-500/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

          <div className="z-20 w-full max-w-[850px] flex flex-col md:flex-row items-center justify-between gap-12 relative min-h-[450px]">
            {/* Welcome banner and entrance card Area */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left justify-center min-h-[220px]">
              <AnimatePresence>
                {pobesVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -40, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="flex flex-col items-center md:items-start gap-4"
                  >
                    {/* Tiny premium badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/15 rounded-full text-[10px] font-black uppercase tracking-widest text-[#9b59b6] shadow-sm">
                      <span className="w-1.5 h-1.5 bg-[#e91e63] rounded-full animate-ping" />
                      {lang === 'bn' ? 'স্মার্ট সহকারী প্রস্তুত' : 'Assistant Ready'}
                    </div>

                    {/* Grand Header Text */}
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                      {lang === 'bn' ? 'এ.আর এন্টারপ্রাইজ' : 'A.R Enterprise'}
                    </h1>
                    
                    {/* Friendly Subtitle describing the mascot */}
                    <p className="text-white/70 max-w-sm text-sm md:text-base font-semibold leading-relaxed">
                      {lang === 'bn' 
                        ? 'আপনার দোকানের আধুনিক হিসাব ও স্মার্ট সলিউশন ম্যানেজারে আপনাকে স্বাগতম।' 
                        : 'Welcome to your premium modern shop transactions & smart assistant manager.'}
                    </p>

                    {/* The Prominent Prabesh ENTER Button */}
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(155, 89, 182, 0.50)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        safeStorage.setItem('dokan_intro_passed', 'true');
                        setIntroPassed(true);
                      }}
                      className="mt-4 inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4f46e5] via-[#9b59b6] to-[#e91e63] text-white font-black text-sm uppercase tracking-wider rounded-full shadow-lg border border-white/20 transition-all cursor-pointer relative overflow-hidden group"
                    >
                      {/* Button gloss slide effect */}
                      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[250%] transition-transform duration-1000" />
                      <span>{lang === 'bn' ? 'প্রবেশ করুন' : 'ENTER PORTAL'}</span>
                      <ArrowRight size={18} className="stroke-[3.5] group-hover:translate-x-1.5 transition-transform" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mascot Walking Area */}
            <div className="flex-1 flex items-center justify-center relative w-full h-[320px]">
              <motion.div
                initial={{ x: "-100vw", opacity: 0 }}
                animate={{ x: isMobileScreen ? "0vw" : "12vw", opacity: 1 }}
                transition={{ duration: 4.0, ease: "easeOut" }}
                onAnimationComplete={() => {
                  setCharacterWalking(false);
                  setCharacterWaving(true);
                  setTimeout(() => setPobesVisible(true), 120);
                }}
                className="absolute"
              >
                <MascotCharacter isWalking={characterWalking} isWaving={characterWaving} />
              </motion.div>
            </div>
          </div>

          {/* Quick Skip Intro Option */}
          <button 
            onClick={() => {
              safeStorage.setItem('dokan_intro_passed', 'true');
              setIntroPassed(true);
            }}
            className="absolute bottom-6 right-8 text-white/40 hover:text-white/80 transition-colors text-xs font-black uppercase tracking-wider"
          >
            {lang === 'bn' ? 'এড়িয়ে যান' : 'Skip Intro'} &rarr;
          </button>
        </div>
      );
    }

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
                safeStorage.setItem('dokan_lang', newLang);
              }}
              className="absolute top-6 right-6 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-black uppercase text-white hover:bg-white/25 transition-all shadow-sm cursor-pointer"
            >
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>

            {/* Glowing Mascot Ring / Platform with 3D Depth */}
            <div 
              className="relative w-80 h-80 flex items-center justify-center mb-8"
              style={{ perspective: 1000 }}
            >
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#e91e63]/20 via-[#9b59b6]/30 to-[#4f46e5]/20 animate-pulse-glow" />
              
              {/* Spinning geometric orbit lines with custom 3D depth */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                className="absolute w-72 h-72 rounded-full border border-white/20 border-dashed pointer-events-none"
                style={{ 
                  transformStyle: 'preserve-3d',
                  rotateX: 45,
                  translateZ: -50
                }}
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                className="absolute w-64 h-64 rounded-full border border-white/10 pointer-events-none"
                style={{ 
                  transformStyle: 'preserve-3d',
                  rotateY: 60,
                  translateZ: -20
                }}
              />

              {/* mascot clickable node - 3D interactively tilted glowing container */}
              <motion.div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => setShowLoginOptions(true)}
                animate={{ 
                  rotateX: rotateX, 
                  rotateY: rotateY,
                  scale: rotateX !== 0 || rotateY !== 0 ? 1.05 : 1
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                  transformStyle: 'preserve-3d',
                  boxShadow: `${shadowX}px ${shadowY}px 35px rgba(0, 0, 0, 0.35)`
                }}
                className="relative z-10 w-52 h-52 rounded-[40px] bg-white/95 backdrop-blur-md border-[5px] border-white/80 shadow-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden p-6 hover:border-white transition-colors duration-300"
              >
                {/* Internal 3D Depth layers */}
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative"
                  style={{ transform: 'translateZ(50px)', transformStyle: 'preserve-3d' }}
                >
                  {/* Floating Holographic Aura */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-[#9b59b6]/10 to-[#4f46e5]/15 rounded-full select-none pointer-events-none blur-sm animate-pulse" />

                  {/* High Definition Floating Logo Sphere */}
                  <motion.div 
                    animate={{ 
                      y: [0, -10, 0],
                      rotateY: [0, 8, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 4, 
                      ease: 'easeInOut' 
                    }}
                    className="w-26 h-26 flex items-center justify-center relative mb-3"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <img 
                      src={AR_LOGO_BASE64} 
                      alt="A.R Enterprise Logo" 
                      className="w-full h-full object-contain rounded-full filter drop-shadow-[0_15px_15px_rgba(79,70,229,0.3)] border-2 border-indigo-100"
                      style={{ transform: 'translateZ(15px)' }}
                    />
                    {/* Ring aura behind the logo */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#9b59b6]/20 to-transparent rounded-full animate-ping opacity-40" style={{ animationDuration: '4s' }} />
                  </motion.div>

                  {/* 3D label/hint text */}
                  <div 
                    className="text-center pointer-events-none mt-2"
                    style={{ transform: 'translateZ(25px)' }}
                  >
                    <span className="text-[11px] font-black tracking-widest text-[#9b59b6]/80 uppercase block animate-pulse">
                      {lang === 'bn' ? 'ক্লিক করুন' : 'CLICK ME'}
                    </span>
                    <span className="text-[8px] font-extrabold text-[#4f46e5]/60 tracking-wider uppercase block mt-0.5">
                      {lang === 'bn' ? 'এআই ড্যাশবোর্ড' : 'AI Dashboard'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Decorative floating micro-particles for extreme 3D sensory feedback */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div 
                  animate={{ y: [0, -25, 0], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute top-12 left-8 w-2 h-2 rounded-full bg-pink-400 blur-[1px]" 
                />
                <motion.div 
                  animate={{ y: [0, -35, 0], opacity: [0.2, 0.9, 0.2] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-16 right-10 w-2.5 h-2.5 rounded-full bg-indigo-300 blur-[1.5px]" 
                />
                <motion.div 
                  animate={{ x: [0, 20, 0], y: [0, 15, 0], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute top-1/2 right-4 w-1.5 h-1.5 rounded-full bg-yellow-300" 
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 lg:p-6 overflow-y-auto py-12 relative select-none font-sans">
          {/* Language Switch */}
          <button 
            type="button"
            onClick={() => {
              const newLang = lang === 'bn' ? 'en' : 'bn';
              setLang(newLang);
              safeStorage.setItem('dokan_lang', newLang);
            }}
            className="absolute top-6 right-6 px-4 py-2 bg-white/80 hover:bg-slate-100/90 text-slate-700/90 rounded-full border border-slate-200/80 text-xs font-black uppercase transition-all shadow-sm hover:shadow cursor-pointer z-50 active:scale-95"
          >
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>

          {/* Desktop Sliding Showcase Frame (md and up) */}
          <div className="hidden md:flex relative w-full max-w-[850px] h-[580px] bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100/80">
            
            {/* Left side form area (Sign In) */}
            <div className="w-1/2 h-full flex items-center justify-center p-8 bg-white">
              <div className="w-full flex justify-center">
                {renderSignInForm(false)}
              </div>
            </div>

            {/* Right side form area (Sign Up) */}
            <div className="w-1/2 h-full flex items-center justify-center p-8 bg-white">
              <div className="w-full flex justify-center">
                {renderSignUpForm(false)}
              </div>
            </div>

            {/* Sliding Panel Cover (Overlay card that slides over left/right side) */}
            <motion.div
              animate={{ x: isLogin ? '100%' : '0%' }}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
              className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-[#4f46e5] via-[#9b59b6] to-[#e91e63] z-10 flex flex-col justify-center p-12 text-white shadow-xl"
            >
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="to-signup"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col text-left"
                  >
                    <h2 className="text-3xl font-black mb-4 tracking-tight flex items-center gap-2">
                      <UserPlus size={28} className="stroke-[2.5]" />
                      {lang === 'bn' ? 'নতুন এখানে?' : 'New Here?'}
                    </h2>
                    <p className="text-white/90 text-sm leading-relaxed mb-8 font-medium">
                      {loginMode === 'staff' ? (
                        lang === 'bn' 
                          ? 'স্টাফ অ্যাকাউন্টগুলো শুধুমাত্র দোকানের মালিক ড্যাশবোর্ড থেকে রেফারেলের মাধ্যমে তৈরি করা সম্ভব।' 
                          : 'Staff registration is managed directly by shop owners in their system panel.'
                      ) : (
                        lang === 'bn' 
                          ? 'আমাদের ইনভেন্টরি ড্যাশবোর্ড, রিয়েল-টাইম হিসাব এবং ডিজিটাল ক্যাশ মেমো জেনারেটর ব্যবহার করতে এখনই অ্যাকাউন্ট খুলুন।' 
                          : 'Create a shop owner profile to generate digital invoice receipts, manage products, and view analytics in real-time.'
                      )}
                    </p>
                    {loginMode !== 'staff' ? (
                      <button 
                        onClick={() => { setIsLogin(false); setError(''); }}
                        className="px-8 py-3 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#9b59b6] rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer max-w-max shadow-md"
                        type="button"
                      >
                        {lang === 'bn' ? 'রেজিস্টার করুন' : 'Sign Up'}
                      </button>
                    ) : (
                      <span className="text-xs bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-white font-bold max-w-max">
                        {lang === 'bn' ? 'স্টাফ সাইনআপ বন্ধ আছে' : 'Staff registration is locked'}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="to-signin"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col text-left"
                  >
                    <h2 className="text-3xl font-black mb-4 tracking-tight flex items-center gap-2">
                      <LogIn size={28} className="stroke-[2.5]" />
                      {lang === 'bn' ? 'স্বাগতম!' : 'Welcome Back!'}
                    </h2>
                    <p className="text-white/90 text-sm leading-relaxed mb-8 font-medium">
                      {lang === 'bn' 
                        ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? আপনার স্টোর প্যানেল এবং ইনভেন্টরি ক্যাশ ড্যাশবোর্ড পরিচালনা করতে এখনই লগইন করুন।' 
                        : 'Already have a shop owner account? Log in with your email and password to access your dashboard directly.'}
                    </p>
                    <button 
                      onClick={() => { setIsLogin(true); setError(''); }}
                      className="px-8 py-3 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#9b59b6] rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer max-w-max shadow-md"
                      type="button"
                    >
                      {lang === 'bn' ? 'লগইন করুন' : 'Sign In'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Mobile Sliding Frame (hidden on md and up) */}
          <div className="md:hidden w-full max-w-[400px] bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col items-center">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-3 shadow-md p-1.5 overflow-hidden">
                <img 
                  src={AR_LOGO_BASE64} 
                  alt="A.R Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">A.R Enterprise</span>
            </div>

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="mobile-login"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col items-center"
                >
                  {renderSignInForm(true)}
                </motion.div>
              ) : (
                <motion.div
                  key="mobile-register"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col items-center"
                >
                  {renderSignUpForm(true)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
  }

  return <>{children}</>;
}

export function UserMenu({ userProfile }: { userProfile?: any }) {
  const user = auth.currentUser;
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileName, setProfileName] = useState(userProfile?.name || user?.displayName || '');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (isProfileEditOpen) {
      setProfileName(userProfile?.name || user?.displayName || '');
    }
  }, [isProfileEditOpen, userProfile, user?.displayName]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      alert('দয়া করে আপনার নাম লিখুন।');
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile(user, { displayName: profileName });
      await setDoc(doc(db, 'users', user.uid), { name: profileName }, { merge: true });
      setIsProfileEditOpen(false);
    } catch (err) {
      console.error('Failed to update user profile:', err);
      alert('সফলভাবে প্রোফাইল আপডেট করা যায়নি!');
    } finally {
      setProfileSaving(false);
    }
  };

  const displayUserRole = userProfile?.role === 'owner' ? 'মালিক' : (userProfile?.role === 'inventory_manager' ? 'ম্যানেজার' : 'ক্যাশিয়ার');

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
      >
        <div className="text-right flex flex-col items-end">
          <p className="text-sm font-bold text-slate-800">{userProfile?.name || user.displayName || 'দোকানদার'}</p>
          <p className="text-[10px] text-[#9b59b6] uppercase tracking-widest font-black leading-none mt-0.5">{displayUserRole}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-slate-800">
          {(userProfile?.name || user.displayName || user.email || '?')[0].toUpperCase()}
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
              className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-30 overflow-hidden"
            >
              <div className="px-4 py-2 border-b border-slate-50 mb-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic truncate">{user.email}</p>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsProfileEditOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
              >
                <UserIcon size={16} className="text-slate-400" /> প্রোফাইল পরিবর্তন
              </button>

              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left border-t border-slate-50/50"
              >
                <LogOut size={16} /> লগআউট করুন
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Profile Edit Modal */}
      <AnimatePresence>
        {isProfileEditOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileEditOpen(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[28px] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">প্রোফাইল পরিবর্তন</h3>
                  <p className="text-xs text-slate-400 font-medium">আপনার প্রোফাইলের নাম ও বিবরণ আপডেট করুন</p>
                </div>
                <button
                  onClick={() => setIsProfileEditOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider block mb-1.5">আপনার নাম</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="text"
                    disabled
                    value={user.email || ''}
                    className="w-full px-4 py-2.5 bg-slate-100 border-2 border-slate-200 text-slate-400 rounded-2xl outline-none font-semibold cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">লগইন আইডি / ইমেইল ঠিকানা পরিবর্তনযোগ্য নয়।</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-[28px]">
                <button
                  type="button"
                  onClick={() => setIsProfileEditOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 bg-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {profileSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
