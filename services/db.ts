
import { supabase } from './supabaseClient';
import { Product, Customer, Sale, Supplier, Expense, Purchase, User, Document, CompanySettings, Tenant, Plan, LandingPageConfig, StockMovement, Settlement } from '../types';

// Helper to get current tenant ID
const getTenantId = () => {
    const user = localStorage.getItem('atlas_user');
    return user ? JSON.parse(user).tenantId : null;
};

// Safe Fetch Helper: Returns empty array if table doesn't exist or error occurs
const safeFetch = async <T>(query: any): Promise<T[]> => {
    try {
        const { data, error } = await query;
        if (error) {
            console.warn("DB Fetch Warning (Table missing?):", error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error("DB Fetch Error:", e);
        return [];
    }
};

export const db = {
  // --- AUTHENTICATION & INITIALIZATION ---
  login: async (email: string, password: string) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    // Super Admin Bypass
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

    if (!authData.user) throw new Error("Utilisateur introuvable.");

    // Fetch Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();

    if (isSuperAdminEmail) {
        return {
           token: authData.session?.access_token,
           user: { id: authData.user.id, name: profile?.name || 'Super Admin', role: 'SUPER_ADMIN', tenantId: null }
       };
    }

    if (!profile) throw new Error("Profil introuvable.");

    // Check Tenant Status
    let modules = { pos: true, stock: true, ai: true, accounting: true };
    if (profile.tenant_id) {
        const { data: tenant } = await supabase.from('tenants').select('modules, is_active').eq('id', profile.tenant_id).single();
        if (tenant) {
            if(!tenant.is_active) throw new Error("Compte suspendu.");
            if(tenant.modules) modules = tenant.modules;
        }
    }

    return {
        token: authData.session?.access_token || '',
        user: { 
            id: profile.id, name: profile.name, role: profile.role, tenantId: profile.tenant_id, modules
        }
    };
  },

  register: async (data: any) => {
    let { data: authData } = await supabase.auth.signUp({ email: data.email, password: data.password });
    if (!authData.user) {
         const { data: loginData } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
         authData = { user: loginData.user, session: loginData.session };
    }
    
    if(!authData.user) throw new Error("Erreur inscription");

    const { data: tenant } = await supabase.from('tenants').insert({
        company_name: data.companyName,
        email: data.email,
        plan_id: data.planId || 'plan_basic',
        modules: { pos: true, stock: true, ai: true, accounting: true },
        is_active: true
    }).select().single();

    await supabase.from('profiles').insert({
        id: authData.user.id,
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

  // --- GLOBAL DATA LOADING ---
  load: async () => {
      const tenantId = getTenantId();
      if (!tenantId) return null;

      // Parallel Fetching with Safe Handling
      const productsPromise = safeFetch<Product>(supabase.from('products').select('*').eq('tenant_id', tenantId));
      const customersPromise = safeFetch<Customer>(supabase.from('customers').select('*').eq('tenant_id', tenantId));
      const salesPromise = safeFetch<Sale>(supabase.from('sales').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }));
      const suppliersPromise = safeFetch<Supplier>(supabase.from('suppliers').select('*').eq('tenant_id', tenantId));
      const expensesPromise = safeFetch<Expense>(supabase.from('expenses').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }));
      const purchasesPromise = safeFetch<Purchase>(supabase.from('purchases').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }));
      const usersPromise = safeFetch<User>(supabase.from('profiles').select('*').eq('tenant_id', tenantId));
      const documentsPromise = safeFetch<Document>(supabase.from('documents').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }));
      const settingsPromise = supabase.from('settings').select('config').eq('tenant_id', tenantId).single();
      const tenantsPromise = safeFetch<Tenant>(supabase.from('tenants').select('*'));
      
      // Safe Fetch for heavy/new tables
      const movementsPromise = safeFetch<any>(supabase.from('stock_movements').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }).limit(200));
      const settlementsPromise = safeFetch<any>(supabase.from('settlements').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }));

      const [
          products, customers, sales, suppliers, expenses, 
          purchases, users, documents, { data: settings }, 
          tenants, movements, settlements
      ] = await Promise.all([
          productsPromise, customersPromise, salesPromise, suppliersPromise, 
          expensesPromise, purchasesPromise, usersPromise, documentsPromise, 
          settingsPromise, tenantsPromise, movementsPromise, settlementsPromise
      ]);

      return {
          products: products.map(p => ({
              id: p.id, name: p.name, category: p.category, price: p.price, 
              stock: p.stock, minStock: p.min_stock, costPrice: p.cost_price, 
              image: p.image, sku: p.sku, barcode: p.barcode, tva: p.tva
          })),
          customers: customers.map(c => ({
              id: c.id, name: c.name, phone: c.phone, balance: c.balance, 
              lastVisit: c.last_visit, points: c.points, ice: c.ice, notes: c.notes
          })),
          sales: sales.map(s => ({
              id: s.id, date: s.date, total: s.total, 
              paymentMethod: s.payment_method, customerId: s.customer_id, 
              isPaid: s.is_paid, items: s.items, userId: s.user_id, advance: s.advance || 0
          })),
          suppliers: suppliers, 
          expenses: expenses,
          purchases: purchases.map(p => ({
              id: p.id, supplierId: p.supplier_id, date: p.date, 
              items: p.items, total: p.total
          })),
          users: users,
          documents: documents.map(d => ({
              id: d.id, type: d.type, date: d.date, customerId: d.customer_id,
              items: d.items, total: d.total, status: d.status, notes: d.notes, advance: d.advance || 0
          })),
          settings: settings?.config || { name: 'Atlas Shop', currency: 'DH' },
          movements: movements.map(m => ({
              id: m.id, productId: m.product_id, productName: m.product_name,
              type: m.type, quantity: m.quantity, date: m.date, 
              userId: m.user_id, reason: m.reason
          })),
          tenants: tenants,
          settlements: settlements.map(s => ({
              id: s.id, entityId: s.entity_id, entityName: s.entity_name,
              type: s.type, amount: s.amount, date: s.date, method: s.method, note: s.note
          }))
      };
  },

  // --- SETTLEMENTS (Optimized & Safe) ---
  addSettlement: async (s: Settlement) => {
      const tenantId = getTenantId();
      
      try {
          const { error } = await supabase.from('settlements').insert({
              id: s.id,
              tenant_id: tenantId,
              entity_id: s.entityId,
              entity_name: s.entityName,
              type: s.type,
              amount: s.amount,
              date: s.date,
              method: s.method,
              note: s.note
          });
          
          if(error) console.warn("Settlement History Error (Table missing?):", error.message);

          if (s.type === 'CUSTOMER_IN') {
              const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entityId).single();
              if(c) await supabase.from('customers').update({ balance: c.balance - s.amount }).eq('id', s.entityId);
          } else if (s.type === 'SUPPLIER_OUT') {
              const { data: supplier } = await supabase.from('suppliers').select('debt').eq('id', s.entityId).single();
              if(supplier) await supabase.from('suppliers').update({ debt: supplier.debt - s.amount }).eq('id', s.entityId);
          }
      } catch (e) {
          console.error("Add Settlement Error", e);
      }
  },

  updateSettlement: async (s: Settlement, oldAmount: number) => {
      // Met à jour le règlement et corrige le solde client/fournisseur
      try {
          // 1. Mettre à jour l'historique
          await supabase.from('settlements').update({
              amount: s.amount,
              method: s.method,
              note: s.note,
              date: s.date
          }).eq('id', s.id);

          // 2. Calculer la différence (Nouveau - Ancien)
          const diff = s.amount - oldAmount;

          // 3. Mettre à jour le solde
          if (s.type === 'CUSTOMER_IN') {
              const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entityId).single();
              // Si le montant payé augmente, la dette diminue (balance - diff)
              if(c) await supabase.from('customers').update({ balance: c.balance - diff }).eq('id', s.entityId);
          } else if (s.type === 'SUPPLIER_OUT') {
              const { data: sup } = await supabase.from('suppliers').select('debt').eq('id', s.entityId).single();
              if(sup) await supabase.from('suppliers').update({ debt: sup.debt - diff }).eq('id', s.entityId);
          }
      } catch (e) {
          console.error("Update Settlement Error", e);
      }
  },

  deleteSettlement: async (id: string) => {
      // Supprime le règlement et remet le montant dans la dette (annule le paiement)
      try {
          // 1. Récupérer le règlement avant suppression pour connaitre le montant
          const { data: s } = await supabase.from('settlements').select('*').eq('id', id).single();
          if(!s) return;

          // 2. Rétablir le solde (Annulation)
          if (s.type === 'CUSTOMER_IN') {
              const { data: c } = await supabase.from('customers').select('balance').eq('id', s.entity_id).single();
              // On rajoute le montant à la dette car le paiement est annulé
              if(c) await supabase.from('customers').update({ balance: c.balance + s.amount }).eq('id', s.entity_id);
          } else if (s.type === 'SUPPLIER_OUT') {
              const { data: sup } = await supabase.from('suppliers').select('debt').eq('id', s.entity_id).single();
              if(sup) await supabase.from('suppliers').update({ debt: sup.debt + s.amount }).eq('id', s.entity_id);
          }

          // 3. Supprimer de l'historique
          await supabase.from('settlements').delete().eq('id', id);
      } catch (e) {
          console.error("Delete Settlement Error", e);
      }
  },

  getSettlements: async (entityId: string) => {
      const tenantId = getTenantId();
      return await safeFetch<any>(
          supabase.from('settlements')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('entity_id', entityId)
            .order('date', { ascending: false })
      ).then(data => data.map(s => ({
          id: s.id, entityId: s.entity_id, entityName: s.entity_name,
          type: s.type, amount: s.amount, date: s.date, method: s.method, note: s.note
      })));
  },

  // --- BULK IMPORT ---
  importData: async (type: 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS', data: any[]) => {
      const tenantId = getTenantId();
      if (!tenantId) throw new Error("Tenant ID not found");

      if (type === 'PRODUCTS') {
          const mapped = data.map(p => ({
              id: p.id || `p-${Date.now()}-${Math.random()}`,
              tenant_id: tenantId,
              name: p.name,
              category: p.category || 'Import',
              price: p.price || 0,
              stock: p.stock || 0,
              min_stock: p.minStock || 5,
              cost_price: p.costPrice || 0,
              image: p.image,
              sku: p.sku,
              barcode: p.barcode,
              tva: p.tva || 20
          }));
          const { error } = await supabase.from('products').upsert(mapped, { onConflict: 'id' });
          if (error) throw error;
      } 
      else if (type === 'CUSTOMERS') {
          const mapped = data.map(c => ({
              id: c.id || `c-${Date.now()}-${Math.random()}`,
              tenant_id: tenantId,
              name: c.name,
              phone: c.phone,
              balance: c.balance || 0,
              points: c.points || 0,
              ice: c.ice,
              notes: c.notes
          }));
          const { error } = await supabase.from('customers').upsert(mapped, { onConflict: 'id' });
          if (error) throw error;
      }
      else if (type === 'SUPPLIERS') {
          const mapped = data.map(s => ({
              id: s.id || `sup-${Date.now()}-${Math.random()}`,
              tenant_id: tenantId,
              name: s.name,
              phone: s.phone,
              debt: s.debt || 0,
              category: s.category || 'Général'
          }));
          const { error } = await supabase.from('suppliers').upsert(mapped, { onConflict: 'id' });
          if (error) throw error;
      }
  },

  // --- PRODUCTS & STOCK ---
  addProduct: async (p: Product) => {
      const tenantId = getTenantId();
      await supabase.from('products').insert({
          id: p.id, tenant_id: tenantId, name: p.name, category: p.category, 
          price: p.price, stock: p.stock, min_stock: p.minStock, 
          cost_price: p.costPrice, image: p.image, sku: p.sku, barcode: p.barcode, tva: p.tva
      });
      if(p.stock > 0) {
          await db.addStockMovement({
              id: `init-${Date.now()}`, productId: p.id, productName: p.name, 
              type: 'ENTREE', quantity: p.stock, date: new Date().toISOString(), 
              userId: 'System', reason: 'Stock Initial'
          });
      }
  },
  updateProduct: async (p: Product) => {
      await supabase.from('products').update({
          name: p.name, category: p.category, price: p.price, 
          min_stock: p.minStock, cost_price: p.costPrice, image: p.image, 
          sku: p.sku, barcode: p.barcode, tva: p.tva
      }).eq('id', p.id);
  },
  deleteProduct: async (id: string) => { await supabase.from('products').delete().eq('id', id); },
  
  addStockMovement: async (m: StockMovement) => {
      const tenantId = getTenantId();
      try {
          await supabase.from('stock_movements').insert({
              tenant_id: tenantId, product_id: m.productId, product_name: m.productName,
              type: m.type, quantity: m.quantity, date: m.date, reason: m.reason, user_id: m.userId
          });
      } catch (e) { console.warn("Stock movement not saved (Table missing?)", e); }

      // Fetch current stock to update
      const { data: prod } = await supabase.from('products').select('stock').eq('id', m.productId).single();
      if(prod) {
          let newStock = prod.stock;
          if (['ENTREE', 'AJUSTEMENT'].includes(m.type)) newStock += m.quantity;
          else newStock -= m.quantity; 
          
          await supabase.from('products').update({ stock: newStock }).eq('id', m.productId);
      }
  },

  // --- SALES & POS ---
  addSale: async (s: Sale) => { 
      const tenantId = getTenantId();
      
      await supabase.from('sales').insert({ 
          id: s.id, 
          tenant_id: tenantId, 
          date: s.date, 
          total: s.total, 
          advance: s.advance || 0,
          payment_method: s.paymentMethod, 
          customer_id: s.customerId || null, 
          is_paid: s.isPaid ?? true, 
          items: s.items 
      }); 

      for (const item of s.items) {
          await db.addStockMovement({
              id: `sale-${s.id}-${item.id}`,
              productId: item.id,
              productName: item.name,
              type: 'SORTIE',
              quantity: item.quantity,
              date: s.date,
              userId: 'POS',
              reason: `Vente #${s.id.slice(-4)}`
          });
      }

      if (s.customerId) {
          const { data: c } = await supabase.from('customers').select('balance, points').eq('id', s.customerId).single();
          if(c) {
              const updates: any = { 
                  last_visit: s.date,
                  points: (c.points || 0) + 10 
              };
              
              if (s.paymentMethod === 'KARNE') {
                  const debtAmount = s.total - (s.advance || 0);
                  updates.balance = c.balance + debtAmount;
              }
              
              await supabase.from('customers').update(updates).eq('id', s.customerId);
          }
      }
  },
  
  updateSale: async (s: Sale) => {
       await supabase.from('sales').update({ 
           items: s.items, 
           total: s.total,
           is_paid: s.isPaid,
           advance: s.advance
        }).eq('id', s.id);
  },
  
  markSaleAsPaid: async (saleId: string, customerId: string) => {
      const tenantId = getTenantId();
      const { data: sale } = await supabase.from('sales').select('total, advance').eq('id', saleId).single();
      if (!sale) return;
      
      const amountToDeduct = sale.total - (sale.advance || 0);

      // 1. Mark sale as paid
      await supabase.from('sales').update({ is_paid: true }).eq('id', saleId);

      // 2. Update customer balance and Log Settlement
      const { data: c } = await supabase.from('customers').select('balance, name').eq('id', customerId).single();
      if (c) {
          await supabase.from('customers').update({ 
              balance: c.balance - amountToDeduct 
          }).eq('id', customerId);

          // NEW: Create settlement record for traceability
          try {
              await db.addSettlement({
                  id: `pay-sale-${saleId}-${Date.now()}`,
                  entityId: customerId,
                  entityName: c.name,
                  type: 'CUSTOMER_IN',
                  amount: amountToDeduct,
                  date: new Date().toISOString(),
                  method: 'CASH', // Assume Cash for direct settlement
                  note: `Règlement Bon #${saleId.slice(-4)}`
              });
          } catch(e) { console.warn("Failed to log settlement", e); }
      }
  },

  deleteSale: async (id: string) => { await supabase.from('sales').delete().eq('id', id); },

  // --- CUSTOMERS ---
  addCustomer: async (c: Customer) => { 
      const tenantId = getTenantId();
      await supabase.from('customers').insert({ 
          id: c.id,
          tenant_id: tenantId,
          name: c.name,
          phone: c.phone,
          balance: c.balance,
          last_visit: c.lastVisit,
          points: c.points,
          ice: c.ice,
          notes: c.notes
      }); 
  },
  updateCustomer: async (c: Customer) => { 
      await supabase.from('customers').update({ 
          name: c.name, phone: c.phone, ice: c.ice, notes: c.notes, last_visit: c.lastVisit, balance: c.balance 
      }).eq('id', c.id); 
  },
  settleDebt: async (id: string, amt: number) => { 
      // Compatibility wrapper
      const { data: c } = await supabase.from('customers').select('balance, name').eq('id', id).single();
      if(c) {
          await db.addSettlement({
              id: `pay-${Date.now()}`,
              entityId: id,
              entityName: c.name,
              type: 'CUSTOMER_IN',
              amount: amt,
              date: new Date().toISOString(),
              method: 'CASH',
              note: 'Règlement Rapide'
          });
      }
  },
  deleteCustomer: async (id: string) => { 
      await supabase.from('customers').delete().eq('id', id); 
  },

  // --- SUPPLIERS & PURCHASES ---
  addSupplier: async (s: Supplier) => { 
      const tenantId = getTenantId();
      await supabase.from('suppliers').insert({ 
          id: s.id,
          tenant_id: tenantId,
          name: s.name,
          phone: s.phone,
          debt: s.debt,
          category: s.category
      }); 
  },
  updateSupplier: async (s: Supplier) => {
      await supabase.from('suppliers').update({ name: s.name, phone: s.phone, category: s.category }).eq('id', s.id);
  },
  paySupplierDebt: async (id: string, amt: number) => {
      const { data: s } = await supabase.from('suppliers').select('debt, name').eq('id', id).single();
      if(s) {
          await db.addSettlement({
              id: `pay-${Date.now()}`,
              entityId: id,
              entityName: s.name,
              type: 'SUPPLIER_OUT',
              amount: amt,
              date: new Date().toISOString(),
              method: 'CASH',
              note: 'Paiement Rapide'
          });
      }
  },
  deleteSupplier: async (id: string) => { await supabase.from('suppliers').delete().eq('id', id); },

  addPurchase: async (p: Purchase) => {
      const tenantId = getTenantId();
      await supabase.from('purchases').insert({
          id: p.id, tenant_id: tenantId, supplier_id: p.supplierId,
          date: p.date, items: p.items, total: p.total
      });

      if(p.supplierId && p.supplierId !== 'unknown') {
          const { data: s } = await supabase.from('suppliers').select('debt').eq('id', p.supplierId).single();
          if(s) await supabase.from('suppliers').update({ debt: s.debt + p.total }).eq('id', p.supplierId);
      }

      for (const item of p.items) {
          let productId = null;
          let productName = item.name;
          const { data: existing } = await supabase.from('products').select('*').eq('tenant_id', tenantId).ilike('name', item.name).single();
          
          if (existing) {
              productId = existing.id;
              productName = existing.name;
              const oldStock = Number(existing.stock) || 0;
              const newQty = Number(item.quantity) || 0;
              const oldCost = Number(existing.cost_price) || 0;
              const newCost = Number(item.cost) || 0;
              let weightedCost = newCost;
              if (oldStock + newQty > 0) {
                  weightedCost = ((oldStock * oldCost) + (newQty * newCost)) / (oldStock + newQty);
              }
              await supabase.from('products').update({
                  stock: oldStock + newQty,
                  cost_price: weightedCost, 
                  price: existing.price === 0 ? newCost * 1.3 : existing.price 
              }).eq('id', productId);
          } else {
              productId = `prod-${Date.now()}-${Math.floor(Math.random()*1000)}`;
              await supabase.from('products').insert({
                  id: productId, tenant_id: tenantId, name: item.name, category: 'Importé',
                  price: item.cost * 1.3, cost_price: item.cost, stock: item.quantity, 
                  min_stock: 5, image: `https://ui-avatars.com/api/?name=${item.name}&background=random`
              });
          }

          if(productId) {
              await db.addStockMovement({
                  id: `mv-${Date.now()}`, productId: productId, productName: productName,
                  type: 'ENTREE', quantity: item.quantity, date: p.date, userId: 'System (Achat)', reason: `Achat ${p.id.slice(-4)}`
              });
          }
      }
  },
  updatePurchase: async (p: Purchase) => {
      await supabase.from('purchases').update({ items: p.items, total: p.total }).eq('id', p.id);
  },
  deletePurchase: async (id: string) => { await supabase.from('purchases').delete().eq('id', id); },

  // --- EXPENSES ---
  addExpense: async (e: Expense) => { 
      const tenantId = getTenantId();
      await supabase.from('expenses').insert({ ...e, tenant_id: tenantId }); 
  },
  deleteExpense: async (id: string) => { await supabase.from('expenses').delete().eq('id', id); },

  // --- DOCUMENTS ---
  addDocument: async (d: Document) => {
      const tenantId = getTenantId();
      await supabase.from('documents').insert({
          id: d.id, tenant_id: tenantId, type: d.type, date: d.date,
          customer_id: d.customerId, items: d.items, total: d.total,
          status: d.status, notes: d.notes, advance: d.advance || 0
      });
  },
  updateDocument: async (d: Document) => {
      await supabase.from('documents').update({
          status: d.status,
          total: d.total,
          items: d.items,
          notes: d.notes,
          advance: d.advance || 0
      }).eq('id', d.id);
  },
  deleteDocument: async (id: string) => { await supabase.from('documents').delete().eq('id', id); },

  // --- SETTINGS ---
  saveSettings: async (s: CompanySettings) => { 
      const tenantId = getTenantId();
      await supabase.from('settings').upsert({ tenant_id: tenantId, config: s }); 
  },

  // --- USERS ---
  addUser: async (u: User) => {
      const tenantId = getTenantId();
      await supabase.from('profiles').insert({
          id: u.id, tenant_id: tenantId, name: u.name, role: u.role, avatar: u.avatar
      });
  },
  deleteUser: async (id: string) => { await supabase.from('profiles').delete().eq('id', id); },

  // --- SUPER ADMIN ---
  getTenants: async () => { 
      const { data } = await supabase.from('tenants').select('*');
      return data?.map(t => ({...t, companyName: t.company_name, planId: t.plan_id, isActive: t.is_active})) || []; 
  },
  toggleTenant: async (id: string, isActive: boolean) => {
      await supabase.from('tenants').update({ is_active: isActive }).eq('id', id);
  },
  updateTenantModules: async (id: string, modules: any) => {
      await supabase.from('tenants').update({ modules }).eq('id', id);
  },
  getPlans: async () => { 
      const { data } = await supabase.from('plans').select('*'); 
      return data || []; 
  },
  savePlan: async (plan: Plan) => { await supabase.from('plans').upsert(plan); },
  deletePlan: async (id: string) => { await supabase.from('plans').delete().eq('id', id); },
  getLandingConfig: async () => {
      const { data } = await supabase.from('landing_page').select('config').single();
      return data?.config || null;
  },
  saveLandingConfig: async (config: LandingPageConfig) => {
      await supabase.from('landing_page').upsert({ id: 'default', config });
  }
};
