
import React, { useState, useEffect } from 'react';
import { Tenant, Plan, LandingPageConfig } from '../types';
import { db } from '../services/db';
import { generateSaaSInsights } from '../services/geminiService';
import { Users, Power, Shield, LogOut, Cpu, BrainCircuit, Sparkles, LayoutTemplate, Save, Plus, Trash2, Eye, CheckCircle, XCircle, Edit3 } from 'lucide-react';

interface SuperAdminViewProps {
    onLogout: () => void;
    onImpersonate: (tenantId: string, name: string) => void;
}

const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onLogout, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<'CLIENTS' | 'PLANS' | 'CMS'>('CLIENTS');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);
  
  // PLANS EDITING STATE
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan>>({});
  const [featuresText, setFeaturesText] = useState(''); // Handle features as lines of text

  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => { 
      setIsLoading(true);
      try {
          const t = await db.getTenants();
          setTenants(t);
          const p = await db.getPlans();
          setPlans(p);
          const c = await db.getLandingConfig();
          setLandingConfig(c);
      } catch (e) {
          console.error("Load Error", e);
      }
      setIsLoading(false);
  };

  // --- CLIENTS ---
  const handleToggleTenant = async (id: string, currentStatus: boolean) => { 
      await db.toggleTenant(id, !currentStatus); 
      loadData(); 
  };
  
  const toggleTenantModule = async (tenant: Tenant, module: 'pos' | 'stock' | 'ai' | 'accounting') => {
      const currentModules = tenant.modules || { pos: true, stock: false, ai: false, accounting: false };
      const newModules = { ...currentModules, [module]: !currentModules[module] };
      await db.updateTenantModules(tenant.id, newModules);
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, modules: newModules } : t));
  };

  const runAiAnalysis = async () => {
      if(tenants.length === 0) return;
      setIsAnalyzing(true);
      const result = await generateSaaSInsights(tenants);
      setAiAnalysis(result);
      setIsAnalyzing(false);
  };

  // --- PLANS ---
  const openPlanEditor = (plan?: Plan) => {
      if(plan) {
          setEditingPlan(plan);
          setFeaturesText(plan.features.join('\n'));
      } else {
          setEditingPlan({ 
              name: '', price: 0, description: '', isPopular: false,
              modules: { pos: true, stock: false, ai: false, accounting: false }
          });
          setFeaturesText('');
      }
      setIsEditingPlan(true);
  };

  const handleSavePlan = async () => {
      if(!editingPlan.name) return alert("Nom du plan obligatoire");
      
      const newPlan: Plan = {
          id: editingPlan.id || `plan_${Date.now()}`,
          name: editingPlan.name,
          price: Number(editingPlan.price) || 0,
          description: editingPlan.description || '',
          features: featuresText.split('\n').filter(line => line.trim() !== ''),
          modules: editingPlan.modules || { pos: true, stock: false, ai: false, accounting: false },
          isPopular: editingPlan.isPopular
      };

      try {
          await db.savePlan(newPlan);
          setIsEditingPlan(false);
          loadData();
      } catch(e: any) {
          alert(e.message);
      }
  };

  const handleDeletePlan = async (id: string) => {
      if(confirm("Voulez-vous vraiment supprimer ce plan ? Cela peut affecter les clients inscrits.")) {
          try {
              await db.deletePlan(id);
              loadData();
          } catch(e: any) {
              alert(e.message);
          }
      }
  };

  // --- CMS ---
  const handleSaveLanding = async () => {
      if(landingConfig) {
          try {
              await db.saveLandingConfig(landingConfig);
              alert("Configuration Landing Page sauvegardée !");
          } catch(e) {
              alert("Erreur sauvegarde.");
          }
      }
  };

  const updateFeature = (index: number, field: string, value: string) => {
      if (!landingConfig) return;
      const newFeatures = [...(landingConfig.features || [])];
      // @ts-ignore
      newFeatures[index][field] = value;
      setLandingConfig({ ...landingConfig, features: newFeatures });
  };

  const removeFeature = (index: number) => {
      if (!landingConfig) return;
      const newFeatures = landingConfig.features.filter((_, i) => i !== index);
      setLandingConfig({ ...landingConfig, features: newFeatures });
  };

  const addFeature = () => {
      if (!landingConfig) return;
      const newFeatures = [...(landingConfig.features || []), { title: 'Nouveau', text: 'Description...', icon: 'Star' }];
      setLandingConfig({ ...landingConfig, features: newFeatures });
  };

  const filteredTenants = tenants.filter(t => t.companyName.toLowerCase().includes(search.toLowerCase()) || t.email.includes(search));

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-gray-900 flex flex-col">
       
       <header className="bg-dark text-white p-4 shadow-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-primary to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-primary/20">
                    <Shield size={24} className="text-white" />
                </div>
                <div>
                   <h1 className="text-xl font-black tracking-tighter italic leading-none">Atlas<span className="text-primary">Admin</span></h1>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Super Admin Access</p>
                </div>
             </div>
             
             <div className="flex bg-white/10 rounded-xl p-1 overflow-x-auto">
                 <button onClick={() => setActiveTab('CLIENTS')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'CLIENTS' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>Clients</button>
                 <button onClick={() => setActiveTab('PLANS')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'PLANS' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>Plans & Offres</button>
                 <button onClick={() => setActiveTab('CMS')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'CMS' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}>CMS Landing</button>
             </div>

             <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold uppercase">
                <LogOut size={16} /> <span className="hidden sm:inline">Déconnexion</span>
             </button>
          </div>
       </header>

       <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
          
          {/* DASHBOARD CLIENTS */}
          {activeTab === 'CLIENTS' && (
             <>
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  <div className="relative z-10 grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1">
                          <h2 className="text-3xl font-black leading-tight mb-4">Analyse de la Flotte</h2>
                          <button onClick={runAiAnalysis} disabled={isAnalyzing} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black uppercase text-xs hover:scale-105 transition-transform flex items-center gap-2">
                             {isAnalyzing ? <div className="w-4 h-4 border-2 border-indigo-900 border-t-transparent rounded-full animate-spin"></div> : <Cpu size={16} />}
                             {isAnalyzing ? 'Analyse...' : 'Lancer Diagnostic'}
                          </button>
                      </div>
                      {aiAnalysis && (
                          <div className="lg:col-span-2 grid md:grid-cols-3 gap-4 animate-fade-in">
                              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                                  <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">Score Santé</p>
                                  <span className="text-4xl font-black text-emerald-400">{aiAnalysis.healthScore}%</span>
                              </div>
                              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                                  <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-2">Risque</p>
                                  <p className="text-sm font-bold text-white/90">{aiAnalysis.riskAlert}</p>
                              </div>
                          </div>
                      )}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Gestion des Clients ({filteredTenants.length})</h2>
                        </div>
                        <input placeholder="Rechercher..." className="pl-4 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none w-full md:w-80" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                              <tr>
                                 <th className="px-8 py-5">Client</th>
                                 <th className="px-6 py-5">Plan</th>
                                 <th className="px-6 py-5">Modules (Live Switch)</th>
                                 <th className="px-6 py-5">Statut</th>
                                 <th className="px-6 py-5 text-right">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {filteredTenants.map(t => (
                                 <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-8 py-5">
                                       <div className="font-black text-gray-800 text-sm">{t.companyName}</div>
                                       <div className="text-[11px] text-gray-400">{t.email}</div>
                                    </td>
                                    <td className="px-6 py-5"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{t.planId}</span></td>
                                    <td className="px-6 py-5">
                                        <div className="flex gap-1.5 flex-wrap max-w-[250px]">
                                            {[
                                                { key: 'pos', label: 'POS', color: 'bg-emerald-500' },
                                                { key: 'stock', label: 'STOCK', color: 'bg-blue-500' },
                                                { key: 'ai', label: 'AI', color: 'bg-purple-500' },
                                                { key: 'accounting', label: 'COMPTA', color: 'bg-orange-500' },
                                            ].map((mod) => (
                                                <button 
                                                  key={mod.key}
                                                  onClick={() => toggleTenantModule(t, mod.key as any)}
                                                  title={`Activer/Désactiver ${mod.label}`}
                                                  className={`px-2 py-1 rounded-md text-[9px] font-black border transition-all ${t.modules?.[mod.key as keyof typeof t.modules] ? `${mod.color} text-white border-transparent shadow-sm` : 'bg-white text-gray-300 border-gray-200 hover:border-gray-400'}`}
                                                >
                                                    {mod.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                       {t.isActive ? <span className="text-emerald-500 font-black text-xs bg-emerald-50 px-2 py-1 rounded">ACTIF</span> : <span className="text-red-500 font-black text-xs bg-red-50 px-2 py-1 rounded">BLOQUÉ</span>}
                                    </td>
                                    <td className="px-6 py-5 text-right flex justify-end gap-2">
                                       <button 
                                        onClick={() => onImpersonate(t.id, t.companyName)}
                                        className="p-2 border border-blue-100 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        title="Se connecter en tant que ce client"
                                       >
                                           <Eye size={16} />
                                       </button>
                                       <button 
                                        onClick={() => handleToggleTenant(t.id, t.isActive)} 
                                        className={`p-2 border rounded-lg hover:bg-gray-100 transition-colors ${t.isActive ? 'text-red-500 border-red-100' : 'text-emerald-500 border-emerald-100'}`}
                                       >
                                           <Power size={16}/>
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                    </div>
                </div>
             </>
          )}

          {/* PLANS MANAGER */}
          {activeTab === 'PLANS' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-black">Offres & Abonnements</h2>
                   <button onClick={() => openPlanEditor()} className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"><Plus size={20}/> Créer un Plan</button>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                   {plans.map(plan => (
                      <div key={plan.id} className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm relative group hover:shadow-xl transition-all flex flex-col">
                         {plan.isPopular && <span className="absolute top-4 right-4 bg-secondary text-white text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-lg shadow-secondary/30">Populaire</span>}
                         <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                         <p className="text-3xl font-black text-primary my-2">{plan.price} DH</p>
                         <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{plan.description}</p>
                         <div className="space-y-2 mb-6 flex-1">
                             {Object.entries(plan.modules).map(([key, val]) => (
                                 <div key={key} className={`text-xs font-bold flex items-center gap-2 ${val ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                                     {val ? <CheckCircle size={14} className="text-primary"/> : <XCircle size={14}/>} {key.toUpperCase()}
                                 </div>
                             ))}
                             <div className="mt-4 pt-4 border-t border-gray-100">
                                 <p className="text-xs font-black text-gray-400 uppercase mb-2">Features:</p>
                                 <ul className="text-xs text-gray-600 space-y-1">
                                     {plan.features.slice(0,3).map((f,i) => <li key={i}>• {f}</li>)}
                                     {plan.features.length > 3 && <li>...</li>}
                                 </ul>
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => openPlanEditor(plan)} className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors">
                                 <Edit3 size={16}/> Editer
                             </button>
                             <button onClick={() => handleDeletePlan(plan.id)} className="p-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center transition-colors">
                                 <Trash2 size={16}/>
                             </button>
                         </div>
                      </div>
                   ))}
                </div>

                {isEditingPlan && (
                   <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                      <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                          <h3 className="text-xl font-black mb-4">{editingPlan.id ? 'Modifier Plan' : 'Nouveau Plan'}</h3>
                          <div className="space-y-4">
                              <input placeholder="Nom du Plan (ex: Gold)" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingPlan.name || ''} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                              <div className="grid grid-cols-2 gap-4">
                                  <input placeholder="Prix (DH)" type="number" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingPlan.price || ''} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} />
                                  <div className="flex items-center gap-2 p-3">
                                      <input type="checkbox" checked={editingPlan.isPopular || false} onChange={e => setEditingPlan({...editingPlan, isPopular: e.target.checked})} className="w-5 h-5 accent-primary" />
                                      <label className="text-sm font-bold">Populaire</label>
                                  </div>
                              </div>
                              <input placeholder="Description courte" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingPlan.description || ''} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} />
                              
                              <div className="bg-gray-50 p-4 rounded-xl">
                                  <p className="text-xs font-black text-gray-400 uppercase mb-2">Modules Activés</p>
                                  <div className="flex flex-wrap gap-2">
                                      {['pos', 'stock', 'ai', 'accounting'].map(mod => (
                                          <button 
                                            key={mod}
                                            onClick={() => setEditingPlan({
                                                ...editingPlan, 
                                                modules: { ...editingPlan.modules, [mod]: !editingPlan.modules?.[mod as keyof typeof editingPlan.modules] } as any
                                            })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border transition-all ${editingPlan.modules?.[mod as keyof typeof editingPlan.modules] ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400'}`}
                                          >
                                              {mod}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              
                              <div>
                                  <p className="text-xs font-black text-gray-400 uppercase mb-2">Liste des avantages (1 par ligne)</p>
                                  <textarea 
                                    className="w-full bg-gray-50 p-3 rounded-xl font-medium text-sm h-32" 
                                    placeholder="Support 24/7&#10;Multi-magasin&#10;..."
                                    value={featuresText}
                                    onChange={e => setFeaturesText(e.target.value)}
                                  />
                              </div>

                              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                                  <button onClick={() => setIsEditingPlan(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Annuler</button>
                                  <button onClick={handleSavePlan} className="flex-1 bg-primary text-white py-3 rounded-xl font-black hover:scale-105 transition-transform">Enregistrer</button>
                              </div>
                          </div>
                      </div>
                   </div>
                )}
             </div>
          )}

          {/* CMS LANDING PAGE */}
          {activeTab === 'CMS' && landingConfig && (
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4">
                    <div className="p-3 bg-pink-50 text-pink-600 rounded-xl"><LayoutTemplate size={24}/></div>
                    <div>
                        <h2 className="text-xl font-black">Éditeur Landing Page (Loading Page)</h2>
                        <p className="text-gray-500 text-xs font-bold">Personnalisez la page d'accueil vue par les visiteurs.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Titre Principal (Hero)</label>
                            <textarea 
                              className="w-full mt-1 p-4 bg-gray-50 rounded-xl font-bold text-lg border-none focus:ring-2 focus:ring-primary/20 text-gray-900" 
                              rows={2}
                              value={landingConfig.heroTitle}
                              onChange={e => setLandingConfig({...landingConfig, heroTitle: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Sous-titre</label>
                            <textarea 
                              className="w-full mt-1 p-4 bg-gray-50 rounded-xl font-medium border-none focus:ring-2 focus:ring-primary/20 text-gray-700" 
                              rows={3}
                              value={landingConfig.heroSubtitle}
                              onChange={e => setLandingConfig({...landingConfig, heroSubtitle: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Image URL (Hero)</label>
                            <input 
                              className="w-full mt-1 p-4 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 text-xs text-gray-800" 
                              value={landingConfig.heroImage}
                              onChange={e => setLandingConfig({...landingConfig, heroImage: e.target.value})}
                            />
                            {landingConfig.heroImage && <img src={landingConfig.heroImage} className="mt-2 h-32 w-full object-cover rounded-xl border-2 border-dashed border-gray-200" />}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Titre Section Plans</label>
                            <input 
                              className="w-full mt-1 p-4 bg-gray-50 rounded-xl font-bold border-none text-gray-900" 
                              value={landingConfig.plansTitle}
                              onChange={e => setLandingConfig({...landingConfig, plansTitle: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* Features Editor */}
                <div className="border-t border-gray-100 pt-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Fonctionnalités (Features)</h3>
                        <button onClick={addFeature} className="text-xs font-black uppercase text-primary bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary hover:text-white transition-all">+ Ajouter Feature</button>
                    </div>
                    
                    <div className="space-y-4">
                        {landingConfig.features?.map((feat, idx) => (
                            <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-100 group hover:shadow-md transition-shadow">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Titre</label>
                                        <input 
                                            className="w-full bg-white p-2 rounded-lg border border-gray-200 text-sm font-bold"
                                            value={feat.title}
                                            onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                                        />
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mt-2 mb-1 block">Icone (Lucide Name)</label>
                                        <input 
                                            className="w-full bg-white p-2 rounded-lg border border-gray-200 text-xs font-mono"
                                            value={feat.icon}
                                            onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                                            placeholder="Ex: Star, Zap..."
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Description</label>
                                        <textarea 
                                            className="w-full bg-white p-2 rounded-lg border border-gray-200 text-sm h-24"
                                            value={feat.text}
                                            onChange={(e) => updateFeature(idx, 'text', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button onClick={() => removeFeature(idx)} className="text-gray-300 hover:text-red-500 p-2 mt-6"><Trash2 size={20} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end mt-8 pt-8 border-t border-gray-100 sticky bottom-0 bg-white p-4 border-t shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-b-[2.5rem]">
                    <button onClick={handleSaveLanding} className="bg-dark text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                        <Save size={20} /> PUBLIER SUR LE SITE
                    </button>
                </div>
             </div>
          )}
       </main>
    </div>
  );
};

export default SuperAdminView;
