
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Plus, Search, AlertTriangle, Edit3, Trash2, X, Sparkles, ScanBarcode, Camera, ArrowRightLeft, History, Tag, ArrowUp, ArrowDown, User, Image as ImageIcon } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { generateProductMagicFill, lookupProductByBarcode } from '../services/geminiService';

interface StockViewProps {
  products: Product[];
  movements: StockMovement[]; 
  onAddProduct: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (id: string) => void;
  onAddMovement: (m: StockMovement) => void; 
}

const StockView: React.FC<StockViewProps> = ({ products, movements, onAddProduct, onUpdateProduct, onDeleteProduct, onAddMovement }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'MOVEMENTS'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Status States
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  
  // Adjustment State
  const [adjustData, setAdjustData] = useState({ productId: '', type: 'AJUSTEMENT', qty: 0, reason: '' });

  // New/Edit Product Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProd, setNewProd] = useState<Partial<Product>>({
    name: '', category: 'Divers', price: 0, stock: 0, costPrice: 0, barcode: '', image: '', sku: '', minStock: 5, tva: 20
  });
  
  // Category Management
  const [isNewCategory, setIsNewCategory] = useState(false);
  
  // Derive unique categories from existing products
  const existingCategories = useMemo(() => {
      const cats = new Set(products.map(p => p.category).filter(Boolean));
      return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const startEdit = (p: Product) => {
    setNewProd(p);
    setEditingId(p.id);
    setIsNewCategory(false);
    setIsAdding(true);
  };

  const handleBarcodeLookup = async (code: string) => {
      try {
          const info = await lookupProductByBarcode(code);
          if (info.name) {
              setNewProd(prev => ({ ...prev, name: info.name, category: info.category || prev.category, image: info.image || prev.image }));
              if (!newProd.price) {
                  const magicData = await generateProductMagicFill(info.name);
                  setNewProd(prev => ({ ...prev, ...magicData }));
              }
          }
      } catch (e) { console.error(e); }
  };

  const handleMagicFill = async () => {
    if (!newProd.name || newProd.name.length < 3) return alert("Entrez au moins le nom du produit !");
    setIsMagicFilling(true);
    const suggestion = await generateProductMagicFill(newProd.name);
    setNewProd(prev => ({ ...prev, ...suggestion }));
    setIsMagicFilling(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewProd(prev => ({ ...prev, image: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = () => {
    if (!newProd.name || !newProd.price) return alert("Nom et Prix obligatoires");

    const productData: Product = {
      id: editingId || `p-${Date.now()}`,
      name: newProd.name,
      category: newProd.category || 'Divers',
      price: Number(newProd.price),
      stock: Number(newProd.stock || 0),
      costPrice: Number(newProd.costPrice || 0),
      barcode: newProd.barcode || '',
      image: newProd.image || '', // Empty if no image provided
      sku: newProd.sku || `SKU-${Date.now()}`,
      minStock: Number(newProd.minStock || 5),
      tva: Number(newProd.tva || 20)
    };

    if (editingId && onUpdateProduct) {
        onUpdateProduct(productData);
    } else {
        onAddProduct(productData);
    }

    setIsAdding(false);
    setEditingId(null);
    setNewProd({ name: '', category: 'Divers', price: 0, stock: 0, costPrice: 0, barcode: '', image: '', sku: '', minStock: 5, tva: 20 });
    setIsNewCategory(false);
  };

  const handleAdjustment = () => {
      if(!adjustData.productId || adjustData.qty === 0) return;
      const prod = products.find(p => p.id === adjustData.productId);
      if(!prod) return;

      onAddMovement({
          id: `m-${Date.now()}`,
          productId: prod.id,
          productName: prod.name,
          type: adjustData.type as any,
          quantity: Math.abs(adjustData.qty),
          date: new Date().toISOString(),
          reason: adjustData.reason || 'Ajustement Manuel',
          userId: 'Admin' // Should be current user
      });
      
      setIsAdjusting(false);
      setAdjustData({ productId: '', type: 'AJUSTEMENT', qty: 0, reason: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Modal Ajustement */}
      {isAdjusting && (
          <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black">Ajustement de Stock</h3>
                    <button onClick={() => setIsAdjusting(false)}><X className="text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Produit</label>
                        <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none mt-1" value={adjustData.productId} onChange={e => setAdjustData({...adjustData, productId: e.target.value})}>
                            <option value="">Sélectionner...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                            <select className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none mt-1" value={adjustData.type} onChange={e => setAdjustData({...adjustData, type: e.target.value})}>
                                <option value="AJUSTEMENT">Correction</option>
                                <option value="CASSE">Casse / Endommagé</option>
                                <option value="PERTE">Perte / Vol</option>
                                <option value="ENTREE">Entrée Manuelle</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Quantité</label>
                            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none mt-1" value={adjustData.qty} onChange={e => setAdjustData({...adjustData, qty: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Raison / Note</label>
                        <input className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none mt-1" placeholder="Ex: Tombé du rayon..." value={adjustData.reason} onChange={e => setAdjustData({...adjustData, reason: e.target.value})} />
                    </div>
                    <button onClick={handleAdjustment} className="w-full bg-primary text-white py-4 rounded-xl font-black mt-2">VALIDER LE MOUVEMENT</button>
                </div>
             </div>
          </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion du Stock</h1>
          <p className="text-gray-500">Inventaire, mouvements et alertes.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsAdjusting(true)} className="flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-4 py-3 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-colors font-bold text-xs uppercase">
            <ArrowRightLeft size={16} /> Mouvements / Casse
            </button>
            <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewProd({}); setIsNewCategory(false); }} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-lg shadow-primary/20">
            {isAdding ? <X size={20} /> : <Plus size={20} />} {isAdding ? 'Fermer' : 'Nouveau Produit'}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-1">
          <button onClick={() => setActiveTab('LIST')} className={`px-4 py-2 font-black text-sm uppercase transition-colors ${activeTab === 'LIST' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}>Inventaire</button>
          <button onClick={() => setActiveTab('MOVEMENTS')} className={`px-4 py-2 font-black text-sm uppercase transition-colors ${activeTab === 'MOVEMENTS' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}>Historique Mouvements</button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-primary/20 shadow-xl animate-scale-up">
           <h3 className="text-xl font-black mb-4 pl-2">{editingId ? 'Modifier Article' : 'Nouvel Article'}</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                 <div className="relative w-32 h-32 rounded-xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     {newProd.image ? (
                         <img src={newProd.image} className="w-full h-full object-cover" />
                     ) : (
                         <div className="text-center text-gray-400">
                             <ImageIcon size={24} className="mx-auto mb-1"/>
                             <span className="text-[10px] font-bold uppercase">Ajouter Photo</span>
                         </div>
                     )}
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white text-xs font-bold uppercase">Changer</span>
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </div>
                 <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2"><ScanBarcode size={14}/> Code-Barres (EAN)</label>
                     <div className="flex gap-2">
                         <input type="text" value={newProd.barcode} onChange={e => setNewProd({...newProd, barcode: e.target.value})} onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeLookup(newProd.barcode || ''); }} className="w-full p-4 bg-white rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 tracking-widest font-mono shadow-sm text-lg" placeholder="Scannez ici..." />
                     </div>
                 </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Désignation</label>
                <input type="text" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Tag size={14}/> Catégorie
                </label>
                {isNewCategory ? (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Nouvelle catégorie..."
                            value={newProd.category} 
                            onChange={e => setNewProd({...newProd, category: e.target.value})} 
                            className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20" 
                        />
                        <button onClick={() => setIsNewCategory(false)} className="p-4 bg-gray-200 rounded-xl hover:bg-gray-300 transition-colors">
                            <X size={18}/>
                        </button>
                    </div>
                ) : (
                    <select 
                        value={newProd.category} 
                        onChange={e => {
                            if (e.target.value === 'NEW_CAT_OPTION') {
                                setIsNewCategory(true);
                                setNewProd({...newProd, category: ''});
                            } else {
                                setNewProd({...newProd, category: e.target.value});
                            }
                        }} 
                        className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20"
                    >
                        {existingCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="NEW_CAT_OPTION">➕ Nouvelle Catégorie...</option>
                    </select>
                )}
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Stock Actuel</label><input type="number" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Alerte Stock Min</label><input type="number" value={newProd.minStock} onChange={e => setNewProd({...newProd, minStock: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Prix Achat HT</label><input type="number" value={newProd.costPrice} onChange={e => setNewProd({...newProd, costPrice: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none" /></div>
              <div><label className="block text-xs font-bold text-primary uppercase mb-2">Prix Vente TTC</label><input type="number" value={newProd.price} onChange={e => setNewProd({...newProd, price: Number(e.target.value)})} className="w-full p-4 bg-primary/5 rounded-xl font-black border border-primary/20 text-primary" /></div>
           </div>
           
           <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2">
                 <Sparkles size={16} className="text-purple-600"/>
                 <span className="text-xs font-bold text-gray-600">Assistant IA: </span>
                 <button onClick={handleMagicFill} className="text-xs text-purple-600 font-black hover:underline">Remplir Infos</button>
              </div>
              <button onClick={handleSave} className="bg-dark text-white px-8 py-3 rounded-xl font-black hover:scale-105 transition-all">ENREGISTRER</button>
           </div>
        </div>
      )}

      {activeTab === 'LIST' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input type="text" placeholder="Rechercher article..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Article</th>
                    <th className="px-6 py-4">SKU / Ref</th>
                    <th className="px-6 py-4">Prix</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                            {product.image ? (
                                <img src={product.image} className="h-full w-full object-cover" alt="" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-300"><Package size={20}/></div>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">{product.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{product.category}</p>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">{product.sku || '-'}</td>
                    <td className="px-6 py-4 font-black text-gray-900">{(product.price || 0).toFixed(2)} DH</td>
                    <td className="px-6 py-4"><span className={`font-bold ${product.stock <= (product.minStock || 5) ? 'text-red-600' : 'text-emerald-600'}`}>{product.stock}</span></td>
                    <td className="px-6 py-4">
                        {product.stock <= (product.minStock || 5) && (
                            <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-wide flex items-center gap-1 w-fit"><AlertTriangle size={10} /> Faible</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => startEdit(product)} className="p-2 text-gray-400 hover:text-primary transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => onDeleteProduct && onDeleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-0">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><History size={18}/> Journal des mouvements</h3>
                <div className="bg-white px-3 py-1 rounded-md border text-xs font-bold text-gray-500 shadow-sm">
                    {movements.length} Entrées
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-100/50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <th className="px-6 py-4">Date / Heure</th>
                            <th className="px-6 py-4">Type Mouvement</th>
                            <th className="px-6 py-4">Produit</th>
                            <th className="px-6 py-4 text-center">Quantité</th>
                            <th className="px-6 py-4">Auteur</th>
                            <th className="px-6 py-4 text-right">Raison</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {movements.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                    <div className="font-bold text-gray-700">{m.date && !isNaN(new Date(m.date).getTime()) ? new Date(m.date).toLocaleDateString() : '-'}</div>
                                    <div className="text-[10px]">{m.date && !isNaN(new Date(m.date).getTime()) ? new Date(m.date).toLocaleTimeString() : '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-2 px-2 py-1 rounded w-fit text-[10px] font-black uppercase tracking-wide border ${
                                        m.type === 'ENTREE' ? 'bg-green-50 text-green-700 border-green-100' : 
                                        m.type === 'SORTIE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                        {m.type === 'ENTREE' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                                        {m.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-sm text-gray-800">{m.productName}</td>
                                <td className="px-6 py-4 font-mono font-bold text-center text-gray-900 bg-gray-50/50">
                                    {m.type !== 'ENTREE' ? '-' : '+'}{m.quantity}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
                                        <User size={12}/> {String(m.userId || 'Inconnu')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500 italic text-right">{m.reason || '-'}</td>
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
export default StockView;
