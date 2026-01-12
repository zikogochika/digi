
import React, { useState, useRef } from 'react';
import { CompanySettings, Product, Customer, Supplier } from '../types';
import { Save, Building2, FileText, Printer, Image as ImageIcon, Sparkles, Download, Upload, Database, Loader2, Coins, Wallet, X, Plus } from 'lucide-react';
import { db } from '../services/db';

interface SettingsViewProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<CompanySettings>({
      ...settings,
      documentFormat: settings.documentFormat || 'A4',
      customPaymentMethods: settings.customPaymentMethods || ['CASH', 'CARD', 'KARNE']
  });
  const [msg, setMsg] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS'>('PRODUCTS');
  
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  const handleSave = () => {
    onSave(formData);
    setMsg('Paramètres enregistrés avec succès !');
    setTimeout(() => setMsg(''), 3000);
  };

  const addPaymentMethod = () => {
      if(newPaymentMethod && !formData.customPaymentMethods?.includes(newPaymentMethod.toUpperCase())) {
          setFormData(prev => ({
              ...prev,
              customPaymentMethods: [...(prev.customPaymentMethods || []), newPaymentMethod.toUpperCase()]
          }));
          setNewPaymentMethod('');
      }
  };

  const removePaymentMethod = (method: string) => {
      if(method === 'KARNE') return; // Cannot remove base functionality
      setFormData(prev => ({
          ...prev,
          customPaymentMethods: prev.customPaymentMethods?.filter(m => m !== method)
      }));
  };

  const handleExport = async (type: 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS') => {
      const data = await db.load();
      if (!data) return alert("Erreur chargement données");
      
      let exportData: any[] = [];
      let filename = '';

      if (type === 'PRODUCTS') { exportData = data.products; filename = 'atlas_produits.json'; }
      if (type === 'CUSTOMERS') { exportData = data.customers; filename = 'atlas_clients.json'; }
      if (type === 'SUPPLIERS') { exportData = data.suppliers; filename = 'atlas_fournisseurs.json'; }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
  };

  const triggerImport = (type: 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS') => {
      setImportType(type);
      fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (!Array.isArray(json)) throw new Error("Format invalide: Doit être une liste []");
              
              await db.importData(importType, json);
              alert(`${json.length} éléments importés avec succès ! Rechargez la page.`);
          } catch (err: any) {
              const errMsg = err?.message || String(err);
              alert("Erreur Import: " + errMsg);
          } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header>
         <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1">Configuration</p>
         <h1 className="text-4xl font-black text-gray-900 leading-none">Paramètres Entreprise</h1>
      </header>

      {msg && (
        <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl font-bold text-center animate-bounce">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Info */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Building2 size={24} /></div>
              <h3 className="text-xl font-black text-gray-800">Identité Entreprise</h3>
           </div>
           
           <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nom de la société / Magasin</label>
                <input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Adresse Complète</label>
                <input 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Téléphone</label>
                  <input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">ICE (Obligatoire)</label>
                  <input 
                    value={formData.ice}
                    onChange={e => setFormData({...formData, ice: e.target.value})}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl">
                 <div className="col-span-3 text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Informations Légales (Pied de page)</div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">R.C</label>
                    <input 
                        value={formData.rc || ''}
                        onChange={e => setFormData({...formData, rc: e.target.value})}
                        className="w-full mt-1 p-2 bg-white rounded-lg border-none font-bold text-xs"
                        placeholder="N° RC"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">I.F</label>
                    <input 
                        value={formData.if || ''}
                        onChange={e => setFormData({...formData, if: e.target.value})}
                        className="w-full mt-1 p-2 bg-white rounded-lg border-none font-bold text-xs"
                        placeholder="N° IF"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Patente</label>
                    <input 
                        value={formData.patente || ''}
                        onChange={e => setFormData({...formData, patente: e.target.value})}
                        className="w-full mt-1 p-2 bg-white rounded-lg border-none font-bold text-xs"
                        placeholder="N° TP"
                    />
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Logo URL (Lien image)</label>
                <div className="flex gap-2">
                   <input 
                    value={formData.logoUrl}
                    onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                    className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary/20"
                    placeholder="https://..."
                   />
                   {formData.logoUrl && <img src={formData.logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-xl border" />}
                </div>
              </div>
           </div>
        </div>

        {/* Finance Settings (Taxes & Currency) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Coins size={24} /></div>
              <h3 className="text-xl font-black text-gray-800">Finance & Paiements</h3>
           </div>

           <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase ml-1">Devise Système</label>
                       <input 
                         value={formData.currency}
                         onChange={e => setFormData({...formData, currency: e.target.value})}
                         className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none font-black text-center focus:ring-2 focus:ring-primary/20"
                         placeholder="DH"
                       />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase ml-1">TVA (Taxe)</label>
                       <div className="flex items-center gap-2 mt-2">
                           <input 
                             type="checkbox" 
                             checked={formData.tvaEnabled} 
                             onChange={e => setFormData({...formData, tvaEnabled: e.target.checked})}
                             className="w-6 h-6 accent-primary"
                           />
                           <span className="font-bold text-sm">Activer TVA</span>
                       </div>
                   </div>
               </div>

               {formData.tvaEnabled && (
                   <div>
                       <label className="text-xs font-bold text-gray-500 uppercase ml-1">Taux de TVA (%)</label>
                       <input 
                         type="number"
                         value={formData.taxRate || 20}
                         onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}
                         className="w-full mt-1 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border-none font-black text-center focus:ring-2 focus:ring-emerald-200"
                         placeholder="20"
                       />
                   </div>
               )}

               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-2"><Wallet size={14}/> Modes de Paiement (POS)</label>
                   <div className="flex flex-wrap gap-2 mt-3 mb-3">
                       {formData.customPaymentMethods?.map(method => (
                           typeof method === 'string' ? (
                           <div key={method} className="bg-white border border-gray-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                               <span className="text-xs font-black uppercase">{method}</span>
                               {method !== 'KARNE' && (
                                   <button onClick={() => removePaymentMethod(method)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                               )}
                           </div>
                           ) : null
                       ))}
                   </div>
                   <div className="flex gap-2">
                       <input 
                         value={newPaymentMethod}
                         onChange={e => setNewPaymentMethod(e.target.value)}
                         placeholder="Nouveau mode (ex: VIREMENT)"
                         className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border-none"
                       />
                       <button onClick={addPaymentMethod} className="p-3 bg-primary text-white rounded-xl"><Plus size={16}/></button>
                   </div>
               </div>
           </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Printer size={24} /></div>
              <h3 className="text-xl font-black text-gray-800">Format & Modèle</h3>
           </div>

           <div className="mb-6">
               <label className="text-xs font-bold text-gray-500 uppercase ml-1">Format Papier par Défaut</label>
               <div className="flex gap-4 mt-2">
                   <button 
                     onClick={() => setFormData({...formData, documentFormat: 'A4'})}
                     className={`flex-1 py-4 rounded-xl font-black border-2 transition-all ${formData.documentFormat === 'A4' ? 'border-primary bg-primary text-white' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}
                   >
                       A4
                   </button>
                   <button 
                     onClick={() => setFormData({...formData, documentFormat: 'A5'})}
                     className={`flex-1 py-4 rounded-xl font-black border-2 transition-all ${formData.documentFormat === 'A5' ? 'border-primary bg-primary text-white' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}
                   >
                       A5
                   </button>
               </div>
           </div>

           <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setFormData({...formData, invoiceTemplate: 'A4_STANDARD'})}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.invoiceTemplate === 'A4_STANDARD' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-300'}`}
              >
                 <div className="flex items-center gap-3 mb-2">
                    <FileText size={20} className={formData.invoiceTemplate === 'A4_STANDARD' ? 'text-primary' : 'text-gray-400'} />
                    <span className="font-black text-gray-900">Standard Professionnel (B2B)</span>
                 </div>
                 <p className="text-xs text-gray-500 font-medium">Format A4/A5 avec tableau détaillé, TVA, et mentions légales complètes. Idéal pour les factures sociétés.</p>
              </button>

              <button 
                onClick={() => setFormData({...formData, invoiceTemplate: 'THERMAL'})}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.invoiceTemplate === 'THERMAL' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-300'}`}
              >
                 <div className="flex items-center gap-3 mb-2">
                    <Printer size={20} className={formData.invoiceTemplate === 'THERMAL' ? 'text-primary' : 'text-gray-400'} />
                    <span className="font-black text-gray-900">Ticket Thermique (80mm)</span>
                 </div>
                 <p className="text-xs text-gray-500 font-medium">Format ticket de caisse compact. Idéal pour POS et vente rapide au comptoir.</p>
              </button>
           </div>
        </div>

        {/* Data Management Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Database size={24} /></div>
              <h3 className="text-xl font-black text-gray-800">Gestion des Données (Import/Export)</h3>
           </div>
           
           <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />

           <div className="grid md:grid-cols-3 gap-6">
               <div className="bg-gray-50 p-6 rounded-2xl">
                   <h4 className="font-bold text-gray-800 mb-4">Produits & Stock</h4>
                   <div className="flex gap-2">
                       <button onClick={() => handleExport('PRODUCTS')} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:border-primary hover:text-primary flex items-center justify-center gap-2"><Download size={16}/> Export</button>
                       <button onClick={() => triggerImport('PRODUCTS')} disabled={isImporting} className="flex-1 py-3 bg-dark text-white rounded-xl font-bold text-xs hover:bg-opacity-90 flex items-center justify-center gap-2">
                           {isImporting ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} Import
                       </button>
                   </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-2xl">
                   <h4 className="font-bold text-gray-800 mb-4">Clients (Karné)</h4>
                   <div className="flex gap-2">
                       <button onClick={() => handleExport('CUSTOMERS')} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:border-primary hover:text-primary flex items-center justify-center gap-2"><Download size={16}/> Export</button>
                       <button onClick={() => triggerImport('CUSTOMERS')} disabled={isImporting} className="flex-1 py-3 bg-dark text-white rounded-xl font-bold text-xs hover:bg-opacity-90 flex items-center justify-center gap-2">
                           {isImporting ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} Import
                       </button>
                   </div>
               </div>
               <div className="bg-gray-50 p-6 rounded-2xl">
                   <h4 className="font-bold text-gray-800 mb-4">Fournisseurs</h4>
                   <div className="flex gap-2">
                       <button onClick={() => handleExport('SUPPLIERS')} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:border-primary hover:text-primary flex items-center justify-center gap-2"><Download size={16}/> Export</button>
                       <button onClick={() => triggerImport('SUPPLIERS')} disabled={isImporting} className="flex-1 py-3 bg-dark text-white rounded-xl font-bold text-xs hover:bg-opacity-90 flex items-center justify-center gap-2">
                           {isImporting ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} Import
                       </button>
                   </div>
               </div>
           </div>
        </div>
      </div>

      <div className="flex justify-end sticky bottom-4">
        <button 
          onClick={handleSave}
          className="bg-dark text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center gap-3"
        >
          <Save size={24} />
          ENREGISTRER LES MODIFICATIONS
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
