/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
import SubscriptionGate from './components/SubscriptionGate';
import Receipt from './components/Receipt';
import GeminiAssistant from './components/GeminiAssistant';
import { Product, Sale, View, SaleItem, ShopInfo, Customer, UserProfile, ServiceJob, RMA, Warehouse, WarehouseStock, WarehouseTransfer, SMSAlert, EMIDetails } from './types';
import Servicing from './components/Servicing';
import RMAManager from './components/RMA';
import Warehouses from './components/Warehouses';
import Commissions from './components/Commissions';
import SmartSearch from './components/SmartSearch';
import { Language, translations } from './translations';
import { formatCurrency } from './lib/utils';
import { AR_LOGO_BASE64 } from './components/Auth';
import { CheckCircle2, Share2, PhoneCall, MapPin, Calendar, DollarSign, FileText, Download, AlertCircle, Globe, Printer, Image, FileImage, Sparkles, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'এ.আর এন্টারপ্রাইজ',
  address: 'মিরপুর, ঢাকা',
  phone: '০১৭XXXXXXXX',
};

export default function App() {
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isInvoiceQuery = urlParams.has('invoice');

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [appTheme, setAppTheme] = useState<'white' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return saved === 'dark' ? 'dark' : 'white';
    } catch {
      return 'white';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', appTheme);
    } catch {}
  }, [appTheme]);
  const [lang, setLang] = useState<Language>('bn');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [warehouseTransfers, setWarehouseTransfers] = useState<WarehouseTransfer[]>([]);
  const [smsAlerts, setSmsAlerts] = useState<SMSAlert[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP_INFO);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [ownerSubscription, setOwnerSubscription] = useState<{
    status: string;
    plan: string;
    date: number;
  } | null>(null);
  const [ownerSubLoading, setOwnerSubLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Public Guest invoice sharing states
  const [publicSale, setPublicSale] = useState<Sale | null>(null);
  const [publicShop, setPublicShop] = useState<ShopInfo | null>(null);
  const [publicLoading, setPublicLoading] = useState<boolean>(false);
  const [publicError, setPublicError] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Custom states for generating and viewing public receipt PNG images natively
  const [publicInvoicePng, setPublicInvoicePng] = useState<string>('');
  const [isGeneratingPublicPng, setIsGeneratingPublicPng] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'png' | 'html'>('png');
  const publicMemoRef = useRef<HTMLDivElement>(null);

  // States for generating and downloading PNG invoice images
  const [generatedPNG, setGeneratedPNG] = useState<string>('');
  const [isGeneratingPNG, setIsGeneratingPNG] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const memoRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

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

  // Generate high-resolution PNG of the invoice for direct client display
  useEffect(() => {
    if (isInvoiceQuery && publicSale && !publicLoading) {
      const generatePng = async () => {
        // Wait a small delay to ensure React has fully rendered the offscreen DOM
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (publicMemoRef.current) {
          try {
            const dataUrl = await toPng(publicMemoRef.current, {
              quality: 1.0,
              pixelRatio: 2, // 2x ratio for high-density, crystal-clear mobile viewing!
              backgroundColor: '#ffffff',
            });
            setPublicInvoicePng(dataUrl);
            setIsGeneratingPublicPng(false);
          } catch (err) {
            console.error('Failed to generate public invoice PNG:', err);
            // On failure, fallback to HTML view so user is never stuck!
            setIsGeneratingPublicPng(false);
            setViewMode('html');
          }
        }
      };
      generatePng();
    }
  }, [isInvoiceQuery, publicSale, publicLoading]);

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
          const emailPrefix = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') : '';
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          const defaultUsername = `${emailPrefix || 'user'}_${randomSuffix}`.toLowerCase().substring(0, 15);

          const inviteDoc = await getDoc(doc(db, 'invitations', user.email?.toLowerCase() || ''));
          if (inviteDoc.exists()) {
            const inviteData = inviteDoc.data();
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              username: defaultUsername,
              role: inviteData.role,
              shopId: inviteData.shopId,
              name: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            await deleteDoc(doc(db, 'invitations', user.email!.toLowerCase()));
            // onSnapshot will trigger again with the new data
          } else {
            // Create as fresh owner
            let pendingPlan = 'basic';
            try {
              pendingPlan = localStorage.getItem('dokan_pending_subscription_plan') || 'basic';
            } catch {}
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              username: defaultUsername,
              role: 'owner',
              shopId: user.uid,
              name: user.displayName || '',
              subscriptionPlan: pendingPlan,
              subscriptionStatus: 'pending',
              subscriptionDate: 0
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            try {
              localStorage.removeItem('dokan_pending_subscription_plan');
            } catch {}
            // onSnapshot will trigger again
          }
        } catch (error) {
          console.error("Profile Creation Error:", error);
          setProfileLoading(false);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setProfileLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Listen to owner's subscription status if the current logged in user is a staff
  useEffect(() => {
    if (!userProfile || userProfile.role === 'owner' || !userProfile.shopId) {
      setOwnerSubscription(null);
      setOwnerSubLoading(false);
      return;
    }
    setOwnerSubLoading(true);
    const ownerDocRef = doc(db, 'users', userProfile.shopId);
    return onSnapshot(ownerDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOwnerSubscription({
          status: data.subscriptionStatus || 'active',
          plan: data.subscriptionPlan || 'standard',
          date: data.subscriptionDate || Date.now()
        });
      }
      setOwnerSubLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userProfile.shopId}`);
      setOwnerSubLoading(false);
    });
  }, [userProfile]);

  // Listen to Shop Info
  useEffect(() => {
    if (!userProfile?.shopId) return;
    return onSnapshot(doc(db, 'shops', userProfile.shopId), (doc) => {
      if (doc.exists()) {
        setShopInfo(doc.data() as ShopInfo);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `shops/${userProfile.shopId}`);
    });
  }, [userProfile?.shopId]);

  // Listen to Products
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'products'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(pData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });
  }, [userProfile?.shopId]);

  // Listen to Customers
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'customers'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(cData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
    });
  }, [userProfile?.shopId]);

  // Listen to Service Jobs
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'service_jobs'), 
      where('shopId', '==', userProfile.shopId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const svData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceJob));
      setServiceJobs(svData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'service_jobs');
    });
  }, [userProfile?.shopId]);

  // Listen to RMA
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'rma'), 
      where('shopId', '==', userProfile.shopId),
      orderBy('warrantyDate', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const rData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RMA));
      setRmas(rData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rma');
    });
  }, [userProfile?.shopId]);

  // Listen to Staff (Users collection)
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'users'), 
      where('shopId', '==', userProfile.shopId)
    );
    return onSnapshot(q, (snapshot) => {
      const sData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setStaff(sData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
  }, [userProfile?.shopId]);

  // Listen to Warehouses
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'warehouses'), 
      where('shopId', '==', userProfile.shopId)
    );
    return onSnapshot(q, (snapshot) => {
      const wData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse));
      wData.sort((a, b) => b.createdAt - a.createdAt);
      setWarehouses(wData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'warehouses');
    });
  }, [userProfile?.shopId]);

  // Listen to Warehouse Stocks
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'warehouse_stocks'), 
      where('shopId', '==', userProfile.shopId)
    );
    return onSnapshot(q, (snapshot) => {
      const wsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WarehouseStock));
      setWarehouseStocks(wsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'warehouse_stocks');
    });
  }, [userProfile?.shopId]);

  // Listen to Warehouse Transfers
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'warehouse_transfers'), 
      where('shopId', '==', userProfile.shopId)
    );
    return onSnapshot(q, (snapshot) => {
      const wtData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WarehouseTransfer));
      wtData.sort((a, b) => b.timestamp - a.timestamp);
      setWarehouseTransfers(wtData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'warehouse_transfers');
    });
  }, [userProfile?.shopId]);

  // Listen to SMS Alerts
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(
      collection(db, 'sms_alerts'), 
      where('shopId', '==', userProfile.shopId)
    );
    return onSnapshot(q, (snapshot) => {
      const smsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SMSAlert));
      smsData.sort((a, b) => b.timestamp - a.timestamp);
      setSmsAlerts(smsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sms_alerts');
    });
  }, [userProfile?.shopId]);

  // Listen to add-to-inventory-direct custom event
  useEffect(() => {
    if (!userProfile) return;
    const handleAddInventoryDirect = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.productName) return;
      const matchedProduct = products.find(p => 
        p.name.toLowerCase().includes(detail.productName.toLowerCase())
      );
      if (matchedProduct) {
        await handleUpdateProduct({
          ...matchedProduct,
          stock: matchedProduct.stock + (detail.quantity || 1)
        });
      } else {
        await handleAddProduct({
          name: detail.productName,
          price: 150,
          purchasePrice: 100,
          stock: detail.quantity || 1,
          minStockLevel: 5,
          category: 'General',
          unit: 'pcs',
          warranty: 'No warranty'
        });
      }
    };
    window.addEventListener('add-to-inventory-direct', handleAddInventoryDirect);
    return () => window.removeEventListener('add-to-inventory-direct', handleAddInventoryDirect);
  }, [products, userProfile]);

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'shopId'>) => {
    if (!userProfile) return;
    if (userProfile.role !== 'owner' && userProfile.role !== 'inventory_manager') {
      alert(lang === 'bn' ? 'শুধুমাত্র মালিক এবং ম্যানেজার প্রোডাক্ট যোগ করতে পারবেন।' : 'Only owner and manager can add products.');
      return;
    }
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
    if (userProfile.role !== 'owner' && userProfile.role !== 'inventory_manager') {
      alert(lang === 'bn' ? 'শুধুমাত্র মালিক এবং ম্যানেজার প্রোডাক্ট এডিট করতে পারবেন।' : 'Only owner and manager can update products.');
      return;
    }
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
    if (userProfile.role !== 'owner' && userProfile.role !== 'inventory_manager') {
      alert(lang === 'bn' ? 'শুধুমাত্র মালিক এবং ম্যানেজার প্রোডাক্ট ডিলিট করতে পারবেন।' : 'Only owner and manager can delete products.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!userProfile || userProfile.role !== 'owner') {
      alert(lang === 'bn' ? 'শুধুমাত্র শপ অনার বিক্রির হিসাব ডিলিট করতে পারবেন।' : 'Only shop owner can delete sales records.');
      return;
    }
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
    if (!userProfile || userProfile.role !== 'owner') {
      alert(lang === 'bn' ? 'শুধুমাত্র শপ অনার কাস্টমার ডিলিট করতে পারবেন।' : 'Only shop owner can delete customer profiles.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  // Service Jobs CRUD handlers
  const handleAddServiceJob = async (newJob: Omit<ServiceJob, 'id' | 'shopId' | 'createdAt'>) => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'service_jobs'), {
        ...newJob,
        shopId: userProfile.shopId,
        createdAt: Date.now()
      });
      showToast(lang === 'bn' ? 'সার্ভিসিং জব সফলভাবে যোগ করা হয়েছে' : 'Service job added successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'service_jobs');
    }
  };

  const handleUpdateServiceJob = async (id: string, updates: Partial<ServiceJob>) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'service_jobs', id), updates);
      showToast(lang === 'bn' ? 'সার্ভিসিং জব আপডেট করা হয়েছে' : 'Service job updated successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `service_jobs/${id}`);
    }
  };

  const handleDeleteServiceJob = async (id: string) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, 'service_jobs', id));
      showToast(lang === 'bn' ? 'সার্ভিসিং জব মুছে ফেলা হয়েছে' : 'Service job removed', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `service_jobs/${id}`);
    }
  };

  // RMA (Return Merchandise Authorization) CRUD handlers
  const handleAddRma = async (newRma: Omit<RMA, 'id' | 'shopId' | 'warrantyDate'>) => {
    if (!userProfile) return;
    try {
      await addDoc(collection(db, 'rma'), {
        ...newRma,
        shopId: userProfile.shopId,
        warrantyDate: Date.now()
      });
      showToast(lang === 'bn' ? 'নতুন ওয়ারেন্টি RMA ট্র্যাকার যোগ করা হয়েছে' : 'Warranty RMA tracker initialized successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rma');
    }
  };

  const handleUpdateRma = async (id: string, updates: Partial<RMA>) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'rma', id), updates);
      showToast(lang === 'bn' ? 'RMA ওয়ারেন্টি তথ্য আপডেট করা হয়েছে' : 'RMA warranty claim successfully updated', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rma/${id}`);
    }
  };

  const handleDeleteRma = async (id: string) => {
    if (!userProfile) return;
    try {
      await deleteDoc(doc(db, 'rma', id));
      showToast(lang === 'bn' ? 'RMA ওয়ারেন্টি ডিলিট করা হয়েছে' : 'RMA warranty claim deleted', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rma/${id}`);
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

  const handleCompleteSale = async (
    items: SaleItem[], 
    discount: number, 
    customerInfo?: { name: string; phone: string; address: string; saveToDatabase?: boolean },
    paymentDetails?: {
      paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'qr';
      pointsEarned: number;
      pointsRedeemed: number;
      discountType: 'percentage' | 'fixed' | 'promo' | 'loyalty';
      promoCode?: string;
      digitalReceiptSent?: boolean;
      receiptSentType?: 'sms' | 'email';
      receiptSentValue?: string;
      offline?: boolean;
      isEMI?: boolean;
      emiDetails?: EMIDetails;
      salesmanId?: string;
      salesmanName?: string;
      commissionAmount?: number;
    }
  ) => {
    if (!userProfile) return;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const payableAmount = Math.max(0, totalAmount - discount);
    
    // Sanitize items - remove undefined fields (like warranty)
    const sanitizedItems = items.map(item => JSON.parse(JSON.stringify(item)));

    const isEmiTx = !!paymentDetails?.isEMI;
    const emiDetails = paymentDetails?.emiDetails;
    const dueAmount = isEmiTx && emiDetails ? Math.max(0, payableAmount - emiDetails.downPayment) : 0;
    const paymentStatus = isEmiTx ? 'partially_paid' : 'paid';

    // Create Sale record
    const saleData = {
      timestamp: Date.now(),
      items: sanitizedItems,
      totalAmount,
      discount,
      payableAmount,
      dueAmount,
      paymentStatus,
      customerName: customerInfo?.name || '',
      customerPhone: customerInfo?.phone || '',
      customerAddress: customerInfo?.address || '',
      shopId: userProfile.shopId,
      createdBy: userProfile.uid,
      // Advanced checkout fields
      paymentMethod: paymentDetails?.paymentMethod || 'cash',
      pointsEarned: paymentDetails?.pointsEarned || 0,
      pointsRedeemed: paymentDetails?.pointsRedeemed || 0,
      discountType: paymentDetails?.discountType || 'fixed',
      promoCode: paymentDetails?.promoCode || '',
      digitalReceiptSent: paymentDetails?.digitalReceiptSent || false,
      receiptSentType: paymentDetails?.receiptSentType || '',
      receiptSentValue: paymentDetails?.receiptSentValue || '',
      offline: paymentDetails?.offline || false,
      isEMI: isEmiTx,
      emiDetails: isEmiTx ? emiDetails : null,
      salesmanId: paymentDetails?.salesmanId || '',
      salesmanName: paymentDetails?.salesmanName || '',
      commissionAmount: paymentDetails?.commissionAmount || 0
    };

    let completedSale: Sale | undefined;
    try {
      try {
        const docRef = await addDoc(collection(db, 'sales'), saleData);
        completedSale = { id: docRef.id, ...saleData } as Sale;
        setLastSale(completedSale);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'sales-completion-create-sale');
        return;
      }
      
      // Update stock 
      for (const item of items) {
        const productRef = doc(db, 'products', item.productId);
        try {
          await updateDoc(productRef, {
            stock: increment(-item.quantity)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `sales-completion-update-stock-${item.productId}`);
          return;
        }
      }

      // Update Customer Stats
      if (customerInfo?.phone) {
        const existingCustomer = customers.find(c => c.phone === customerInfo.phone);
        const earnedPoints = paymentDetails?.pointsEarned || 0;
        const redeemedPoints = paymentDetails?.pointsRedeemed || 0;
        const pointsDelta = earnedPoints - redeemedPoints;

        if (existingCustomer) {
          try {
            await updateDoc(doc(db, 'customers', existingCustomer.id), {
              totalSales: increment(payableAmount),
              lastPurchaseDate: Date.now(),
              address: customerInfo.address || existingCustomer.address,
              name: customerInfo.name || existingCustomer.name,
              points: increment(pointsDelta),
              totalDue: increment(dueAmount)
            });
         } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `sales-completion-update-customer-${existingCustomer.id}`);
            return;
          }
        } else if (customerInfo.saveToDatabase) {
          try {
            await addDoc(collection(db, 'customers'), {
              name: customerInfo.name || 'Anonymous',
              phone: customerInfo.phone,
              address: customerInfo.address || '',
              totalSales: payableAmount,
              lastPurchaseDate: Date.now(),
              shopId: userProfile.shopId,
              points: earnedPoints,
              totalDue: dueAmount
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'sales-completion-create-customer');
            return;
          }
        }
      }
      return completedSale;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales-completion-batch-fallback');
    }
  };

  // Render Public Guest Invoice view if "invoice" URL search param is present
  if (isInvoiceQuery) {
    if (publicLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
          <Loader2 className="animate-spin text-amber-500" size={40} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            {lang === 'bn' ? 'ডিজিটাল ইনভয়েস লোড হচ্ছে...' : 'Loading Digital Invoice...'}
          </p>
        </div>
      );
    }

    if (publicError || !publicSale) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
          <div className="w-16 h-16 bg-red-950/40 text-red-400 rounded-3xl flex items-center justify-center mb-4 border border-red-900/40 shadow-sm animate-pulse">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-slate-200 mb-2">
            {publicError || (lang === 'bn' ? 'ইনভয়েসটি পাওয়া যায়নি' : 'Invoice Not Found')}
          </h2>
          <p className="text-slate-400 max-w-md text-sm mb-6">
            {lang === 'bn' 
              ? 'অনুগ্রহ করে নিশ্চিত হোন যে আপনার কিউআর কোড লিংকটি সঠিক অথবা আমাদের সাপোর্ট নাম্বারে যোগাযোগ করুন।' 
              : 'Please make sure your QR Code link is correct, or contact support for assistance.'}
          </p>
          <a 
            href="/"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 rounded-2xl font-black text-sm italic tracking-wide transition-all shadow-lg"
          >
            {lang === 'bn' ? 'হোম পেজে যান' : 'Go to Homepage'}
          </a>
        </div>
      );
    }


    const currentShop = publicShop || shopInfo || DEFAULT_SHOP_INFO;
    const accentColor = currentShop.accentColor || '#4f46e5';

    const handleCopyLink = () => {
      try {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        showToast(
          lang === 'bn' 
            ? 'ইনভয়েস লিংকটি সফলভাবে কপি করা হয়েছে! 📋' 
            : 'Invoice link copied to clipboard! 📋'
        );
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    };

    const handlePrintInvoice = () => {
      window.print();
      showToast(
        lang === 'bn' 
          ? 'মেমো প্রিন্ট করার নির্দেশ পাঠানো হয়েছে! 🖨️' 
          : 'Print command initiated successfully! 🖨️'
      );
    };

    const handleDownloadPng = async () => {
      let pngUrl = publicInvoicePng;
      if (!pngUrl && publicMemoRef.current) {
        try {
          pngUrl = await toPng(publicMemoRef.current, {
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
          });
          setPublicInvoicePng(pngUrl);
        } catch (err) {
          console.error("Failed to generate PNG on download trigger:", err);
        }
      }
      if (!pngUrl) {
        alert(lang === 'bn' ? 'দুঃখিত, ইমেজ সংস্করণ প্রস্তুত হচ্ছে। অনুগ্রহ করে ২ সেকেন্ড পর আবার চেষ্টা করুন।' : 'Sorry, the image version is still preparing. Please try again in 2 seconds.');
        return;
      }
      const link = document.createElement('a');
      link.download = `Invoice-${publicSale.id.slice(0, 8).toUpperCase()}.png`;
      link.href = pngUrl;
      link.click();
      showToast(
        lang === 'bn' 
          ? 'মেমো পিকচার সফলভাবে ডাউনলোড হয়েছে! 📥' 
          : 'Invoice image downloaded successfully! 📥'
      );
    };

    return (
      <div className="min-h-screen bg-slate-950 py-8 px-4 font-sans relative antialiased selection:bg-indigo-500 selection:text-white">
        
        {/* Hidden Container - absolutely required to generate the crisp PNG of the receipt */}
        <div className="absolute top-0 left-[-9999px] select-none pointer-events-none" style={{ width: '640px' }}>
          <div ref={publicMemoRef} className="bg-white p-8 font-sans text-sm relative" style={{ width: '640px' }}>
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.10] z-0">
              <img 
                src={currentShop.logoUrl || AR_LOGO_BASE64} 
                alt="Watermark Logo" 
                className="w-4/5 h-auto object-contain grayscale animate-pulse"
              />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="relative mb-6 pb-4 border-b-2 flex justify-between items-start gap-6 animate-fadeIn" style={{ borderColor: `${accentColor}20` }}>
                <div>
                  <div className="w-14 h-14 bg-slate-50 rounded-[16px] flex items-center justify-center p-1.5 border border-slate-100 shadow-sm ring-4 ring-slate-100/50 mb-3 overflow-hidden">
                    {currentShop.logoUrl ? (
                      <img src={currentShop.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-extrabold text-lg select-none bg-slate-100">
                        {currentShop.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1" style={{ color: accentColor }}>{currentShop.name}</h1>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-relaxed pr-6">{currentShop.address}</p>
                </div>

                <div className="text-right mt-2 flex flex-col gap-1 items-end">
                  <div className="text-white font-extrabold text-[10px] tracking-widest px-3 py-1 rounded-lg w-fit" style={{ backgroundColor: accentColor }}>
                    {lang === 'bn' ? 'ক্যাশ মেমো' : 'CASH MEMO'}
                  </div>
                  <div className="mt-2 text-slate-600 font-bold text-[10px] italic">
                    {lang === 'bn' ? 'ইনভয়েস নং' : 'Invoice'}: #{publicSale.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                    {format(new Date(publicSale.timestamp), 'dd MMMM yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[9px] font-black uppercase tracking-widest block mb-1" style={{ color: accentColor }}>{lang === 'bn' ? 'ক্রেতার বিবরণ' : 'Customer Details'}</span>
                {publicSale.customerName ? (
                  <p className="text-base font-black text-slate-800 leading-none uppercase">{publicSale.customerName}</p>
                ) : (
                  <p className="text-base font-extrabold text-slate-400 leading-none italic">{lang === 'bn' ? 'বেনামী ক্রেতা' : 'Anonymous Customer'}</p>
                )}
                {publicSale.customerPhone && <p className="text-xs text-slate-500 font-bold">{lang === 'bn' ? 'ফোন' : 'Mobile'}: {publicSale.customerPhone}</p>}
                {publicSale.customerAddress && <p className="text-[11px] text-slate-400 leading-relaxed italic mt-0.5">{publicSale.customerAddress}</p>}
              </div>

              {/* Table */}
              <div className="mb-6 rounded-2xl border-2 overflow-hidden" style={{ borderColor: accentColor }}>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-white animate-fadeIn" style={{ backgroundColor: accentColor }}>
                      <th className="px-3 py-2 text-left italic font-black uppercase border-r" style={{ borderColor: `${accentColor}15` }}>#</th>
                      <th className="px-4 py-2 text-left italic font-black uppercase border-r" style={{ borderColor: `${accentColor}15` }}>{lang === 'bn' ? 'বিবরণ' : 'Description'}</th>
                      <th className="px-3 py-2 text-center italic font-black uppercase border-r" style={{ borderColor: `${accentColor}15` }}>{lang === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                      <th className="px-4 py-2 text-right italic font-black uppercase border-r" style={{ borderColor: `${accentColor}15` }}>{lang === 'bn' ? 'দর' : 'Rate'}</th>
                      <th className="px-4 py-2 text-right italic font-black uppercase">{lang === 'bn' ? 'মোট' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: `${accentColor}20` }}>
                    {publicSale.items.map((item, idx) => {
                      const rate = item.total / item.quantity;
                      return (
                        <tr key={idx} className="bg-white">
                          <td className="px-3 py-2 font-bold text-slate-500 border-r border-slate-100">{idx + 1}</td>
                          <td className="px-4 py-2 border-r border-slate-100">
                            <p className="font-extrabold text-slate-900 text-sm leading-tight uppercase">{item.productName}</p>
                            {item.warranty && (
                              <p className="text-[9px] font-black text-rose-500 mt-0.5 italic tracking-tight uppercase">🛡️ {lang === 'bn' ? 'ওয়ারেন্টি' : 'Warranty'}: {item.warranty}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-extrabold text-slate-700 border-r border-slate-100">{item.quantity}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-700 border-r border-slate-100">{formatCurrency(rate)}</td>
                          <td className="px-4 py-2 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2" style={{ borderColor: accentColor }}>
                      <td colSpan={2} className="px-4 py-2.5 text-right text-[10px] font-black italic uppercase border-r border-slate-100">{lang === 'bn' ? 'মোট পণ্য সংখ্যা' : 'No of Items'}:</td>
                      <td className="px-3 py-2.5 text-center font-black border-r border-slate-100 text-slate-800">{publicSale.items.length}</td>
                      <td className="px-4 py-2.5 text-right text-[10px] font-black italic uppercase border-r border-slate-100">{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}:</td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-900">{formatCurrency(publicSale.totalAmount)}</td>
                    </tr>
                    {(publicSale.discount || 0) > 0 && (
                      <tr className="bg-slate-50">
                        <td colSpan={4} className="px-4 py-2 text-right text-[10px] font-black italic uppercase border-r border-slate-100">{lang === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}:</td>
                        <td className="px-4 py-2 text-right font-black text-red-500">- {formatCurrency(publicSale.discount)}</td>
                      </tr>
                    )}
                    <tr className="text-white" style={{ backgroundColor: accentColor }}>
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black italic uppercase tracking-wider">{lang === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Payable Total'}:</td>
                      <td className="px-4 py-3 text-right font-black text-amber-300">{formatCurrency(publicSale.payableAmount || (publicSale.totalAmount - (publicSale.discount || 0)))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Policy & Signatures */}
              <div className="mt-12 grid grid-cols-2 gap-8 text-center text-slate-900">
                <div>
                  <div className="border-t pt-1.5" style={{ borderColor: `${accentColor}20` }}>
                    <p className="text-[9px] font-black uppercase tracking-widest italic">{lang === 'bn' ? 'ক্রেতার স্বাক্ষর' : 'Customer Signature'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-2xl font-normal text-blue-900 tracking-tighter transform -rotate-2 select-none h-8 opacity-90" style={{ fontFamily: '"Great Vibes", cursive' }}>
                    Rabbi
                  </p>
                  <div className="border-t-2 pt-1.5 w-full" style={{ borderColor: accentColor }}>
                    <p className="text-[9px] font-black uppercase tracking-widest italic">{lang === 'bn' ? 'কর্তৃপক্ষের স্বাক্ষর' : 'Authority Signature'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] text-slate-500">
                <p className="italic uppercase font-medium max-w-[340px] text-left">
                  {lang === 'bn' 
                    ? 'ক্রয়কৃত পণ্য ক্রয়ের ৭ দিনের মধ্যে ওয়ারেন্টি এবং পরিবর্তনের যোগ্য। মেমো অবশ্যই প্রদর্শন করতে হবে।'
                    : 'Warranty within 7 days of purchase only with original invoice.'}
                </p>
                <div className="text-right">
                  <p className="font-bold text-slate-700">{lang === 'bn' ? 'আমাদের দোকানে কেনাকাটার জন্য ধন্যবাদ।' : 'Thank you for shopping with us!'}</p>
                  <p className="text-[8px] tracking-wider text-slate-400 uppercase mt-0.5">ORIGINAL SECURED MEMO</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Multi-Mode Client Interface */}
        {viewMode === 'png' ? (
          <div className="max-w-md mx-auto space-y-4">
            {/* Header branding */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                {currentShop.logoUrl ? (
                  <img src={currentShop.logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded-md" referrerPolicy="no-referrer" />
                ) : (
                  <Sparkles className="shrink-0" size={16} style={{ color: accentColor }} />
                )}
                <span className="font-black text-xs text-slate-300 tracking-wider">
                  {currentShop.name}
                </span>
              </div>
              <button 
                onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-extrabold text-slate-200 rounded-xl transition-all"
              >
                {lang === 'bn' ? 'English' : 'বাংলা'}
              </button>
            </div>

            {/* Core Box containing PNG preview and instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
              {/* Top Banner */}
              <div className="w-full flex justify-between items-center mb-4 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl">
                <div className="flex items-center gap-2" style={{ color: accentColor }}>
                  <CheckCircle2 className="shrink-0" size={14} />
                  <p className="text-[9px] font-black uppercase tracking-wider">
                    {lang === 'bn' ? 'মেমো ইমেজ (PNG)' : 'MEMO IMAGE (PNG)'}
                  </p>
                </div>
                <div className="text-[9px] font-mono font-bold" style={{ color: accentColor }}>
                  ID: #{publicSale.id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              {/* Guide */}
              <p className="text-xs text-slate-300 font-medium text-center mb-5 leading-relaxed max-w-sm">
                {lang === 'bn' 
                  ? 'নিচের বোতাম চেপে মোবাইলে ক্যাশ মেমোটির ছবি ডাউনলোড করুন অথবা ছবির উপর কিছুক্ষণ চাপ দিয়ে ধরে রাখতে পারেন।' 
                  : 'Tap download below to save the invoice, or press and hold the picture to save/share.'}
              </p>

              {/* Crisp PNG Viewer */}
              <div className="w-full bg-white rounded-2xl overflow-hidden shadow-2xl ring-4 ring-black/40 relative max-h-[60vh] overflow-y-auto min-h-[300px] flex items-center justify-center">
                {publicInvoicePng ? (
                  <img 
                    src={publicInvoicePng} 
                    alt={`${currentShop.name} Invoice PNG`} 
                    className="w-full h-auto object-contain cursor-zoom-in animate-fadeIn"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8 text-center text-slate-800">
                    <Loader2 className="animate-spin text-[#9b59b6]" size={36} />
                    <p className="text-sm font-black animate-pulse leading-snug">
                      {lang === 'bn' ? 'সরাসরি ক্যাশ মেমো ছবি প্রস্তুত হচ্ছে...' : 'Generating direct crisp cash memo...'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">A.R Enterprise Engine</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-6 space-y-3">
                <button 
                  onClick={handleDownloadPng}
                  className="w-full py-4 text-white hover:scale-[1.01] active:scale-95 rounded-2xl font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Download size={16} />
                  {lang === 'bn' ? 'মেমো পিকচার লাভ করুন (PNG)' : 'Download Receipt Image'}
                </button>
                
                <button 
                  onClick={() => setViewMode('html')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <Globe size={14} />
                  {lang === 'bn' ? 'ডিজিটাল ওয়েব সংস্করণ দেখুন' : 'Switch to Digital Web View'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* High-density HTML interactive web view */
          <div className="max-w-2xl mx-auto space-y-4">
            
            {/* Nav containing switches/actions */}
            <div className="flex items-center justify-between px-2 print:hidden" id="verified-memo-nav">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={currentShop.logoUrl || AR_LOGO_BASE64} alt="Shop Logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                </div>
                <span className="font-extrabold text-xs text-slate-300 tracking-tight">{currentShop.name}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleDownloadPng}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Download size={14} />
                  {lang === 'bn' ? 'ডাউনলোড' : 'Download PNG'}
                </button>
                <button 
                  onClick={() => setViewMode('png')}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-black flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Image size={14} />
                  {lang === 'bn' ? 'ছবি মোড' : 'Image Mode'}
                </button>
                <button 
                  onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {lang === 'bn' ? 'English' : 'বাংলা'}
                </button>
                <button 
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer ${
                    copiedLink 
                      ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Share2 size={13} />
                  {copiedLink ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'শেয়ার' : 'Share')}
                </button>
                <button 
                  onClick={handlePrintInvoice}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl active:scale-95 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm border border-slate-700 cursor-pointer"
                >
                  <Printer size={13} />
                  {lang === 'bn' ? 'প্রিন্ট' : 'Print'}
                </button>
              </div>
            </div>

            {/* Document wrapper */}
            <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-900 print:shadow-none print:border-none relative animate-fadeIn">
              
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-500/20 px-6 md:px-8 py-3 flex items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <p className="uppercase tracking-wider">
                    {lang === 'bn' ? 'অফিসিয়াল ডিজিটাল ভেরিফাইড মেমো' : 'Official Digitally Verified Memo'}
                  </p>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
                  VERIFIED
                </div>
              </div>

              <div className="p-8 md:p-12 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.10] print:opacity-[0.12] z-0">
                  <img 
                    src={currentShop.logoUrl || AR_LOGO_BASE64} 
                    alt="Watermark Logo" 
                    className="w-4/5 h-auto object-contain grayscale"
                  />
                </div>

                <div className="relative z-10 text-slate-900">
                  {/* Header */}
                  <div className="relative mb-8 pb-6 border-b-2 border-slate-900/10 flex flex-col sm:flex-row justify-between items-start gap-6">
                    <div>
                      <div className="w-16 h-16 bg-slate-50 rounded-[20px] flex items-center justify-center p-1.5 border border-slate-100 shadow-md ring-4 ring-slate-100/50 mb-4 overflow-hidden">
                        <img src={currentShop.logoUrl || AR_LOGO_BASE64} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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

                  {/* Customer details */}
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

                  {/* Table */}
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
                          <td colSpan={2} className="px-6 py-3.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">{lang === 'bn' ? 'মোট পণ্য সংখ্যা' : 'No of Items'}:</td>
                          <td className="px-4 py-3.5 text-center font-black border-r border-slate-100 text-slate-800">{publicSale.items.length}</td>
                          <td className="px-6 py-3.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">{lang === 'bn' ? 'সাবটোটাল' : 'Subtotal'}:</td>
                          <td className="px-6 py-3.5 text-right font-black text-slate-900 text-base">{formatCurrency(publicSale.totalAmount)}</td>
                        </tr>
                        {(publicSale.discount || 0) > 0 && (
                          <tr className="bg-slate-50">
                            <td colSpan={4} className="px-6 py-2.5 text-right text-xs font-black italic uppercase tracking-wider border-r border-slate-100">{lang === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}:</td>
                            <td className="px-6 py-2.5 text-right font-black text-red-500 text-base">- {formatCurrency(publicSale.discount)}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-900 text-white">
                          <td colSpan={4} className="px-6 py-4 text-right text-xs font-black italic uppercase leading-none tracking-widest">{lang === 'bn' ? 'পরিশোধযোগ্য মোট' : 'Payable Total'}:</td>
                          <td className="px-6 py-4 text-right font-black text-xl whitespace-nowrap leading-none text-amber-300">{formatCurrency(publicSale.payableAmount || (publicSale.totalAmount - (publicSale.discount || 0)))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Signatures */}
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
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl max-w-sm w-max print:hidden"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={13} />
              </div>
              <p className="text-xs font-bold leading-tight tracking-wide">{toast.message}</p>
              <button 
                onClick={() => setToast(null)}
                className="ml-2 text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (profileLoading || (userProfile && userProfile.role !== 'owner' && ownerSubLoading)) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const isOwner = userProfile?.role === 'owner';
  const subStatus = isOwner ? userProfile?.subscriptionStatus : (ownerSubscription?.status || 'active');
  const subPlan = isOwner ? userProfile?.subscriptionPlan : (ownerSubscription?.plan || 'standard');
  const subDate = isOwner ? userProfile?.subscriptionDate : (ownerSubscription?.date || Date.now());

  const hasTrialPassed = subStatus === 'trial' && (Date.now() - (subDate || 0)) > 3 * 24 * 60 * 60 * 1000;
  const isBlocked = userProfile && (!subStatus || subStatus === 'pending' || hasTrialPassed);

  if (isBlocked) {
    if (isOwner) {
      return (
        <Auth>
          <SubscriptionGate 
            userProfile={userProfile!} 
            lang={lang} 
            onActivated={() => {
              showToast(lang === 'bn' ? 'সাবস্ক্রিপশন সফলভাবে সচল করা হয়েছে!' : 'Subscription activated successfully!', 'success');
            }} 
          />
        </Auth>
      );
    } else {
      return (
        <Auth>
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
            <div className="z-10 w-full max-w-md bg-slate-950/80 border border-slate-805 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {lang === 'bn' ? 'দোকানের সাবস্ক্রিপশন মেয়াদোত্তীর্ণ!' : 'Shop Subscription Expired'}
                </h3>
                <p className="text-slate-400 text-xs mt-2 font-semibold leading-relaxed">
                  {lang === 'bn' 
                    ? 'আপনার এ.আর এন্টারপ্রাইজের মালিকের সাবস্ক্রিপশনের মেয়াদ শেষ হয়ে গিয়েছে। ড্যাশবোর্ডে প্রবেশ করতে অনুগ্রহ করে দোকানের মলিকের সাথে যোগাযোগ করুন।' 
                    : 'Your shop owner subscription package has expired. To access standard POS list features, please contact your store owner/administrator to renew.'}
                </p>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-700"
              >
                {lang === 'bn' ? 'লগআউট করুন' : 'Log Out'}
              </button>
            </div>
          </div>
        </Auth>
      );
    }
  }

  return (
    <Auth>
      <Layout 
        activeView={activeView} 
        onViewChange={setActiveView} 
        userProfile={userProfile}
        lang={lang}
        onLanguageChange={setLang}
        shopInfo={shopInfo}
        onUpdateShopInfo={handleUpdateShopInfo}
        onUpgradeClick={() => setShowUpgradeModal(true)}
        appTheme={appTheme}
        onAppThemeChange={setAppTheme}
      >
        {activeView === 'dashboard' && <Dashboard products={products} sales={sales} lang={lang} />}
        {activeView === 'pos' && (
          <POS 
            products={products} 
            customers={customers} 
            shopInfo={shopInfo}
            onCompleteSale={handleCompleteSale} 
            lang={lang}
            staff={staff}
            appTheme={appTheme}
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
            onUpgradeClick={() => setShowUpgradeModal(true)}
          />
        )}
        {activeView === 'staff' && userProfile && (
           <StaffManagement userProfile={userProfile} lang={lang} />
        )}
        {activeView === 'servicing' && (
           <Servicing 
            jobs={serviceJobs}
            onAddJob={handleAddServiceJob}
            onUpdateJob={handleUpdateServiceJob}
            onDeleteJob={handleDeleteServiceJob}
            lang={lang}
           />
        )}
        {activeView === 'rma' && (
           <RMAManager 
            rmas={rmas}
            onAddRma={handleAddRma}
            onUpdateRma={handleUpdateRma}
            onDeleteRma={handleDeleteRma}
            lang={lang}
           />
        )}
        {activeView === 'warehouses' && (
          <Warehouses 
            products={products}
            warehouses={warehouses}
            warehouseStocks={warehouseStocks}
            warehouseTransfers={warehouseTransfers}
            showToast={showToast}
            lang={lang}
            userProfile={userProfile!}
          />
        )}
        {activeView === 'commissions' && (
          <Commissions 
            sales={sales}
            staff={staff}
            showToast={showToast}
            lang={lang}
            userProfile={userProfile!}
          />
        )}
        {activeView === 'smartsearch' && (
          <SmartSearch 
            sales={sales}
            serviceJobs={serviceJobs}
            rmas={rmas}
            lang={lang}
          />
        )}
      </Layout>

      <GeminiAssistant products={products} sales={sales} lang={lang} />

      {lastSale && (
        <Receipt sale={lastSale} shopInfo={shopInfo} onClose={() => setLastSale(null)} lang={lang} />
      )}

      {/* Subscription Upgrade Overlay Modal */}
      <AnimatePresence>
        {showUpgradeModal && userProfile && (
          <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-4xl relative"
            >
              <SubscriptionGate 
                userProfile={userProfile} 
                lang={lang} 
                onActivated={() => {
                  setShowUpgradeModal(false);
                  showToast(lang === 'bn' ? 'সাবস্ক্রিপশন সফলভাবে সচল করা হয়েছে!' : 'Subscription activated successfully!', 'success');
                }}
                onClose={() => setShowUpgradeModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Auth>
  );
}

