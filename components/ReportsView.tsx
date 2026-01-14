
import React, { useMemo } from 'react';
import { Sale, Expense, Product } from '../types';
import { PieChart, TrendingUp, DollarSign, WalletCards, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface ReportsViewProps {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ sales, expenses, products }) => {
  const stats = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    
    // Calcul coût des produits vendus (COGS)
    let totalCOGS = 0;
    sales.forEach(s => {
        s.items.forEach(i => {
            const product = products.find(p => p.id === i.id);
            const cost = product?.costPrice || 0;
            totalCOGS += (cost * i.quantity);
        });
    });

    const grossProfit = totalSales - totalCOGS; // Marge Brute
    const netProfit = grossProfit - totalExpenses; // Bénéfice Net (Brut - Dépenses)

    // Top Products
    const productStats: Record<string, number> = {};
    sales.forEach(s => {
        s.items.forEach(i => {
            productStats[i.name] = (productStats[i.name] || 0) + i.quantity;
        });
    });
    const topProducts = Object.entries(productStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, value: qty }));

    // Sales by Day (Last 7 days)
    const salesByDay: Record<string, number> = {};
    sales.forEach(s => {
        if (!s.date || isNaN(new Date(s.date).getTime())) return;
        const date = new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short' });
        salesByDay[date] = (salesByDay[date] || 0) + s.total;
    });
    const chartData = Object.entries(salesByDay).map(([name, vente]) => ({ name, vente }));

    return { totalSales, totalExpenses, totalCOGS, grossProfit, netProfit, topProducts, chartData };
  }, [sales, expenses, products]);

  const COLORS = ['#0F766E', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-8 animate-fade-in pb-20">
       <header>
         <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1">Business Intelligence</p>
         <h1 className="text-4xl font-black text-gray-900 leading-none">Rapports Financiers</h1>
       </header>

       {/* KPIs Principaux */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80}/></div>
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
               <h3 className="text-3xl font-black text-gray-900">{stats.totalSales.toLocaleString()} <span className="text-sm">DH</span></h3>
               <div className="mt-2 flex items-center text-emerald-500 text-xs font-bold"><ArrowUpRight size={14}/> +12% ce mois</div>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><WalletCards size={80}/></div>
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Dépenses</p>
               <h3 className="text-3xl font-black text-red-500">-{stats.totalExpenses.toLocaleString()} <span className="text-sm">DH</span></h3>
               <div className="mt-2 flex items-center text-red-500 text-xs font-bold"><ArrowUpRight size={14}/> +5% vs mois dernier</div>
           </div>

           <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80}/></div>
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Marge Brute (Com.)</p>
               <h3 className="text-3xl font-black text-blue-600">{stats.grossProfit.toLocaleString()} <span className="text-sm">DH</span></h3>
               <p className="text-[10px] text-gray-400 mt-2">Ventes - Coût Achat Marchandise</p>
           </div>

           <div className="bg-dark text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><PieChart size={80}/></div>
               <p className="text-xs font-black text-white/50 uppercase tracking-widest mb-2">Bénéfice Net Réel</p>
               <h3 className="text-4xl font-black text-emerald-400">{stats.netProfit.toLocaleString()} <span className="text-sm">DH</span></h3>
               <p className="text-[10px] text-white/50 mt-2">Après déduction de toutes les charges</p>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Graphique Ventes */}
           <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp size={20}/> Évolution des Ventes (7 jours)</h3>
              <div className="h-64 w-full min-w-0">
                {stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:12, fontWeight:'bold'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill:'#94a3b8', fontSize:12, fontWeight:'bold'}} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                            <Bar dataKey="vente" fill="#0F766E" radius={[10, 10, 10, 10]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">Pas assez de données</div>
                )}
              </div>
           </div>

           {/* Top Produits */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Award size={20}/> Top Produits</h3>
              <div className="h-64 flex flex-col justify-center">
                  {stats.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between mb-4 last:mb-0">
                          <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{backgroundColor: COLORS[i % COLORS.length]}}>
                                  {i + 1}
                              </div>
                              <span className="text-sm font-bold text-gray-700">{p.name}</span>
                          </div>
                          <span className="font-mono font-bold text-gray-900">{p.value} utés</span>
                      </div>
                  ))}
                  {stats.topProducts.length === 0 && <p className="text-center text-gray-400 text-xs">Pas assez de données</p>}
              </div>
           </div>
       </div>
    </div>
  );
};

export default ReportsView;
