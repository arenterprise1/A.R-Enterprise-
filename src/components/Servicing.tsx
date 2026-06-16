import React, { useState } from 'react';
import { ServiceJob } from '../types';
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
  Wrench, 
  Printer, 
  Clock, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  Smartphone, 
  Save, 
  FileText 
} from 'lucide-react';

interface ServicingProps {
  jobs: ServiceJob[];
  onAddJob: (job: Omit<ServiceJob, 'id' | 'shopId' | 'createdAt'>) => Promise<void>;
  onUpdateJob: (id: string, updates: Partial<ServiceJob>) => Promise<void>;
  onDeleteJob?: (id: string) => Promise<void>;
  lang: 'bn' | 'en';
}

export default function Servicing({ jobs, onAddJob, onUpdateJob, onDeleteJob, lang }: ServicingProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);
  const [printJob, setPrintJob] = useState<ServiceJob | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [serialOrImei, setSerialOrImei] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [repairCost, setRepairCost] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [status, setStatus] = useState<ServiceJob['status']>('pending');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [promisedDate, setPromisedDate] = useState('');

  const t = translations[lang];

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeviceName('');
    setSerialOrImei('');
    setProblemDescription('');
    setRepairCost(0);
    setAdvancePaid(0);
    setStatus('pending');
    setTechnicianNotes('');
    setPromisedDate('');
    setEditingJob(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: ServiceJob) => {
    setEditingJob(job);
    setCustomerName(job.customerName);
    setCustomerPhone(job.customerPhone);
    setDeviceName(job.deviceName);
    setSerialOrImei(job.serialOrImei || '');
    setProblemDescription(job.problemDescription);
    setRepairCost(job.repairCost);
    setAdvancePaid(job.advancePaid);
    setStatus(job.status);
    setTechnicianNotes(job.technicianNotes || '');
    if (job.promisedDate) {
      setPromisedDate(new Date(job.promisedDate).toISOString().split('T')[0]);
    } else {
      setPromisedDate('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deviceName.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    const payload = {
      customerName,
      customerPhone,
      deviceName,
      serialOrImei: serialOrImei.trim() || undefined,
      problemDescription,
      repairCost: Number(repairCost) || 0,
      advancePaid: Number(advancePaid) || 0,
      status,
      technicianNotes: technicianNotes.trim() || undefined,
      promisedDate: promisedDate ? new Date(promisedDate).getTime() : undefined,
    };

    try {
      if (editingJob) {
        await onUpdateJob(editingJob.id, payload);
      } else {
        await onAddJob(payload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save service job:", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: ServiceJob['status']) => {
    try {
      await onUpdateJob(id, { status: newStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (amount: number) => {
    return lang === 'bn' ? `৳${amount.toLocaleString('bn-BD')}` : `৳${amount.toLocaleString('en-US')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customerPhone.includes(searchTerm) ||
      job.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.serialOrImei && job.serialOrImei.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (statusVal: ServiceJob['status']) => {
    const configs = {
      pending: {
        bg: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50',
        label: lang === 'bn' ? 'পেন্ডিং' : 'Pending',
      },
      repairing: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-450 border-indigo-200/50',
        label: lang === 'bn' ? 'মেকানিক কাজ করছে' : 'Repairing',
      },
      fixed: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
        label: lang === 'bn' ? 'ঠিক করা হয়েছে' : 'Fixed',
      },
      delivered: {
        bg: 'bg-slate-50 dark:bg-slate-900/40 text-slate-650 dark:text-slate-400 border-slate-200/50',
        label: lang === 'bn' ? 'কাস্টমারকে ফেরত দেওয়া হয়েছে' : 'Delivered',
      },
      cancelled: {
        bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/50',
        label: lang === 'bn' ? 'বাতিল' : 'Cancelled',
      }
    };

    const current = configs[statusVal] || configs.pending;

    return (
      <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border", current.bg)}>
        {current.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Servicing Controls header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/40 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm text-slate-400 font-medium">
            {lang === 'bn' ? 'কাস্টমারের সার্ভিসিং ও রিপেয়ারিং রিকোয়েস্ট ট্র্যাক করুন' : 'Customer repair & servicing orders ledger'}
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-indigo-100/50 dark:shadow-none shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          {lang === 'bn' ? 'নতুন রিপেয়ার জবশীট' : 'New Repair Job'}
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'bn' ? 'কাস্টমার নাম, ফোন, ডিভাইস বা সিরিয়াল দিয়ে খুঁজুন...' : 'Search by name, phone, device or SN...'}
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
            <option value="pending">{lang === 'bn' ? 'পেন্ডিং' : 'Pending'}</option>
            <option value="repairing">{lang === 'bn' ? 'কাজ চলছে (Repairing)' : 'Repairing'}</option>
            <option value="fixed">{lang === 'bn' ? 'ঠিক করা হয়েছে (Fixed)' : 'Fixed'}</option>
            <option value="delivered">{lang === 'bn' ? 'ডেলিভারি সম্পন্ন (Delivered)' : 'Delivered'}</option>
            <option value="cancelled">{lang === 'bn' ? 'বাতিল (Cancelled)' : 'Cancelled'}</option>
          </select>
        </div>
      </div>

      {/* Grid of Service Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredJobs.map((job) => {
            const leftToPay = Math.max(0, job.repairCost - job.advancePaid);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <div>
                      <h4 className="font-sans font-black text-slate-900 dark:text-white leading-snug">
                        {job.deviceName}
                      </h4>
                      {job.serialOrImei && (
                        <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider mt-0.5">
                          SN: {job.serialOrImei}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  {/* Customer Information detail */}
                  <div className="py-3 space-y-2 text-slate-650 dark:text-slate-350 text-xs font-semibold leading-relaxed border-b border-dashed border-slate-100 dark:border-slate-800/20">
                    <p className="flex items-center gap-1.5 font-bold">
                      <User size={14} className="text-slate-400 shrink-0" />
                      {job.customerName}
                    </p>
                    <p className="flex items-center gap-1.5 font-bold">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      {job.customerPhone}
                    </p>
                    {job.problemDescription && (
                      <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 rounded-xl">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">
                          ⚠️ {lang === 'bn' ? 'সমস্যা' : 'Issue'}
                        </p>
                        <p className="text-[11px] leading-relaxed italic">{job.problemDescription}</p>
                      </div>
                    )}
                    {job.technicianNotes && (
                      <div className="mt-2 p-2 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-200/20 rounded-xl">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">
                          ⚙️ {lang === 'bn' ? 'টেকনিশিয়ান ড্রাফট' : 'Tech Note'}
                        </p>
                        <p className="text-[11px] leading-relaxed italic">{job.technicianNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Pricing Overview */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-3 text-[11px] leading-normal font-semibold">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-black">{lang === 'bn' ? 'মোট বাজেট' : 'Total Budget'}</p>
                      <p className="font-sans font-black text-slate-800 dark:text-white mt-0.5">{formatCurrency(job.repairCost)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-black">{lang === 'bn' ? 'অগ্রিম দিয়েছে' : 'Paid Advance'}</p>
                      <p className="font-sans font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(job.advancePaid)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-black">{lang === 'bn' ? 'বাকি' : 'Due Balance'}</p>
                      <p className={cn("font-sans font-black mt-0.5", leftToPay > 0 ? "text-rose-500" : "text-emerald-600")}>
                        {formatCurrency(leftToPay)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operations / Context Menu items */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between gap-1.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(job)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 rounded-xl transition-all cursor-pointer"
                      title={lang === 'bn' ? 'সম্পাদন' : 'Edit repair details'}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setPrintJob(job)}
                      className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 rounded-xl transition-all cursor-pointer"
                      title={lang === 'bn' ? 'জবশীট রিসিট প্রিন্ট করুন' : 'Print jobsheet customer copy'}
                    >
                      <Printer size={15} />
                    </button>
                  </div>

                  {/* Hot statuses controls */}
                  <div className="flex gap-1 shadow-sm rounded-xl p-0.5 border border-slate-200/40 dark:border-slate-800/40 bg-slate-50 dark:bg-slate-900/30">
                    {job.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'repairing')}
                        className="px-2 py-1 bg-indigo-600 text-white font-black uppercase text-[9px] rounded-lg tracking-wider cursor-pointer transition-all"
                      >
                        ⚡ {lang === 'bn' ? 'কাজ শুরু করুন' : 'Start Repair'}
                      </button>
                    )}
                    {job.status === 'repairing' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'fixed')}
                        className="px-2 py-1 bg-emerald-600 text-white font-black uppercase text-[9px] rounded-lg tracking-wider cursor-pointer transition-all"
                      >
                        ✓ {lang === 'bn' ? 'কাজ শেষ করুন' : 'Complete'}
                      </button>
                    )}
                    {job.status === 'fixed' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'delivered')}
                        className="px-2 py-1 bg-slate-700 text-white font-black uppercase text-[9px] rounded-lg tracking-wider cursor-pointer transition-all"
                      >
                        🤝 {lang === 'bn' ? 'ডেলিভারি দিন' : 'Deliver'}
                      </button>
                    )}
                    {job.status === 'delivered' && (
                      <span className="px-2.5 py-1 text-slate-400 font-bold text-[9px] uppercase flex items-center gap-1">
                        📦 {lang === 'bn' ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* JOBSHEET PRINT PREVIEW CONTAINER (ONLY POPULATED ON PRINT MODE) */}
      <AnimatePresence>
        {printJob && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full text-slate-900 space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setPrintJob(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 rounded-full cursor-pointer print:hidden"
              >
                <X size={20} />
              </button>

              <div id="print-jobsheet-area" className="space-y-6 text-left font-mono">
                {/* Invoice header slip */}
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tight text-indigo-950">
                    {lang === 'bn' ? 'সার্ভিস ও মেরামত জবশীট' : 'SERVICE JOBSHEET RECEIPT'}
                  </h2>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'bn' ? 'কাস্টমার কপি' : 'CUSTOMER INTAKE SLIP'}
                  </p>
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">CUSTOMER DETAILS:</span>
                    <p className="font-bold text-slate-900">{printJob.customerName}</p>
                    <p className="text-slate-600">{printJob.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-400">TICKET NO:</span>
                    <p className="font-bold uppercase text-slate-900">#REP-{printJob.id.toUpperCase().substring(0, 6)}</p>
                    <span className="block text-[10px] font-bold text-slate-400 mt-1">INTAKE DATE:</span>
                    <p className="text-slate-600">{formatDate(printJob.createdAt)}</p>
                  </div>
                </div>

                {/* Device Profile info */}
                <div className="space-y-2 text-xs">
                  <h5 className="font-black border-b pb-1 text-slate-800">DEVICE INFORMATION:</h5>
                  <div className="grid grid-cols-2 gap-2 leading-relaxed">
                    <div>
                      <span className="font-extrabold">Device Model:</span> {printJob.deviceName}
                    </div>
                    <div>
                      <span className="font-extrabold">Serial / IMEI:</span> {printJob.serialOrImei || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border leading-relaxed mt-2 text-slate-700 italic">
                    <span className="block text-[10px] font-extrabold text-slate-500 not-italic uppercase mb-0.5">COMPLAINT STATEMENT:</span>
                    {printJob.problemDescription}
                  </div>
                </div>

                {/* Costs slip */}
                <table className="w-full text-xs text-slate-850">
                  <thead className="border-b">
                    <tr className="font-bold">
                      <th className="py-2 text-left">CHARGES GUIDE</th>
                      <th className="py-2 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dashed">
                      <td className="py-2">{lang === 'bn' ? 'আনুমানিক মেরামতের মূল্য' : 'Estimated repair charges'}</td>
                      <td className="py-2 text-right font-black">{formatCurrency(printJob.repairCost)}</td>
                    </tr>
                    <tr className="border-b border-dashed">
                      <td className="py-2 text-emerald-700 font-bold">{lang === 'bn' ? 'অগ্রিম জমা' : 'Secured down-payment'}</td>
                      <td className="py-2 text-right text-emerald-750 font-black">{formatCurrency(printJob.advancePaid)}</td>
                    </tr>
                    <tr className="font-black text-rose-500">
                      <td className="py-2 uppercase">{lang === 'bn' ? 'বাকি বকেয়া' : 'Pending balance due on claim'}</td>
                      <td className="py-2 text-right text-base">{formatCurrency(Math.max(0, printJob.repairCost - printJob.advancePaid))}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Delivery Target promise date */}
                {printJob.promisedDate && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-xl text-center text-xs text-indigo-950">
                    <span className="font-black uppercase tracking-wider block text-[10px] text-slate-400 mb-0.5">Target Release Promise Date:</span>
                    <p className="font-black text-base">{formatDate(printJob.promisedDate)}</p>
                  </div>
                )}

                {/* Signature terms and conditions */}
                <div className="text-[10px] leading-relaxed text-slate-400 font-sans border-t pt-3 space-y-1">
                  <p>* Please hold this ticket slip safe. It must be returned during device claim collection.</p>
                  <p>* Shop cannot hold liability for software backups or data losses during hardware debug cycles.</p>
                  <p>* Claim collection must occur within 30 days of repair claim notice.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-12 text-slate-500 text-[11px] text-center font-sans">
                  <div>
                    <div className="border-b border-slate-350 mx-auto w-3/4 mb-1" />
                    <span>Technician / Rep</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-350 mx-auto w-3/4 mb-1" />
                    <span>Customer Auth</span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex justify-end gap-3 print:hidden border-t pt-4">
                <button
                  onClick={() => setPrintJob(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-black uppercase text-slate-600 cursor-pointer hover:bg-slate-50 transition-all font-sans"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow-md"
                >
                  <Printer size={14} />
                  {lang === 'bn' ? 'প্রিন্ট রশিদ' : 'Print Intakes-Receipt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE & EDIT SERVICE JOB MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-[28px] max-w-xl w-full hover:shadow-2xl transition-all h-[92vh] flex flex-col justify-between overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Wrench size={18} className="text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
                    {editingJob ? (lang === 'bn' ? 'জবশীট সংশোধন' : 'Modify Intake Ticket') : (lang === 'bn' ? 'নতুন মেরামতের টিকিট' : 'New Service Intake')}
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

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div className="text-indigo-850 dark:text-white grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer Information detail */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider flex items-center gap-1">
                      <User size={12} /> {lang === 'bn' ? 'কাস্টমার নাম' : 'Customer Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: মোহাম্মদ তামিম' : 'e.g. Tamim Iqbal'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-455 text-slate-400 tracking-wider flex items-center gap-1">
                      <Phone size={12} /> {lang === 'bn' ? 'মোবাইল নম্বর' : 'Customer Phone'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: ০১৭********' : 'e.g. 01711223344'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Device specifications */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Smartphone size={12} /> {lang === 'bn' ? 'ডিভাইসের নাম এবং মডেল' : 'Device Brand & Model'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: HP 15s Ryzen 5' : 'e.g. HP Pavilion Laptop'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      ⚙️ {lang === 'bn' ? 'সিরিয়াল / IMEI নম্বর' : 'Device Serial / IMEI'}
                    </label>
                    <input
                      type="text"
                      value={serialOrImei}
                      onChange={(e) => setSerialOrImei(e.target.value)}
                      placeholder={lang === 'bn' ? 'যেমন: SN829377484' : 'e.g. SN129A839X4'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-mono font-bold tracking-wider rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                {/* Problem details and intake summary description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <AlertCircle size={12} /> {lang === 'bn' ? 'ডিভাইসের সমস্যা / কী কাজ করতে হবে' : 'Complaint Statement / Diagnostic request'} *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: ডিসপ্লে পরিবর্তন ও ধীরগতির সমস্যা' : 'e.g. Laptop display cracked and needs replacement, CPU repaste'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white resize-none"
                  />
                </div>

                {/* Pricing / advance paid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <DollarSign size={12} /> {lang === 'bn' ? 'আনুমানিক বিল' : 'Estimated repair charge'}
                    </label>
                    <input
                      type="number"
                      value={repairCost || ''}
                      onChange={(e) => setRepairCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      💵 {lang === 'bn' ? 'অগ্রিম পেমেন্ট সংগ্রহ' : 'Advance Payment Collected'}
                    </label>
                    <input
                      type="number"
                      value={advancePaid || ''}
                      onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {lang === 'bn' ? 'স্ট্যাটাস' : 'Service Status'}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ServiceJob['status'])}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white cursor-pointer"
                    >
                      <option value="pending">{lang === 'bn' ? 'পেন্ডিং (Pending)' : 'Pending'}</option>
                      <option value="repairing">{lang === 'bn' ? 'কাজ চলছে (Repairing)' : 'Repairing'}</option>
                      <option value="fixed">{lang === 'bn' ? 'ঠিক করা হয়েছে (Fixed)' : 'Fixed'}</option>
                      <option value="delivered">{lang === 'bn' ? 'ডেলিভারি সম্পন্ন (Delivered)' : 'Delivered'}</option>
                      <option value="cancelled">{lang === 'bn' ? 'বাতিল (Cancelled)' : 'Cancelled'}</option>
                    </select>
                  </div>

                  {/* Expected Completion Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Calendar size={12} /> {lang === 'bn' ? 'মেয়াদ শেষের তারিখ' : 'Target Release Date'}
                    </label>
                    <input
                      type="date"
                      value={promisedDate}
                      onChange={(e) => setPromisedDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-black rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Technician Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <FileText size={12} /> {lang === 'bn' ? 'টেকনিশিয়ান ইন্টারনাল নোটস' : 'Internal Debug/Technician Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: মাদারবোর্ডের ২য় ক্যাপাসিটর পরিবর্তন করা প্রয়োজন' : 'e.g. Capacitor C4 replacement, track repaired successfully.'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 text-xs font-semibold rounded-xl focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-all dark:text-white resize-none"
                  />
                </div>
              </form>

              {/* Action row footer */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border rounded-2xl text-xs font-black uppercase tracking-wider text-slate-505 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-100/55 dark:shadow-none"
                >
                  <Save size={14} />
                  {editingJob ? (lang === 'bn' ? 'সংরোধন করুন' : 'Apply Changes') : (lang === 'bn' ? 'সংরক্ষণ করুন' : 'Issue Ticket & Save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
