import React, { useState, useMemo, useRef, useEffect } from 'react';
// Added missing Loader2 and Package to the lucide-react imports
import { Search, Plus, Minus, CreditCard, User, Wallet, ShoppingCart, Scan, Mic, MicOff, X, BrainCircuit, Sparkles, AlertCircle, History, LayoutGrid, Receipt, Calendar, Banknote, Clock, ArrowUpRight, ChevronRight, Tag, Info, Trash2, Loader2, Package } from 'lucide-react';
import { Product, CartItem, Customer, Sale, CompanySettings } from '../types';
import { getAISearchIntent } from '../services/geminiService';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  onProcessSale: (sale: Sale) => void;
  settings?: CompanySettings;
}

const PosView: React.FC<PosViewProps> = ({ products, customers, sales, onProcessSale, settings }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY'>('POS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  // Fixed: Added toggleVoice function to handle voice UI toggle
  const toggleVoice = () => {
    setIsListening(!isListening);
  };

  const categories = ['Tout', ...Array.from(new Set(products.map(p => p.category)))];
  const paymentMethods = settings?.customPaymentMethods || ['CASH', 'CARD', 'KARNE'];

  const handleAiSearch = async () => {
    if (searchTerm.length < 3) return;
    setAiLoading(true);
    const ids = await getAISearchIntent(searchTerm, products);
    setAiResults(ids);
    setAiLoading(false);
  };

  const filteredProducts = useMemo(() => {
    if (isAiSearch && aiResults.length > 0) {
      return products.filter(p => aiResults.includes(p.id));
    }
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Tout' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, isAiSearch, aiResults]);

  const filteredSales = useMemo(() => {
      return sales.filter(s => 
          s.id.toLowerCase().includes(historySearch.toLowerCase()) || 
          (customers.find(c => c.id === s.customerId)?.name.toLowerCase().includes(historySearch.toLowerCase()))
      );
  }, [sales, historySearch, customers]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
      setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const initCheckout = (method: string) => {
      if (cart.length === 0) return;
      if (method === 'KARNE' && !selectedCustomer) {
          alert("Veuillez sélectionner un client pour le crédit.");
          return;
      }
      if (method === 'KARNE') {
          setShowAdvanceModal(true);
          return;
      }
      handleCheckout(method, 0);
  };

  const handleCheckout = (method: string, advance: number) => {
    onProcessSale({
      id: `s-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal,
      paymentMethod: method,
      customerId: selectedCustomer || undefined,
      advance: advance,
      isPaid: method !== 'KARNE'
    });
    setCart([]);
    setSelectedCustomer('');
    setShowAdvanceModal(false);
  };

  const getCustomerName = (id?: string) => {
      if (!id) return "Client de Passage";
      return customers.find(c => c.id === id)?.name || "Client Inconnu";
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8 relative animate-fade-in -mt-4">
      
      {/* --- MODAL AVANCE --- */}
      {showAdvanceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/80 backdrop-blur-md">
              <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-scale-up text-center border border-gray-100">
                  <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                      <Banknote size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">Avance (Tsb9)</h3>
                  <p className="text-gray-500 mb-8 font-medium">Le client verse-t-il une partie de la somme ?</p>
                  
                  <div className="bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total à payer</p>
                      <p className="text-4xl font-black text-gray-900">{cartTotal.toFixed(2)} <span className="text-sm">DH</span></p>
                  </div>

                  <div className="relative mb-8">
                    <input 
                        type="number" 
                        placeholder="0.00" 
                        className="w-full p-6 bg-white border-2 border-gray-100 rounded-[2rem] font-black text-4xl text-center outline-none focus:border-primary transition-all text-primary shadow-sm"
                        value={advanceAmount}
                        onChange={e => setAdvanceAmount(e.target.value)}
                        autoFocus
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 right-6 font-black text-gray-300 text-xl">DH</div>
                  </div>
                  
                  <div className="flex gap-4">
                      <button onClick={() => setShowAdvanceModal(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs tracking-widest">Annuler</button>
                      <button 
                        onClick={() => handleCheckout('KARNE', parseFloat(advanceAmount) || 0)} 
                        className="flex-[2] py-5 bg-primary text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-primary/20 transition-all uppercase text-xs tracking-widest"
                      >
                          Valider le Bon
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- PARTIE GAUCHE : CATALOGUE --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Tabs (Glass Style) */}
        <div className="flex items-center gap-4 mb-6 bg-white/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-white w-fit shadow-sm">
            <button 
              onClick={() => setActiveTab('POS')} 
              className={`px-8 py-3 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'POS' ? 'bg-dark text-white shadow-xl' : 'text-gray-400 hover:text-gray-900'}`}
            >
                <LayoutGrid size={16} /> Vente Rapide
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')} 
              className={`px-8 py-3 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'HISTORY' ? 'bg-dark text-white shadow-xl' : 'text-gray-400 hover:text-gray-900'}`}
            >
                <History size={16} /> Historique
            </button>
        </div>

        {activeTab === 'POS' ? (
            <div className="flex flex-col h-full space-y-6">
                
                {/* Barre de Recherche Royale */}
                <div className="flex gap-4 items-center">
                    <div className={`relative flex-1 group transition-all duration-500 ${isAiSearch ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity ${isAiSearch ? 'bg-purple-500/20' : ''}`}></div>
                        <div className={`relative flex items-center bg-white rounded-[2.5rem] border-2 border-transparent group-focus-within:border-primary/20 group-focus-within:shadow-2xl transition-all shadow-sm ${isAiSearch ? 'group-focus-within:border-purple-500/30' : ''}`}>
                            <Search className={`ml-6 transition-colors duration-300 ${isAiSearch ? 'text-purple-500' : 'text-gray-400 group-focus-within:text-primary'}`} size={24} />
                            <input 
                                type="text" 
                                placeholder={isAiSearch ? "Dites-moi ce que le client veut... (Ex: Petit déjeuner complet)" : "Scanner ou chercher un produit..."}
                                className="w-full pl-4 pr-32 py-6 bg-transparent outline-none text-lg font-bold text-gray-900 placeholder-gray-300"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value === '') setAiResults([]);
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && isAiSearch && handleAiSearch()}
                            />
                            <div className="absolute right-4 flex items-center gap-2">
                                <button 
                                    onClick={() => { setIsAiSearch(!isAiSearch); setAiResults([]); setSearchTerm(''); }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest ${isAiSearch ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-gray-300 hover:text-gray-600'}`}
                                >
                                    {isAiSearch ? <Sparkles size={16}/> : <BrainCircuit size={16}/>}
                                    {isAiSearch ? 'Smart Mode' : 'IA'}
                                </button>
                                {isAiSearch && searchTerm.length > 2 && (
                                    <button onClick={handleAiSearch} className="p-3 bg-white text-purple-600 rounded-xl shadow-lg border border-purple-100 hover:bg-purple-50 transition-all">
                                        {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpRight size={18} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={toggleVoice} className={`p-6 rounded-[2rem] shadow-xl transition-all hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-400 border border-gray-100 hover:text-primary'}`}>
                        {isListening ? <MicOff size={24}/> : <Mic size={24}/>}
                    </button>
                    <button onClick={() => setIsScanning(true)} className="p-6 bg-dark text-white rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        <Scan size={24}/>
                    </button>
                </div>

                {/* Filtre Catégories Épuré */}
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setIsAiSearch(false); }}
                            className={`px-8 py-3.5 rounded-[1.5rem] whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat && !isAiSearch ? 'bg-primary text-white shadow-xl shadow-primary/30 -translate-y-1' : 'bg-white text-gray-400 border border-gray-100 hover:border-primary/30 hover:text-primary shadow-sm'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grille Produits Modernes */}
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                    {isAiSearch && aiResults.length === 0 && searchTerm.length > 2 && !aiLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 bg-purple-50 text-purple-600 rounded-[2.5rem] flex items-center justify-center mb-6 animate-pulse">
                                <BrainCircuit size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">Recherche Prédictive Active</h3>
                            <p className="text-gray-400 font-medium max-w-sm">Appuyez sur Entrée pour laisser l'IA analyser votre demande et trouver les meilleurs produits.</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <button 
                                key={product.id} 
                                onClick={() => addToCart(product)} 
                                className="group relative bg-white rounded-[2.5rem] p-4 text-left transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-2 border border-gray-100 flex flex-col h-full overflow-hidden"
                            >
                                {/* Stock Alert Badge */}
                                {product.stock <= 5 && (
                                    <div className="absolute top-4 right-4 z-10 bg-red-500/90 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg">Stock Bas</div>
                                )}
                                
                                <div className="aspect-square rounded-[2rem] bg-gray-50 mb-4 overflow-hidden relative border border-gray-50/50">
                                    {product.image ? (
                                        <img src={product.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115" alt={product.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={40}/></div>
                                    )}
                                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500"></div>
                                </div>
                                
                                <div className="flex-1 flex flex-col">
                                    <div className="flex items-center gap-1.5 mb-1 opacity-50">
                                        <Tag size={10} className="text-primary"/>
                                        <span className="text-[9px] font-black uppercase tracking-widest truncate">{product.category}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-3 line-clamp-2">{product.name}</h3>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">{(product.price || 0).toFixed(2)}<span className="text-xs text-gray-400 font-bold ml-1">DH</span></p>
                                        <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg transition-all duration-300 transform group-active:scale-90">
                                            <Plus size={20} />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            /* --- VUE HISTORIQUE ÉLÉGANTE --- */
            <div className="flex flex-col h-full bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
                        <input 
                            placeholder="Chercher une référence ou un client..." 
                            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-8 py-5">Bon / Date</th>
                                <th className="px-8 py-5">Client</th>
                                <th className="px-8 py-5">Articles</th>
                                <th className="px-8 py-5 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-gray-900 mb-1">#{sale.id.slice(-6)}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <Calendar size={12}/> {new Date(sale.date).toLocaleDateString()}
                                            <span className="mx-1">•</span>
                                            <Clock size={12}/> {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 text-xs font-black">
                                                {getCustomerName(sale.customerId).charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{getCustomerName(sale.customerId)}</p>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${sale.paymentMethod === 'KARNE' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-bold text-gray-600">{sale.items.length} Produits</p>
                                        <p className="text-[10px] text-gray-400 truncate max-w-[150px] italic">
                                            {sale.items.map(i => i.name).join(', ')}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-xl font-black text-gray-900 tracking-tighter">{(sale.total || 0).toFixed(2)} <span className="text-[10px] text-gray-400">DH</span></p>
                                        {sale.advance > 0 && <p className="text-[9px] text-emerald-600 font-black uppercase">Payé: {sale.advance} DH</p>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* --- PARTIE DROITE : PANIER (TICKET DE CAISSE DESIGN) --- */}
      <div className="w-full lg:w-[480px] flex flex-col h-[700px] lg:h-full">
        
        <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden relative">
            
            {/* Header Panier */}
            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <ShoppingCart size={24}/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Commande</h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Nouveau Ticket de Caisse</p>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={20}/>
                        </button>
                    )}
                </div>

                {/* Sélecteur Client Intégré */}
                <div className="relative mt-6">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-primary">
                        <User size={18} />
                    </div>
                    <select 
                        value={selectedCustomer} 
                        onChange={(e) => setSelectedCustomer(e.target.value)} 
                        className="w-full pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 outline-none appearance-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all uppercase tracking-widest"
                    >
                        <option value="">👤 Client de Passage</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} (Solde: {(c.balance || 0)} DH)</option>)}
                    </select>
                </div>
            </div>

            {/* Liste des Articles (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Receipt size={48} className="text-gray-200" />
                        </div>
                        <p className="font-black text-xs uppercase tracking-[0.3em] text-gray-400">Le panier est vide</p>
                        <p className="text-[10px] font-bold text-gray-300 mt-2">Cliquez sur un produit pour commencer</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-[1.8rem] group hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/10">
                            <div className="h-16 w-16 bg-white rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm relative transition-transform duration-500 group-hover:scale-110">
                                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200 font-black">?</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-gray-900 truncate mb-1">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{(item.price || 0).toFixed(2)} DH</span>
                                    <span className="text-[8px] text-gray-300 font-bold">x {item.quantity}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                                <button onClick={() => updateQuantity(item.id, -1)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Minus size={14} /></button>
                                <span className="text-sm font-black w-6 text-center text-gray-900">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"><Plus size={14} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Panier (Totals & Checkout) */}
            <div className="p-8 bg-white border-t border-gray-100">
                <div className="flex flex-col space-y-4 mb-8">
                    <div className="flex justify-between items-center text-gray-400 font-bold text-xs uppercase tracking-widest">
                        <span>Sous-total</span>
                        <span>{cartTotal.toFixed(2)} DH</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Net à payer</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-gray-900 tracking-tighter">{cartTotal.toFixed(2)}</span>
                                <span className="text-lg font-black text-primary">DH</span>
                            </div>
                        </div>
                        <div className="h-16 w-16 bg-dark rounded-[2rem] flex items-center justify-center text-secondary shadow-2xl">
                            <Wallet size={32} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {paymentMethods.map(method => (
                        <button 
                            key={method}
                            onClick={() => initCheckout(method)} 
                            className={`flex flex-col items-center justify-center gap-3 py-6 rounded-[2.2rem] transition-all duration-300 shadow-xl active:scale-95 group 
                                ${method === 'CASH' ? 'bg-primary text-white hover:bg-emerald-700 shadow-primary/20' : 
                                  method === 'KARNE' ? 'bg-secondary text-white hover:bg-amber-600 shadow-amber-200' :
                                  'bg-dark text-white hover:bg-gray-800 shadow-dark/20'}`}
                        >
                            <div className="p-2 bg-white/10 rounded-xl group-hover:scale-110 transition-transform">
                                {method === 'CASH' ? <Banknote size={24}/> : method === 'CARD' ? <CreditCard size={24}/> : <AlertCircle size={24}/>}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{method === 'KARNE' ? 'Crédit' : method}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- OVERLAY SCANNER --- */}
      {isScanning && (
        <div className="fixed inset-0 z-[110] bg-dark/95 backdrop-blur-2xl flex flex-col items-center justify-center">
           <button onClick={() => setIsScanning(false)} className="absolute top-10 right-10 p-6 text-white/50 hover:text-white transition-all bg-white/5 rounded-full hover:scale-110"><X size={40} /></button>
           <div className="relative">
                <div className="absolute -inset-10 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="relative w-80 h-80 border-[8px] border-white/10 rounded-[4rem] overflow-hidden shadow-[0_0_50px_rgba(15,118,110,0.5)]">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-red-500 shadow-[0_0_30px_rgba(239,68,68,1)] animate-scan"></div>
                </div>
           </div>
           <p className="text-white font-black uppercase tracking-[0.5em] mt-16 text-xs animate-pulse">Scanning Intelligent...</p>
        </div>
      )}
    </div>
  );
};

export default PosView;