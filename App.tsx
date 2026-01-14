
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
import { DollarSign, Users, Package, FileText, Wifi, PieChart, ShieldAlert, Lock, Eye, LogOut, Bot, Sparkles, AlertTriangle, PlayCircle } from 'lucide-react';
import { db } from './services/db';
import { analyzeDashboardRisks } from './services/geminiService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'CAISSIER' | 'MANAGER' | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [showLanding, setShowLanding] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [impersonatedTenant, setImpersonatedTenant] = useState<{id: string, name: string} | null>(null);
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
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
      name: 'Atlas Shop', address: 'Maroc', phone: '', ice: '', logoUrl: '',
      invoiceTemplate: 'A4_STANDARD', documentFormat: 'A4', currency: 'DH',
      tvaEnabled: true, customPaymentMethods: ['CASH', 'CARD', 'KARNE']
  });
  
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('atlas_token');
    const savedUser = localStorage.getItem('atlas_user');
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

  useEffect(() => {
    if (isAuthenticated && (userRole !== 'SUPER_ADMIN' || impersonatedTenant)) {
        db.load().then(data => {
            if (data) {
                setProducts(data.products);
                setCustomers(data.customers);
                setSales(data.sales);
                setSuppliers(data.suppliers);
                setExpenses(data.expenses);
                setPurchases(data.purchases);
                setUsers(data.users);
                setDocuments(data.documents);
                setStockMovements(data.movements);
                if(data.settings) setSettings(data.settings);
            }
            setIsLoaded(true);
        });
    }
  }, [isAuthenticated, impersonatedTenant, currentView]);

  const handleAddSupplier = async (s: Supplier) => { setSuppliers(prev => [s, ...prev]); await db.addSupplier(s); };
  const handleEditSupplier = async (s: Supplier) => { setSuppliers(prev => prev.map(x => x.id === s.id ? s : x)); await db.updateSupplier(s); };
  const handleDeleteSupplier = async (id: string) => { setSuppliers(prev => prev.filter(x => x.id !== id)); await db.deleteSupplier(id); };
  const handlePaySupplier = async (id: string, amt: number) => { 
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, debt: s.debt - amt } : s)); 
      await db.paySupplierDebt(id, amt); 
  };
  
  const handleImportPurchase = async (data: any) => {
      let supplierId = data.supplierId;
      if (supplierId === 'NEW') {
          const newSup: Supplier = { id: `sup-${Date.now()}`, name: data.supplierName, phone: '0600000000', category: 'Divers', debt: 0 };
          setSuppliers(prev => [newSup, ...prev]);
          await db.addSupplier(newSup);
          supplierId = newSup.id;
      }
      const newPurchase: Purchase = { id: `pur-${Date.now()}`, supplierId: supplierId || 'unknown', date: data.date, items: data.items.map((i:any) => ({ name: i.name, quantity: i.quantity, cost: i.costPrice })), total: data.total };
      setPurchases(prev => [newPurchase, ...prev]);
      await db.addPurchase(newPurchase);
      const updated = await db.load();
      if(updated) { setProducts(updated.products); setSuppliers(updated.suppliers); setStockMovements(updated.movements); }
  };

  // Document Handlers
  const handleCreateDocument = async (doc: Document) => {
    setDocuments([doc, ...documents]);
    await db.addDocument(doc);
  };

  const handleUpdateDocument = async (doc: Document) => {
    setDocuments(documents.map(d => d.id === doc.id ? doc : d));
    await db.updateDocument(doc);
  };

  const handleDeleteDocument = async (id: string) => {
    if(confirm("Voulez-vous vraiment supprimer ce document ?")) {
        setDocuments(documents.filter(d => d.id !== id));
        await db.deleteDocument(id);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return (
        <div className="space-y-8 animate-fade-in pb-20">
          <header className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1"><Wifi size={12} className="text-emerald-500 animate-pulse" /><p className="text-[10px] font-black text-emerald-600 tracking-[0.2em] uppercase">SaaS Cloud: Connecté</p></div>
              <h1 className="text-4xl font-black text-gray-900 leading-none tracking-tighter italic">Salam, {settings.name}</h1>
            </div>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[{ label: 'Caisse Jour', val: sales.filter(s => s.paymentMethod !== 'KARNE' && new Date(s.date).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.total, 0), icon: DollarSign, color: 'text-gray-900' }, { label: 'Crédit Clients', val: customers.reduce((a, b) => a + (b.balance || 0), 0), icon: Users, color: 'text-red-500' }, { label: 'Dette Fournisseurs', val: suppliers.reduce((a, b) => a + (b.debt || 0), 0), icon: Package, color: 'text-orange-600' }, { label: 'Bénéfice Net', val: (sales.reduce((a, b) => a + b.total, 0) - expenses.reduce((a,e)=>a+e.amount,0)), icon: PieChart, color: 'text-indigo-600' }].map((stat, i) => (
               <div key={i} className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all`}>
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">{stat.label}</p>
                 <h3 className="text-3xl font-black">{stat.val.toLocaleString()} <span className={`text-xs ${stat.color}`}>DH</span></h3>
                 <stat.icon className={`absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform ${stat.color}`} />
               </div>
             ))}
          </div>
        </div>
      );
      case AppView.SUPPLIERS: return <SuppliersView suppliers={suppliers} purchases={purchases} onAddSupplier={handleAddSupplier} onEditSupplier={handleEditSupplier} onDeleteSupplier={handleDeleteSupplier} onPayDebt={handlePaySupplier} />;
      case AppView.PURCHASES: return <PurchasesView purchases={purchases} suppliers={suppliers} products={products} onImport={handleImportPurchase} />;
      case AppView.POS: return <PosView products={products} customers={customers} sales={sales} onProcessSale={async (s) => { setSales([s, ...sales]); await db.addSale(s); }} settings={settings} />;
      case AppView.STOCK: return <StockView products={products} movements={stockMovements} onAddProduct={async (p) => { setProducts([p, ...products]); await db.addProduct(p); }} onUpdateProduct={async (p) => { setProducts(products.map(x => x.id === p.id ? p : x)); await db.updateProduct(p); }} onDeleteProduct={async (id) => { setProducts(products.filter(x => x.id !== id)); await db.deleteProduct(id); }} onAddMovement={async (m) => { await db.addStockMovement(m); setStockMovements([m, ...stockMovements]); }} />;
      case AppView.KARNE: return <KarneView customers={customers} sales={sales} products={products} onSettleDebt={async (id, amt) => { 
            await db.settleDebt(id, amt); 
            setCustomers(customers.map(c => c.id === id ? {...c, balance: (c.balance || 0) - amt} : c)); 
      }} onMarkSalePaid={async (saleId, customerId) => { const sale = sales.find(s => s.id === saleId); if(sale) { const updatedSale = {...sale, isPaid: true}; setSales(sales.map(s => s.id === saleId ? updatedSale : s)); await db.updateSale(updatedSale); setCustomers(customers.map(c => c.id === customerId ? {...c, balance: (c.balance || 0) - (sale.total - (sale.advance || 0))} : c)); } }} onAddCustomer={async (c) => { setCustomers([c, ...customers]); await db.addCustomer(c); }} onEditCustomer={async (c) => { setCustomers(customers.map(x => x.id === c.id ? c : x)); await db.updateCustomer(c); }} onDeleteCustomer={async (id) => { setCustomers(customers.filter(x => x.id !== id)); await db.deleteCustomer(id); }} onUpdateSale={async (s) => { setSales(sales.map(x => x.id === s.id ? s : x)); await db.updateSale(s); const updatedData = await db.load(); if(updatedData) setCustomers(updatedData.customers); }} onDeleteSale={async (id) => { setSales(sales.filter(x => x.id !== id)); await db.deleteSale(id); const updatedData = await db.load(); if(updatedData) setCustomers(updatedData.customers); }} />;
      case AppView.BILLING: return <BillingView documents={documents} customers={customers} products={products} settings={settings} onCreateDocument={handleCreateDocument} onUpdateDocument={handleUpdateDocument} onDeleteDocument={handleDeleteDocument} />;
      case AppView.AI_COACH: return <AiCoachView sales={sales} inventory={products} customers={customers} />;
      case AppView.EXPENSES: return <ExpensesView expenses={expenses} onAddExpense={async (e) => { setExpenses([e, ...expenses]); await db.addExpense(e); }} onDeleteExpense={async (id) => { setExpenses(expenses.filter(x => x.id !== id)); await db.deleteExpense(id); }} />;
      case AppView.USERS: return <UsersView users={users} onAddUser={async (u) => { setUsers([...users, u]); await db.addUser(u); }} onDeleteUser={async (id) => { setUsers(users.filter(u => u.id !== id)); await db.deleteUser(id); }} />;
      case AppView.SETTINGS: return <SettingsView settings={settings} onSave={async (s) => { setSettings(s); await db.saveSettings(s); }} />;
      case AppView.REPORTS: return <ReportsView sales={sales} expenses={expenses} products={products} />;
      default: return <div>Page introuvable</div>;
    }
  };

  const handleLogout = () => { localStorage.clear(); window.location.reload(); };

  if (showLanding && !isAuthenticated) {
    if (!landingConfig) {
      return (
        <div className="min-h-screen bg-dark flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black uppercase tracking-[0.3em] text-xs">Chargement Atlas SaaS...</p>
        </div>
      );
    }
    return <LandingPage config={landingConfig} plans={plans} onLogin={() => setShowLanding(false)} onSelectPlan={setSelectedPlan} />;
  }
  
  if (!isAuthenticated) return <LoginView onLoginSuccess={(u) => { setIsAuthenticated(true); setUserRole(u.role); }} onBack={() => setShowLanding(true)} />;
  if (!isLoaded) return <div className="min-h-screen bg-dark flex items-center justify-center text-white">Chargement des données...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 flex">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} enabledModules={currentModules} />
      <main className={`flex-1 ml-20 lg:ml-64 p-4 lg:p-10 overflow-x-hidden min-h-screen relative`}>
        <button onClick={handleLogout} className="absolute top-4 right-4 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-red-50 hover:text-red-500">Déconnexion</button>
        <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
      </main>
    </div>
  );
};
export default App;
