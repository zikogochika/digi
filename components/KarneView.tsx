
import React, { useState, useEffect } from 'react';
import { Customer, Sale, Product, CartItem, Settlement } from '../types';
import { Phone, Calendar, ArrowUpRight, CheckCircle, MessageSquare, History, Sparkles, BrainCircuit, UserPlus, X, Save, User, Edit3, Trash2, ArrowLeft, Receipt, Check, Plus, Minus, Search, CreditCard, Banknote, AlertCircle, FileText, ArrowDownRight, Wallet } from 'lucide-react';
import { generateSmartWhatsApp } from '../services/geminiService';
import { db } from '../services/db';

interface KarneViewProps {
  customers: Customer[];
  sales: Sale[];
  products: Product[]; 
  onSettleDebt?: (customerId: string, amount: number) => void;
  onMarkSalePaid?: (saleId: string, customerId: string) => void;
  onAddCustomer?: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
  onUpdateSale?: (sale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
}

const KarneView: React.FC<KarneViewProps> = ({ 
    customers, sales, products, 
    onSettleDebt, onMarkSalePaid, onAddCustomer, onEditCustomer, onDeleteCustomer, 
    onUpdateSale, onDeleteSale 
}) => {
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'SALES' | 'SETTLEMENTS'>('SALES');
  const [customerSettlements, setCustomerSettlements] = useState<Settlement[]>([]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [settleData, setSettleData] = useState({ amount: '', method: 'CASH', note: '' });
  const [formData, setFormData] = useState({ name: '', phone: '', ice: '', initialBalance: '0', initialBalanceType: 'CREDIT' as 'CREDIT' | 'ADVANCE', note: '' });

  const totalCredit = customers.reduce((acc, c) => acc + (c.balance || 0), 0);

  useEffect(() => {
      if(selectedCustomer && viewMode === 'SETTLEMENTS') {
          loadSettlements();
      }
  }, [selectedCustomer, viewMode]);

  const loadSettlements = () => {
      if(!selectedCustomer) return;
      db.getSettlements(selectedCustomer.id).then(data => {
          setCustomerSettlements(data.filter(s => s.type === 'CUSTOMER_IN'));
      });
  };

  const customerHistory = selectedCustomer 
    ? sales
        .filter(s => s.customerId === selectedCustomer.id)
        .sort((a,b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
        })
    : [];

  const startEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setFormData({ 
        name: c.name, 
        phone: c.phone, 
        ice: c.ice || '', 
        initialBalance: '0', 
        initialBalanceType: 'CREDIT',
        note: c.notes || ''
    });
    setIsAdding(true);
  };

  const openSettleModal = (e?: React.MouseEvent, settlementToEdit?: Settlement) => {
      if(e) e.stopPropagation();
      
      if (settlementToEdit) {
          setEditingSettlement(settlementToEdit);
          setSettleData({ 
              amount: settlementToEdit.amount.toString(), 
              method: settlementToEdit.method, 
              note: settlementToEdit.note || '' 
          });
      } else {
          setEditingSettlement(null);
          setSettleData({ amount: '', method: 'CASH', note: '' });
      }
      setIsSettling(true);
  };

  const handleConfirmSettlement = async () => {
      if(!selectedCustomer || !settleData.amount) return;
      const amount = parseFloat(settleData.amount);
      if(isNaN(amount) || amount <= 0) return alert("Montant invalide");

      if (editingSettlement) {
          const updatedSettlement: Settlement = {
              ...editingSettlement,
              amount: amount,
              method: settleData.method,
              note: settleData.note,
              date: new Date().toISOString()
          };
          const oldAmount = editingSettlement.amount;
          await db.updateSettlement(updatedSettlement, oldAmount);
          const diff = amount - oldAmount;
          setSelectedCustomer({ ...selectedCustomer, balance: (selectedCustomer.balance || 0) - diff });
      } else {
          // FIX: Only trigger onSettleDebt which performs the DB persistence and state update.
          // Directly calling db.addSettlement here caused double deduction when App.tsx handler was also called.
          if(onSettleDebt) {
              onSettleDebt(selectedCustomer.id, amount);
              // Optimistic UI update for the current view
              setSelectedCustomer({ ...selectedCustomer, balance: (selectedCustomer.balance || 0) - amount });
          }
      }

      setIsSettling(false);
      if(viewMode === 'SETTLEMENTS') loadSettlements();
  };

  const handleDeleteSettlement = async (settlement: Settlement) => {
      if(confirm(`Supprimer ce règlement de ${settlement.amount} DH ? Le solde du client augmentera de ce montant.`)) {
          await db.deleteSettlement(settlement.id);
          if(selectedCustomer) {
              setSelectedCustomer({ ...selectedCustomer, balance: (selectedCustomer.balance || 0) + settlement.amount });
          }
          loadSettlements();
      }
  };

  const handleSettleSale = (sale: Sale, customerId: string) => {
      const restToPay = sale.total - (sale.advance || 0);
      if (confirm(`Régler le reste de ce bon (${restToPay.toFixed(2)} DH) ? Cela déduira ce montant de la dette globale.`)) {
          if (onMarkSalePaid) {
              onMarkSalePaid(sale.id, customerId);
              if(selectedCustomer) {
                  setSelectedCustomer({ ...selectedCustomer, balance: (selectedCustomer.balance || 0) - restToPay });
              }
          }
      }
  };

  const handleSaveCustomer = () => {
    if (!formData.name) return alert("Le nom est obligatoire");
    
    if (editingId && onEditCustomer) {
        const existing = customers.find(c => c.id === editingId);
        onEditCustomer({
            ...existing!,
            name: formData.name,
            phone: formData.phone,
            ice: formData.ice,
            notes: formData.note
        });
    } else if (onAddCustomer) {
      let balance = parseFloat(formData.initialBalance || '0');
      if (formData.initialBalanceType === 'ADVANCE') {
          balance = -balance;
      }

      onAddCustomer({
        id: `c-${Date.now()}`,
        name: formData.name,
        phone: formData.phone || '0000000000',
        balance: balance,
        points: 0,
        lastVisit: new Date().toISOString(),
        ice: formData.ice,
        notes: formData.note ? `Solde départ: ${balance} DH. ${formData.note}` : undefined
      });
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', ice: '', initialBalance: '0', initialBalanceType: 'CREDIT', note: '' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Supprimer définitivement ce client ? Les ventes associées resteront dans l'historique mais le dossier client sera perdu.")) {
        if (onDeleteCustomer) {
            onDeleteCustomer(id);
            if(selectedCustomer?.id === id) setSelectedCustomer(null);
        }
    }
  };

  const sendWhatsAppReminder = async (customer: Customer, isSmart: boolean = false) => {
    let message = `Salam ${customer.name}, kankarkom b-hsab dialkom: ${(customer.balance || 0).toFixed(2)} DH. Chokran !`;
    if (isSmart) {
      setAiGenerating(customer.id);
      message = await generateSmartWhatsApp(customer);
      setAiGenerating(null);
    }
    const url = `https://wa.me/212${customer.phone.substring(1)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleEditSaleItemQty = (itemId: string, delta: number) => {
      if(!editingSale) return;
      const updatedItems = editingSale.items.map(item => {
          if(item.id === itemId) {
              return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
      }).filter(item => item.quantity > 0);
      const newTotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setEditingSale({ ...editingSale, items: updatedItems, total: newTotal });
  };

  const handleAddProductToSale = (product: Product) => {
      if(!editingSale) return;
      const existing = editingSale.items.find(i => i.id === product.id);
      let updatedItems;
      if(existing) {
          updatedItems = editingSale.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
          updatedItems = [...editingSale.items, { ...product, quantity: 1 }];
      }
      const newTotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setEditingSale({ ...editingSale, items: updatedItems, total: newTotal });
      setItemSearch('');
  };

  const handleSaveSale = () => {
      if(!editingSale || !onUpdateSale) return;
      onUpdateSale(editingSale);
      setEditingSale(null);
  };

  const handleDeleteEntireSale = () => {
      if(!editingSale || !onDeleteSale) return;
      if(confirm("Supprimer ce Bon complètement ? Le montant sera déduit du crédit client.")) {
          onDeleteSale(editingSale.id);
          setEditingSale(null);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase mb-1">Carnet de crédit numérique</p>
           <h1 className="text-4xl font-black text-gray-900 leading-none">Gestion Karné</h1>
        </div>
        <div className="flex gap-4">
           <div className="bg-white border-2 border-red-100 rounded-[2rem] p-4 px-6 flex items-center gap-4 shadow-xl shadow-red-500/5">
              <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                  <ArrowUpRight className="h-6 w-6" />
              </div>
              <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Crédit</p>
                  <p className="text-2xl font-black text-red-600">{totalCredit.toLocaleString()} <span className="text-xs">DH</span></p>
              </div>
           </div>
           <button 
             onClick={() => {
                 setEditingId(null);
                 setFormData({ name: '', phone: '', ice: '', initialBalance: '0', initialBalanceType: 'CREDIT', note: '' });
                 setIsAdding(true);
             }}
             className="bg-dark text-white px-8 py-4 rounded-[2rem] font-black text-sm shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
           >
             {isAdding ? <X size={20} /> : <UserPlus size={20} />}
             {isAdding ? 'ANNULER' : 'NOUVEAU CLIENT'}
           </button>
        </div>
      </header>

      {isSettling && selectedCustomer && (
          <div className="fixed inset-0 bg-dark/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-scale-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black">{editingSettlement ? 'Modifier Règlement' : 'Règlement Client'}</h3>
                      <button onClick={() => setIsSettling(false)}><X className="text-gray-400"/></button>
                  </div>
                  {!editingSettlement && (
                      <div className="text-center mb-6">
                          <p className="text-xs font-bold text-gray-400 uppercase">Dette Actuelle</p>
                          <p className="text-3xl font-black text-red-600">{(selectedCustomer.balance || 0).toFixed(2)} DH</p>
                      </div>
                  )}
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase ml-2">Montant {editingSettlement ? 'Modifié' : 'Reçu'}</label>
                          <input 
                            type="number" 
                            className="w-full bg-gray-50 p-4 rounded-xl font-black text-2xl text-center border-none text-primary"
                            placeholder="0.00"
                            value={settleData.amount}
                            onChange={e => setSettleData({...settleData, amount: e.target.value})}
                            autoFocus
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase ml-2">Mode de paiement</label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                              {['CASH', 'CHECK', 'TRANSFER'].map(m => (
                                  <button 
                                    key={m}
                                    onClick={() => setSettleData({...settleData, method: m})}
                                    className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${settleData.method === m ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200'}`}
                                  >
                                      {m}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase ml-2">Note (Optionnel)</label>
                          <input 
                            className="w-full bg-gray-50 p-3 rounded-xl font-bold border-none text-sm"
                            placeholder="Ex: Avance sur..."
                            value={settleData.note}
                            onChange={e => setSettleData({...settleData, note: e.target.value})}
                          />
                      </div>
                      <button onClick={handleConfirmSettlement} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform">
                          <CheckCircle size={20}/> {editingSettlement ? 'ENREGISTRER MODIFICATIONS' : 'VALIDER LE PAIEMENT'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {editingSale && selectedCustomer && (
          <div className="fixed inset-0 bg-dark/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Modifier Bon #{editingSale.id.slice(-4)}</h3>
                        <p className="text-xs text-gray-500 font-bold">Client: {selectedCustomer.name}</p>
                      </div>
                      <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                      <div className="relative z-20">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4"/>
                          <input 
                            className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Chercher un produit pour l'ajouter..."
                            value={itemSearch}
                            onChange={e => setItemSearch(e.target.value)}
                          />
                          {itemSearch && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-xl rounded-xl mt-2 max-h-48 overflow-y-auto">
                                  {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                                      <button 
                                        key={p.id} 
                                        onClick={() => handleAddProductToSale(p)}
                                        className="w-full text-left p-3 hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                      >
                                          <span className="font-bold text-sm text-gray-800">{p.name}</span>
                                          <span className="text-xs font-black text-primary">{(p.price || 0)} DH</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                      <div className="space-y-2">
                          {editingSale.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                  <div className="flex-1">
                                      <p className="font-black text-gray-800 text-sm">{item.name}</p>
                                      <p className="text-[10px] text-gray-500 font-bold">{(item.price || 0)} DH / Unité</p>
                                  </div>
                                  <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                      <button onClick={() => handleEditSaleItemQty(item.id, -1)} className="p-1 text-gray-400 hover:text-red-500"><Minus size={14}/></button>
                                      <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                                      <button onClick={() => handleEditSaleItemQty(item.id, 1)} className="p-1 text-gray-400 hover:text-green-500"><Plus size={14}/></button>
                                  </div>
                                  <div className="w-20 text-right font-black text-gray-900">
                                      {((item.price || 0) * item.quantity).toFixed(2)}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                          <span className="font-bold text-gray-500 uppercase text-xs">Nouveau Total</span>
                          <span className="text-3xl font-black text-primary">{(editingSale.total || 0).toFixed(2)} DH</span>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={handleDeleteEntireSale} className="px-4 py-4 bg-red-50 text-red-500 rounded-xl font-bold text-xs uppercase hover:bg-red-100 flex items-center gap-2">
                              <Trash2 size={16}/> Supprimer Bon
                          </button>
                          <button onClick={handleSaveSale} className="flex-1 bg-primary text-white rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform">
                              Enregistrer & Mettre à jour Solde
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isAdding && (
         <div className="bg-white p-8 rounded-[2.5rem] border border-primary/20 shadow-2xl animate-scale-up max-w-2xl mx-auto">
            <h3 className="font-black text-xl text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl text-primary"><UserPlus size={24} /></div>
              {editingId ? 'Modifier Client' : 'Créer un Dossier Client'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-2">Nom Complet</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Mohammed Alami"
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20 mt-1"
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-2">Téléphone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="06..."
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20 mt-1"
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-2">ICE (Entreprise)</label>
                  <input 
                    type="text" 
                    value={formData.ice}
                    onChange={e => setFormData({...formData, ice: e.target.value})}
                    placeholder="Identifiant Commun..."
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20 mt-1"
                  />
               </div>
               {!editingId && (
                   <div className="col-span-2 bg-gray-50 p-4 rounded-2xl mt-2">
                       <p className="text-xs font-black text-gray-500 uppercase mb-3">Solde de départ</p>
                       <div className="flex gap-4 items-center mb-3">
                           <button 
                             onClick={() => setFormData({...formData, initialBalanceType: 'CREDIT'})}
                             className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${formData.initialBalanceType === 'CREDIT' ? 'bg-red-100 text-red-600 ring-2 ring-red-500' : 'bg-white text-gray-400'}`}
                           >
                             Il me doit (Crédit)
                           </button>
                           <button 
                             onClick={() => setFormData({...formData, initialBalanceType: 'ADVANCE'})}
                             className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${formData.initialBalanceType === 'ADVANCE' ? 'bg-green-100 text-green-600 ring-2 ring-green-500' : 'bg-white text-gray-400'}`}
                           >
                             Je lui dois (Avance)
                           </button>
                       </div>
                       <input 
                         type="number" 
                         value={formData.initialBalance}
                         onChange={e => setFormData({...formData, initialBalance: e.target.value})}
                         placeholder="Montant en DH"
                         className="w-full p-4 bg-white rounded-2xl border-none font-black text-xl text-center focus:ring-2 focus:ring-primary/20"
                       />
                       <input 
                         type="text" 
                         value={formData.note}
                         onChange={e => setFormData({...formData, note: e.target.value})}
                         placeholder="Note (Ex: Ancien carnet page 12...)"
                         className="w-full mt-2 p-3 bg-white rounded-xl border-none text-sm font-medium"
                       />
                   </div>
               )}
               <button 
                 onClick={handleSaveCustomer}
                 className="col-span-2 w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex justify-center gap-3 mt-4"
               >
                 <Save size={20} /> Enregistrer le client
               </button>
            </div>
         </div>
      )}

      {selectedCustomer ? (
          <div className="animate-fade-in space-y-6 pb-20 relative">
              <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-gray-500 hover:text-primary font-bold mb-4">
                  <ArrowLeft size={20} /> Retour à la liste
              </button>
              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10">
                      <User size={200} />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                      <div>
                          <div className="flex items-center gap-4 mb-4">
                             <div className="h-20 w-20 rounded-3xl bg-primary text-white flex items-center justify-center text-4xl font-black shadow-lg shadow-primary/30">
                                 {selectedCustomer.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                 <h1 className="text-4xl font-black text-gray-900">{selectedCustomer.name}</h1>
                                 <div className="flex gap-3 text-sm font-medium text-gray-500 mt-1">
                                     <span className="flex items-center gap-1"><Phone size={14} /> {selectedCustomer.phone}</span>
                                     {selectedCustomer.ice && <span className="flex items-center gap-1 px-2 bg-gray-100 rounded text-xs font-bold">ICE: {selectedCustomer.ice}</span>}
                                 </div>
                             </div>
                          </div>
                          {selectedCustomer.notes && (
                              <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl text-sm font-medium border border-amber-100 max-w-md">
                                  Note: {selectedCustomer.notes}
                              </div>
                          )}
                      </div>
                      <div className="text-right bg-gray-50 p-6 rounded-3xl border border-gray-100 min-w-[250px]">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Solde Actuel</p>
                          <p className={`text-4xl font-black ${(selectedCustomer.balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                             {(selectedCustomer.balance || 0).toFixed(2)} <span className="text-lg text-gray-400">DH</span>
                          </p>
                          <div className="mt-4 flex justify-end gap-2">
                              <button onClick={(e) => openSettleModal(e)} className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform text-sm">
                                  Régler / Encaisser
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-4 border-b border-gray-200 pb-1">
                  <button 
                    onClick={() => setViewMode('SALES')} 
                    className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-colors ${viewMode === 'SALES' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                      Achats (Bons)
                  </button>
                  <button 
                    onClick={() => setViewMode('SETTLEMENTS')} 
                    className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-colors ${viewMode === 'SETTLEMENTS' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                      Historique Règlements
                  </button>
              </div>
              <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
                  {viewMode === 'SALES' ? (
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                              <tr>
                                  <th className="px-6 py-4">Date</th>
                                  <th className="px-6 py-4">Description / Ref</th>
                                  <th className="px-6 py-4 text-center">Statut</th>
                                  <th className="px-6 py-4 text-right">Montant Total</th>
                                  <th className="px-6 py-4 text-right">Avance (POS)</th>
                                  <th className="px-6 py-4 text-right text-red-500">Reste (Crédit)</th>
                                  <th className="px-6 py-4 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {customerHistory.length === 0 ? (
                                  <tr>
                                      <td colSpan={7} className="text-center p-10 text-gray-400 font-medium">Aucune opération enregistrée.</td>
                                  </tr>
                              ) : (
                                  customerHistory.map(sale => (
                                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setEditingSale(sale)}>
                                          <td className="px-6 py-4 text-xs font-bold text-gray-600">
                                              {sale.date && !isNaN(new Date(sale.date).getTime()) ? new Date(sale.date).toLocaleString() : '-'}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-gray-800 text-sm">Vente #{sale.id.slice(-4)}</div>
                                              <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{sale.items.length} Articles: {sale.items.map(i => i.name).join(', ')}</div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${sale.isPaid ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                  {sale.isPaid ? 'PAYÉ' : 'NON PAYÉ'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <span className="font-bold text-gray-900">{sale.total.toFixed(2)}</span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <span className="font-bold text-green-600">{(sale.advance || 0).toFixed(2)}</span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {sale.isPaid ? <span className="text-gray-300">-</span> : <span className="font-bold text-red-600">{(sale.total - (sale.advance || 0)).toFixed(2)}</span>}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button title="Modifier" className="p-2 bg-gray-100 rounded-lg text-gray-500 hover:text-primary"><Edit3 size={14}/></button>
                                                  {!sale.isPaid && (
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleSettleSale(sale, selectedCustomer.id); }}
                                                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white font-bold text-[10px] uppercase whitespace-nowrap"
                                                      >
                                                          Régler ce bon
                                                      </button>
                                                  )}
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  ) : (
                      <table className="w-full text-left">
                          <thead className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                              <tr>
                                  <th className="px-6 py-4">Date Règlement</th>
                                  <th className="px-6 py-4">Mode</th>
                                  <th className="px-6 py-4">Note / Référence</th>
                                  <th className="px-6 py-4 text-right">Montant Encaissé</th>
                                  <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {customerSettlements.length === 0 ? (
                                  <tr>
                                      <td colSpan={5} className="text-center p-10 text-gray-400 font-medium">Aucun règlement enregistré.</td>
                                  </tr>
                              ) : (
                                  customerSettlements.map(s => (
                                      <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                          <td className="px-6 py-4 text-xs font-bold text-gray-600">
                                              {s.date && !isNaN(new Date(s.date).getTime()) ? new Date(s.date).toLocaleString() : '-'}
                                          </td>
                                          <td className="px-6 py-4">
                                              <span className="bg-white border px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.method}</span>
                                          </td>
                                          <td className="px-6 py-4 text-sm text-gray-600 italic">
                                              {s.note || '-'}
                                          </td>
                                          <td className="px-6 py-4 text-right font-black text-emerald-600">
                                              +{s.amount.toFixed(2)} DH
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => openSettleModal(undefined, s)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary"><Edit3 size={14}/></button>
                                                  <button onClick={() => handleDeleteSettlement(s)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {customers.sort((a,b) => (b.balance || 0) - (a.balance || 0)).map(customer => (
          <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col h-full cursor-pointer">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={(e) => startEdit(customer, e)} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-primary"><Edit3 size={16} /></button>
                <button onClick={(e) => handleDelete(customer.id, e)} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="flex justify-between items-start mb-8">
              <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center text-primary font-black text-2xl border border-gray-100 group-hover:scale-110 transition-transform">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${(customer.balance || 0) > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                {(customer.balance || 0) > 0 ? 'En Dette' : 'À jour'}
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 truncate">{customer.name}</h3>
            <div className="space-y-4 mb-10 flex-1">
               <div className="flex items-center text-gray-400 text-xs font-bold">
                 <Phone className="h-4 w-4 mr-3 text-primary/30" />
                 {customer.phone}
               </div>
               <div className="flex items-center text-gray-400 text-xs font-bold">
                 <Calendar className="h-4 w-4 mr-3 text-primary/30" />
                 {customer.lastVisit && !isNaN(new Date(customer.lastVisit).getTime()) ? new Date(customer.lastVisit).toLocaleDateString() : '-'}
               </div>
               <div className="flex items-center text-gray-400 text-xs font-bold">
                 <History className="h-4 w-4 mr-3 text-primary/30" />
                 Fidélité: <span className="ml-1 text-secondary font-black">{customer.points} PTS</span>
               </div>
            </div>
            <div className="pt-8 border-t border-gray-50 flex items-center justify-between mt-auto">
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Solde Actuel</p>
                    <p className={`text-3xl font-black ${(customer.balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(customer.balance || 0).toFixed(2)} <span className="text-xs">DH</span>
                    </p>
                </div>
                <div className="flex gap-2">
                   <div className="relative group/smart">
                      <button 
                        onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(customer, true); }}
                        disabled={aiGenerating === customer.id}
                        className="p-4 bg-primary/10 text-primary rounded-[1.5rem] hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 disabled:opacity-50"
                        title="Rappel Intelligent (IA)"
                      >
                        {aiGenerating === customer.id ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <BrainCircuit size={22} />}
                      </button>
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-dark text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/smart:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Rappel IA</span>
                   </div>
                   <button 
                    onClick={() => { setSelectedCustomer(customer); setIsSettling(true); setEditingSettlement(null); setSettleData({ amount: '', method: 'CASH', note: '' }); }}
                    className="p-4 bg-primary text-white rounded-[1.5rem] hover:bg-emerald-700 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95"
                   >
                      <CheckCircle size={22} />
                      <span className="text-xs font-black uppercase tracking-widest">Saffi</span>
                   </button>
                </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(customer, false); }}
              className="absolute right-8 top-28 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-green-500 hover:scale-110"
              title="WhatsApp Standard"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default KarneView;
