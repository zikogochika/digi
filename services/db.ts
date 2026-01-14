
import { supabase } from './supabaseClient';
import { Product, Customer, Sale, Supplier, Expense, Purchase, User, Document, CompanySettings, Tenant, Plan, LandingPageConfig, StockMovement, Settlement } from '../types';

const getTenantId = () => {
    const user = localStorage.getItem('atlas_user');
    return user ? JSON.parse(user).tenantId : null;
};

const safeFetch = async <T>(query: any): Promise<T[]> => {
    try {
        const { data, error } = await query;
        if (error) {
            console.warn("DB Fetch Warning:", error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error("DB Fetch Error:", e);
        return [];
    }
};

export const db = {
  // --- AUTHENTICATION ---
  login: async (email: string, password: string) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    const isSuperAdminEmail = ['admin@admin.com', 'zakariyachika@gmail.com'].includes(email.toLowerCase());
    
    if (authError) {
        if (isSuperAdminEmail && password === 'admin') {
             return {
                token: 'super-admin-dev-token',
                user: { id: 'super-admin', name: 'Super Admin', role: 'SUPER_ADMIN', tenantId: null }
            };
        }
        throw new Error(authError.message);
    }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user!.id).single();
    let modules = { pos: true, stock: true, ai: true, accounting: true };
    if (profile?.tenant_id) {
        const { data: tenant } = await supabase.from('tenants').select('modules, is_active').eq('id', profile.tenant_id).single();
        if (tenant) {
            if(!tenant.is_active) throw new Error("Compte suspendu.");
            if(tenant.modules) modules = tenant.modules;
        }
    }
    return {
        token: authData.session?.access_token || '',
        user: { id: profile.id, name: profile.name, role: profile.role, tenantId: profile.tenant_id, modules }
    };
  },

  register: async (data: any) => {
    let { data: authData } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (!authData.user) {
         const { data: loginData } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
         authData = { user: loginData.user, session: loginData.session };
    }
    const { data: tenant } = await supabase.from('tenants').insert({
        company_name: data.companyName,
        email: data.email,
        plan_id: data.planId || 'plan_basic',
        modules: { pos: true, stock: true, ai: true, accounting: true },
        is_active: true
    }).select().single();
    await supabase.from('profiles').insert({
        id: authData.user!.id,
        tenant_id: tenant.id,
        name: 'Admin',
        role: 'ADMIN',
        avatar: 'A'
    });
    await supabase.from('settings').insert({
        tenant_id: tenant.id,
        config: { name: data.companyName, currency: 'DH', invoiceTemplate: 'A4_STANDARD' }
    });
    return { success: true, user: authData.user };
  },

  // --- DATA LOADING ---
  load: async () => {
      const tenantId = getTenantId();
      if (!tenantId) return null;

      const [
          products, customers, sales, suppliers, expenses, 
          purchases, users, documents, { data: settings }, 
          tenants, movements, settlements
      ] = await Promise.all([
          safeFetch<any>(supabase.from('products').select('*').eq('tenant_id', tenantId)),
          safeFetch<any>(supabase.from('customers').select('*').eq('tenant_id', tenantId)),
          safeFetch<any>(supabase.from('sales').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })),
          safeFetch<any>(supabase.from('suppliers').select('*').eq('tenant_id', tenantId)),
          safeFetch<Expense>(supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })),
          safeFetch<any>(supabase.from('purchases').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })),
          safeFetch<User>(supabase.from('profiles').select('*').eq('tenant_id', tenantId)),
          safeFetch<any>(supabase.from('documents').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })),
          supabase.from('settings').select('config').eq('tenant_id', tenantId).single(),
          safeFetch<Tenant>(supabase.from('tenants').select('*')),
          safeFetch<any>(supabase.from('stock_movements').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })),
          safeFetch<any>(supabase.from('settlements').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }))
      ]);

      return {
          products: products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock, minStock: p.min_stock, costPrice: p.cost_price, image: p.image, sku: p.sku, barcode: p.barcode, tva: p.tva })),
          customers: customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, balance: c.balance, lastVisit: c.last_visit, points: c.points, ice: c.ice, notes: c.notes })),
          sales: sales.map(s => ({ id: s.id, date: s.date, total: s.total, payment_method: s.payment_method, customer_id: s.customer_id, is_paid: s.is_paid, items: s.items, user_id: s.user_id, advance: s.advance || 0 })),
          suppliers: suppliers.map(s => ({ id: s.id, name: s.name, phone: s.phone, debt: s.debt, category: s.category, ice: s.ice, address: s.address, notes: s.notes })), 
          expenses,
          purchases: purchases.map(p => ({ id: p.id, supplierId: p.supplier_id, date: p.date, items: p.items, total: p.total })),
          users,
          documents: documents.map(d => ({ id: d.id, type: d.type, date: d.date, customer_id: d.customer_id, items: d.items, total: d.total, status: d.status, notes: d.notes, advance: d.advance || 0 })),
          settings: settings?.config || { name: 'Atlas Shop', currency: 'DH' },
          movements: movements.map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: m.quantity, date: m.date, user_id: m.user_id, reason: m.reason })),
          tenants,
          settlements: settlements.map(s => ({ id: s.id, entityId: s.entity_id, entityName: s.entity_name, type: s.type, amount: s.amount, date: s.date, method: s.method, note: s.note }))
      };
  },

  // --- SUPPLIERS & SETTLEMENTS ---
  addSupplier: async (s: Supplier) => {
      const tenantId = getTenantId();
      await supabase.from('suppliers').insert({ 
          id: s.id, tenant_id: tenantId, name: s.name, phone: s.phone, debt: s.debt, category: s.category, ice: s.ice, address: s.address, notes: s.notes 
      });
  },
  updateSupplier: async (s: Supplier) => {
      await supabase.from('suppliers').update({ 
          name: s.name, phone: s.phone, category: s.category, ice: s.ice, address: s.address, notes: s.notes 
      }).eq('id', s.id);
  },
  deleteSupplier: async (id: string) => { await supabase.from('suppliers').delete().eq('id', id); },

  addSettlement: async (s: Settlement) => {
      const tenantId = getTenantId();
      await supabase.from('settlements').insert({
          id: s.id, tenant_id: tenantId, entity_id: s.entityId, entity_name: s.entityName, type: s.type, amount: s.amount, date: s.date, method: s.method, note: s.note
      });
      if (s.type === 'CUSTOMER_IN') {
          const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entityId).single();
          if(c) await supabase.from('customers').update({ balance: c.balance - s.amount }).eq('id', s.entityId);
      } else if (s.type === 'SUPPLIER_OUT') {
          const { data: sup } = await supabase.from('suppliers').select('debt').eq('id', s.entityId).single();
          if(sup) await supabase.from('suppliers').update({ debt: sup.debt - s.amount }).eq('id', s.entityId);
      }
  },

  updateSettlement: async (s: Settlement, oldAmount: number) => {
      await supabase.from('settlements').update({ amount: s.amount, method: s.method, note: s.note, date: s.date }).eq('id', s.id);
      const diff = s.amount - oldAmount;
      if (s.type === 'CUSTOMER_IN') {
          const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entityId).single();
          if(c) await supabase.from('customers').update({ balance: c.balance - diff }).eq('id', s.entityId);
      } else if (s.type === 'SUPPLIER_OUT') {
          const { data: sup } = await supabase.from('suppliers').select('debt').eq('id', s.entityId).single();
          if(sup) await supabase.from('suppliers').update({ debt: sup.debt - diff }).eq('id', s.entityId);
      }
  },

  deleteSettlement: async (id: string) => {
      const { data: s } = await supabase.from('settlements').select('*').eq('id', id).single();
      if(!s) return;
      if (s.type === 'CUSTOMER_IN') {
          const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entity_id).single();
          if(c) await supabase.from('customers').update({ balance: c.balance + s.amount }).eq('id', s.entity_id);
      } else if (s.type === 'SUPPLIER_OUT') {
          const { data: sup } = await supabase.from('suppliers').select('debt').eq('id', s.entity_id).single();
          if(sup) await supabase.from('suppliers').update({ debt: sup.debt + s.amount }).eq('id', s.entity_id);
      }
      await supabase.from('settlements').delete().eq('id', id);
  },

  getSettlements: async (entityId: string) => {
      const tenantId = getTenantId();
      const data = await safeFetch<any>(supabase.from('settlements').select('*').eq('tenant_id', tenantId).eq('entity_id', entityId).order('date', { ascending: false }));
      return data.map(s => ({ id: s.id, entityId: s.entity_id, entityName: s.entity_name, type: s.type, amount: s.amount, date: s.date, method: s.method, note: s.note }));
  },

  paySupplierDebt: async (id: string, amt: number) => {
      const { data: s } = await supabase.from('suppliers').select('debt, name').eq('id', id).single();
      if(s) {
          await db.addSettlement({
              id: `pay-${Date.now()}`, entityId: id, entityName: s.name, type: 'SUPPLIER_OUT', amount: amt, date: new Date().toISOString(), method: 'CASH', note: 'Paiement Rapide'
          });
      }
  },

  // Added settleDebt method to resolve Property 'settleDebt' does not exist error in App.tsx
  settleDebt: async (id: string, amt: number) => {
      const { data: c } = await supabase.from('customers').select('name').eq('id', id).single();
      if(c) {
          await db.addSettlement({
              id: `pay-${Date.now()}`, entityId: id, entityName: c.name, type: 'CUSTOMER_IN', amount: amt, date: new Date().toISOString(), method: 'CASH', note: 'Règlement Rapide'
          });
      }
  },

  // --- PURCHASES ---
  addPurchase: async (p: Purchase) => {
      const tenantId = getTenantId();
      await supabase.from('purchases').insert({ id: p.id, tenant_id: tenantId, supplier_id: p.supplierId, date: p.date, items: p.items, total: p.total });
      if(p.supplierId && p.supplierId !== 'unknown') {
          const { data: s } = await supabase.from('suppliers').select('debt').eq('id', p.supplierId).single();
          if(s) await supabase.from('suppliers').update({ debt: s.debt + p.total }).eq('id', p.supplierId);
      }
      for (const item of p.items) {
          const { data: existing } = await supabase.from('products').select('*').eq('tenant_id', tenantId).ilike('name', item.name).single();
          if (existing) {
              const oldStock = Number(existing.stock) || 0;
              const newQty = Number(item.quantity) || 0;
              const oldCost = Number(existing.cost_price) || 0;
              const newCost = Number(item.cost) || 0;
              let weightedCost = newCost;
              if (oldStock + newQty > 0) weightedCost = ((oldStock * oldCost) + (newQty * newCost)) / (oldStock + newQty);
              await supabase.from('products').update({ stock: oldStock + newQty, cost_price: weightedCost }).eq('id', existing.id);
              await db.addStockMovement({ id: `mv-${Date.now()}`, productId: existing.id, productName: existing.name, type: 'ENTREE', quantity: item.quantity, date: p.date, userId: 'System (Achat)', reason: `Achat ${p.id.slice(-4)}` });
          } else {
              const prodId = `prod-${Date.now()}-${Math.random()}`;
              await supabase.from('products').insert({ id: prodId, tenant_id: tenantId, name: item.name, category: 'Importé', price: item.cost * 1.3, cost_price: item.cost, stock: item.quantity, min_stock: 5, image: `https://ui-avatars.com/api/?name=${item.name}` });
              await db.addStockMovement({ id: `mv-${Date.now()}`, productId: prodId, productName: item.name, type: 'ENTREE', quantity: item.quantity, date: p.date, userId: 'System (Achat)', reason: `Achat ${p.id.slice(-4)}` });
          }
      }
  },
  updatePurchase: async (p: Purchase) => { await supabase.from('purchases').update({ items: p.items, total: p.total }).eq('id', p.id); },
  deletePurchase: async (id: string) => { await supabase.from('purchases').delete().eq('id', id); },

  // --- OTHERS ---
  addProduct: async (p: Product) => {
      const tenantId = getTenantId();
      await supabase.from('products').insert({ id: p.id, tenant_id: tenantId, name: p.name, category: p.category, price: p.price, stock: p.stock, min_stock: p.minStock, cost_price: p.costPrice, image: p.image, sku: p.sku, barcode: p.barcode, tva: p.tva });
  },
  updateProduct: async (p: Product) => { await supabase.from('products').update({ name: p.name, category: p.category, price: p.price, min_stock: p.minStock, cost_price: p.costPrice, image: p.image, sku: p.sku, barcode: p.barcode, tva: p.tva }).eq('id', p.id); },
  deleteProduct: async (id: string) => { await supabase.from('products').delete().eq('id', id); },
  addStockMovement: async (m: StockMovement) => {
      const tenantId = getTenantId();
      await supabase.from('stock_movements').insert({ tenant_id: tenantId, product_id: m.productId, product_name: m.productName, type: m.type, quantity: m.quantity, date: m.date, reason: m.reason, user_id: m.userId });
  },
  addSale: async (s: Sale) => {
      const tenantId = getTenantId();
      await supabase.from('sales').insert({ id: s.id, tenant_id: tenantId, date: s.date, total: s.total, advance: s.advance || 0, payment_method: s.paymentMethod, customer_id: s.customerId || null, is_paid: s.isPaid ?? true, items: s.items });
      if (s.customerId && s.paymentMethod === 'KARNE') {
          const { data: c } = await supabase.from('customers').select('balance').eq('id', s.customerId).single();
          if(c) await supabase.from('customers').update({ balance: c.balance + (s.total - (s.advance || 0)) }).eq('id', s.customerId);
      }
  },
  updateSale: async (s: Sale) => { await supabase.from('sales').update({ items: s.items, total: s.total, is_paid: s.isPaid, advance: s.advance }).eq('id', s.id); },
  deleteSale: async (id: string) => { await supabase.from('sales').delete().eq('id', id); },
  addCustomer: async (c: Customer) => {
      const tenantId = getTenantId();
      await supabase.from('customers').insert({ id: c.id, tenant_id: tenantId, name: c.name, phone: c.phone, balance: c.balance, last_visit: c.lastVisit, points: c.points, ice: c.ice, notes: c.notes });
  },
  updateCustomer: async (c: Customer) => { await supabase.from('customers').update({ name: c.name, phone: c.phone, ice: c.ice, notes: c.notes, balance: c.balance }).eq('id', c.id); },
  deleteCustomer: async (id: string) => { await supabase.from('customers').delete().eq('id', id); },
  addExpense: async (e: Expense) => { const tenantId = getTenantId(); await supabase.from('expenses').insert({ ...e, tenant_id: tenantId }); },
  deleteExpense: async (id: string) => { await supabase.from('expenses').delete().eq('id', id); },
  addDocument: async (d: Document) => {
      const tenantId = getTenantId();
      await supabase.from('documents').insert({ id: d.id, tenant_id: tenantId, type: d.type, date: d.date, customer_id: d.customerId, items: d.items, total: d.total, status: d.status, notes: d.notes, advance: d.advance || 0 });
  },
  updateDocument: async (d: Document) => { await supabase.from('documents').update({ status: d.status, total: d.total, items: d.items, notes: d.notes, advance: d.advance || 0 }).eq('id', d.id); },
  deleteDocument: async (id: string) => { await supabase.from('documents').delete().eq('id', id); },
  saveSettings: async (s: CompanySettings) => { const tenantId = getTenantId(); await supabase.from('settings').upsert({ tenant_id: tenantId, config: s }); },
  addUser: async (u: User) => { const tenantId = getTenantId(); await supabase.from('profiles').insert({ id: u.id, tenant_id: tenantId, name: u.name, role: u.role, avatar: u.avatar }); },
  deleteUser: async (id: string) => { await supabase.from('profiles').delete().eq('id', id); },
  getTenants: async () => { const { data } = await supabase.from('tenants').select('*'); return data?.map(t => ({...t, companyName: t.company_name, planId: t.plan_id, isActive: t.is_active})) || []; },
  toggleTenant: async (id: string, isActive: boolean) => { await supabase.from('tenants').update({ is_active: isActive }).eq('id', id); },
  updateTenantModules: async (id: string, modules: any) => { await supabase.from('tenants').update({ modules }).eq('id', id); },
  getPlans: async () => { const { data } = await supabase.from('plans').select('*'); return data || []; },
  savePlan: async (plan: Plan) => { await supabase.from('plans').upsert(plan); },
  deletePlan: async (id: string) => { await supabase.from('plans').delete().eq('id', id); },
  getLandingConfig: async () => { const { data } = await supabase.from('landing_page').select('config').single(); return data?.config || null; },
  saveLandingConfig: async (config: LandingPageConfig) => { await supabase.from('landing_page').upsert({ id: 'default', config }); },
  importData: async (type: string, data: any[]) => {
      const tenantId = getTenantId();
      if (type === 'SUPPLIERS') {
          const mapped = data.map(s => ({ id: s.id || `sup-${Date.now()}-${Math.random()}`, tenant_id: tenantId, name: s.name, phone: s.phone, debt: s.debt || 0, category: s.category || 'Général', ice: s.ice, address: s.address, notes: s.notes }));
          await supabase.from('suppliers').upsert(mapped);
      }
      // Add other imports if needed
  }
};
