
export interface Tenant {
  id: string;
  companyName: string;
  email: string;
  planId: string;
  modules: {
    pos: boolean;
    stock: boolean;
    ai: boolean;
    accounting: boolean;
  };
  isActive: boolean;
  createdAt: string;
  expiryDate?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  modules: {
    pos: boolean;
    stock: boolean;
    ai: boolean;
    accounting: boolean;
  };
  isPopular?: boolean;
}

export interface LandingFeature {
  title: string;
  text: string;
  icon: string;
}

export interface LandingPageConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  featuresTitle: string;
  plansTitle: string;
  features: LandingFeature[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'MANAGER';
    tenantId?: string;
    modules?: {
        pos: boolean;
        stock: boolean;
        ai: boolean;
        accounting: boolean;
    }
  };
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  stock: number;
  minStock?: number;
  image: string;
  costPrice?: number;
  barcode?: string;
  tva?: number;
  variants?: { name: string; price: number; stock: number }[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'CASSE' | 'PERTE';
  quantity: number;
  date: string;
  reason?: string;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'CAISSIER' | 'MANAGER' | 'SUPER_ADMIN';
  avatar: string;
}

export interface Sale {
  id: string;
  date: string; 
  items: CartItem[];
  total: number;
  advance?: number;
  paymentMethod: string;
  customerId?: string;
  userId?: string;
  isPaid?: boolean;
}

export interface Document {
  id: string;
  type: 'FACTURE' | 'DEVIS' | 'BON_LIVRAISON';
  date: string;
  customerId: string;
  items: CartItem[];
  total: number;
  advance?: number;
  status: 'PAYÉ' | 'EN_ATTENTE' | 'ANNULÉ' | 'CONVERTI';
  notes?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  date: string;
  items: { name: string; quantity: number; cost: number }[];
  total: number;
  invoiceImageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  lastVisit: string;
  points: number;
  ice?: string;
  address?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  debt: number;
  category: string;
  ice?: string;
  address?: string;
  notes?: string;
}

export interface Settlement {
  id: string;
  entityId: string;
  entityName: string;
  type: 'CUSTOMER_IN' | 'SUPPLIER_OUT';
  amount: number;
  date: string;
  method: string;
  note?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'LOYER' | 'ELECTRICITE' | 'TRANSPORT' | 'SALAIRE' | 'AUTRE' | 'IMPOT';
  date: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  ice: string;
  rc?: string;
  if?: string;
  patente?: string;
  logoUrl: string;
  invoiceTemplate: 'THERMAL' | 'A4_STANDARD' | 'A4_MODERN';
  documentFormat: 'A4' | 'A5';
  currency: string;
  tvaEnabled: boolean;
  taxRate?: number;
  customPaymentMethods?: string[];
}

export enum AppView {
  LOGIN = 'LOGIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  KARNE = 'KARNE',
  STOCK = 'STOCK',
  SUPPLIERS = 'SUPPLIERS',
  EXPENSES = 'EXPENSES',
  AI_COACH = 'AI_COACH',
  BILLING = 'BILLING',
  PURCHASES = 'PURCHASES',
  USERS = 'USERS',
  SETTINGS = 'SETTINGS',
  REPORTS = 'REPORTS'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
