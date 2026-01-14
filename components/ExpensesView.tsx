
import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, WalletCards, Calendar, Trash2, PieChart, Sparkles, AlertOctagon, PlayCircle, Loader2 } from 'lucide-react';
import { analyzeExpensesAudit } from '../services/geminiService';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onAddExpense, onDeleteExpense }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('AUTRE');
  
  // AI Audit State
  const [auditMsg, setAuditMsg] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleRunAudit = async () => {
     if(expenses.length === 0) return;
     setIsAuditing(true);
     try {
         const msg = await analyzeExpensesAudit(expenses);
         setAuditMsg(msg);
     } finally {
         setIsAuditing(false);
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    
    onAddExpense({
      id: Date.now().toString(),
      description: desc,
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString()
    });
    setDesc('');
    setAmount('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Dépenses (Masarif)</h1>
          <p className="text-gray-500">Suivez vos sorties d'argent pour calculer votre bénéfice réel.</p>
        </div>
        <div className="flex gap-4">
             <button 
                onClick={handleRunAudit}
                disabled={isAuditing || expenses.length === 0}
                className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase hover:bg-indigo-100 transition-colors disabled:opacity-50"
             >
                {isAuditing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                Audit IA
             </button>
             <div className="bg-amber-50 border border-amber-100 px-6 py-3 rounded-2xl flex items-center gap-3">
              <PieChart className="text-amber-600" />
              <div>
                <p className="text-xs text-amber-700 font-bold uppercase">Total Dépenses</p>
                <p className="text-xl font-black text-amber-900">{totalExpenses.toFixed(2)} DH</p>
              </div>
            </div>
        </div>
      </div>

      {/* AI Audit Banner */}
      {auditMsg && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-[2rem] shadow-lg flex items-start gap-4 animate-fade-in relative overflow-hidden">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Sparkles className="animate-pulse" />
            </div>
            <div className="relative z-10">
                <h4 className="font-black uppercase text-[10px] tracking-[0.2em] opacity-80 mb-1">Audit Financier IA</h4>
                <p className="font-bold text-lg leading-tight">"{auditMsg}"</p>
            </div>
            <AlertOctagon className="absolute -right-6 -bottom-6 h-32 w-32 text-white/10 rotate-12" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Nouvelle Dépense</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
              <input 
                type="text" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Ex: Loyer du mois, Facture RAMSA..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Montant (DH)</label>
                <input 
                  type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catégorie</label>
                <select 
                  value={category} onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                >
                  <option value="LOYER">Loyer</option>
                  <option value="ELECTRICITE">Electricité/Eau</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="SALAIRE">Salaire</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>
            <button className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <Plus size={18} /> Ajouter
            </button>
          </form>
        </div>

        {/* Liste des dépenses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Historique des sorties</h3>
            <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500 font-medium">{expenses.length} opérations</span>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            {expenses.length === 0 ? (
              <div className="p-10 text-center text-gray-400">Aucune dépense enregistrée.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
                  <tr>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Catégorie</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Montant</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{exp.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold">{exp.category}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1"><Calendar size={12}/> {exp.date && !isNaN(new Date(exp.date).getTime()) ? new Date(exp.date).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-red-500 text-sm">-{(exp.amount || 0).toFixed(2)} DH</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;
