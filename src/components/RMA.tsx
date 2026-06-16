import React, { useState } from 'react';
import { RMA } from '../types';
import { translations } from '../translations';
import { cn } from '../lib/utils';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Calendar, 
  User, 
  Box, 
  Tag, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  Save, 
  Truck, 
  PackageCheck 
} from 'lucide-react';

interface RMAProps {
  rmas: RMA[];
  onAddRma: (rma: Omit<RMA, 'id' | 'shopId' | 'warrantyDate'>) => Promise<void>;
  onUpdateRma: (id: string, updates: Partial<RMA>) => Promise<void>;
  onDeleteRma?: (id: string) => Promise<void>;
  lang: 'bn' | 'en';
}

export default function RMAManager({ rmas, onAddRma, onUpdateRma, onDeleteRma, lang }: RMAProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRma, setEditingRma] = useState<RMA | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [serialOrImei, setSerialOrImei] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [status, setStatus] = useState<RMA['status']>('sent_to_supplier');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');

  const t = translations[lang];

  const resetForm = () => {
    setProductName('');
    setSerialOrImei('');
    setSupplierName('');
    setStatus('sent_to_supplier');
    setReturnDate('');
    setNotes('');
    setEditingRma(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rma: RMA) => {
    setEditingRma(rma);
    setProductName(rma.productName);
    setSerialOrImei(rma.serialOrImei);
    setSupplierName(rma.supplierName);
    setStatus(rma.status);
    setReturnDate(rma.returnDate ? new Date(rma.returnDate).toISOString().split('T')[0] : '');
    setNotes(rma.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !serialOrImei.trim() || !supplierName.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    const payload = {
      productName,
      serialOrImei: serialOrImei.trim(),
      supplierName,
      status,
      returnDate: returnDate ? new Date(returnDate).getTime() : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingRma) {
        await onUpdateRma(editingRma.id, payload);
      } else {
        await onAddRma(payload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save RMA claim:", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: RMA['status']) => {
    const updates: Partial<RMA> = { status: newStatus };
    if (newStatus === 'received_from_supplier') {
      updates.returnDate = Date.now();
    }
    try {
      await onUpdateRma(id, updates);
    } catch (error) {
      console.error(error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRmas = rmas.filter(rma => {
    const matchesSearch = 
      rma.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.serialOrImei.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rma.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (statusVal: RMA['status']) => {
    const configs = {
      sent_to_supplier: {
        bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/50',
        label: lang === 'bn' ? 'সাপ্লায়ারে পাঠানো হয়েছে' : 'Sent to Supplier',
      },
      received_from_supplier: {
        bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50',
        label: lang === 'bn' ? 'ফেরত রিসিভ করা হয়েছে' : 'Received Back',
      },
      delivered_to_customer: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
        label: lang === 'bn' ? 'কাস্টমারকে দেওয়া হয়েছে' : 'Delivered to Customer',
      },
    };

    const current = configs[statusVal] || configs.sent_to_supplier;

    return (
      <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border", current.bg)}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm text-slate-400 font-medium">
            {lang === 'bn' ? 'সাপ্লায়ারের সাথে ওয়ারেন্টি ও যন্ত্রাংশ প্রতিস্থাপন হিসাব রাখুন' : 'Manage RMA logs and manufacturer warranty replacements'}
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-indigo-100/50 dark:shadow-none shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          {lang === 'bn' ? 'নতুন ওয়ারেন্টি ক্লাইম (RMA)' : 'Add Warranty Claim (RMA)'}
        </button>
      </div>

      {/* Filters Search row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'bn' ? 'ওয়ারেন্টি প্রোডাক্টের নাম, সিরিয়াল বা সাপ্লায়ার লিখে খুঁজুন...' : 'Search by product name, SN, or supplier...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 text-sm font-semibold rounded-2xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
          />
        </div>

        <div className="relative">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 text-sm font-black rounded-2xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white cursor-pointer"
          >
            <option value="all">{lang === 'bn' ? 'সব স্ট্যাটাস' : 'All Statuses'}</option>
            <option value="sent_to_supplier">{lang === 'bn' ? 'সাপ্লায়ারে স্টক পাঠানো হয়েছে (Sent)' : 'Sent to Supplier'}</option>
            <option value="received_from_supplier">{lang === 'bn' ? 'সাপ্লায়ার ফেরত দিয়েছে (Received)' : 'Received'}</option>
            <option value="delivered_to_customer">{lang === 'bn' ? 'কাস্টমারকে ডেলিভারি করা হয়েছে (Delivered)' : 'Delivered to Customer'}</option>
          </select>
        </div>
      </div>

      {/* Grid rendering cases list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredRmas.map((rma) => (
            <motion.div
              key={rma.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-800/40 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                  <div>
                    <h4 className="font-sans font-black text-slate-905 dark:text-white leading-snug">
                      {rma.productName}
                    </h4>
                    <p className="font-mono text-[10px] text-indigo-700 dark:text-indigo-400 font-bold tracking-wider mt-0.5">
                      SN: {rma.serialOrImei}
                    </p>
                  </div>
                  {getStatusBadge(rma.status)}
                </div>

                {/* Supplier detail listing */}
                <div className="space-y-2 py-3 text-xs font-semibold text-slate-650 dark:text-slate-350 leading-relaxed border-b border-dashed border-slate-100 dark:border-slate-805/20">
                  <p className="flex items-center gap-1.5 font-bold">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mr-1">{lang === 'bn' ? 'সাপ্লায়ার' : 'Supplier'}:</span>
                    {rma.supplierName}
                  </p>
                  <p className="flex items-center gap-1.5 font-bold">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide mr-1">{lang === 'bn' ? 'পাঠানোর তারিখ' : 'Sent Date'}:</span>
                    {formatDate(rma.warrantyDate)}
                  </p>
                  {rma.returnDate && (
                    <p className="flex items-center gap-1.5 font-bold text-indigo-650 dark:text-indigo-400">
                      <PackageCheck size={14} className="shrink-0 animate-pulse text-indigo-500" />
                      <span className="text-[10px] uppercase font-black tracking-wide mr-1">{lang === 'bn' ? 'ফেরত পাওয়ার তারিখ' : 'Returned Date'}:</span>
                      {formatDate(rma.returnDate)}
                    </p>
                  )}
                  {rma.notes && (
                    <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/20 italic text-[11px] leading-relaxed text-slate-505">
                      {rma.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Action layout */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(rma)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border dark:border-slate-700 text-[10px] font-black uppercase text-slate-550 dark:text-slate-350 cursor-pointer rounded-xl transition-all"
                >
                  ⚙️ {lang === 'bn' ? 'সংশোধন' : 'Edit Claims'}
                </button>

                {/* Status stepper trigger buttons */}
                <div className="flex gap-1">
                  {rma.status === 'sent_to_supplier' && (
                    <button
                      onClick={() => handleUpdateStatus(rma.id, 'received_from_supplier')}
                      className="px-2 py-1 bg-amber-600 text-white font-black uppercase text-[9px] rounded-lg tracking-wider cursor-pointer transition-all hover:bg-amber-700 flex items-center gap-1"
                    >
                      📦 {lang === 'bn' ? 'ফেরত রিসিভ' : 'Log Return'}
                    </button>
                  )}
                  {rma.status === 'received_from_supplier' && (
                    <button
                      onClick={() => handleUpdateStatus(rma.id, 'delivered_to_customer')}
                      className="px-2 py-1 bg-emerald-600 text-white font-black uppercase text-[9px] rounded-lg tracking-wider cursor-pointer transition-all hover:bg-emerald-700 flex items-center gap-1"
                    >
                      🤝 {lang === 'bn' ? 'কাস্টমারকে দিন' : 'Deliver Client'}
                    </button>
                  )}
                  {rma.status === 'delivered_to_customer' && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-950/10 shadow-sm select-none">
                      ✓ {lang === 'bn' ? 'সম্পন্ন হয়েছে' : 'Resolved'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CREATE & EDIT RMA CLAIMS MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-[28px] max-w-lg w-full shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw size={18} className="text-indigo-650 animate-spin" style={{ animationDuration: '6s' }} />
                    {editingRma ? (lang === 'bn' ? 'ওয়ারেন্টি ক্লাইম সংশোধন' : 'Modify Warranty Claim') : (lang === 'bn' ? 'নতুন ওয়ারেন্টি ক্লাইম (RMA)' : 'New Supplier Warranty Claim')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-400 hover:text-slate-650 rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Box size={12} /> {lang === 'bn' ? 'প্রোডাক্টের নাম / মডেল' : 'Product Model / Brand'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: Asus Dual RTX 4060 Oc' : 'e.g. Asus Dual RTX 4060 GPU'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white"
                  />
                </div>

                {/* Serial Numbers (IMEI) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Tag size={12} /> {lang === 'bn' ? 'সিরিয়াল / IMEI নম্বর' : 'Product Serial / IMEI'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={serialOrImei}
                    onChange={(e) => setSerialOrImei(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: SN892374829X' : 'e.g. SN1297A4839Q'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-mono font-bold tracking-wider rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white"
                  />
                </div>

                {/* Supplier */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <User size={12} /> {lang === 'bn' ? 'সাপ্লায়ার / পরিবেশক' : 'Supplier Name / Provider'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: স্টার টেক ডিস্ট্রিবিউশন' : 'e.g. UCC Distribution Ltd'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white"
                  />
                </div>

                {/* Status Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {lang === 'bn' ? 'ক্লাইম স্ট্যাটাস' : 'Claim Status'}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as RMA['status'])}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white cursor-pointer"
                    >
                      <option value="sent_to_supplier">{lang === 'bn' ? 'সাপ্লায়ারে পাঠানো হয়েছে (Sent)' : 'Sent to Supplier'}</option>
                      <option value="received_from_supplier">{lang === 'bn' ? 'রিসিভ করা হইয়াছে (Received)' : 'Received'}</option>
                      <option value="delivered_to_customer">{lang === 'bn' ? 'কাস্টমারকে ফেরত দেওয়া হয়েছে (Completed)' : 'Completed & Delivered'}</option>
                    </select>
                  </div>

                  {/* Return Date if status is resolved */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Calendar size={12} /> {lang === 'bn' ? 'ফেরত পাওয়ার তারিখ' : 'Return Date'}
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <FileText size={12} /> {lang === 'bn' ? 'ওয়ারেন্টি বিবরণ / বাড়তি তথ্য' : 'Warranty Notes / Replacement Serial'}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: মাদারবোর্ড বদলে নতুন ১টি ফ্রেশ পিস দেওয়া হয়েছে।' : 'e.g. Supplier replacement granted. New motherboard received with serial SN-NEW-xyz'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 focus:outline-none transition-all dark:text-white resize-none"
                  />
                </div>
              </form>

              {/* Action layout footer */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border rounded-2xl text-xs font-black uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all font-sans"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-100/55 dark:shadow-none font-sans"
                >
                  <Save size={14} />
                  {editingRma ? (lang === 'bn' ? 'সংরোধন করুন' : 'Apply Changes') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Record Claim')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
