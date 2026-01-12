
import React, { useState, useMemo } from 'react';
import { FileText, Plus, Search, Sparkles, Printer, Trash2, BrainCircuit, CheckCircle, Clock, Loader2, Save, X, ShoppingCart, ArrowRightLeft, Package, Edit3, Download } from 'lucide-react';
import { Document, Customer, Product, CartItem, CompanySettings } from '../types';

interface BillingViewProps {
  documents: Document[];
  customers: Customer[];
  products: Product[];
  settings: CompanySettings;
  onCreateDocument: (doc: Document) => void;
  onUpdateDocument: (doc: Document) => void;
  onDeleteDocument?: (id: string) => void;
}

const BillingView: React.FC<BillingViewProps> = ({ documents, customers, products, settings, onCreateDocument, onUpdateDocument, onDeleteDocument }) => {
  const [activeTab, setActiveTab] = useState<'FACTURE' | 'DEVIS' | 'BON_LIVRAISON'>('FACTURE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Edit State
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [docItems, setDocItems] = useState<CartItem[]>([]);
  const [docNotes, setDocNotes] = useState('');
  const [docAdvance, setDocAdvance] = useState(''); // New Advance State
  
  // Item Adding State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');

  const filteredDocs = documents.filter(d => d.type === activeTab);

  // Filter products for dropdown based on search
  const filteredProducts = useMemo(() => {
      if(!productSearchTerm) return products;
      return products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [products, productSearchTerm]);

  const openNewDocModal = () => {
      setEditingDoc(null);
      setSelectedCustomerId('');
      setDocItems([]);
      setDocNotes('');
      setDocAdvance('');
      setProductSearchTerm('');
      setIsModalOpen(true);
  };

  const openEditDocModal = (doc: Document) => {
      setEditingDoc(doc);
      setSelectedCustomerId(doc.customerId);
      setDocItems([...doc.items]);
      setDocNotes(doc.notes || '');
      setDocAdvance(doc.advance ? doc.advance.toString() : '');
      setProductSearchTerm('');
      setIsModalOpen(true);
  };

  const addItem = () => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        setDocItems([...docItems, { ...prod, quantity: parseFloat(manualQty) || 1, price: parseFloat(manualPrice) || prod.price }]);
      }
    } else if (manualName && manualPrice) {
      setDocItems([...docItems, {
        id: `temp-${Date.now()}`,
        name: manualName,
        price: parseFloat(manualPrice),
        quantity: parseFloat(manualQty) || 1,
        category: 'Divers',
        stock: 0,
        image: ''
      }]);
    }
    // Reset fields
    setSelectedProductId(''); 
    setManualName(''); 
    setManualPrice(''); 
    setManualQty('1');
    setProductSearchTerm('');
  };

  const removeItem = (idx: number) => { setDocItems(docItems.filter((_, i) => i !== idx)); };
  
  const getSubTotal = () => docItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const getTaxAmount = () => {
      if (!settings.tvaEnabled) return 0;
      const rate = settings.taxRate || 20;
      return getSubTotal() * (rate / 100);
  };

  const getTotal = () => getSubTotal() + getTaxAmount();

  const handleSave = () => {
    if (!selectedCustomerId || docItems.length === 0) return alert("Client et Articles obligatoires");
    
    const docData = {
      customerId: selectedCustomerId,
      items: docItems,
      total: getTotal(),
      advance: parseFloat(docAdvance) || 0,
      notes: docNotes,
      date: editingDoc ? editingDoc.date : new Date().toISOString(),
      status: editingDoc ? editingDoc.status : (activeTab === 'FACTURE' ? 'PAYÉ' : 'EN_ATTENTE'),
      type: editingDoc ? editingDoc.type : activeTab
    };

    if (editingDoc) {
        onUpdateDocument({ ...editingDoc, ...docData } as Document);
    } else {
        onCreateDocument({
            id: `${activeTab === 'FACTURE' ? 'FAC' : activeTab === 'DEVIS' ? 'DEV' : 'BL'}-${Date.now()}`,
            ...docData
        } as Document);
    }

    setIsModalOpen(false);
    setEditingDoc(null);
  };

  const convertToInvoice = async (doc: Document) => {
      if(confirm(`Convertir ce ${doc.type} en Facture ? Cela créera une nouvelle facture.`)) {
          try {
              const newId = `FAC-${Date.now()}`;
              // Determine status based on payment
              const initialStatus = (doc.advance || 0) >= doc.total ? 'PAYÉ' : 'EN_ATTENTE';

              const newDoc: Document = {
                  id: newId,
                  type: 'FACTURE',
                  date: new Date().toISOString(),
                  customerId: doc.customerId,
                  items: [...doc.items], // Clone items
                  total: doc.total,
                  advance: doc.advance || 0,
                  status: initialStatus,
                  notes: `Converti depuis ${doc.type} #${doc.id}`
              };
              
              await onCreateDocument(newDoc);

              const updatedDoc = { ...doc, status: 'CONVERTI' as const };
              await onUpdateDocument(updatedDoc);
              
              alert("Facture générée avec succès !");
              setActiveTab('FACTURE');
          } catch (e: any) {
              console.error("Conversion Error:", e);
              let errorMsg = "Erreur inconnue";
              if (e?.message) errorMsg = e.message;
              else if (typeof e === 'string') errorMsg = e;
              else if (e && typeof e === 'object') errorMsg = JSON.stringify(e);
              
              alert("Erreur lors de la conversion: " + errorMsg);
          }
      }
  };

  const handlePrint = (doc: Document) => {
      const customer = customers.find(c => c.id === doc.customerId);
      const title = doc.type === 'BON_LIVRAISON' ? 'BON DE LIVRAISON' : doc.type;
      const safeDate = doc.date && !isNaN(new Date(doc.date).getTime()) ? new Date(doc.date).toLocaleDateString('fr-FR') : '-';
      const isA5 = settings.documentFormat === 'A5';

      let totalHT = 0;
      
      const rows = doc.items.map(item => {
          const unitPrice = item.price; 
          const qty = item.quantity;
          const lineTotal = unitPrice * qty;
          totalHT += lineTotal;
          
          return `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;"><strong>${item.name}</strong></td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${qty}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${unitPrice.toFixed(2)}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;">${lineTotal.toFixed(2)}</td>
            </tr>
          `;
      }).join('');

      // Recalculate tax for print based on current settings or document snapshot (simplification: using current settings)
      const taxRate = settings.tvaEnabled ? (settings.taxRate || 20) : 0;
      const totalTax = totalHT * (taxRate / 100);
      const totalTTC = totalHT + totalTax;
      
      const advance = doc.advance || 0;
      const remaining = totalTTC - advance;

      const printContent = `
        <html>
          <head>
            <title>${title} - ${doc.id}</title>
            <style>
              @page { size: ${settings.documentFormat || 'A4'}; margin: 0; }
              body { 
                  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                  padding: 40px; 
                  color: #333; 
                  background: white;
                  font-size: ${isA5 ? '10px' : '12px'};
              }
              .logo-container { text-align: center; margin-bottom: 20px; }
              .logo { max-height: 80px; margin-bottom: 10px; }
              .doc-box { 
                  border: 1px solid #ddd; 
                  padding: 20px; 
                  border-radius: 4px; 
                  margin-bottom: 30px; 
              }
              .info-row { margin-bottom: 8px; font-weight: 500; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { 
                  background: #f8f9fa; 
                  text-align: left; 
                  padding: 10px 8px; 
                  border-bottom: 2px solid #ddd; 
                  font-size: ${isA5 ? '10px' : '11px'}; 
                  text-transform: uppercase; 
                  color: #555;
              }
              .totals-container { display: flex; justify-content: flex-end; }
              .totals-box { width: ${isA5 ? '200px' : '300px'}; text-align: right; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .grand-total { font-weight: 900; font-size: ${isA5 ? '14px' : '16px'}; border-top: 1px solid #ddd; padding-top: 10px; }
              .advance-row { color: #0F766E; font-weight: bold; }
              .remaining-row { color: #EF4444; font-weight: bold; border-top: 1px dashed #ddd; padding-top: 5px;}
              
              .footer { 
                  margin-top: 60px; 
                  text-align: center; 
                  font-size: ${isA5 ? '8px' : '10px'}; 
                  color: #777; 
                  border-top: 1px solid #eee; 
                  padding-top: 20px; 
                  line-height: 1.6;
              }
            </style>
          </head>
          <body>
            
            <div class="logo-container">
               ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : `<h1 style="margin:0; color:#0F766E;">${settings.name}</h1>`}
            </div>

            <div class="doc-box">
                <div class="info-row">Document: ${title} ${doc.id}</div>
                <div class="info-row">Date: ${safeDate}</div>
                <div style="margin: 15px 0;"></div>
                <div class="info-row">Client: ${customer?.name || 'Client de Passage'}</div>
                <div class="info-row">Adresse: ${customer?.address || '-'}</div>
                <div class="info-row">ICE: ${customer?.ice || '-'}</div>
                <div class="info-row">Téléphone: ${customer?.phone || '-'}</div>
            </div>

            <table>
              <thead>
                <tr>
                    <th style="width: 40%">Désignation</th>
                    <th style="width: 15%; text-align:center">Quantité</th>
                    <th style="width: 20%; text-align:right">Prix U.</th>
                    <th style="width: 25%; text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="totals-container">
               <div class="totals-box">
                   <div class="total-row">
                       <span>Total ${settings.tvaEnabled ? 'HT' : ''}:</span>
                       <strong>${totalHT.toFixed(2)} ${settings.currency}</strong>
                   </div>
                   ${settings.tvaEnabled ? `
                   <div class="total-row">
                       <span>TVA (${taxRate}%):</span>
                       <strong>${totalTax.toFixed(2)} ${settings.currency}</strong>
                   </div>
                   ` : ''}
                   <div class="total-row grand-total">
                       <span>Total TTC:</span>
                       <span>${totalTTC.toFixed(2)} ${settings.currency}</span>
                   </div>
                   ${advance > 0 ? `
                   <div class="total-row advance-row">
                       <span>Avance:</span>
                       <span>-${advance.toFixed(2)} ${settings.currency}</span>
                   </div>
                   <div class="total-row remaining-row">
                       <span>Reste à Payer:</span>
                       <span>${remaining.toFixed(2)} ${settings.currency}</span>
                   </div>` : ''}
               </div>
            </div>

            <div class="footer">
                <div style="font-weight:bold; margin-bottom:5px;">${settings.name}</div>
                <div>
                   ICE: ${settings.ice} 
                   ${settings.if ? ` - IF: ${settings.if}` : ''} 
                   ${settings.rc ? ` - RC: ${settings.rc}` : ''}
                   ${settings.patente ? ` - Patente: ${settings.patente}` : ''}
                </div>
                <div>${settings.address}</div>
                <div>${settings.phone}</div>
            </div>

          </body>
        </html>
      `;
      const win = window.open('', '_blank');
      win?.document.write(printContent);
      win?.document.close();
      setTimeout(() => { 
          win?.focus(); 
          win?.print(); 
      }, 500);
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Modal Creation / Edition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl animate-scale-up h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">
                    {editingDoc ? `Modifier ${editingDoc.type}` : `Nouveau ${activeTab.replace('_', ' ')}`}
                </h3>
                <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-red-500" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                 {/* Selection Client & Notes */}
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-2">Client</label>
                        <select 
                            className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none mt-1 text-gray-900 focus:ring-2 focus:ring-primary/20" 
                            value={selectedCustomerId} 
                            onChange={e => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">-- Sélectionner Client --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-2">Notes / Conditions</label>
                        <input 
                            className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none mt-1 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20" 
                            placeholder="Note sur le document..." 
                            value={docNotes} 
                            onChange={e => setDocNotes(e.target.value)} 
                        />
                    </div>
                 </div>

                 {/* Zone Ajout Articles */}
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-sm text-gray-700 mb-4 flex items-center gap-2"><ShoppingCart size={16}/> Ajouter des articles</h4>
                    
                    <div className="grid grid-cols-12 gap-3 mb-4 items-end">
                        {/* Recherche et Selection Produit */}
                        <div className="col-span-4 space-y-2">
                           <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3"/>
                               <input 
                                    className="w-full pl-8 p-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-900" 
                                    placeholder="Filtrer produits..."
                                    value={productSearchTerm}
                                    onChange={e => setProductSearchTerm(e.target.value)}
                               />
                           </div>
                           <select 
                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900" 
                                value={selectedProductId} 
                                onChange={e => { 
                                    setSelectedProductId(e.target.value); 
                                    const p = products.find(x => x.id === e.target.value); 
                                    if (p) { 
                                        setManualName(p.name); 
                                        setManualPrice((p.price || 0).toString()); 
                                    }
                                }}
                           >
                              <option value="">Choisir produit (Stock)</option>
                              {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                           </select>
                        </div>

                        {/* Champs Manuels */}
                        <div className="col-span-3">
                            <input 
                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400" 
                                placeholder="Ou taper nom..." 
                                value={manualName} 
                                onChange={e => { setManualName(e.target.value); setSelectedProductId(''); }} 
                            />
                        </div>
                        <div className="col-span-2">
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400" 
                                placeholder="Prix" 
                                value={manualPrice} 
                                onChange={e => setManualPrice(e.target.value)} 
                            />
                        </div>
                        <div className="col-span-2">
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 placeholder-gray-400" 
                                placeholder="Qté" 
                                value={manualQty} 
                                onChange={e => setManualQty(e.target.value)} 
                            />
                        </div>
                        <div className="col-span-1">
                            <button onClick={addItem} className="w-full p-3 bg-primary text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform shadow-lg"><Plus size={18}/></button>
                        </div>
                    </div>

                    {/* Table Items */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-xs border-b">
                                <tr>
                                    <th className="px-4 py-3">Article</th>
                                    <th className="px-4 py-3">Prix</th>
                                    <th className="px-4 py-3">Qté</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {docItems.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-800">{item.name}</td>
                                        <td className="px-4 py-3 font-medium text-gray-600">{(item.price || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-3 font-black text-primary">{((item.price || 0) * item.quantity).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                                {docItems.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-xs">Aucun article ajouté</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-end">
                 <div>
                     <label className="text-xs font-bold text-gray-500 uppercase ml-2">Avance (Tsb9)</label>
                     <input 
                        type="number"
                        className="w-full bg-gray-50 p-4 rounded-xl font-black border-none mt-1 text-primary focus:ring-2 focus:ring-primary/20 text-xl" 
                        placeholder="0.00" 
                        value={docAdvance} 
                        onChange={e => setDocAdvance(e.target.value)} 
                     />
                 </div>
                 <div className="text-right">
                     {settings.tvaEnabled && (
                         <p className="text-xs font-medium text-gray-400 mb-1">
                             Sous-total: {getSubTotal().toFixed(2)} + TVA ({settings.taxRate}%): {getTaxAmount().toFixed(2)}
                         </p>
                     )}
                     <p className="text-xs font-bold text-gray-400 uppercase">Total TTC</p>
                     <p className="text-3xl font-black text-gray-900">{getTotal().toFixed(2)} {settings.currency}</p>
                     {(parseFloat(docAdvance) > 0) && (
                         <p className="text-sm font-bold text-red-500 mt-1">Reste à Payer: {(getTotal() - parseFloat(docAdvance)).toFixed(2)} {settings.currency}</p>
                     )}
                 </div>
                 <button onClick={handleSave} className="bg-dark text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-xl h-[60px]">
                   <Save size={20} /> {editingDoc ? 'ENREGISTRER' : `CRÉER ${activeTab}`}
                 </button>
              </div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-end">
        <div>
           <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase mb-1">Commercial & Facturation</p>
           <h1 className="text-4xl font-black text-gray-900 leading-none">Gestion Documents</h1>
        </div>
        <button onClick={openNewDocModal} className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 flex items-center gap-3 hover:scale-105 transition-all">
          <Plus size={20} /> NOUVEAU DOC
        </button>
      </header>

      <div className="flex gap-4">
         {['FACTURE', 'DEVIS', 'BON_LIVRAISON'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-dark text-white shadow-xl shadow-dark/20' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
             >
                {tab.replace('_', ' ')}
             </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
             <div className="space-y-4 overflow-y-auto flex-1">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-20 opacity-40 font-bold uppercase tracking-widest">Aucun document trouvé</div>
                ) : filteredDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-3xl border border-gray-50 hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all group">
                     <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-primary shadow-sm">
                           {doc.type === 'BON_LIVRAISON' ? <Package size={24}/> : <FileText size={24} />}
                        </div>
                        <div>
                           <h4 className="font-black text-gray-900">{doc.id}</h4>
                           <p className="text-[10px] font-black text-gray-400 uppercase">
                               Client: {customers.find(c => c.id === doc.customerId)?.name || 'Inconnu'} • {doc.date && !isNaN(new Date(doc.date).getTime()) ? new Date(doc.date).toLocaleDateString() : '-'}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                           <p className="text-xl font-black text-gray-900">{(doc.total || 0).toFixed(2)} {settings.currency}</p>
                           {doc.advance > 0 && <p className="text-[10px] font-bold text-green-600">Avance: {doc.advance} {settings.currency}</p>}
                           <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase justify-end ${doc.status === 'PAYÉ' ? 'text-emerald-500' : (doc.status === 'CONVERTI' ? 'text-blue-500' : 'text-amber-500')}`}>
                              {doc.status}
                           </span>
                        </div>
                        
                        {/* Edit Button */}
                        {doc.status !== 'CONVERTI' && (
                            <button onClick={() => openEditDocModal(doc)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-primary border border-gray-100 shadow-sm transition-all" title="Modifier">
                                <Edit3 size={18} />
                            </button>
                        )}

                        {(doc.type === 'DEVIS' || doc.type === 'BON_LIVRAISON') && doc.status !== 'CONVERTI' && (
                            <button onClick={() => convertToInvoice(doc)} className="p-3 bg-white rounded-xl text-blue-400 hover:text-blue-600 border border-gray-100 shadow-sm transition-all" title="Convertir en Facture">
                                <ArrowRightLeft size={18} />
                            </button>
                        )}
                        
                        <button onClick={() => handlePrint(doc)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-primary border border-gray-100 shadow-sm transition-all" title="Imprimer / Télécharger PDF">
                            <Download size={18} />
                        </button>
                        {onDeleteDocument && (
                           <button onClick={() => onDeleteDocument(doc.id)} className="p-3 bg-white rounded-xl text-gray-400 hover:text-red-500 border border-gray-100 shadow-sm transition-all" title="Supprimer">
                               <Trash2 size={18} />
                           </button>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
      </div>
    </div>
  );
};

export default BillingView;
