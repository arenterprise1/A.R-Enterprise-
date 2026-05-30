import React, { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { User, Phone, MapPin, Search, Plus, X, Edit2, Trash2, Mail } from 'lucide-react';
import { Customer, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../translations';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'shopId'>) => void;
  onUpdateCustomer: (id: string, customer: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  userProfile: UserProfile;
  lang: Language;
}

export default function Customers({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer, userProfile, lang }: CustomersProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.phone) {
      if (editingId) {
        onUpdateCustomer(editingId, formData);
        setEditingId(null);
      } else {
        onAddCustomer({ ...formData, totalSales: 0 });
      }
      setFormData({ name: '', phone: '', address: '' });
      setIsAdding(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic tracking-tight text-black">{lang === 'bn' ? 'কাস্টমার ডাটাবেস' : 'Customer Database'}</h2>
          <p className="text-gray-500 font-medium mt-1">{lang === 'bn' ? 'আপনার নিয়মিত কাস্টমারদের তালিকা পরিচালনা করুন' : 'Manage your regular customer list'}</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (editingId) {
              setEditingId(null);
              setFormData({ name: '', phone: '', address: '' });
            }
          }}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:shadow-2xl transition-all w-full md:w-auto justify-center"
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
          {isAdding ? t.cancel : (lang === 'bn' ? 'নতুন কাস্টমার' : 'New Customer')}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 overflow-hidden"
          >
            <h3 className="text-xl font-bold italic">{editingId ? (lang === 'bn' ? 'কাস্টমার তথ্য সংশোধন করুন' : 'Update Customer Info') : (lang === 'bn' ? 'নতুন কাস্টমারের তথ্য দিন' : 'Enter New Customer Info')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-1">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                  <User size={14} /> {t.name}
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-black transition-all outline-none"
                  placeholder={lang === 'bn' ? 'যেমন: রহিম আহমেদ' : 'e.g. Rahim Ahmed'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                  <Phone size={14} /> {t.customerPhone}
                </label>
                <input
                  required
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-black transition-all outline-none"
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div className="space-y-2 lg:col-span-full">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                  <MapPin size={14} /> {t.shopAddress}
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-black transition-all outline-none resize-none h-24"
                  placeholder={lang === 'bn' ? 'কাস্টমারের পূর্ণ ঠিকানা...' : 'Customer full address...'}
                />
              </div>
              <div className="flex items-end gap-3 lg:col-span-full">
                <button type="submit" className="flex-1 py-4 bg-black text-white rounded-xl font-black hover:shadow-xl transition-all tracking-wide italic">
                  {editingId ? t.actions_edit : t.save}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder={t.searchCustomers} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-black transition-all outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 italic">
            {lang === 'bn' ? 'মোট কাস্টমার' : 'Total Customers'}: {customers.length} {lang === 'bn' ? 'জন' : ''}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 italic text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">{t.customerName}</th>
                <th className="px-6 py-4 italic text-[11px] font-bold text-gray-400 uppercase tracking-widest text-left">{t.customerPhone} & {t.shopAddress}</th>
                <th className="px-6 py-4 italic text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t.totalSpent}</th>
                <th className="px-6 py-4 italic text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{lang === 'bn' ? 'সর্বশেষ কেনাকাটা' : 'Last Purchase'}</th>
                <th className="px-6 py-4 italic text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                          <User size={20} />
                        </div>
                        <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone size={12} className="text-gray-300" /> {customer.phone}
                        </span>
                        {customer.address && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px] flex items-center gap-1">
                            <MapPin size={12} className="text-gray-200" /> {customer.address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-black">{formatCurrency(customer.totalSales)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {customer.lastPurchaseDate ? (
                        <span className="text-xs text-gray-500 font-medium">
                          {format(new Date(customer.lastPurchaseDate), 'PP', { locale: lang === 'bn' ? bn : enUS })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">{lang === 'bn' ? 'এখনো করেনি' : 'Never'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                          title={t.actions_edit}
                        >
                          <Edit2 size={16} />
                        </button>
                        {userProfile.role === 'owner' && (
                          <button 
                            onClick={() => {
                              if (window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই কাস্টমারকে ডিলিট করতে চান?' : 'Are you sure you want to delete this customer?')) {
                                onDeleteCustomer(customer.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title={t.actions_delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                    {lang === 'bn' ? 'কোন কাস্টমার পাওয়া যায়নি' : 'No customers found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
