import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit2, Trash2, X, Check, Copy, Printer, QrCode } from 'lucide-react';
import { Product, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../translations';
import QRCode from 'qrcode';

const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '110100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '110001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '110000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '001100001',
  'W': '111000000', 'X': '001110001', 'Y': '111110000', 'Z': '011100011',
  '-': '001000001', '.': '110000000', ' ': '011000010', '*': '010010100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010'
};

function SvgBarcode({ value }: { value: string }) {
  const sanitized = value.toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
  const code = `*${sanitized}*`;
  const elements: React.ReactNode[] = [];
  let currentX = 0;
  
  const narrowWidth = 1.2;
  const wideWidth = 3.2;
  const interGap = 1.2;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const bits = CODE39_MAP[char] || CODE39_MAP[' '];
    
    for (let b = 0; b < bits.length; b++) {
      const isBar = b % 2 === 0;
      const isWide = bits[b] === '1';
      const width = isWide ? wideWidth : narrowWidth;
      
      if (isBar) {
        elements.push(
          <rect 
            key={`${i}-${b}`} 
            x={currentX} 
            y={0} 
            width={width} 
            height={40} 
            fill="black" 
          />
        );
      }
      currentX += width;
    }
    currentX += interGap;
  }
  
  return (
    <div className="w-full h-8 flex items-center justify-center">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${currentX} 40`} 
        preserveAspectRatio="none"
      >
        {elements}
      </svg>
    </div>
  );
}

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'shopId'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  userProfile: UserProfile | null;
  lang: Language;
}

export default function Inventory({ products, onAddProduct, onUpdateProduct, onDeleteProduct, userProfile, lang }: InventoryProps) {
  const t = translations[lang];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Label printing states
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null);
  const [labelQuantity, setLabelQuantity] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'standard' | 'small'>('standard');
  const [barcodeType, setBarcodeType] = useState<'qr' | '1d'>('1d');
  const [showShopName, setShowShopName] = useState<boolean>(true);
  const [shopNameInput, setShopNameInput] = useState<string>('A.R Enterprise');
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showWarranty, setShowWarranty] = useState<boolean>(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (selectedProductForLabel && selectedProductForLabel.barcode) {
      QRCode.toDataURL(selectedProductForLabel.barcode, {
        margin: 1,
        width: 154,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Failed to generate QR code:', err);
          setQrCodeDataUrl('');
        });
    } else {
      setQrCodeDataUrl('');
    }
  }, [selectedProductForLabel, selectedProductForLabel?.barcode]);

  const handleAssignAutoBarcode = () => {
    if (!selectedProductForLabel) return;
    const prefix = selectedProductForLabel.category
      ? selectedProductForLabel.category.slice(0, 3).toUpperCase().replace(/[^a-zA-Z0-9]/g, 'PR')
      : 'AR';
    const rand = Math.floor(100000 + Math.random() * 900000);
    const newBarcode = `${prefix}-${rand}`;
    
    // Save current product with new barcode
    const updatedProduct = { ...selectedProductForLabel, barcode: newBarcode };
    onUpdateProduct(updatedProduct);
    setSelectedProductForLabel(updatedProduct);
  };

  const openLabelPrinter = (product: Product) => {
    setSelectedProductForLabel(product);
    setLabelQuantity(product.stock > 0 ? product.stock : 1);
    setBarcodeType('1d');
    setShopNameInput('A.R Enterprise');
  };

  const canEdit = userProfile?.role === 'owner' || userProfile?.role === 'inventory_manager';
  
  const brands = ['itel', 'samsung', 'symphony', 'Smart'];
  const categories = lang === 'bn' 
    ? ['মোবাইল', 'চার্জার', 'ইয়ারফোন', 'ব্যাটারি', 'কট', 'লাইট', 'ইলেকট্রিক']
    : ['Mobile', 'Charger', 'Earphone', 'Battery', 'Cable', 'Light', 'Electric'];

  const [selectedBrand, setSelectedBrand] = useState('');
  const [customBrand, setCustomBrand] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    purchasePrice: 0,
    stock: 0,
    barcode: '',
    category: 'মোবাইল',
    brand: '',
    warranty: '১ বছর',
    warrantyTerms: '',
    requiresSerial: false,
    hasEMI: false,
    unit: 'পিস',
    technicalSpecs: '',
    commissionType: 'flat',
    commissionValue: 0
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.price >= 0) {
      const finalBrand = selectedBrand === 'Other' ? customBrand : selectedBrand;
      const finalData = { ...formData, brand: finalBrand };

      if (editingId) {
        const original = products.find(p => p.id === editingId);
        if (original) {
          onUpdateProduct({ ...original, ...finalData });
        }
        setEditingId(null);
      } else {
        onAddProduct(finalData);
      }
      setFormData({ 
        name: '', 
        price: 0, 
        purchasePrice: 0, 
        stock: 0, 
        barcode: '', 
        category: lang === 'bn' ? 'মোবাইল' : 'Mobile', 
        brand: '', 
        warranty: lang === 'bn' ? '১ বছর' : '1 Year', 
        warrantyTerms: '',
        requiresSerial: false,
        hasEMI: false,
        unit: lang === 'bn' ? 'পিস' : 'Piece',
        technicalSpecs: '',
        commissionType: 'flat',
        commissionValue: 0
      });
      setSelectedBrand('');
      setCustomBrand('');
      setIsAdding(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    const isStandardBrand = brands.includes(product.brand || '');
    setSelectedBrand(product.brand ? (isStandardBrand ? product.brand : 'Other') : '');
    setCustomBrand(isStandardBrand ? '' : (product.brand || ''));
    setFormData({
      name: product.name,
      price: product.price,
      purchasePrice: product.purchasePrice || 0,
      stock: product.stock,
      barcode: product.barcode || '',
      category: product.category,
      brand: product.brand || '',
      warranty: product.warranty || '',
      warrantyTerms: product.warrantyTerms || '',
      requiresSerial: !!product.requiresSerial,
      hasEMI: !!product.hasEMI,
      unit: product.unit,
      technicalSpecs: product.technicalSpecs || '',
      commissionType: product.commissionType || 'flat',
      commissionValue: product.commissionValue || 0
    });
    setIsAdding(true);
  };

  const duplicateProduct = (product: Product) => {
    const { id, ...data } = product;
    // Pre-fill form but as "Adding new"
    setEditingId(null);
    const isStandardBrand = brands.includes(product.brand || '');
    setSelectedBrand(product.brand ? (isStandardBrand ? product.brand : 'Other') : '');
    setCustomBrand(isStandardBrand ? '' : (product.brand || ''));
    setFormData({
      name: `${product.name} (Copy)`,
      price: product.price,
      purchasePrice: product.purchasePrice || 0,
      stock: product.stock,
      barcode: '', // Clear barcode for duplicates as it should be unique
      category: product.category,
      brand: product.brand || '',
      warranty: product.warranty || '',
      warrantyTerms: product.warrantyTerms || '',
      requiresSerial: !!product.requiresSerial,
      hasEMI: !!product.hasEMI,
      unit: product.unit,
      technicalSpecs: product.technicalSpecs || '',
      commissionType: product.commissionType || 'flat',
      commissionValue: product.commissionValue || 0
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t.searchProducts}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pro-input pl-11 shadow-sm"
          />
        </div>
        {canEdit && (
          <button
            onClick={() => {
              if (isAdding) {
                setEditingId(null);
                setFormData({ 
                  name: '', 
                  price: 0, 
                  purchasePrice: 0, 
                  stock: 0, 
                  barcode: '', 
                  category: lang === 'bn' ? 'মোবাইল' : 'Mobile', 
                  brand: '', 
                  warranty: lang === 'bn' ? '১ বছর' : '1 Year', 
                  warrantyTerms: '',
                  requiresSerial: false,
                  hasEMI: false,
                  unit: lang === 'bn' ? 'পিস' : 'Piece'
                });
              }
              setIsAdding(!isAdding);
            }}
            className={cn(
              "h-11 shadow-sm",
              isAdding ? "pro-btn-secondary" : "pro-btn-primary"
            )}
          >
            {isAdding ? t.close : <><Plus size={20} /> {t.addProduct}</>}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit} 
            className="pro-card p-6 lg:p-8 space-y-8 bg-white border-none shadow-xl ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">{editingId ? t.editProduct : t.addProduct}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.productName}</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pro-input py-2"
                    placeholder={lang === 'bn' ? 'যেমন: স্যামসাং গ্যালাক্সি...' : 'e.g. Samsung Galaxy...'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.price}</label>
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="pro-input py-2"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.purchasePrice}</label>
                  <input
                    required
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })}
                    className="pro-input py-2"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.stock}</label>
                  <input
                    required
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) })}
                    className="pro-input py-2"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{lang === 'bn' ? 'বারকোড' : 'Barcode'}</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="pro-input py-2"
                    placeholder={t.barcodePlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.category}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="pro-input py-2 appearance-none bg-no-repeat bg-[right_0.75rem_center] cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='slate-400' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.brand}</label>
                  <div className="space-y-2">
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="pro-input py-2 appearance-none bg-no-repeat bg-[right_0.75rem_center] cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='slate-400' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                    >
                      <option value="">{lang === 'bn' ? 'ব্র্যান্ড সিলেক্ট করুন' : 'Select Brand'}</option>
                      {brands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Other">{lang === 'bn' ? 'অন্যান্য (Other)' : 'Other'}</option>
                    </select>
                    {selectedBrand === 'Other' && (
                      <input
                        type="text"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        className="pro-input py-2"
                        placeholder={lang === 'bn' ? 'ব্র্যান্ডের নাম লিখুন...' : 'Type brand name...'}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.warranty}</label>
                  <select
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    className="pro-input py-2 appearance-none bg-no-repeat bg-[right_0.75rem_center] cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='slate-400' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                  >
                    <option value="">{lang === 'bn' ? 'ওয়ারেন্টি নেই' : 'No Warranty'}</option>
                    <option value={lang === 'bn' ? '৩ মাস' : '3 Months'}>{lang === 'bn' ? '৩ মাস' : '3 Months'}</option>
                    <option value={lang === 'bn' ? '৬ মাস' : '6 Months'}>{lang === 'bn' ? '৬ মাস' : '6 Months'}</option>
                    <option value={lang === 'bn' ? '১ বছর' : '1 Year'}>{lang === 'bn' ? '১ বছর' : '1 Year'}</option>
                    <option value={lang === 'bn' ? '২ বছর' : '2 Years'}>{lang === 'bn' ? '২ বছর' : '2 Years'}</option>
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
                    {lang === 'bn' ? 'ওয়ারেন্টির শর্তাবলী (Warranty Terms)' : 'Warranty Terms & Conditions'}
                  </label>
                  <input
                    type="text"
                    value={formData.warrantyTerms}
                    onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                    className="pro-input py-2"
                    placeholder={lang === 'bn' ? 'যেমন: শুধুমাত্র পার্টস ওয়ারেন্টি, ভাঙা বা পানিতে ভেজা গ্রহণযোগ্য নয়।' : 'e.g., Parts warranty only. Physical or liquid damage is not covered.'}
                  />
                </div>

                {/* Salesman Commission settings */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-indigo-500 uppercase tracking-tight">
                    {lang === 'bn' ? 'কমিশন টাইপ' : 'Commission Type'}
                  </label>
                  <select
                    value={formData.commissionType || 'flat'}
                    onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                    className="pro-input py-2 appearance-none bg-no-repeat bg-[right_0.75rem_center] cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='slate-400' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                  >
                    <option value="flat">{lang === 'bn' ? 'ফ্ল্যাট / নির্দিষ্ট পরিমাণ (৳)' : 'Flat Amount (Cash)'}</option>
                    <option value="percentage">{lang === 'bn' ? 'শতকরা ( % )' : 'Percentage ( % )'}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-indigo-500 uppercase tracking-tight">
                    {lang === 'bn' ? 'কমিশন মান (Value)' : 'Commission Value'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.commissionValue || 0}
                    onChange={(e) => setFormData({ ...formData, commissionValue: parseFloat(e.target.value) || 0 })}
                    className="pro-input py-2"
                    placeholder={lang === 'bn' ? 'যেমন: ৫০ বা ১০%' : 'e.g., 50 or 10'}
                  />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight text-indigo-600 dark:text-indigo-400">
                    🔧 {lang === 'bn' ? 'প্রোডাক্টের বিবরণ ও স্পেসিফিকেশন (Technical Specs)' : 'Technical Specifications (RAM, CPU, Specs)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.technicalSpecs}
                    onChange={(e) => setFormData({ ...formData, technicalSpecs: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-none transition-all font-semibold resize-none text-slate-700"
                    placeholder={lang === 'bn' ? 'যেমন: 16GB DDR4 RAM, 512GB NVMe SSD, Intel Core i5 12th Gen' : 'e.g. 16GB DDR4 RAM, 512GB NVMe SSD, Intel Core i5 12th Gen'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{t.unit}</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="pro-input py-2 appearance-none bg-no-repeat bg-[right_0.75rem_center] cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='slate-400' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                  >
                    <option value={lang === 'bn' ? 'পিস' : 'Piece'}>{lang === 'bn' ? 'পিস' : 'Piece'}</option>
                    <option value={lang === 'bn' ? 'কেজি' : 'KG'}>{lang === 'bn' ? 'কেজি' : 'KG'}</option>
                    <option value={lang === 'bn' ? 'লিটার' : 'Litre'}>{lang === 'bn' ? 'লিটার' : 'Litre'}</option>
                    <option value={lang === 'bn' ? 'প্যাকেট' : 'Packet'}>{lang === 'bn' ? 'প্যাকেট' : 'Packet'}</option>
                  </select>
                </div>

                {/* Electronics Trackings - Full Row */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-slate-100 dark:border-slate-800/20">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.requiresSerial}
                      onChange={(e) => setFormData({ ...formData, requiresSerial: e.target.checked })}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div>
                      <span className="block text-xs font-black text-slate-800 dark:text-slate-200">
                        {lang === 'bn' ? 'সিরিয়াল / IMEI ট্র্যাকিং সক্রিয় করুন' : 'Enable Serial / IMEI Tracking'}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {lang === 'bn' 
                          ? 'বিক্রয় করার সময় প্রতিটি পিসের জন্য আলাদা ইউনিক সিরিয়াল/IMEI নম্বর এন্ট্রি নেওয়া হবে।' 
                          : 'Prompt for unique serial/IMEI key scan/input for each unit sold during billing.'}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.hasEMI}
                      onChange={(e) => setFormData({ ...formData, hasEMI: e.target.checked })}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div>
                      <span className="block text-xs font-black text-slate-800 dark:text-slate-200">
                        {lang === 'bn' ? 'কিস্তিতে (EMI) বিক্রির সুবিধা দিন' : 'Allow EMI / Installments'}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {lang === 'bn' 
                          ? 'এই পণ্যটির জন্য কাস্টমার কিস্তিতে পেমেন্ট করার সুবিধা পাবে (EMI Calculator সক্রিয় হবে)' 
                          : 'Tag product as EMI eligible to display installment options in cart checkout.'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex items-end gap-3 lg:col-span-3 pt-2">
                  <button type="submit" className="pro-btn-primary flex-1 py-3 text-base shadow-indigo-100 animate-pulse-subtle">
                    <Check size={20} className="mr-1" />
                    {editingId ? t.updateProduct : t.saveProduct}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setIsAdding(false);
                        setFormData({ 
                          name: '', 
                          price: 0, 
                          purchasePrice: 0, 
                          stock: 0, 
                          barcode: '', 
                          category: lang === 'bn' ? 'মোবাইল' : 'Mobile', 
                          brand: '', 
                          warranty: lang === 'bn' ? '১ বছর' : '1 Year', 
                          warrantyTerms: '',
                          requiresSerial: false,
                          hasEMI: false,
                          unit: lang === 'bn' ? 'পিস' : 'Piece'
                        });
                      }}
                      className="p-3 pro-btn-secondary text-slate-500"
                    >
                      <X size={22} />
                    </button>
                  )}
                </div>
              </div>
            </motion.form>
        )}
      </AnimatePresence>

      <div className="pro-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.productInfo}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.category}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.purchasePrice}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.price}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight border-r border-slate-100">{t.stockStatus}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-tight">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{product.name}</p>
                          {product.technicalSpecs && (
                            <p className="text-[10px] text-slate-500 font-medium italic mt-0.5 leading-snug max-w-[280px] break-words">🔧 Specs: {product.technicalSpecs}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {product.brand && (
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{product.brand}</span>
                            )}
                            {product.warranty && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1 rounded">🛡️ {product.warranty}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-tight">
                        {product.category || t.uncategorized}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-400 italic line-through decoration-slate-200">{formatCurrency(product.purchasePrice || 0)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-bold",
                          product.stock <= 5 ? "text-red-500" : "text-slate-700"
                        )}>
                          {product.stock} {product.unit}
                        </span>
                        {product.stock <= 5 && (
                          <span className="text-[9px] text-red-500 uppercase font-bold tracking-tight bg-red-50 px-1.5 py-0.5 rounded w-fit mt-1">{t.lowStockWarning}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canEdit ? (
                          <>
                            <button 
                              onClick={() => openLabelPrinter(product)}
                              className="p-2 transition-all text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg animate-fadeIn"
                              title={lang === 'bn' ? 'লেবেল প্রিন্ট করুন' : 'Print Label'}
                            >
                              <Printer size={16} />
                            </button>
                            <button 
                              onClick={() => startEdit(product)}
                              className="p-2 transition-all text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              title={t.actions_edit}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => duplicateProduct(product)}
                              className="p-2 transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title={lang === 'bn' ? 'কপি করুন' : 'Duplicate'}
                            >
                              <Copy size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(t.confirmDeleteProduct)) {
                                  onDeleteProduct(product.id);
                                }
                              }}
                              className="p-2 transition-all text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                              title={t.actions_delete}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic font-medium">{lang === 'bn' ? 'রিড-অনলি' : 'Read-only'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={40} className="opacity-20 text-slate-400" />
                      <span className="text-sm font-bold uppercase tracking-tight">
                        {searchQuery ? t.noProductsFound : t.noProductsAdded}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Label Printing Modal Overlay */}
      <AnimatePresence>
        {selectedProductForLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto flex flex-col gap-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-500">
                    <Printer size={22} className="stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-slate-900">
                      {lang === 'bn' ? 'লেবেল প্রিন্টার' : 'Custom Label Printer'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'bn' 
                        ? 'থার্মাল প্রিন্টারের জন্য বারকোড এবং কিউআর কোড লেবেল কাস্টমাইজ করুন' 
                        : 'Customize barcode and QR code stickers for thermal label printers'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedProductForLabel(null)}
                  className="p-2 transition-all hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-left">
                {/* Left Column: Interactive WYSIWYG Preview */}
                <div className="col-span-12 md:col-span-5 flex flex-col items-center gap-6 bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {lang === 'bn' ? 'লেবেল প্রিভিউ (WYSIWYG)' : 'Label Preview (WYSIWYG)'}
                  </h4>

                  {/* Simulated Thermal Sticker */}
                  <div 
                    className={cn(
                      "relative bg-white border-2 border-slate-300 rounded shadow-sm flex flex-col justify-between p-3 overflow-hidden select-none text-black",
                      labelSize === 'standard' ? "w-[240px] h-[144px]" : "w-[200px] h-[131px]"
                    )}
                  >
                    {/* Shop Header */}
                    {showShopName && (
                      <div className="text-[10px] font-bold text-slate-700 tracking-tight text-center truncate uppercase">
                        {shopNameInput || 'Shop'}
                      </div>
                    )}

                    {/* Product Info */}
                    {showProductName && (
                      <div className="text-xs font-black text-slate-900 leading-tight text-center uppercase tracking-wide px-1 line-clamp-2">
                        {selectedProductForLabel.name}
                      </div>
                    )}

                    {/* Code image or svg barcode */}
                    {selectedProductForLabel.barcode ? (
                      <div className="flex flex-col items-center justify-center grow my-1 overflow-hidden">
                        {barcodeType === 'qr' ? (
                          qrCodeDataUrl ? (
                            <img 
                              src={qrCodeDataUrl} 
                              className="h-[50px] w-[50px] object-contain shrink-0 mix-blend-multiply" 
                              alt="QR Code" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono animate-pulse">Generating...</span>
                          )
                        ) : (
                          <div className="w-full flex flex-col items-center justify-center px-1">
                            <div className="w-[85%] h-8 overflow-hidden">
                              <SvgBarcode value={selectedProductForLabel.barcode} />
                            </div>
                            <span className="font-mono text-[9px] tracking-widest text-slate-700 mt-1 uppercase">
                              *{selectedProductForLabel.barcode}*
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border border-dashed border-red-200 bg-red-50/50 rounded-xl p-2 w-full flex flex-col items-center justify-center grow">
                        <QrCode size={24} className="text-red-400/50 mb-1" />
                        <span className="text-[9px] font-bold uppercase tracking-tight text-red-500">
                          {lang === 'bn' ? 'বারকোড নেই' : 'No Barcode Added'}
                        </span>
                      </div>
                    )}

                    {/* Bottom tag bar */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-xs">
                      {showPrice && (
                        <span className="font-black text-slate-900">
                          ৳{selectedProductForLabel.price}
                        </span>
                      )}
                      {showWarranty && selectedProductForLabel.warranty && (
                        <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
                          🛡️ {selectedProductForLabel.warranty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="w-full space-y-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={!selectedProductForLabel.barcode}
                      className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-40 cursor-pointer border-none outline-none"
                    >
                      <Printer size={18} className="stroke-[2.5]" />
                      {lang === 'bn' ? 'কনফার্ম ও প্রিন্ট' : 'Confirm & Print'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedProductForLabel(null)}
                      className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>

                {/* Right Column: Settings Panel */}
                <div className="col-span-12 md:col-span-7 space-y-6">
                  {/* Sizing Selectors */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'bn' ? 'লেবেল সাইজ' : 'Label Dimension / Size'}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setLabelSize('standard')}
                        className={cn(
                          "p-4 border text-left rounded-2xl transition-all flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer w-full",
                          labelSize === 'standard' 
                            ? "border-indigo-600 bg-indigo-50/40 text-slate-900" 
                            : "border-slate-200 bg-white hover:bg-slate-50/40 text-slate-600"
                        )}
                      >
                        <span className="font-extrabold text-sm block">Standard Label</span>
                        <span className="text-xs text-slate-400 font-mono mt-1">50mm x 30mm</span>
                        {labelSize === 'standard' && (
                          <div className="absolute top-3 right-3 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLabelSize('small')}
                        className={cn(
                          "p-4 border text-left rounded-2xl transition-all flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer w-full",
                          labelSize === 'small' 
                            ? "border-indigo-600 bg-indigo-50/40 text-slate-900" 
                            : "border-slate-200 bg-white hover:bg-slate-50/40 text-slate-600"
                        )}
                      >
                        <span className="font-extrabold text-sm block">Small Label</span>
                        <span className="text-xs text-slate-400 font-mono mt-1">38mm x 25mm</span>
                        {labelSize === 'small' && (
                          <div className="absolute top-3 right-3 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </button>
                    </div>
                  </div>



                  {/* Print Quantity Controls */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'bn' ? 'লেবেল পরিমাণ' : 'Print Copies / Quantity'}
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center bg-slate-100 rounded-2xl border border-slate-200/50 p-1 h-12 max-w-[150px]">
                        <button
                          type="button"
                          onClick={() => setLabelQuantity(prev => Math.max(1, prev - 1))}
                          className="w-10 h-10 rounded-xl hover:bg-white text-slate-600 hover:text-indigo-600 transition-all font-extrabold text-lg flex items-center justify-center cursor-pointer border-none outline-none"
                        >
                          -
                        </button>
                        <input
                          required
                          type="number"
                          min="1"
                          value={labelQuantity}
                          onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 text-center bg-transparent border-none text-slate-800 font-extrabold text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setLabelQuantity(prev => prev + 1)}
                          className="w-10 h-10 rounded-xl hover:bg-white text-slate-600 hover:text-indigo-600 transition-all font-extrabold text-[15px] flex items-center justify-center cursor-pointer border-none outline-none"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLabelQuantity(selectedProductForLabel.stock > 0 ? selectedProductForLabel.stock : 1)}
                        className="px-4 py-3 border border-slate-200 text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/20 text-xs font-black rounded-2xl transition-all h-12 flex items-center justify-center cursor-pointer uppercase tracking-widest leading-none shrink-0 bg-transparent"
                      >
                        {lang === 'bn' 
                          ? `বর্তমান স্টক সেট করুন (${selectedProductForLabel.stock} কপি)` 
                          : `Match Current Stock (${selectedProductForLabel.stock} pcs)`}
                      </button>
                    </div>
                  </div>

                  {/* Detail Layout Options */}
                  <div className="space-y-4 border-t border-slate-100 pt-5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'bn' ? 'লেআউট সেটিংস' : 'Display Overlays / Layout'}
                    </label>

                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      {/* Shop name toggle and input */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showShopName}
                            onChange={(e) => setShowShopName(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span className="text-sm font-bold text-slate-700">
                            {lang === 'bn' ? 'দোকানের নাম দেখান' : 'Show Shop Title'}
                          </span>
                        </label>
                        {showShopName && (
                          <input
                            type="text"
                            value={shopNameInput}
                            onChange={(e) => setShopNameInput(e.target.value)}
                            className="pro-input py-1.5 text-xs font-semibold pl-3"
                            placeholder="Shop name"
                          />
                        )}
                      </div>

                      {/* Show product name toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showProductName}
                          onChange={(e) => setShowProductName(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {lang === 'bn' ? 'প্রোডাক্টের নাম দেখান' : 'Show Product Name'}
                        </span>
                      </label>

                      {/* Show price toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showPrice}
                          onChange={(e) => setShowPrice(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {lang === 'bn' ? 'মূল্য দেখান' : 'Show Product Price'}
                        </span>
                      </label>

                      {/* Show warranty toggle */}
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showWarranty}
                          onChange={(e) => setShowWarranty(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          {lang === 'bn' ? 'ওয়ারেন্টি দেখান' : 'Show Warranty Seal'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Error Handler / Missing Barcode Auto-Assistant */}
                  {!selectedProductForLabel.barcode && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-slate-700 space-y-3">
                      <div className="flex gap-2">
                        <div className="text-amber-500 shrink-0">⚠️</div>
                        <div>
                          <h5 className="text-xs font-black uppercase text-amber-800 tracking-wide">
                            {lang === 'bn' ? 'বারকোড তথ্য অনুপস্থিত!' : 'Missing Scanning Barcode!'}
                          </h5>
                          <p className="text-xs text-amber-700 mt-1">
                            {lang === 'bn' 
                              ? 'ইনভেন্টরিতে এই প্রোডাক্টটির কোনো স্ক্যানিং নম্বর বা বারকোড নেই। একটি নম্বর ছাড়া লেবেল ডাউনলোড বা প্রিন্ট করা যাবে না।' 
                              : 'This product has no barcode. To enable scans in the POS dashboard, auto-generate a custom identifier below.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAssignAutoBarcode}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/10 uppercase tracking-widest border-none outline-none"
                      >
                        <span>🪄</span>
                        {lang === 'bn' ? 'অটো-তৈরি এবং সেভ করুন' : 'Auto-Generate & Assign'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Printable Area for paper label printer */}
      {selectedProductForLabel && (
        <div id="printable-labels-area" className="hidden font-sans bg-white text-black" style={{ display: 'none' }}>
          <style>{`
            @media print {
              html, body {
                background: #fff !important;
                color: #000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
              }
              #printable-labels-area {
                display: block !important;
                background-color: white !important;
                color: black !important;
              }
              .print-label-item {
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                align-items: center !important;
                page-break-after: always !important;
                break-after: page !important;
                border: 1px solid #000 !important;
                box-sizing: border-box !important;
                padding: 2mm !important;
                margin: 0 auto !important;
                background-color: white !important;
                color: black !important;
                overflow: hidden !important;
              }
              .print-label-item:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
          `}</style>
          {Array.from({ length: labelQuantity }).map((_, idx) => {
            const barcodeValue = selectedProductForLabel.barcode || '';
            
            return (
              <div 
                key={idx} 
                className="print-label-item text-center flex flex-col justify-between items-center"
                style={{
                  width: labelSize === 'standard' ? '50mm' : '38mm',
                  height: labelSize === 'standard' ? '30mm' : '25mm',
                  maxWidth: labelSize === 'standard' ? '50mm' : '38mm',
                  maxHeight: labelSize === 'standard' ? '30mm' : '25mm',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {/* Shop Name */}
                {showShopName && (
                  <div 
                    className="font-bold tracking-tight text-center truncate w-full uppercase"
                    style={{
                      fontSize: labelSize === 'standard' ? '9px' : '7.5px',
                      lineHeight: '1.1'
                    }}
                  >
                    {shopNameInput}
                  </div>
                )}

                {/* Product Name */}
                {showProductName && (
                  <div 
                    className="font-extrabold text-center tracking-wide uppercase"
                    style={{
                      fontSize: labelSize === 'standard' ? '11px' : '9px',
                      lineHeight: '1.2',
                      maxHeight: '2.4em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      width: '100%'
                    }}
                  >
                    {selectedProductForLabel.name}
                  </div>
                )}

                {/* Barcode representation */}
                {barcodeValue ? (
                  <div className="flex flex-col items-center justify-center w-full grow my-0.5 overflow-hidden">
                    {barcodeType === 'qr' ? (
                      qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          className="object-contain" 
                          style={{
                            height: labelSize === 'standard' ? '12mm' : '9mm',
                            width: labelSize === 'standard' ? '12mm' : '9mm'
                          }}
                          alt="QR Code"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span style={{ fontSize: '7px' }}>Generating...</span>
                      )
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center">
                        <div className="w-[85%] overflow-hidden">
                          <SvgBarcode value={barcodeValue} />
                        </div>
                        <span className="font-mono tracking-widest font-semibold text-center" style={{ fontSize: '7px', marginTop: '1px' }}>
                          *{barcodeValue.toUpperCase()}*
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-black/40 rounded p-1 w-full flex items-center justify-center grow">
                    <span style={{ fontSize: '7px' }} className="font-bold uppercase tracking-tight text-slate-400">No Barcode</span>
                  </div>
                )}

                {/* Bottom Row (Price and Warranty) */}
                <div className="flex items-center justify-between w-full border-t border-black/20 pt-0.5 shrink-0">
                  {showPrice && (
                    <div 
                      className="font-black text-left"
                      style={{
                        fontSize: labelSize === 'standard' ? '11px' : '8.5px',
                        lineHeight: '1'
                      }}
                    >
                      {lang === 'bn' ? `৳${selectedProductForLabel.price}` : `৳${selectedProductForLabel.price}`}
                    </div>
                  )}
                  {showWarranty && selectedProductForLabel.warranty && (
                    <div 
                      className="font-semibold text-right"
                      style={{
                        fontSize: labelSize === 'standard' ? '7.5px' : '6px',
                        lineHeight: '1'
                      }}
                    >
                      🛡️ {selectedProductForLabel.warranty}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
