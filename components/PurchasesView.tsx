
import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, Scan, Plus, Trash2, BrainCircuit, Sparkles, 
  CheckCircle, Loader2, X, ChevronRight, History, Calendar, 
  User, Search, Edit3, Save, Package, Truck 
} from 'lucide-react';
import { processInvoiceImage } from '../services/geminiService';
import { Purchase, Supplier, Product } from '../types';

interface PurchasesViewProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  products: Product[]; 
  onImport: (data: any) => void;
  onUpdatePurchase?: (purchase: Purchase) => void;
  onDeletePurchase?: (id: string) => void;
}

const PurchasesView: React.FC<PurchasesViewProps> = ({ purchases, suppliers, products, onImport, onUpdatePurchase, onDeletePurchase }) => {
  const [viewMode, setViewMode] = useState<'HISTORY' | 'SCAN' | 'REVIEW' | 'EDIT'>('HISTORY');
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newManualItem, setNewManualItem] = useState({ id: '', name: '', qty: 1, cost: 0 });

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const startManualEntry = () => {
    setExtractedData({ supplierId: '', supplierName: '', date: new Date().toISOString().split('T')[0], items: [], total: 0 });
    setViewMode('REVIEW');
  };

  const startEditPurchase = (purchase: Purchase) => {
      setEditingId(purchase.id);
      const supplierName = suppliers.find(s => s.id === purchase.supplierId)?.name || '';
      let safeDate = new Date().toISOString().split('T')[0];
      if (purchase.date && !isNaN(new Date(purchase.date).getTime())) safeDate = new Date(purchase.date).toISOString().split('T')[0];

      setExtractedData({
          supplierId: purchase.supplierId,
          supplierName: supplierName,
          date: safeDate,
          items: purchase.items.map(i => ({ name: i.name, quantity: i.quantity, costPrice: i.cost })),
          total: purchase.total
      });
      setViewMode('EDIT');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setViewMode('SCAN');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const data = await processInvoiceImage(base64);
      
      if (data && data.items) {
        // --- INTELLIGENCE FOURNISSEUR ---
        // On essaie de trouver le fournisseur dans la liste existante
        let matchedSupplierId = '';
        let detectedName = data.supplierName || '';

        if (detectedName) {
            const found = suppliers.find(s => s.name.toLowerCase().includes(detectedName.toLowerCase()));
            if (found) {
                matchedSupplierId = found.id;
            } else {
                matchedSupplierId = 'NEW'; // Flag pour création auto
            }
        }

        setExtractedData({ 
            ...data, 
            supplierId: matchedSupplierId, 
            supplierName: detectedName 
        });
        setViewMode('REVIEW');
      } else {
        alert("Erreur de lecture IA. Essayez une photo plus nette.");
        setViewMode('HISTORY');
      }
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateField = (index: number, field: string, value: any) => {
    const updatedItems = [...extractedData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: field === 'name' ? value : parseFloat(value) || 0 };
    const newTotal = updatedItems.reduce((acc: number, item: any) => acc + (item.quantity * item.costPrice), 0);
    setExtractedData({ ...extractedData, items: updatedItems, total: newTotal });
  };

  const addManualItem = () => {
    if (!newManualItem.name) return;
    const item = { name: newManualItem.name, quantity: Number(newManualItem.qty), costPrice: Number(newManualItem.cost) };
    const updatedItems = [...extractedData.items, item];
    const newTotal = updatedItems.reduce((acc: number, i: any) => acc + (i.quantity * i.costPrice), 0);
    setExtractedData({ ...extractedData, items: updatedItems, total: newTotal });
    setNewManualItem({ id: '', name: '', qty: 1, cost: 0 });
  };

  const removeItem = (index: number) => {
    const updatedItems = extractedData.items.filter((_: any, i: number) => i !== index);
    const newTotal = updatedItems.reduce((acc: number, item: any) => acc + (item.quantity * item.costPrice), 0);
    setExtractedData({ ...extractedData, items: updatedItems, total: newTotal });
  };

  const handleConfirm = () => {
    if (!extractedData) return;
    
    // Validation
    if (!extractedData.supplierId && !extractedData.supplierName) {
        return alert("Veuillez sélectionner ou saisir un fournisseur pour le Karné.");
    }

    setImporting(true);
    setTimeout(() => {
      onImport(extractedData);
      setImporting(false);
      setExtractedData(null);
      setSuccessMsg(true);
      setViewMode('HISTORY');
    }, 1000);
  };

  const handleSaveEdit = () => {
      if(!editingId || !onUpdatePurchase) return;
      const updatedPurchase: Purchase = {
          id: editingId,
          supplierId: extractedData.supplierId,
          date: new Date(extractedData.date).toISOString(),
          items: extractedData.items.map((i: any) => ({ name: i.name, quantity: i.quantity, cost: i.costPrice })),
          total: extractedData.total
      };
      onUpdatePurchase(updatedPurchase);
      setViewMode('HISTORY');
      setEditingId(null);
      setExtractedData(null);
  };

  const handleDelete = () => {
      if(confirm("Supprimer ce bon ? La dette sera ajustée.") && editingId && onDeletePurchase) {
          onDeletePurchase(editingId);
          setViewMode('HISTORY');
          setEditingId(null);
      }
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Inconnu';

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {successMsg && (
        <div className="fixed top-10 right-10 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-bounce">
          <CheckCircle size={20} /> <span className="font-black uppercase text-xs tracking-widest">Achat & Dette enregistrés !</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1">Stock & Hsab</p>
           <h1 className="text-4xl font-black text-gray-900 leading-none">Bons d'Achat</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={startManualEntry} className="bg-white text-gray-600 border border-gray-200 px-6 py-4 rounded-2xl font-bold text-sm shadow-sm hover:border-primary hover:text-primary transition-all flex items-center gap-2"><Edit3 size={18} /> Saisie Manuelle</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-dark text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3 hover:scale-105 transition-all">{isScanning ? <Loader2 className="animate-spin" /> : <Scan size={20} />} SCANNER FACTURE</button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
      </header>

      {(viewMode === 'REVIEW' || viewMode === 'EDIT') && extractedData && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-primary/10 overflow-hidden animate-scale-up">
           <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                  <h3 className="text-xl font-black text-gray-900">{viewMode === 'EDIT' ? 'Modifier Achat' : 'Enregistrer Bon'}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                      {extractedData.supplierName ? `Fournisseur détecté : ${extractedData.supplierName}` : "Veuillez identifier le fournisseur"}
                  </p>
              </div>
              <button onClick={() => { setViewMode('HISTORY'); setEditingId(null); }} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Fournisseur</label>
                    <div className="space-y-2">
                        <div className="relative">
                            <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select 
                                value={extractedData.supplierId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setExtractedData({
                                        ...extractedData, 
                                        supplierId: val,
                                        supplierName: val === 'NEW' ? extractedData.supplierName : (suppliers.find(s => s.id === val)?.name || '')
                                    });
                                }}
                                className={`w-full pl-10 p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 appearance-none ${extractedData.supplierId === 'NEW' ? 'text-primary' : 'text-gray-900'}`}
                            >
                                <option value="">-- Choisir Fournisseur --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                <option value="NEW">➕ Nouveau : {extractedData.supplierName || 'Saisir nom...'}</option>
                            </select>
                        </div>
                        {extractedData.supplierId === 'NEW' && (
                            <div className="animate-fade-in">
                                <label className="text-[9px] font-bold text-primary uppercase ml-2 mb-1 block">Nom du nouveau fournisseur</label>
                                <input 
                                    placeholder="Nom du fournisseur détecté ou à créer" 
                                    value={extractedData.supplierName} 
                                    onChange={e => setExtractedData({...extractedData, supplierName: e.target.value})} 
                                    className="w-full p-3 bg-white border-2 border-primary/20 rounded-xl font-bold text-sm" 
                                    autoFocus 
                                />
                            </div>
                        )}
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date Facture</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="date" value={extractedData.date} onChange={(e) => setExtractedData({...extractedData, date: e.target.value})} className="w-full pl-10 p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Total (Calculé)</label>
                    <div className="p-4 bg-primary/5 rounded-xl font-black text-primary text-lg">{(extractedData.total || 0).toFixed(2)} DH</div>
                 </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><ShoppingBag size={18}/> Liste des articles (Mise à jour Stock)</h4>
                  <div className="space-y-3">
                      {extractedData.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
                              <div className="flex-1">
                                  <input value={item.name} onChange={(e) => handleUpdateField(idx, 'name', e.target.value)} className="w-full font-bold text-sm bg-transparent outline-none" placeholder="Nom du produit" />
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="text-[10px] font-bold text-gray-400">QTÉ</span>
                                  <input type="number" value={item.quantity} onChange={(e) => handleUpdateField(idx, 'quantity', e.target.value)} className="w-12 font-bold text-sm bg-transparent outline-none text-center" />
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="text-[10px] font-bold text-gray-400">PRIX</span>
                                  <input type="number" value={item.costPrice} onChange={(e) => handleUpdateField(idx, 'costPrice', e.target.value)} className="w-16 font-bold text-sm bg-transparent outline-none text-right" />
                                  <span className="text-xs font-bold text-gray-400">DH</span>
                              </div>
                              <div className="w-20 text-right font-black text-sm">{(item.quantity * item.costPrice).toFixed(2)}</div>
                              <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      
                      <div className="flex gap-4 items-center bg-white/50 p-3 rounded-xl border border-dashed border-gray-300">
                          <div className="flex-1">
                              <input placeholder="Ajouter produit..." className="w-full bg-transparent text-sm font-medium outline-none" value={newManualItem.name} onChange={e => setNewManualItem({...newManualItem, name: e.target.value})} />
                          </div>
                          <input type="number" placeholder="Qté" className="w-16 bg-white p-2 rounded-lg text-sm text-center border border-gray-200" value={newManualItem.qty} onChange={e => setNewManualItem({...newManualItem, qty: Number(e.target.value)})} />
                          <input type="number" placeholder="Prix" className="w-20 bg-white p-2 rounded-lg text-sm text-right border border-gray-200" value={newManualItem.cost} onChange={e => setNewManualItem({...newManualItem, cost: Number(e.target.value)})} />
                          <button onClick={addManualItem} className="bg-dark text-white p-2 rounded-lg hover:scale-110 transition-transform"><Plus size={16}/></button>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                  {viewMode === 'EDIT' && (
                      <button onClick={handleDelete} className="px-6 py-4 border border-red-100 text-red-500 rounded-2xl font-bold uppercase text-xs hover:bg-red-50 flex items-center gap-2"><Trash2 size={18} /> Supprimer Bon</button>
                  )}
                  <div className="flex-1"></div>
                  <button onClick={() => setViewMode('HISTORY')} className="px-8 py-4 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-colors">Annuler</button>
                  <button onClick={viewMode === 'EDIT' ? handleSaveEdit : handleConfirm} disabled={importing} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-70">
                    {importing ? <Loader2 className="animate-spin"/> : <CheckCircle size={20} />}
                    {viewMode === 'EDIT' ? 'ENREGISTRER' : 'VALIDER & AJOUTER DETTE'}
                  </button>
              </div>
           </div>
        </div>
      )}

      {viewMode === 'HISTORY' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
           <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><History size={20}/> Historique des Achats</h3>
              <div className="bg-white border px-4 py-2 rounded-xl text-xs font-bold text-gray-500 shadow-sm">{purchases.length} Opérations</div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Fournisseur</th><th className="px-8 py-5">Total</th><th className="px-8 py-5 text-right">Action</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {purchases.length === 0 ? (
                        <tr><td colSpan={4} className="text-center p-10 text-gray-400 font-bold">Aucun achat enregistré</td></tr>
                    ) : purchases.map(purchase => (
                       <tr key={purchase.id} onClick={() => startEditPurchase(purchase)} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-2 text-sm font-bold text-gray-700"><Calendar size={14} className="text-gray-400"/> {purchase.date && !isNaN(new Date(purchase.date).getTime()) ? new Date(purchase.date).toLocaleDateString() : '-'}</div>
                          </td>
                          <td className="px-8 py-5">
                             <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold uppercase">{getSupplierName(purchase.supplierId)}</span>
                          </td>
                          <td className="px-8 py-5 font-black text-primary text-lg">{(purchase.total || 0).toFixed(2)} <span className="text-xs text-gray-400">DH</span></td>
                          <td className="px-8 py-5 text-right"><button className="text-gray-300 hover:text-primary transition-colors p-2 bg-white rounded-full border border-gray-100 shadow-sm group-hover:scale-110"><ChevronRight size={18} /></button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesView;
