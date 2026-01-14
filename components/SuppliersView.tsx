
import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Purchase, Settlement } from '../types';
import { Truck, Phone, Receipt, Plus, ArrowRight, X, Save, CheckCircle, Edit3, Trash2, MessageCircle, Sparkles, Loader2, Calendar, FileText, Wallet, ArrowLeft, ArrowUpRight, ArrowDownRight, Filter, MapPin, Building2, StickyNote, TrendingUp, Check } from 'lucide-react';
import { generateSupplierNegotiation } from '../services/geminiService';
import { db } from '../services/db';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchases?: Purchase[];
  onAddSupplier: (supplier: Supplier) => void;
  onPayDebt: (id: string, amount: number) => void;
  onEditSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
}

const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, purchases = [], onAddSupplier, onPayDebt, onEditSupplier, onDeleteSupplier }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', category: '', ice: '', address: '', notes: '' });
  
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payData, setPayData] = useState({ amount: '', method: 'CASH', note: '' });
  const [supplierSettlements, setSupplierSettlements] = useState<Settlement[]>([]);

  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [negotiationText, setNegotiationText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
      if(selectedSupplier) {
          db.getSettlements(selectedSupplier.id).then(data => {
              setSupplierSettlements(data.filter(s => s.type === 'SUPPLIER_OUT'));
          });
      }
  }, [selectedSupplier, payingId]);

  const supplierStats = useMemo(() => {
      if(!selectedSupplier) return null;
      
      const supplierPurchases = purchases.filter(p => p.supplierId === selectedSupplier.id);
      const totalPurchased = supplierPurchases.reduce((acc, p) => acc + p.total, 0);
      const totalPaid = supplierSettlements.reduce((acc, s) => acc + s.amount, 0);
      
      const history = [
          ...supplierPurchases.map(p => ({
              id: p.id,
              date: p.date,
              type: 'ACHAT',
              amount: p.total,
              details: `${p.items.length} Produits`,
              ref: `#${p.id.slice(-4)}`
          })),
          ...supplierSettlements.map(s => ({
              id: s.id,
              date: s.date,
              type: 'RÈGLEMENT',
              amount: s.amount,
              details: s.method,
              ref: s.note || 'Paiement'
          }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { totalPurchased, totalPaid, history };
  }, [selectedSupplier, purchases, supplierSettlements]);

  const startEdit = (s: Supplier, e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      setEditingId(s.id);
      setFormData({ 
          name: s.name, 
          phone: s.phone, 
          category: s.category,
          ice: s.ice || '',
          address: s.address || '',
          notes: s.notes || ''
      });
      setIsAdding(true);
  };

  const handleSaveSupplier = async () => {
    if (!formData.name) return alert("Le nom du fournisseur est obligatoire");
    
    if (editingId && onEditSupplier) {
      const existing = suppliers.find(s => s.id === editingId);
      const updated = { 
          ...existing!, 
          name: formData.name, 
          phone: formData.phone, 
          category: formData.category,
          ice: formData.ice,
          address: formData.address,
          notes: formData.notes
      };
      onEditSupplier(updated);
      if(selectedSupplier?.id === editingId) setSelectedSupplier(updated);
    } else {
      onAddSupplier({
        id: `sup-${Date.now()}`,
        name: formData.name,
        phone: formData.phone || '0600000000',
        category: formData.category || 'Général',
        debt: 0,
        ice: formData.ice,
        address: formData.address,
        notes: formData.notes
      });
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', category: '', ice: '', address: '', notes: '' });
  };

  const handlePayment = async () => {
    if (!payingId || !payData.amount) return;
    const amount = parseFloat(payData.amount);
    
    // FIX: Removed the db.addSettlement call here because it's already handled in onPayDebt (App.tsx)
    // to avoid double deduction from the balance.
    onPayDebt(payingId, amount);
    
    if(selectedSupplier && selectedSupplier.id === payingId) {
        setSelectedSupplier({...selectedSupplier, debt: selectedSupplier.debt - amount});
    }

    setPayingId(null);
    setPayData({ amount: '', method: 'CASH', note: '' });
  };

  const handleNegotiate = async (s: Supplier) => {
    setNegotiatingId(s.id);
    setAiLoading(true);
    const text = await generateSupplierNegotiation(s);
    setNegotiationText(text);
    setAiLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {isAdding && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black">{editingId ? 'Modifier Fournisseur' : 'Nouveau Fournisseur'}</h3>
               <button onClick={() => setIsAdding(false)}><X className="text-gray-400 hover:text-red-500" /></button>
             </div>
             <div className="space-y-4">
               <div>
                   <label className="text-xs font-bold text-gray-500 uppercase ml-2 tracking-widest">Désignation / Raison Sociale</label>
                   <input className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" placeholder="Ex: Centrale Danone" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase ml-2">Téléphone</label>
                       <input className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" placeholder="06..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase ml-2">Catégorie</label>
                       <input className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" placeholder="Ex: Laiterie" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                   </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Détails de Contact & Légal</p>
                   <div className="space-y-4">
                       <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                           <Building2 className="text-primary" size={18}/>
                           <input className="flex-1 border-none font-bold text-sm outline-none" placeholder="ICE (Identifiant Commun)" value={formData.ice} onChange={e => setFormData({...formData, ice: e.target.value})} />
                       </div>
                       <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                           <MapPin className="text-primary" size={18}/>
                           <input className="flex-1 border-none font-bold text-sm outline-none" placeholder="Adresse Siège" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                       </div>
                       <div className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm">
                           <StickyNote className="text-primary mt-1" size={18}/>
                           <textarea className="flex-1 border-none font-medium text-sm outline-none h-20" placeholder="Notes (jours de livraison, contact commercial...)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                       </div>
                   </div>
               </div>
               <button onClick={handleSaveSupplier} className="w-full bg-primary text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-transform">
                 <Save size={20} /> ENREGISTRER LA FICHE
               </button>
             </div>
          </div>
        </div>
      )}

      {payingId && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-scale-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black">Enregistrer Règlement</h3>
               <button onClick={() => setPayingId(null)}><X className="text-gray-400 hover:text-red-500" /></button>
             </div>
             <div className="space-y-5">
               <div className="text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dette Totale</p>
                  <p className="text-3xl font-black text-red-500">{(suppliers.find(s => s.id === payingId)?.debt || 0).toLocaleString()} DH</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Montant du versement</label>
                  <input type="number" className="w-full bg-transparent p-0 rounded-xl font-black text-4xl text-center border-none text-primary focus:ring-0" placeholder="0.00" value={payData.amount} onChange={e => setPayData({...payData, amount: e.target.value})} autoFocus />
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'CHÈQUE', 'VIREMENT'].map(m => (
                      <button key={m} onClick={() => setPayData({...payData, method: m})} className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${payData.method === m ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>{m}</button>
                  ))}
               </div>
               <input className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none text-sm" placeholder="Note (N° Chèque, Référence...)" value={payData.note} onChange={e => setPayData({...payData, note: e.target.value})} />
               <button onClick={handlePayment} className="w-full bg-primary text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-transform">
                 <CheckCircle size={24} /> CONFIRMER PAIEMENT
               </button>
             </div>
          </div>
        </div>
      )}

      {negotiatingId && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up text-center">
             <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <Sparkles className="text-violet-600" size={40} />
             </div>
             <h3 className="text-2xl font-black mb-4">Assistant Négociation</h3>
             {aiLoading ? (
                 <div className="py-10 flex flex-col items-center gap-4">
                     <Loader2 className="animate-spin text-violet-500" size={32} />
                     <p className="text-xs font-bold text-gray-400 uppercase animate-pulse">L'IA prépare votre argumentaire...</p>
                 </div>
             ) : (
               <div className="space-y-6">
                 <textarea className="w-full h-40 bg-violet-50 rounded-2xl p-5 text-sm font-medium border-none focus:ring-2 focus:ring-violet-200 leading-relaxed" value={negotiationText} onChange={e => setNegotiationText(e.target.value)} />
                 <div className="flex gap-3">
                    <button onClick={() => setNegotiatingId(null)} className="flex-1 py-4 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">Annuler</button>
                    <button onClick={() => window.open(`https://wa.me/212600000000?text=${encodeURIComponent(negotiationText)}`, '_blank')} className="flex-[2] bg-green-500 text-white py-4 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-green-600 shadow-xl shadow-green-100">
                        <MessageCircle size={20} /> ENVOYER WHATSAPP
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}

      {selectedSupplier ? (
        <div className="animate-fade-in space-y-8">
            <button onClick={() => setSelectedSupplier(null)} className="flex items-center gap-2 text-gray-400 hover:text-primary font-bold text-sm group transition-colors">
                  <div className="p-2 bg-white rounded-lg group-hover:bg-primary/10 transition-colors"><ArrowLeft size={18} /></div>
                  RETOUR À LA LISTE
            </button>
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                    <Truck size={300} />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-5 mb-4">
                            <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary text-4xl font-black">
                                {selectedSupplier.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-black text-gray-900 leading-none">{selectedSupplier.name}</h1>
                                    <button onClick={(e) => startEdit(selectedSupplier, e)} className="p-2.5 bg-gray-50 hover:bg-primary/10 rounded-xl text-gray-400 hover:text-primary transition-all"><Edit3 size={18}/></button>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-gray-400 mt-3">
                                    <span className="flex items-center gap-1.5"><Phone size={14} className="text-primary"/> {selectedSupplier.phone}</span>
                                    <span className="bg-gray-100 px-3 py-1 rounded-lg">{selectedSupplier.category}</span>
                                    {selectedSupplier.ice && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">ICE: {selectedSupplier.ice}</span>}
                                </div>
                            </div>
                        </div>
                        {selectedSupplier.notes && (
                            <div className="bg-amber-50/50 text-amber-800 p-4 rounded-2xl text-xs font-medium border border-amber-100 max-w-xl italic">
                                "{selectedSupplier.notes}"
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 min-w-[280px]">
                         <div className="bg-dark text-white p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                             <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent"></div>
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 relative z-10">Reste à payer (Dette)</p>
                             <p className="text-4xl font-black relative z-10">{selectedSupplier.debt.toLocaleString()} <span className="text-lg text-white/40">DH</span></p>
                             <div className="absolute right-4 bottom-4 opacity-20 transform translate-x-2 translate-y-2 group-hover:scale-110 transition-transform"><Wallet size={40}/></div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => handleNegotiate(selectedSupplier)} className="flex-1 bg-violet-50 text-violet-700 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-violet-100 transition-colors uppercase tracking-widest"><Sparkles size={16}/> Négocier</button>
                             <button onClick={() => { setPayingId(selectedSupplier.id); setPayData({ amount: '', method: 'CASH', note: '' }); }} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform uppercase tracking-widest"><Receipt size={16}/> Payer</button>
                         </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase tracking-tighter"><FileText size={22} className="text-primary"/> Relevé de Situation</h3>
                        <span className="text-[10px] font-black text-gray-400 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">{supplierStats?.history.length} OPÉRATIONS</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[600px]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">
                                <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Type</th><th className="px-8 py-5 text-right">Montant</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {supplierStats?.history.length === 0 ? (
                                    <tr><td colSpan={3} className="p-20 text-center text-gray-300 font-black uppercase tracking-widest text-sm">Hsab Jdid (Vide)</td></tr>
                                ) : (
                                    supplierStats?.history.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-gray-700">{new Date(item.date).toLocaleDateString()}</div>
                                                <div className="text-[10px] font-bold text-gray-400 mt-0.5">{item.ref}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${item.type === 'ACHAT' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    {item.type}
                                                </span>
                                                <div className="text-[10px] text-gray-400 font-bold mt-1.5 ml-1">{item.details}</div>
                                            </td>
                                            <td className={`px-8 py-5 text-right font-black text-lg ${item.type === 'ACHAT' ? 'text-gray-900' : 'text-emerald-600'}`}>
                                                {item.type === 'ACHAT' ? '+' : '-'}{item.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="space-y-8">
                     <div className="bg-white p-8 rounded-[3rem] border border-gray-200 shadow-sm">
                        <h3 className="font-black text-gray-800 uppercase tracking-tighter mb-6 flex items-center gap-3"><TrendingUp size={22} className="text-primary"/> Statistiques Globales</h3>
                        <div className="grid grid-cols-2 gap-6">
                             <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Commandé</p>
                                 <p className="text-2xl font-black text-gray-900">{supplierStats?.totalPurchased.toLocaleString()} DH</p>
                             </div>
                             <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Versé</p>
                                 <p className="text-2xl font-black text-emerald-700">{supplierStats?.totalPaid.toLocaleString()} DH</p>
                             </div>
                        </div>
                     </div>
                     <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles size={20}/>
                                <h3 className="font-black uppercase text-xs tracking-widest">Assistant Stratégique</h3>
                            </div>
                            <p className="text-lg font-bold leading-relaxed mb-6 italic opacity-90">
                                "Vous avez réduit votre dette de {Math.round((supplierStats?.totalPaid! / supplierStats?.totalPurchased!) * 100) || 0}% chez ce fournisseur. C'est le bon moment pour demander une remise sur la prochaine commande."
                            </p>
                            <button onClick={() => handleNegotiate(selectedSupplier)} className="w-full py-4 bg-white/20 hover:bg-white/30 rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10">Lancer une négociation</button>
                        </div>
                        <Sparkles className="absolute -right-4 -bottom-4 opacity-10" size={120}/>
                     </div>
                </div>
            </div>
        </div>
      ) : (
        <>
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1">Carné Fournisseurs (Hsab)</p>
                    <h1 className="text-4xl font-black text-gray-900 leading-none">Gestion Situation</h1>
                </div>
                <button 
                    onClick={() => { setEditingId(null); setFormData({ name: '', phone: '', category: '', ice: '', address: '', notes: '' }); setIsAdding(true); }} 
                    className="flex items-center gap-3 bg-dark text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-2xl hover:scale-105 transition-all active:scale-95"
                >
                    <Plus size={20}/> NOUVEAU FOURNISSEUR
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                {suppliers.sort((a,b) => b.debt - a.debt).map(s => (
                <div key={s.id} onClick={() => setSelectedSupplier(s)} className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative group flex flex-col h-full min-h-[380px] overflow-hidden">
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e) => startEdit(s, e)} className="p-3 bg-white shadow-xl rounded-xl text-gray-400 hover:text-primary transition-colors"><Edit3 size={18}/></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSupplier && onDeleteSupplier(s.id); }} className="p-3 bg-white shadow-xl rounded-xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                    <div className="flex items-center gap-5 mb-8">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-3 group-hover:scale-110">
                            <Truck size={30}/>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tighter leading-tight">{s.name}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.category}</p>
                        </div>
                    </div>
                    <div className="space-y-4 mb-8 flex-1">
                        <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <Phone size={14} className="text-primary/40"/> {s.phone}
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <MapPin size={14} className="text-primary/40"/> {s.address ? s.address.substring(0, 30) + '...' : 'Pas d\'adresse'}
                        </div>
                        {s.notes && (
                            <div className="bg-gray-50 p-4 rounded-2xl text-[10px] text-gray-500 font-medium line-clamp-2 italic border border-gray-100/50">
                                "{s.notes}"
                            </div>
                        )}
                    </div>
                    <div className="pt-6 border-t border-gray-50 flex flex-col gap-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Solde Hsab</span>
                                <span className={`text-4xl font-black tracking-tighter ${s.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{s.debt.toLocaleString()} <span className="text-lg">DH</span></span>
                            </div>
                            <div className={`p-3 rounded-2xl ${s.debt > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {s.debt > 0 ? <ArrowUpRight size={24}/> : <Check size={24}/>}
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setPayingId(s.id); setPayData({ amount: '', method: 'CASH', note: '' }); }} className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-xl shadow-primary/20 active:scale-95 transition-all">Encaisser / Régler</button>
                    </div>
                </div>
                ))}
                {suppliers.length === 0 && (
                    <div className="col-span-full py-32 text-center">
                        <div className="bg-gray-100/50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 transform rotate-6">
                            <Truck size={40} className="text-gray-300"/>
                        </div>
                        <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Hsab Fournisseurs Vide</h3>
                        <p className="text-gray-400 font-bold mt-2">Commencez par ajouter votre premier fournisseur.</p>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};

export default SuppliersView;
