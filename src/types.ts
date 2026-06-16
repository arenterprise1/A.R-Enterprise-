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
  unit: string;
  imageUrl?: string;
  shopId: string;
  outletId?: string; // outlet binding
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  warranty?: string;
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

export type View = 'dashboard' | 'inventory' | 'pos' | 'history' | 'customers' | 'settings' | 'staff' | 'logout';
