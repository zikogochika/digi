
import { Product, Customer, Sale, Supplier } from './types';

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Thé Vert Sultan (200g)', category: 'Alimentation', price: 15.00, stock: 120, image: 'https://picsum.photos/200/200?random=1' },
  { id: '2', name: 'Huile d\'Olive (1L)', category: 'Alimentation', price: 85.00, stock: 5, image: 'https://picsum.photos/200/200?random=2' },
  { id: '3', name: 'Coca Cola (1L)', category: 'Boissons', price: 8.50, stock: 200, image: 'https://picsum.photos/200/200?random=3' },
  { id: '4', name: 'Eau Minérale Sidi Ali', category: 'Boissons', price: 5.00, stock: 300, image: 'https://picsum.photos/200/200?random=4' },
  { id: '5', name: 'Fromage Rouge (Kg)', category: 'Frais', price: 110.00, stock: 2, image: 'https://picsum.photos/200/200?random=5' },
  { id: '6', name: 'Pain Complet', category: 'Boulangerie', price: 2.50, stock: 50, image: 'https://picsum.photos/200/200?random=6' },
  { id: '7', name: 'Recharge Inwi 20DH', category: 'Télécom', price: 20.00, stock: 999, image: 'https://picsum.photos/200/200?random=7' },
  { id: '8', name: 'Couscous Dari (1kg)', category: 'Alimentation', price: 13.00, stock: 60, image: 'https://picsum.photos/200/200?random=8' },
];

export const MOCK_CUSTOMERS: Customer[] = [
  // Fixed: Added points property to each mock customer as required by the Customer interface
  { id: 'c1', name: 'Mohammed Benali', phone: '0661123456', balance: 150.00, lastVisit: '2024-05-10', points: 0 },
  { id: 'c2', name: 'Fatima Zahra', phone: '0663987654', balance: 0.00, lastVisit: '2024-05-12', points: 0 },
  { id: 'c3', name: 'Youssef El Idrissi', phone: '0655112233', balance: 420.50, lastVisit: '2024-05-08', points: 0 },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'sup1', name: 'Centrale Danone', phone: '0522112233', debt: 2500.00, category: 'Laiterie' },
  { id: 'sup2', name: 'Disway Distribution', phone: '0522445566', debt: 0.00, category: 'Telecom/Tech' },
  { id: 'sup3', name: 'Bimo / Mondelēz', phone: '0522998877', debt: 1200.50, category: 'Biscuits' },
];

export const MOCK_SALES: Sale[] = [
  { id: 's1', date: new Date(Date.now() - 86400000 * 2).toISOString(), items: [], total: 1250.00, paymentMethod: 'CASH' },
  { id: 's2', date: new Date(Date.now() - 86400000).toISOString(), items: [], total: 2100.00, paymentMethod: 'CASH' },
  { id: 's3', date: new Date().toISOString(), items: [], total: 850.00, paymentMethod: 'KARNE', customerId: 'c3' },
];

export const CHART_DATA = [
  { name: 'Lun', vente: 4000 },
  { name: 'Mar', vente: 3000 },
  { name: 'Mer', vente: 2000 },
  { name: 'Jeu', vente: 2780 },
  { name: 'Ven', vente: 1890 },
  { name: 'Sam', vente: 6390 },
  { name: 'Dim', vente: 3490 },
];
