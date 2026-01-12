
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Minus, CreditCard, User, Wallet, ShoppingCart, Scan, Mic, MicOff, X, BrainCircuit, Sparkles, AlertCircle, History, LayoutGrid, Receipt, Calendar, Banknote, Clock, ArrowUpRight } from 'lucide-react';
import { Product, CartItem, Customer, Sale, CompanySettings } from '../types';
import { getAISearchIntent } from '../services/geminiService';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  onProcessSale: (sale: Sale) => void;
  settings?: CompanySettings; // New Prop
}

const PosView: React.FC<PosViewProps> = ({ products, customers, sales, onProcessSale, settings }) => {
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY'>('POS');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [historySearch, setHistorySearch] = useState(''); // New search for history
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Advance Payment State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

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

  // Filter Sales History
  const filteredSales = useMemo(() => {
      return sales.filter(s => 
          s.id.toLowerCase().includes(historySearch.toLowerCase()) || 
          (getCustomerName(s.customerId).toLowerCase().includes(historySearch.toLowerCase()))
      );
  }, [sales, historySearch]);

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

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const toggleVoice = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        const prod = products.find(p => p.name.toLowerCase().includes("coca") || p.name.toLowerCase().includes("thé"));
        if (prod) addToCart(prod);
        setIsListening(false);
      }, 2000);
    } else {
      setIsListening(false);
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setTimeout(() => {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        addToCart(randomProduct);
        stopScanner();
      }, 3000);
    } catch (err) { setIsScanning(false); }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
    }
    setIsScanning(false);
  };

  const initCheckout = (method: string) => {
      if (cart.length === 0) return;
      if (method === 'KARNE') {
          if (!selectedCustomer) {
              alert("Veuillez sélectionner un client pour le crédit.");
              return;
          }
          setShowAdvanceModal(true);
          setAdvanceAmount('');
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
      customerId: selectedCustomer || undefined, // IMPORTANT: Ensure undefined if empty string
      advance: advance,
      isPaid: method !== 'KARNE' // If Karne, implies debt unless paid fully which logic handles in db
    });
    setCart([]);
    setSelectedCustomer('');
    setShowAdvanceModal(false);
  };

  // Helper function reused in useMemo
  function getCustomerName(id?: string) {
      if (!id) return "Client de Passage";
      return customers.find(c => c.id === id)?.name || "Client Inconnu";
  };

  const getPaymentIcon = (method: string) => {
      switch(method) {
          case 'CASH': return <Banknote size={20} className="mb-2 group-hover:scale-110 transition-transform"/>;
          case 'CARD': return <CreditCard size={20} className="mb-2 group-hover:scale-110 transition-transform"/>;
          case 'KARNE': return <AlertCircle size={20} className="mb-2 group-hover:scale-110 transition-transform"/>;
          default: return <Wallet size={20} className="mb-2 group-hover:scale-110 transition-transform"/>;
      }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 relative animate-fade-in">
      {/* Advance Payment Modal */}
      {showAdvanceModal && (
          <div className="fixed inset-0 z-50 bg-dark/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-scale-up text-center">
                  <h3 className="text-xl font-black text-gray-900 mb-2">Avance sur Crédit (Tsb9)</h3>
                  <p className="text-sm text-gray-500 mb-6 font-bold">Le client paye-t-il une partie maintenant ?</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl mb-4">
                      <p className="text-xs font-black text-gray-400 uppercase">Total Commande</p>
                      <p className="text-2xl font-black text-gray-900">{cartTotal.toFixed(2)} DH</p>
                  </div>

                  <input 
                    type="number" 
                    placeholder="Montant Avance (0 si rien)" 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-black text-xl text-center outline-none focus:border-primary mb-2"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    autoFocus
                  />
                  
                  <div className="flex justify-between items-center px-2 mb-6">
                      <span className="text-xs font-bold text-gray-400">Reste à crédit:</span>
                      <span className="text-sm font-black text-red-500">{(cartTotal - (parseFloat(advanceAmount) || 0)).toFixed(2)} DH</span>
                  </div>

                  <div className="flex gap-2">
                      <button onClick={() => setShowAdvanceModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200">Annuler</button>
                      <button 
                        onClick={() => handleCheckout('KARNE', parseFloat(advanceAmount) || 0)} 
                        className="flex-1 py-3 bg-primary text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg"
                      >
                          VALIDER
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* TABS HEADER */}
        <div className="p-4 border-b border-gray-50 flex gap-4">
            <button 
              onClick={() => setActiveTab('POS')} 
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'POS' ? 'bg-dark text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
                <LayoutGrid size={16} /> Catalogue & Vente
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')} 
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'HISTORY' ? 'bg-dark text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
                <History size={16} /> Historique Ventes
            </button>
        </div>

        {activeTab === 'POS' ? (
            <>
                <div className="p-6 pt-2 border-b border-gray-50 space-y-6">
                <div className="flex gap-3">
                    <div className="relative flex-1 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${isAiSearch ? 'text-primary' : 'text-gray-400'}`} />
                    <input 
                        type="text" 
                        placeholder={isAiSearch ? "Ex: 'Chi haja l-ftour' ou 'Produits bar'din'..." : "Chercher un article..."}
                        className={`w-full pl-12 pr-28 py-4 bg-gray-50/50 border-2 rounded-[1.5rem] focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold transition-all ${isAiSearch ? 'border-primary/50 bg-primary/5' : 'border-transparent'}`}
                        value={searchTerm}
                        onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (e.target.value === '') setAiResults([]);
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && isAiSearch && handleAiSearch()}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {isAiSearch && searchTerm.length > 2 && (
                        <button onClick={handleAiSearch} className="p-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all">
                            {aiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={16} />}
                        </button>
                        )}
                        <button 
                        onClick={() => {
                            setIsAiSearch(!isAiSearch);
                            setAiResults([]);
                            setSearchTerm('');
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${isAiSearch ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white text-gray-400 border-gray-200 hover:border-primary hover:text-primary'}`}
                        >
                        <BrainCircuit size={16} /> {isAiSearch ? 'Smart Search' : 'AI'}
                        </button>
                    </div>
                    </div>
                    <button onClick={startScanner} className="p-4 bg-dark text-white rounded-2xl hover:opacity-90 transition-all shadow-lg"><Scan size={22} /></button>
                    <button onClick={toggleVoice} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{isListening ? <MicOff size={22} /> : <Mic size={22} />}</button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => {
                        setSelectedCategory(cat);
                        setIsAiSearch(false);
                        }}
                        className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat && !isAiSearch ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                        {cat}
                    </button>
                    ))}
                </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20">
                {isAiSearch && aiResults.length === 0 && searchTerm.length > 2 && !aiLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10">
                    <div className="bg-primary/5 p-6 rounded-full mb-4">
                        <Sparkles className="text-primary h-10 w-10 animate-bounce" />
                    </div>
                    <h3 className="font-black text-gray-800 text-lg mb-2">Essayez la Recherche Intelligente Atlas</h3>
                    <p className="text-gray-400 text-sm max-w-xs font-medium">Tapez votre besoin et appuyez sur l'icône AI ou Entrée. L'IA trouvera les meilleurs articles pour vous.</p>
                    </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredProducts.map(product => (
                    <button key={product.id} onClick={() => addToCart(product)} className="bg-white border border-gray-100 rounded-[2.5rem] p-5 hover:shadow-2xl hover:-translate-y-2 transition-all text-left flex flex-col h-full group relative overflow-hidden">
                        <div className="aspect-square rounded-3xl bg-gray-50 mb-4 overflow-hidden relative border border-gray-100">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 font-bold">No IMG</div>
                        )}
                        {product.stock <= 5 && <div className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter">Critique</div>}
                        </div>
                        <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-xs line-clamp-2 mb-2 leading-tight h-8">{product.name}</h3>
                        <div className="flex items-center justify-between">
                            <p className="text-primary font-black text-xl">{(product.price || 0).toFixed(2)} <span className="text-[10px]">DH</span></p>
                            <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                            <Plus size={16} />
                            </div>
                        </div>
                        </div>
                    </button>
                    ))}
                </div>
                </div>
            </>
        ) : (
            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                        <input 
                            placeholder="Filtrer par Ref ou Nom client..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            value={historySearch}
                            onChange={e => setHistorySearch(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100/50 text-gray-500 text-[10px] font-black uppercase sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4">Ref & Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Détail Panier</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4 text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredSales.map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-black text-gray-900 font-mono">#{sale.id.slice(-6)}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-1">
                                            <Calendar size={10}/>
                                            {new Date(sale.date).toLocaleDateString()}
                                            <Clock size={10} className="ml-1"/>
                                            {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                                                <User size={14}/>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{getCustomerName(sale.customerId)}</p>
                                                {sale.customerId && <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Client Fidèle</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-gray-700">{sale.items.length} Articles</p>
                                        <p className="text-[10px] text-gray-400 truncate max-w-[200px]">
                                            {sale.items.map(i => i.name).join(', ')}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 font-black text-gray-900 text-lg">
                                        {(sale.total || 0).toFixed(2)} <span className="text-xs text-gray-400">DH</span>
                                        {sale.advance > 0 && <div className="text-[9px] text-green-600 font-bold">Avance: {sale.advance} DH</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="flex items-center gap-2 text-[10px] font-bold bg-gray-50 px-2 py-1 rounded w-fit border border-gray-200 uppercase tracking-wide">
                                                {getPaymentIcon(sale.paymentMethod)} {sale.paymentMethod}
                                            </span>
                                            {sale.isPaid === false && (
                                                <span className="text-[9px] text-red-500 font-black uppercase bg-red-50 px-2 rounded">Non Payé</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center flex flex-col items-center justify-center text-gray-400">
                                        <div className="bg-gray-50 p-4 rounded-full mb-2"><History size={24}/></div>
                                        <span className="font-bold text-xs uppercase tracking-widest">Aucune vente trouvée</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* CART SIDEBAR - Always visible */}
      <div className="w-full lg:w-[420px] bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col h-[650px] lg:h-full overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/20">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-black text-2xl text-gray-900">Panier</h2>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{cart.length} Articles</div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Transaction en cours...</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <div className="p-8 rounded-full bg-gray-50 mb-6">
                <ShoppingCart size={80} className="text-gray-300" />
              </div>
              <p className="font-black text-sm uppercase tracking-[0.3em] text-gray-400">Le panier est vide</p>
              <p className="text-xs font-bold text-gray-300 mt-2">Scanner un article ou choisir dans la liste</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-3xl group border border-gray-50 hover:border-primary/20 hover:shadow-lg transition-all">
                 <div className="h-16 w-16 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm relative group-hover:scale-105 transition-transform">
                    {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-300">N/A</div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-gray-800 truncate mb-1">{item.name}</h4>
                    <p className="text-[11px] text-primary font-black uppercase tracking-widest">{((item.price || 0) * item.quantity).toFixed(2)} DH</p>
                 </div>
                 <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
                   <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-white hover:text-red-500 text-gray-400 rounded-xl transition-all"><Minus size={16} /></button>
                   <span className="text-sm font-black w-8 text-center text-gray-800">{item.quantity}</span>
                   <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-white hover:text-emerald-500 text-gray-400 rounded-xl transition-all"><Plus size={16} /></button>
                 </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-100 space-y-6">
            <div className="relative">
                <div className="absolute -top-3 left-4 bg-gray-50 px-2 text-[8px] font-black text-gray-400 uppercase tracking-widest z-10">Fidélité Atlas</div>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                   <User className="text-primary h-5 w-5" />
                   <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="flex-1 bg-transparent outline-none text-xs font-black text-gray-700">
                      <option value="">👤 CLIENT DE PASSAGE</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({(c.balance || 0)} DH)</option>)}
                   </select>
                </div>
            </div>

          <div className="flex justify-between items-center bg-dark text-white p-6 rounded-[2rem] shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total à payer</span>
              <span className="text-3xl font-black">{(cartTotal || 0).toFixed(2)} <span className="text-sm text-secondary">DH</span></span>
            </div>
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
               <Wallet className="text-secondary h-6 w-6" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
             {paymentMethods.map(method => (
                 typeof method === 'string' ? (
                 <button 
                    key={method}
                    onClick={() => initCheckout(method)} 
                    className={`flex flex-col items-center justify-center py-5 rounded-[1.5rem] transition-all shadow-xl active:scale-95 group 
                        ${method === 'CASH' ? 'bg-primary text-white shadow-primary/20 hover:bg-emerald-700' : 
                          method === 'KARNE' ? 'bg-secondary text-white shadow-amber-200 hover:bg-amber-600' :
                          'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'}`}
                 >
                    {getPaymentIcon(method)}
                    <span className="text-[10px] font-black uppercase tracking-tighter">{method}</span>
                 </button>
                 ) : null
             ))}
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-dark/95 backdrop-blur-xl flex flex-col items-center justify-center">
           <button onClick={stopScanner} className="absolute top-8 right-8 p-5 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full"><X size={32} /></button>
           <div className="relative w-72 h-72 border-4 border-white/20 rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/40">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan"></div>
           </div>
           <p className="text-white font-black uppercase tracking-[0.3em] mt-10 text-xs">Scan Intelligent en cours...</p>
        </div>
      )}
    </div>
  );
};

export default PosView;
