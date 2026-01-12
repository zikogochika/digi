
import React, { useState, useEffect } from 'react';
import { Supplier, Purchase, Settlement } from '../types';
import { Truck, Phone, Receipt, Plus, ArrowRight, X, Save, CheckCircle, Edit3, Trash2, MessageCircle, Sparkles, Loader2, Calendar, FileText, Wallet } from 'lucide-react';
import { generateSupplierNegotiation } from '../services/geminiService';
import { db } from '../services/db';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchases?: Purchase[]; // Optional purchases for history
  onAddSupplier: (supplier: Supplier) => void;
  onPayDebt: (id: string, amount: number) => void;
  onEditSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
}

const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, purchases = [], onAddSupplier, onPayDebt, onEditSupplier, onDeleteSupplier }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', category: '' });
  
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payData, setPayData] = useState({ amount: '', method: 'CASH', note: '' });
  
  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [negotiationText, setNegotiationText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // New History View State
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'PURCHASES' | 'PAYMENTS'>('PURCHASES');
  const [supplierSettlements, setSupplierSettlements] = useState<Settlement[]>([]);

  // Optimized load for history
  useEffect(() => {
      if(historyId && historyTab === 'PAYMENTS') {
          db.getSettlements(historyId).then(data => {
              setSupplierSettlements(data.filter(s => s.type === 'SUPPLIER_OUT'));
          });
      }
  }, [historyId, historyTab, payingId]); // payingId dependency triggers reload after payment

  const totalDebt = suppliers.reduce((acc, s) => acc + s.debt, 0);

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormData({ name: s.name, phone: s.phone, category: s.category });
    setIsAdding(true);
  };

  const handleNegotiate = async (s: Supplier) => {
    setNegotiatingId(s.id);
    setAiLoading(true);
    const text = await generateSupplierNegotiation(s);
    setNegotiationText(text);
    setAiLoading(false);
  };

  const sendWhatsApp = (phone: string, text: string) => {
    const url = `https://wa.me/212${phone.substring(1)}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setNegotiatingId(null);
  };

  const handleSaveSupplier = () => {
    if (!formData.name) return alert("Nom obligatoire");
    
    if (editingId && onEditSupplier) {
      const existing = suppliers.find(s => s.id === editingId);
      onEditSupplier({
        ...existing!,
        name: formData.name,
        phone: formData.phone,
        category: formData.category
      });
    } else {
      onAddSupplier({
        id: `sup-${Date.now()}`,
        name: formData.name,
        phone: formData.phone || '0600000000',
        category: formData.category || 'Général',
        debt: 0
      });
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', category: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce fournisseur ?")) {
      onDeleteSupplier && onDeleteSupplier(id);
    }
  };

  const handlePayment = async () => {
    if (!payingId || !payData.amount) return;
    
    const amount = parseFloat(payData.amount);
    
    // Add settlement record
    const supplier = suppliers.find(s => s.id === payingId);
    if(supplier) {
        await db.addSettlement({
            id: `pay-${Date.now()}`,
            entityId: supplier.id,
            entityName: supplier.name,
            type: 'SUPPLIER_OUT',
            amount: amount,
            date: new Date().toISOString(),
            method: payData.method,
            note: payData.note
        });
    }

    onPayDebt(payingId, amount); // Update UI balance
    setPayingId(null);
    setPayData({ amount: '', method: 'CASH', note: '' });
  };

  const getSupplierPurchases = (id: string) => {
      return purchases.filter(p => p.supplierId === id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Modal Ajout/Edit */}
      {isAdding && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black">{editingId ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}</h3>
               <button onClick={() => setIsAdding(false)}><X className="text-gray-400 hover:text-red-500" /></button>
             </div>
             <div className="space-y-4">
               <input 
                 className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" 
                 placeholder="Nom de l'entreprise / Fournisseur"
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
               />
               <input 
                 className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" 
                 placeholder="Téléphone"
                 value={formData.phone}
                 onChange={e => setFormData({...formData, phone: e.target.value})}
               />
               <input 
                 className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" 
                 placeholder="Catégorie (Ex: Laiterie, Boissons...)"
                 value={formData.category}
                 onChange={e => setFormData({...formData, category: e.target.value})}
               />
               <button onClick={handleSaveSupplier} className="w-full bg-primary text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                 <Save size={18} /> ENREGISTRER
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {historyId && (
          <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-3xl shadow-2xl animate-scale-up h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-xl font-black">Fiche Fournisseur</h3>
                          <p className="text-sm font-bold text-gray-500">{suppliers.find(s => s.id === historyId)?.name}</p>
                      </div>
                      <button onClick={() => setHistoryId(null)}><X className="text-gray-400 hover:text-red-500" /></button>
                  </div>

                  <div className="flex gap-4 border-b border-gray-100 mb-4 pb-1">
                      <button 
                        onClick={() => setHistoryTab('PURCHASES')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${historyTab === 'PURCHASES' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                          Achats (Stock)
                      </button>
                      <button 
                        onClick={() => setHistoryTab('PAYMENTS')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${historyTab === 'PAYMENTS' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                          Paiements Effectués
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                      {historyTab === 'PURCHASES' ? (
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0">
                                  <tr>
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Détails</th>
                                      <th className="px-4 py-3 text-right">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {getSupplierPurchases(historyId).length === 0 ? (
                                      <tr><td colSpan={3} className="text-center p-8 text-gray-400">Aucun achat enregistré.</td></tr>
                                  ) : (
                                      getSupplierPurchases(historyId).map(p => (
                                          <tr key={p.id}>
                                              <td className="px-4 py-3 text-xs font-bold text-gray-600">
                                                  <div className="flex items-center gap-2">
                                                      <Calendar size={12}/> {new Date(p.date).toLocaleDateString()}
                                                  </div>
                                              </td>
                                              <td className="px-4 py-3">
                                                  <p className="text-xs font-bold text-gray-800">{p.items.length} Articles</p>
                                                  <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{p.items.map(i => i.name).join(', ')}</p>
                                              </td>
                                              <td className="px-4 py-3 text-right font-black text-gray-900">
                                                  {p.total.toFixed(2)} DH
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      ) : (
                          <table className="w-full text-left">
                              <thead className="bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest sticky top-0">
                                  <tr>
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Mode</th>
                                      <th className="px-4 py-3">Note</th>
                                      <th className="px-4 py-3 text-right">Montant</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {supplierSettlements.length === 0 ? (
                                      <tr><td colSpan={4} className="text-center p-8 text-gray-400">Aucun paiement enregistré.</td></tr>
                                  ) : (
                                      supplierSettlements.map(s => (
                                          <tr key={s.id}>
                                              <td className="px-4 py-3 text-xs font-bold text-gray-600">
                                                  {new Date(s.date).toLocaleDateString()}
                                              </td>
                                              <td className="px-4 py-3">
                                                  <span className="bg-white border px-2 py-1 rounded text-[10px] font-bold text-gray-500">{s.method}</span>
                                              </td>
                                              <td className="px-4 py-3 text-xs text-gray-500 italic">
                                                  {s.note || '-'}
                                              </td>
                                              <td className="px-4 py-3 text-right font-black text-orange-600">
                                                  -{s.amount.toFixed(2)} DH
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Modal Negociation IA */}
      {negotiatingId && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up relative">
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white p-3 rounded-full shadow-lg border-4 border-white">
                <Sparkles size={24} />
             </div>
             <h3 className="text-xl font-black text-center mt-4 mb-4">Assistant Négociation IA</h3>
             
             {aiLoading ? (
               <div className="flex flex-col items-center py-10">
                 <Loader2 className="animate-spin text-purple-600 mb-2" size={32} />
                 <p className="text-xs font-bold text-gray-400">Rédaction en cours...</p>
               </div>
             ) : (
               <div className="space-y-4">
                 <textarea 
                   className="w-full h-32 bg-purple-50 rounded-xl p-4 text-sm font-medium border-none focus:ring-2 focus:ring-purple-200"
                   value={negotiationText}
                   onChange={e => setNegotiationText(e.target.value)}
                 />
                 <div className="flex gap-2">
                    <button onClick={() => setNegotiatingId(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Annuler</button>
                    <button 
                      onClick={() => {
                          const s = suppliers.find(su => su.id === negotiatingId);
                          if(s) sendWhatsApp(s.phone, negotiationText);
                      }}
                      className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-black shadow-lg shadow-purple-200 hover:scale-105 transition-transform flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} /> Envoyer
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {payingId && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black">Sortie de Caisse (Paiement)</h3>
               <button onClick={() => setPayingId(null)}><X className="text-gray-400 hover:text-red-500" /></button>
             </div>
             <div className="space-y-4">
               <p className="text-sm text-gray-500 font-bold">Combien versez-vous à ce fournisseur ?</p>
               <input 
                 type="number"
                 className="w-full bg-gray-50 p-4 rounded-xl font-black text-2xl text-center border-none text-primary" 
                 placeholder="0.00 DH"
                 value={payData.amount}
                 onChange={e => setPayData({...payData, amount: e.target.value})}
                 autoFocus
               />
               
               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-2">Mode</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                      {['CASH', 'CHECK', 'TRANSFER'].map(m => (
                          <button 
                            key={m}
                            onClick={() => setPayData({...payData, method: m})}
                            className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${payData.method === m ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200'}`}
                          >
                              {m}
                          </button>
                      ))}
                  </div>
               </div>

               <input 
                 className="w-full bg-gray-50 p-3 rounded-xl font-bold border-none text-sm" 
                 placeholder="Note (N° Chèque, Ref virement...)"
                 value={payData.note}
                 onChange={e => setPayData({...payData, note: e.target.value})}
               />

               <button onClick={handlePayment} className="w-full bg-primary text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                 <CheckCircle size={18} /> CONFIRMER PAIEMENT
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Karné Fournisseurs</h1>
          <p className="text-gray-500">Gérez vos achats et vos dettes auprès des grossistes.</p>
        </div>
        <button 
          onClick={() => {
              setEditingId(null);
              setFormData({ name: '', phone: '', category: '' });
              setIsAdding(true);
          }}
          className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors font-semibold shadow-lg shadow-secondary/20"
        >
          <Plus size={20} />
          Nouveau Fournisseur
        </button>
      </div>

      <div className="bg-dark text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <p className="text-white/60 font-medium mb-1">Total Dettes Fournisseurs</p>
          <h2 className="text-4xl font-bold">{totalDebt.toLocaleString()} DH</h2>
          <div className="mt-4 flex gap-4">
             <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 text-sm">
                <span className="opacity-60">Dû à payer ce mois:</span> <span className="font-bold">{(totalDebt * 0.4).toFixed(2)} DH</span>
             </div>
          </div>
        </div>
        <Truck className="absolute -right-4 -bottom-4 h-48 w-48 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(supplier)} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-primary"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(supplier.id)} className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{supplier.name}</h3>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{supplier.category}</p>
                </div>
              </div>
              <div className="text-right mt-8">
                <p className="text-xs text-gray-400 font-medium">Dette actuelle</p>
                <p className={`text-xl font-black ${supplier.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(supplier.debt || 0).toFixed(2)} DH
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <button 
                onClick={() => setHistoryId(supplier.id)}
                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors uppercase"
              >
                <FileText size={14} /> Historique
              </button>
              <button 
                onClick={() => handleNegotiate(supplier)}
                className="flex items-center justify-center gap-2 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors uppercase"
                title="Négocier avec IA"
              >
                <Sparkles size={14} /> Négocier
              </button>
              <button 
                onClick={() => { setPayingId(supplier.id); setPayData({ amount: '', method: 'CASH', note: '' }); }}
                className="flex items-center justify-center gap-2 py-2.5 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-xl text-xs font-bold transition-colors uppercase"
              >
                <Receipt size={14} />
                Payer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuppliersView;
