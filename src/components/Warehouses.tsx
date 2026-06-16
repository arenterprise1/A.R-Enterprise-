import React, { useState } from 'react';
import { Warehouse, Plus, ArrowRightLeft, Store, MapPin, Phone, History, AlertTriangle, Layers, Calendar, CheckCircle2, User } from 'lucide-react';
import { Product, Warehouse as WarehouseType, WarehouseStock, WarehouseTransfer, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

interface WarehousesProps {
  products: Product[];
  warehouses: WarehouseType[];
  warehouseStocks: WarehouseStock[];
  warehouseTransfers: WarehouseTransfer[];
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  lang: 'bn' | 'en';
  userProfile: UserProfile;
}

export default function Warehouses({ products, warehouses, warehouseStocks, warehouseTransfers, showToast, lang, userProfile }: WarehousesProps) {
  const [activeTab, setActiveTab] = useState<'stocks' | 'transfers' | 'setup'>('stocks');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states - Warehouse Setup
  const [newWhName, setNewWhName] = useState('');
  const [newWhAddress, setNewWhAddress] = useState('');
  const [newWhPhone, setNewWhPhone] = useState('');

  // Form states - Stock Transfer
  const [transferProduct, setTransferProduct] = useState('');
  const [transferSource, setTransferSource] = useState('shop'); // 'shop' or warehouse ID
  const [transferDest, setTransferDest] = useState(''); // warehouse ID or 'shop'
  const [transferQty, setTransferQty] = useState<number>(1);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) return;

    try {
      const whId = 'wh_' + Math.random().toString(36).slice(2, 11);
      await setDoc(doc(db, 'warehouses', whId), {
        id: whId,
        name: newWhName,
        address: newWhAddress,
        phone: newWhPhone,
        shopId: userProfile.shopId,
        createdAt: Date.now()
      });

      // Default stock initialized at zero for active products
      for (const p of products) {
        const stockId = `${whId}_${p.id}`;
        await setDoc(doc(db, 'warehouse_stocks', stockId), {
          id: stockId,
          warehouseId: whId,
          warehouseName: newWhName,
          productId: p.id,
          productName: p.name,
          category: p.category || 'General',
          stock: 0,
          shopId: userProfile.shopId
        });
      }

      showToast(lang === 'bn' ? 'নতুন গোডাউন / শোরুম তৈরি করা হয়েছে!' : 'New warehouse created successfully!', 'success');
      setNewWhName('');
      setNewWhAddress('');
      setNewWhPhone('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      showToast(lang === 'bn' ? 'সিস্টেম ত্রুটি হয়েছে' : 'Firebase error saving warehouse', 'error');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct || !transferSource || !transferDest || transferQty <= 0) {
      showToast(lang === 'bn' ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Fill all fields correctly', 'error');
      return;
    }

    if (transferSource === transferDest) {
      showToast(lang === 'bn' ? 'উৎস ও গন্তব্য একই হতে পারে না!' : 'Source and destination cannot be identical!', 'error');
      return;
    }

    const productObj = products.find(p => p.id === transferProduct);
    if (!productObj) return;

    // Check balance in source
    let availableSourceStock = 0;
    if (transferSource === 'shop') {
      availableSourceStock = productObj.stock;
    } else {
      const existingStockObj = warehouseStocks.find(ws => ws.productId === transferProduct && ws.warehouseId === transferSource);
      availableSourceStock = existingStockObj?.stock || 0;
    }

    if (availableSourceStock < transferQty) {
      showToast(lang === 'bn' ? 'উৎস অবস্থানে পর্যাপ্ত স্টক নেই!' : 'Insufficient stock at source location!', 'error');
      return;
    }

    try {
      const sourceName = transferSource === 'shop' 
        ? (lang === 'bn' ? 'মূল শোরুম / দোকান' : 'Main Shop') 
        : (warehouses.find(w => w.id === transferSource)?.name || '');

      const destName = transferDest === 'shop' 
        ? (lang === 'bn' ? 'মূল শোরুম / দোকান' : 'Main Shop') 
        : (warehouses.find(w => w.id === transferDest)?.name || '');

      const transferId = 'tr_' + Math.random().toString(36).slice(2, 11);

      // 1. Log transfer record
      await setDoc(doc(db, 'warehouse_transfers', transferId), {
        id: transferId,
        productId: transferProduct,
        productName: productObj.name,
        sourceWarehouseId: transferSource,
        sourceWarehouseName: sourceName,
        destWarehouseId: transferDest,
        destWarehouseName: destName,
        quantity: Number(transferQty),
        timestamp: Date.now(),
        shopId: userProfile.shopId,
        createdBy: userProfile.email || 'Admin'
      });

      // 2. Adjust source stock
      if (transferSource === 'shop') {
        const productRef = doc(db, 'products', transferProduct);
        await updateDoc(productRef, {
          stock: increment(-Number(transferQty))
        });
      } else {
        const stockId = `${transferSource}_${transferProduct}`;
        await updateDoc(doc(db, 'warehouse_stocks', stockId), {
          stock: increment(-Number(transferQty))
        });
      }

      // 3. Adjust destination stock
      if (transferDest === 'shop') {
        const productRef = doc(db, 'products', transferProduct);
        await updateDoc(productRef, {
          stock: increment(Number(transferQty))
        });
      } else {
        const stockId = `${transferDest}_${transferProduct}`;
        // Create if does not exist
        const whObj = warehouses.find(w => w.id === transferDest);
        await setDoc(doc(db, 'warehouse_stocks', stockId), {
          id: stockId,
          warehouseId: transferDest,
          warehouseName: whObj?.name || '',
          productId: transferProduct,
          productName: productObj.name,
          category: productObj.category || 'General',
          stock: increment(Number(transferQty)),
          shopId: userProfile.shopId
        }, { merge: true });
      }

      showToast(lang === 'bn' ? 'স্টক সফলভাবে স্থানান্তর সম্পন্ন!' : 'Inventory transfer logged and adjusted!', 'success');
      setShowTransferModal(false);
      setTransferProduct('');
      setTransferQty(1);
    } catch (err) {
      console.error(err);
      showToast(lang === 'bn' ? 'স্থানান্তর ট্র্যাকিং সংরক্ষণ করা যায়নি' : 'Unable to complete transfer process', 'error');
    }
  };

  return (
    <div className="space-y-6" id="warehouse-management-dashboard">
      {/* Header and buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Warehouse className="text-amber-500" />
            {lang === 'bn' ? 'মাল্টিপল গুদাম বা গোডাউন স্টক ট্র্যাকিং' : 'Multi-Warehouse & Go-down Stocks'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'bn' 
              ? 'মূল দোকান এবং স্টক গুদামসমূহের মধ্যে স্টক লেভেল এক স্ক্রিনে পর্যালোচনা করুন এবং ট্রান্সফার করুন।' 
              : 'Keep track of items across your showroom, outlet branches, and warehouse depots side-by-side.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-600/10"
            id="open-wh-transfer-btn"
          >
            <ArrowRightLeft size={13} />
            {lang === 'bn' ? 'স্টক ট্রান্সফার' : 'Transfer Stock'}
          </button>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            id="open-add-wh-btn"
          >
            <Plus size={14} />
            {lang === 'bn' ? 'নতুন গোডাউন' : 'Add Warehouse'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
            activeTab === 'stocks' ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'bn' ? 'গুদাম ভিত্তিক মজুদ (Stocks)' : 'Go-down Stocks Grid'}
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transfers' ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'bn' ? 'স্থানান্তর লগ (Transfers)' : 'Transfer History Logs'}
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
            activeTab === 'setup' ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          {lang === 'bn' ? 'স্থাপনা সেটিংস (Setup)' : 'Warehouse Directory'}
        </button>
      </div>

      {/* 1. Stocks Tab */}
      {activeTab === 'stocks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="wh-stocks-table-panel">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-amber-500" />
              {lang === 'bn' ? 'সকল শোরুম ও গোডাউনের স্টক লেভেল' : 'Stock Levels side-by-side'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-4 px-6">{lang === 'bn' ? 'প্রোডাক্ট' : 'Product Details'}</th>
                  <th className="py-4 px-6 bg-slate-950/30 text-indigo-400">{lang === 'bn' ? 'মূল শোরুম (দোকান শপ)' : 'Main Shop Outlet'}</th>
                  {warehouses.map(wh => (
                    <th key={wh.id} className="py-4 px-6 font-semibold text-amber-400">{wh.name}</th>
                  ))}
                  <th className="py-4 px-6 text-right">{lang === 'bn' ? 'মোট সামগ্রিক স্টক' : 'Consolidated Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map(p => {
                  const shopQty = p.stock || 0;
                  
                  // Collect warehouse stocks for this product
                  const whStocks = warehouses.map(wh => {
                    const match = warehouseStocks.find(ws => ws.productId === p.id && ws.warehouseId === wh.id);
                    return match?.stock || 0;
                  });

                  const totalConsolidated = shopQty + whStocks.reduce((sum, val) => sum + val, 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-950/20 transition-all text-slate-300">
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-slate-200">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.category || 'General'}</p>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold bg-slate-950/10 text-slate-200">
                        <span className={shopQty < 5 ? 'text-rose-400 bg-rose-400/5 px-2 py-1 rounded-xl border border-rose-500/10 font-black' : ''}>
                          {shopQty} {lang === 'bn' ? 'টি' : 'units'}
                        </span>
                      </td>
                      {warehouses.map((wh, idx) => {
                        const whQty = whStocks[idx];
                        return (
                          <td key={wh.id} className="py-4 px-6 font-mono text-slate-400 font-bold">
                            {whQty} {lang === 'bn' ? 'টি' : 'units'}
                          </td>
                        );
                      })}
                      <td className="py-4 px-6 text-right font-mono font-black text-amber-400">
                        {totalConsolidated} {lang === 'bn' ? 'টি' : 'units'}
                      </td>
                    </tr>
                  );
                })}

                {products.length === 0 && (
                  <tr>
                    <td colSpan={warehouses.length + 3} className="py-12 text-center text-slate-500 text-xs">
                      {lang === 'bn' ? 'অনুমোদিত কোনো প্রোডাক্ট পাওয়া যায়নি।' : 'No products loaded in shop directory yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Transfers Logs Tab */}
      {activeTab === 'transfers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="wh-transfers-panel">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <History size={13} className="text-amber-500" />
              {lang === 'bn' ? 'সাম্প্রতিক ট্রান্সফার রেকর্ডসমূহ' : 'Recent inventory transfer orders'}
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {warehouseTransfers.map((tx) => (
              <div key={tx.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-950/10 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[9px] font-black uppercase font-mono">
                      {lang === 'bn' ? 'ট্রান্সফার সফল' : 'Transferred Successfully'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">#{tx.id?.toUpperCase()}</span>
                  </div>
                  <h4 className="text-slate-100 font-bold text-sm">{tx.productName}</h4>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-[10px] text-slate-300 font-bold">
                      {tx.sourceWarehouseName}
                    </span>
                    <span className="text-slate-600 font-black">➔</span>
                    <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-[10px] text-amber-400 font-bold">
                      {tx.destWarehouseName}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1 text-xs">
                  <p className="text-slate-200 font-extrabold text-sm font-mono">
                    {tx.quantity} {lang === 'bn' ? 'টি সামগ্রী' : 'units'}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />
                    {format(tx.timestamp, 'dd MMMM yyyy, hh:mm a', { locale: lang === 'bn' ? bn : enUS })}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <User size={10} />
                    {lang === 'bn' ? 'কর্মী:' : 'Staff:'} {tx.createdBy}
                  </p>
                </div>
              </div>
            ))}

            {warehouseTransfers.length === 0 && (
              <div className="p-16 text-center text-slate-500 text-xs">
                {lang === 'bn' ? 'কোনো স্থানান্তরের রেকর্ড পাওয়া যায়নি।' : 'No transfer history logged yet.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Setup Tab */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="wh-setup-panel">
          {warehouses.map((wh) => (
            <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Warehouse size={18} />
                </div>
                <div>
                  <h3 className="text-slate-200 font-extrabold text-sm">{wh.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {wh.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-80s0/10 pt-3">
                {wh.phone && (
                  <p className="text-slate-400 flex items-center gap-2 font-mono">
                    <Phone size={12} className="text-slate-500" />
                    {wh.phone}
                  </p>
                )}
                {wh.address ? (
                  <p className="text-slate-400 flex items-center gap-2">
                    <MapPin size={12} className="text-slate-500 shrink-0" />
                    {wh.address}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">{lang === 'bn' ? 'কোনো ঠিকানা দেওয়া হয়নি' : 'No address supplied'}</p>
                )}
              </div>
            </div>
          ))}

          {warehouses.length === 0 && (
            <div className="col-span-full bg-slate-950/20 border border-slate-800 border-dashed rounded-2xl p-16 text-center">
              <Warehouse className="text-slate-600 mx-auto mb-4" size={32} />
              <h3 className="text-slate-400 font-bold text-sm">
                {lang === 'bn' ? 'কোনো বাড়তি গোডাউন বা শাখা যুক্ত করা হয়নি' : 'No Additional Warehouses Listed'}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                {lang === 'bn' ? 'ডানদিকের বাটনে ক্লিক করে প্রথম ওয়ারহাউজ গোডাউন যোগ করুন' : 'Click the button above to register a branch depot/warehouse.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Add Warehouse Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-sans font-black uppercase text-slate-200 flex items-center gap-2">
                <Warehouse className="text-amber-500" />
                {lang === 'bn' ? 'নতুন গোডাউন বা শোরুম যুক্ত করুন' : 'Register New Warehouse'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'bn' ? 'নতুন গুদামের নাম এবং যোগাযোগের তথ্য সংরক্ষণ করুন।' : 'Add a separate physical depot directory in the store.'}
              </p>
            </div>

            <form onSubmit={handleAddWarehouse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{lang === 'bn' ? 'নাম (Name)' : 'Warehouse Name'}</label>
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'যেমন: মিরপর রোড গোডাউন' : 'e.g. Mirpur Depot'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone / Mobile'}</label>
                <input
                  type="text"
                  placeholder="e.g. +88017XXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  value={newWhPhone}
                  onChange={(e) => setNewWhPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{lang === 'bn' ? 'ঠিকানা (Address)' : 'Street Address'}</label>
                <textarea
                  placeholder={lang === 'bn' ? 'যেমন: ব্লক-সি, রোড-১২, ঢাকা...' : 'e.g. West side of main market, Mirpur 1'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white height-20 focus:outline-none focus:border-amber-500 resize-none h-16"
                  value={newWhAddress}
                  onChange={(e) => setNewWhAddress(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুণ' : 'Create Depot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Transfer Warehouse Modal Overlay */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-sans font-black uppercase text-slate-200 flex items-center gap-2">
                <ArrowRightLeft className="text-amber-500" />
                {lang === 'bn' ? 'স্টক ট্রান্সফার রিকোয়েস্ট' : 'Inventory Stock Transfer'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'bn' ? 'দোকান শপ এবং যেকোনো গুদামের মধ্যে সামগ্রী সরান।' : 'Instantly transfer in-stock units between shop and depots.'}
              </p>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  {lang === 'bn' ? 'প্রোডাক্ট নির্বাচন করুন' : 'Select Product'}
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:text-white"
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  required
                >
                  <option value="">{lang === 'bn' ? 'একটি প্রোডাক্ট বাছুন' : 'Choose Product...'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({lang === 'bn' ? 'স্টক:' : 'Shop Unit Qty:'} {p.stock || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'bn' ? 'উৎস অবস্থান (From)' : 'Source Location (From)'}
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    required
                  >
                    <option value="shop">{lang === 'bn' ? 'মূল শোরুম (দোকান শপ)' : 'Main Shop Outlet'}</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'bn' ? 'গন্তব্য অবস্থান (To)' : 'Destination Location (To)'}
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    value={transferDest}
                    onChange={(e) => setTransferDest(e.target.value)}
                    required
                  >
                    <option value="">{lang === 'bn' ? 'বাছুন...' : 'Select recipient...'}</option>
                    <option value="shop">{lang === 'bn' ? 'মূল শোরুম (দোকান শপ)' : 'Main Shop Outlet'}</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  {lang === 'bn' ? 'পরিমাণ (Quantity)' : 'Quantity to Transfer'}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="w-1/2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  {lang === 'bn' ? 'স্থানান্তর করুন' : 'Confirm dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
