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
  role: UserRole;
  shopId: string;
  name?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice: number;
  stock: number;
  barcode?: string;
  category: string;
  brand?: string;
  warranty?: string;
  unit: string;
  imageUrl?: string;
  shopId: string;
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
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  shopId: string;
  createdBy: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalSales: number;
  lastPurchaseDate?: number;
  shopId: string;
}

export type View = 'dashboard' | 'inventory' | 'pos' | 'history' | 'customers' | 'settings' | 'staff';
