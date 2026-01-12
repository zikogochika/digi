
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PosView from './components/PosView';
import KarneView from './components/KarneView';
import StockView from './components/StockView';
import SuppliersView from './components/SuppliersView';
import ExpensesView from './components/ExpensesView';
import AiCoachView from './components/AiCoachView';
import BillingView from './components/BillingView';
import PurchasesView from './components/PurchasesView';
import UsersView from './components/UsersView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import SuperAdminView from './components/SuperAdminView';
import ReportsView from './components/ReportsView';
import LandingPage from './components/LandingPage';
import { AppView, Sale, Customer, Product, Supplier, Expense, User, Purchase, Document, CompanySettings, LandingPageConfig, Plan, StockMovement } from './types';
import { 
  DollarSign, Users, Package, FileText, Wifi, PieChart, ShieldAlert, Lock, Eye, LogOut, Bot, Sparkles, AlertTriangle
} from 'lucide-react';
import { db } from './services/db';
import { analyzeDashboardRisks } from './services/geminiService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'MANAGER' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [showLanding, setShowLanding] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // GOD MODE STATE
  const [impersonatedTenant, setImpersonatedTenant] = useState<{id: string, name: string} | null>(null);
  
  // Dynamic Configs
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  // DEFAULT PERMISSIONS (Safeguard)
  const [currentModules, setCurrentModules] = useState({ pos: true, stock: true, ai: true, accounting: true });
  
  // Data States
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({
      name: 'Atlas Shop',
      address: 'Maroc',
      phone: '',
      ice: '',
      logoUrl: '',
      invoiceTemplate: 'A4_STANDARD',
      documentFormat: 'A4',
      currency: 'DH',
      tvaEnabled: true,
      customPaymentMethods: ['CASH', 'CARD', 'KARNE']
  });
  
  // AI Insight State
  const [aiInsight, setAiInsight] = useState<string>('');

  // Check Auth on Mount
  useEffect(() => {
    const token = localStorage.getItem('atlas_token');
    const savedUser = localStorage.getItem('atlas_user');
    
    // Load Landing Page Config first
    db.getLandingConfig().then(setLandingConfig);
    db.getPlans().then(setPlans);

    if (token && savedUser) {
        const u = JSON.parse(savedUser);
        setIsAuthenticated(true);
        setUserRole(u.role);
        setShowLanding(false);
        if(u.modules) setCurrentModules(u.modules);
    }
  }, []);

  // ROUTE GUARD
  useEffect(() => {
      if(userRole === 'SUPER_ADMIN' && !impersonatedTenant) return;

      const guards = {
          [AppView.STOCK]: currentModules.stock,
          [AppView.PURCHASES]: currentModules.stock,
          [AppView.AI_COACH]: currentModules.ai,
          [AppView.BILLING]: currentModules.accounting,
          [AppView.POS]: currentModules.pos,
      };

      // @ts-ignore
      if (guards[currentView] === false) {
          setCurrentView(AppView.DASHBOARD);
      }
  }, [currentView, currentModules, userRole, impersonatedTenant]);

  // Load Data Async
  useEffect(() => {
    if (isAuthenticated && (userRole !== 'SUPER_ADMIN' || impersonatedTenant)) {
        const initData = async () => {
            try {
                const data = await db.load();
                if (data) {
                    const savedUser = localStorage.getItem('atlas_user');
                    if(savedUser) {
                        const u = JSON.parse(savedUser);
                        const myTenant = data.tenants.find(t => t.id === u.tenantId);
                        if(myTenant && myTenant.modules) {
                             setCurrentModules(myTenant.modules);
                        }
                    }

                    setProducts(data.products || []);
                    setCustomers(data.customers || []);
                    setSales(data.sales || []);
                    setSuppliers(data.suppliers || []);
                    setExpenses(data.expenses || []);
                    setPurchases(data.purchases || []);
                    setUsers(data.users || []);
                    setDocuments(data.documents || []);
                    setStockMovements(data.movements || []);
                    if(data.settings) setSettings(data.settings);
                    
                    // Trigger AI Analysis once data is loaded
                    if(data.sales && data.products && data.customers) {
                         analyzeDashboardRisks(data.sales, data.products, data.customers).then(setAiInsight);
                    }
                }
            } catch (e) { 
                console.error(e);
            } finally { setIsLoaded(true); }
        };
        initData();
    }
  }, [isAuthenticated, userRole, currentView, impersonatedTenant]); 

  const handleLogout = () => {
      localStorage.removeItem('atlas_token');
      localStorage.removeItem('atlas_user');
      setIsAuthenticated(false);
      setUserRole(null);
      setShowLanding(true);
      setCurrentView(AppView.DASHBOARD);
      setImpersonatedTenant(null);
  };

  const handleImpersonate = (tenantId: string, companyName: string) => {
      const currentUserStr = localStorage.getItem('atlas_user');
      if(!currentUserStr) return;
      const currentUser = JSON.parse(currentUserStr);

      const impersonatedUser = {
          ...currentUser,
          tenantId: tenantId,
          isImpersonating: true
      };
      
      localStorage.setItem('atlas_user', JSON.stringify(impersonatedUser));
      setImpersonatedTenant({ id: tenantId, name: companyName });
      setIsLoaded(false); 
      setCurrentView(AppView.DASHBOARD);
  };

  const exitImpersonation = () => {
      const currentUserStr = localStorage.getItem('atlas_user');
      if(currentUserStr) {
          const u = JSON.parse(currentUserStr);
          const restoredUser = { ...u, tenantId: null, isImpersonating: false };
          localStorage.setItem('atlas_user', JSON.stringify(restoredUser));
      }
      setImpersonatedTenant(null);
      setCurrentView(AppView.DASHBOARD);
  };

  // Handlers
  const handleAddProduct = async (p: Product) => { setProducts(prev => [p, ...prev]); await db.addProduct(p); };
  const handleUpdateProduct = async (p: Product) => { setProducts(prev => prev.map(x => x.id === p.id ? p : x)); await db.updateProduct(p); };
  const handleDeleteProduct = async (id: string) => { setProducts(prev => prev.filter(x => x.id !== id)); await db.deleteProduct(id); };
  
  const handleProcessSale = async (s: Sale) => { 
      // 1. Update Sales State
      setSales(prev => [s, ...prev]); 
      
      // 2. Update DB
      await db.addSale(s);

      // 3. IMPORTANT: Update Local Customer Balance Immediately (Connect POS to Karne)
      if (s.customerId && s.paymentMethod === 'KARNE') {
          const debtAmount = s.total - (s.advance || 0);
          setCustomers(prev => prev.map(c => 
              c.id === s.customerId 
                  ? { ...c, balance: (c.balance || 0) + debtAmount, lastVisit: s.date, points: (c.points || 0) + 10 } 
                  : c
          ));
      } else if (s.customerId) {
          // Just update points/visit for cash sales
          setCustomers(prev => prev.map(c => 
              c.id === s.customerId 
                  ? { ...c, lastVisit: s.date, points: (c.points || 0) + 10 } 
                  : c
          ));
      }

      // 4. Reload critical data in background to ensure sync
      const data = await db.load();
      if(data) { 
          setProducts(data.products); 
          setStockMovements(data.movements); 
          // Optional: Force sync customers again if needed
          // setCustomers(data.customers); 
      }
  };
  
  const handleUpdateSale = async (s: Sale) => { setSales(prev => prev.map(x => x.id === s.id ? s : x)); await db.updateSale(s); };
  const handleDeleteSale = async (id: string) => { setSales(prev => prev.filter(x => x.id !== id)); await db.deleteSale(id); };
  
  const handleMarkSalePaid = async (saleId: string, customerId: string) => {
      // 1. Find sale locally to calculate amount
      const sale = sales.find(s => s.id === saleId);
      if(!sale) return;
      const amountToDeduct = sale.total - (sale.advance || 0);

      // 2. Update DB
      await db.markSaleAsPaid(saleId, customerId);
      
      // 3. Update Local State (Immediate Feedback)
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, isPaid: true } : s));
      setCustomers(prev => prev.map(c => 
          c.id === customerId 
              ? { ...c, balance: (c.balance || 0) - amountToDeduct } 
              : c
      ));
  };

  const handleAddCustomer = async (c: Customer) => { setCustomers(prev => [c, ...prev]); await db.addCustomer(c); };
  const handleEditCustomer = async (c: Customer) => { setCustomers(prev => prev.map(x => x.id === c.id ? c : x)); await db.updateCustomer(c); };
  const handleDeleteCustomer = async (id: string) => { setCustomers(prev => prev.filter(x => x.id !== id)); await db.deleteCustomer(id); };
  
  const handleAddSupplier = async (s: Supplier) => { setSuppliers(prev => [s, ...prev]); await db.addSupplier(s); };
  const handleEditSupplier = async (s: Supplier) => { setSuppliers(prev => prev.map(x => x.id === s.id ? s : x)); await db.updateSupplier(s); };
  const handleDeleteSupplier = async (id: string) => { setSuppliers(prev => prev.filter(x => x.id !== id)); await db.deleteSupplier(id); };
  const handlePaySupplier = async (id: string, amt: number) => { 
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, debt: s.debt - amt } : s)); 
      await db.paySupplierDebt(id, amt); 
  };
  
  const handleAddPurchase = async (p: Purchase) => {
      setPurchases(prev => [p, ...prev]);
      await db.addPurchase(p);
      const data = await db.load();
      if(data) { 
          setProducts(data.products); 
          setSuppliers(data.suppliers); 
          setStockMovements(data.movements); 
      }
  };
  const handleUpdatePurchase = async (p: Purchase) => { setPurchases(prev => prev.map(x => x.id === p.id ? p : x)); await db.updatePurchase(p); };
  const handleDeletePurchase = async (id: string) => { setPurchases(prev => prev.filter(x => x.id !== id)); await db.deletePurchase(id); };
  
  const handleAddExpense = async (e: Expense) => { setExpenses(prev => [e, ...prev]); await db.addExpense(e); };
  const handleDeleteExpense = async (id: string) => { setExpenses(prev => prev.filter(x => x.id !== id)); await db.deleteExpense(id); };
  
  const handleAddDocument = async (d: Document) => { setDocuments(prev => [d, ...prev]); await db.addDocument(d); };
  const handleUpdateDocument = async (d: Document) => { setDocuments(prev => prev.map(x => x.id === d.id ? d : x)); await db.updateDocument(d); };
  const handleDeleteDocument = async (id: string) => { setDocuments(prev => prev.filter(x => x.id !== id)); await db.deleteDocument(id); };
  
  const handleAddUser = async (u: User) => { setUsers(prev => [...prev, u]); await db.addUser(u); };
  const handleDeleteUser = async (id: string) => { setUsers(prev => prev.filter(u => u.id !== id)); await db.deleteUser(id); };
  
  const handleSaveSettings = async (s: CompanySettings) => { setSettings(s); await db.saveSettings(s); };

  if (showLanding && !isAuthenticated) {
    if(!landingConfig) return <div>Loading...</div>;
    return <LandingPage config={landingConfig} plans={plans} onLogin={() => setShowLanding(false)} onSelectPlan={(planId) => { setSelectedPlan(planId); setShowLanding(false); }} />;
  }

  if (!isAuthenticated) {
    return <LoginView initialPlan={selectedPlan} onLoginSuccess={(u) => { setIsAuthenticated(true); setUserRole(u.role); if(u.modules) setCurrentModules(u.modules); }} onBack={() => { setShowLanding(true); setSelectedPlan(null); }} />;
  }

  if (userRole === 'SUPER_ADMIN' && !impersonatedTenant) {
      return <SuperAdminView onLogout={handleLogout} onImpersonate={handleImpersonate} />;
  }
  
  if (!isLoaded) return <div className="min-h-screen bg-dark flex flex-col items-center justify-center text-white font-bold animate-pulse">Chargement AtlasPOS...</div>;

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return (
        <div className="space-y-8 animate-fade-in pb-20">
          <header className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <Wifi size={12} className="text-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black text-emerald-600 tracking-[0.2em] uppercase">SaaS Cloud: Connecté</p>
              </div>
              <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tighter italic">Salam, {settings.name}</h1>
            </div>
          </header>
          
          {/* AI ANALYST WIDGET - Text Size Reduced */}
          {aiInsight && (
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl flex items-start gap-5">
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md shrink-0">
                      <Bot size={24} className="text-white animate-pulse" />
                  </div>
                  <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Atlas AI Monitor (Darija)</p>
                      <h3 className="text-sm md:text-base font-bold leading-tight">"{aiInsight}"</h3>
                  </div>
                  <Sparkles className="absolute top-4 right-4 text-white/20" size={100} />
              </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { label: 'Caisse Jour', val: sales.filter(s => s.paymentMethod !== 'KARNE' && new Date(s.date).toDateString() === new Date().toDateString()).reduce((a, b) => a + Number(b.total), 0), icon: DollarSign, color: 'text-gray-900' },
               { label: 'Crédit Clients', val: customers.reduce((a, b) => a + Number(b.balance), 0), icon: Users, color: 'text-red-500' },
               { label: 'Stock (Valeur)', val: products.reduce((a, b) => a + (Number(b.price) * Number(b.stock)), 0), icon: Package, color: 'text-emerald-600', disabled: !currentModules.stock },
               { label: 'Bénéfice Net', val: (sales.reduce((a, b) => a + b.total, 0) - expenses.reduce((a,e)=>a+e.amount,0)), icon: PieChart, color: 'text-indigo-600' },
             ].map((stat, i) => (
               <div key={i} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all ${stat.disabled ? 'opacity-50 grayscale' : ''}`}>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-black">{stat.disabled ? '---' : stat.val.toLocaleString()} <span className={`text-xs ${stat.color}`}>DH</span></h3>
                  <stat.icon className={`absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform ${stat.color.replace('text-', 'text-')}`} />
               </div>
             ))}
          </div>
        </div>
      );
      case AppView.POS: return currentModules.pos ? <PosView products={products} customers={customers} sales={sales} onProcessSale={handleProcessSale} settings={settings} /> : null;
      case AppView.KARNE: return <KarneView customers={customers} sales={sales} products={products} onSettleDebt={(id, amt) => { db.settleDebt(id, amt); setCustomers(prev => prev.map(c => c.id === id ? {...c, balance: c.balance - amt} : c)); }} onMarkSalePaid={handleMarkSalePaid} onAddCustomer={handleAddCustomer} onEditCustomer={handleEditCustomer} onDeleteCustomer={handleDeleteCustomer} onUpdateSale={handleUpdateSale} onDeleteSale={handleDeleteSale} />;
      case AppView.STOCK: return currentModules.stock ? <StockView products={products} movements={stockMovements} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onAddMovement={async (m) => { await db.addStockMovement(m); setStockMovements([m, ...stockMovements]); const d = await db.load(); if(d) setProducts(d.products); }} /> : null;
      case AppView.PURCHASES: return currentModules.stock ? (
        <PurchasesView 
            purchases={purchases} 
            suppliers={suppliers} 
            products={products} 
            onImport={(data) => handleAddPurchase({ 
                id: `pur-${Date.now()}`, 
                supplierId: suppliers.find(s => s.name === data.supplierName)?.id || 'unknown', 
                date: data.date, 
                items: data.items.map((i:any) => ({ name: i.name, quantity: i.quantity, cost: i.costPrice })), 
                total: data.total 
            })} 
            onUpdatePurchase={handleUpdatePurchase} 
            onDeletePurchase={handleDeletePurchase} 
        />
      ) : null;
      case AppView.BILLING: return currentModules.accounting ? <BillingView documents={documents} customers={customers} products={products} settings={settings} onCreateDocument={handleAddDocument} onUpdateDocument={handleUpdateDocument} onDeleteDocument={handleDeleteDocument} /> : null;
      case AppView.SUPPLIERS: return <SuppliersView suppliers={suppliers} purchases={purchases} onAddSupplier={handleAddSupplier} onEditSupplier={handleEditSupplier} onDeleteSupplier={handleDeleteSupplier} onPayDebt={handlePaySupplier} />;
      case AppView.EXPENSES: return <ExpensesView expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />;
      case AppView.AI_COACH: return currentModules.ai ? <AiCoachView sales={sales} inventory={products} customers={customers} /> : null;
      case AppView.USERS: return <UsersView users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} />;
      case AppView.SETTINGS: return <SettingsView settings={settings} onSave={handleSaveSettings} />;
      case AppView.REPORTS: return <ReportsView sales={sales} expenses={expenses} products={products} />;
      default: return <div>Page introuvable</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 flex">
      {impersonatedTenant && (
          <div className="fixed top-0 left-0 right-0 h-10 bg-red-600 z-[100] flex items-center justify-center text-white gap-4 shadow-xl">
              <span className="text-xs font-black uppercase tracking-widest animate-pulse">MODE SUPER ADMIN : "{impersonatedTenant.name.toUpperCase()}"</span>
              <button onClick={exitImpersonation} className="bg-white text-red-600 px-4 py-1 rounded-full text-[10px] font-black uppercase hover:bg-gray-100 flex items-center gap-2"><LogOut size={12}/> Quitter</button>
          </div>
      )}
      <Sidebar currentView={currentView} onChangeView={setCurrentView} enabledModules={currentModules} />
      <main className={`flex-1 ml-20 lg:ml-64 p-4 lg:p-10 overflow-x-hidden min-h-screen relative ${impersonatedTenant ? 'pt-14' : ''}`}>
        <button onClick={handleLogout} className="absolute top-4 right-4 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-50 hover:text-red-500">Déconnexion</button>
        <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
      </main>
    </div>
  );
};
export default App;
