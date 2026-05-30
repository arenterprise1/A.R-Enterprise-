/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
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
import Receipt from './components/Receipt';
import GeminiAssistant from './components/GeminiAssistant';
import { Product, Sale, View, SaleItem, ShopInfo, Customer, UserProfile } from './types';
import { Language, translations } from './translations';

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'এ.আর এন্টারপ্রাইজ',
  address: 'মিরপুর, ঢাকা',
  phone: '০১৭XXXXXXXX',
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [lang, setLang] = useState<Language>('bn');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP_INFO);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const user = auth.currentUser;
  const t = translations[lang];

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
          const inviteDoc = await getDoc(doc(db, 'invitations', user.email?.toLowerCase() || ''));
          if (inviteDoc.exists()) {
            const inviteData = inviteDoc.data();
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              role: inviteData.role,
              shopId: inviteData.shopId,
              name: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            await deleteDoc(doc(db, 'invitations', user.email!.toLowerCase()));
            // onSnapshot will trigger again with the new data
          } else {
            // Create as fresh owner
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email!,
              role: 'owner',
              shopId: user.uid,
              name: user.displayName || ''
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            // onSnapshot will trigger again
          }
        } catch (error) {
          console.error("Profile Creation Error:", error);
          setProfileLoading(false);
        }
      }
    });

    return () => unsub();
  }, [user]);

  // Listen to Shop Info
  useEffect(() => {
    if (!userProfile?.shopId) return;
    return onSnapshot(doc(db, 'shops', userProfile.shopId), (doc) => {
      if (doc.exists()) {
        setShopInfo(doc.data() as ShopInfo);
      }
    });
  }, [userProfile?.shopId]);

  // Listen to Products
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'products'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(pData);
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
    });
  }, [userProfile?.shopId]);

  // Listen to Customers
  useEffect(() => {
    if (!userProfile?.shopId) return;
    const q = query(collection(db, 'customers'), where('shopId', '==', userProfile.shopId));
    return onSnapshot(q, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(cData);
    });
  }, [userProfile?.shopId]);

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'shopId'>) => {
    if (!userProfile) return;
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
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!userProfile || userProfile.role !== 'owner') return;
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
    if (!userProfile || userProfile.role !== 'owner') return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
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

  const handleCompleteSale = async (items: SaleItem[], discount: number, customerInfo?: { name: string; phone: string; address: string; saveToDatabase?: boolean }) => {
    if (!userProfile) return;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const payableAmount = Math.max(0, totalAmount - discount);
    
    // Sanitize items - remove undefined fields (like warranty)
    const sanitizedItems = items.map(item => JSON.parse(JSON.stringify(item)));

    // Create Sale record
    const saleData = {
      timestamp: Date.now(),
      items: sanitizedItems,
      totalAmount,
      discount,
      payableAmount,
      customerName: customerInfo?.name || '',
      customerPhone: customerInfo?.phone || '',
      customerAddress: customerInfo?.address || '',
      shopId: userProfile.shopId,
      createdBy: userProfile.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'sales'), saleData);
      const completedSale = { id: docRef.id, ...saleData } as Sale;
      setLastSale(completedSale);
      
      // Update stock 
      for (const item of items) {
        const productRef = doc(db, 'products', item.productId);
        await updateDoc(productRef, {
          stock: increment(-item.quantity)
        });
      }

      // Update Customer Stats
      if (customerInfo?.phone) {
        const existingCustomer = customers.find(c => c.phone === customerInfo.phone);
        if (existingCustomer) {
          await updateDoc(doc(db, 'customers', existingCustomer.id), {
            totalSales: increment(payableAmount),
            lastPurchaseDate: Date.now(),
            address: customerInfo.address || existingCustomer.address,
            name: customerInfo.name || existingCustomer.name
          });
        } else if (customerInfo.saveToDatabase) {
          await addDoc(collection(db, 'customers'), {
            name: customerInfo.name || 'Anonymous',
            phone: customerInfo.phone,
            address: customerInfo.address || '',
            totalSales: payableAmount,
            lastPurchaseDate: Date.now(),
            shopId: userProfile.shopId
          });
        }
      }
      return completedSale;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'sales-completion-batch');
    }
  };

  if (profileLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <Auth>
      <Layout 
        activeView={activeView} 
        onViewChange={setActiveView} 
        userProfile={userProfile}
        lang={lang}
        onLanguageChange={setLang}
      >
        {activeView === 'dashboard' && <Dashboard products={products} sales={sales} lang={lang} />}
        {activeView === 'pos' && (
          <POS 
            products={products} 
            customers={customers} 
            shopInfo={shopInfo}
            onCompleteSale={handleCompleteSale} 
            lang={lang}
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
          />
        )}
        {activeView === 'staff' && userProfile && (
           <StaffManagement userProfile={userProfile} lang={lang} />
        )}
      </Layout>

      <GeminiAssistant products={products} sales={sales} lang={lang} />

      {lastSale && (
        <Receipt sale={lastSale} shopInfo={shopInfo} onClose={() => setLastSale(null)} lang={lang} />
      )}
    </Auth>
  );
}

