
import React from 'react';
import { LayoutDashboard, ShoppingCart, Users, Sparkles, Settings, LogOut, Store, Package, Truck, WalletCards, FileText, ShoppingBag, UsersRound, PieChart } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  enabledModules?: { // New Prop
      pos: boolean;
      stock: boolean;
      ai: boolean;
      accounting: boolean;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, enabledModules }) => {
  // Default to all true if not provided (fallback)
  const modules = enabledModules || { pos: true, stock: true, ai: true, accounting: true };

  const allNavItems = [
    { id: AppView.DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard, visible: true },
    { id: AppView.POS, label: 'Caisse (POS)', icon: ShoppingCart, visible: modules.pos },
    { id: AppView.STOCK, label: 'Stock & Mouvements', icon: Package, visible: modules.stock },
    { id: AppView.BILLING, label: 'Factures & Bons', icon: FileText, visible: modules.accounting },
    { id: AppView.PURCHASES, label: 'Achats & Fournisseurs', icon: ShoppingBag, visible: modules.stock },
    { id: AppView.KARNE, label: 'Clients (Crédit)', icon: Users, visible: true },
    { id: AppView.REPORTS, label: 'Rapports & Bénéfice', icon: PieChart, visible: true },
    { id: AppView.EXPENSES, label: 'Dépenses', icon: WalletCards, visible: true },
    { id: AppView.USERS, label: 'Équipe', icon: UsersRound, visible: true },
    { id: AppView.AI_COACH, label: 'Atlas AI Coach', icon: Sparkles, special: true, visible: modules.ai },
    { id: AppView.SETTINGS, label: 'Paramètres', icon: Settings, visible: true },
  ];

  const navItems = allNavItems.filter(item => item.visible);

  return (
    <div className="w-20 lg:w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-20 transition-all duration-300">
      <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100 bg-gray-50/30">
        <div className="bg-primary p-2 rounded-2xl shadow-lg shadow-primary/20 mr-0 lg:mr-3">
            <Store className="h-6 w-6 text-white" />
        </div>
        <span className="hidden lg:block font-black text-xl text-gray-900 tracking-tighter italic">Atlas<span className="text-primary">PRO</span></span>
      </div>

      <nav className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-2xl transition-all duration-300 group relative
              ${currentView === item.id 
                ? 'bg-dark text-white shadow-xl shadow-dark/20' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-primary'
              }
            `}
          >
            <item.icon 
              className={`h-5 w-5 lg:mr-3 ${item.special && currentView !== item.id ? 'text-secondary animate-pulse' : ''}`} 
            />
            <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">{item.label}</span>
            {currentView === item.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/30">
        <div className="hidden lg:flex items-center gap-3 px-3 py-4 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black">A</div>
            <div>
                <p className="text-[10px] font-black text-gray-900">ADMIN</p>
                <p className="text-[9px] text-gray-400">Atlas Shop #1</p>
            </div>
        </div>
        <button className="w-full flex items-center justify-center lg:justify-start px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors font-bold text-xs uppercase tracking-widest">
          <LogOut className="h-5 w-5 lg:mr-3" />
          <span className="hidden lg:block">Quitter</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
