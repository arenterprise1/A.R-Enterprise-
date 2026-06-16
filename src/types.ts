export type UserRole = 'owner' | 'inventory_manager' | 'cashier';

export interface StaffMember {
  id: string;
  email: string;
  role: UserRole;
  shopId: string;
  name?: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  role: UserRole;
  shopId: string;
  name?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionDate?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice: number;
  stock: number;
  minStockLevel?: number; // Minimum stock level for Low Stock Alerts
  barcode?: string;
  category: string;
  brand?: string;
  warranty?: string;
  warrantyTerms?: string;
  requiresSerial?: boolean;
  hasEMI?: boolean;
  unit: string;
  imageUrl?: string;
  shopId: string;
  outletId?: string; // outlet binding
  technicalSpecs?: string; // Technical specification details (e.g. RAM, Processor, SSD, screen, etc.)
  commissionType?: 'percentage' | 'fixed'; // Commission type
  commissionValue?: number; // Default commission value
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  warranty?: string;
  warrantyTerms?: string;
  serialNumbers?: string[];
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  commissionAmount?: number;
}

export interface InstallmentPayment {
  id: string;
  amount: number;
  date: number;
  installmentNo: number;
  paymentMethod: string;
}

export interface EMIDetails {
  downPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  installmentInterval: 'monthly' | 'weekly';
  nextInstallmentDate: number;
  installmentHistory: InstallmentPayment[];
}

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  payableAmount: number;
  dueAmount?: number; // Outstanding amount (বাকি) for credit sales
  paymentStatus?: 'paid' | 'partially_paid' | 'unpaid'; // Status (পরিশোধিত, আংশিক, অপরিশোধিত)
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  shopId: string;
  createdBy: string;
  paymentMethod?: 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'qr';
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountType?: 'percentage' | 'fixed' | 'promo' | 'loyalty';
  promoCode?: string;
  digitalReceiptSent?: boolean;
  receiptSentType?: 'sms' | 'email';
  receiptSentValue?: string;
  outletId?: string; // Active Outlet representation
  offline?: boolean; // Local sync flag
  isEMI?: boolean;
  emiDetails?: EMIDetails;
  salesmanId?: string; // Salesman who made the sale
  salesmanName?: string; // Salesman name
  commissionAmount?: number; // Total commission earned on this sale
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  shopId: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalSales: number;
  totalDue?: number; // Total outstanding balance across all transactions (বাকি খাতা)
  lastPurchaseDate?: number;
  shopId: string;
  points?: number; // Loyalty points balance
}

export type View = 'dashboard' | 'inventory' | 'pos' | 'history' | 'customers' | 'settings' | 'staff' | 'servicing' | 'rma' | 'warehouses' | 'commissions' | 'smartsearch' | 'logout';

export interface ServiceJob {
  id: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  serialOrImei?: string;
  problemDescription: string;
  repairCost: number;
  advancePaid: number;
  status: 'pending' | 'repairing' | 'fixed' | 'delivered' | 'cancelled';
  technicianNotes?: string;
  createdAt: number;
  promisedDate?: number;
}

export interface RMA {
  id: string;
  shopId: string;
  productName: string;
  serialOrImei: string;
  supplierName: string;
  status: 'sent_to_supplier' | 'received_from_supplier' | 'delivered_to_customer';
  warrantyDate: number; // when sent
  returnDate?: number; // when received back
  notes?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  phone: string;
  shopId: string;
  createdAt: number;
}

export interface WarehouseStock {
  id: string; // warehouseId + "_" + productId
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  category: string;
  brand?: string;
  stock: number;
  shopId: string;
}

export interface WarehouseTransfer {
  id: string;
  productId: string;
  productName: string;
  sourceWarehouseId: string; // or 'showroom'
  sourceWarehouseName: string;
  destWarehouseId: string;
  destWarehouseName: string;
  quantity: number;
  timestamp: number;
  shopId: string;
  createdBy: string;
}

export interface SMSAlert {
  id: string;
  shopId: string;
  customerPhone: string;
  customerName: string;
  message: string;
  type: 'emi_reminder' | 'repair_pickup' | 'custom';
  status: 'sent' | 'pending' | 'failed';
  timestamp: number;
}


