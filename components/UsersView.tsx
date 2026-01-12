
import React, { useState } from 'react';
import { User } from '../types';
import { UsersRound, Shield, UserPlus, Trash2, Activity, Save, X, Sparkles, MessageSquareQuote } from 'lucide-react';
import { generateStaffFeedback } from '../services/geminiService';

interface UsersViewProps {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const UsersView: React.FC<UsersViewProps> = ({ users, onAddUser, onDeleteUser }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'CAISSIER' as const });
  const [feedback, setFeedback] = useState<{id: string, text: string} | null>(null);

  const handleCreate = () => {
    if(!newUser.name) return;
    onAddUser({
      id: `u-${Date.now()}`,
      name: newUser.name,
      role: newUser.role,
      avatar: newUser.name.charAt(0).toUpperCase()
    });
    setIsAdding(false);
    setNewUser({ name: '', role: 'CAISSIER' });
  };

  const handleGetFeedback = async (u: User) => {
      const text = await generateStaffFeedback(u.name, u.role);
      setFeedback({ id: u.id, text });
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Modal Ajout */}
      {isAdding && (
         <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black">Ajouter un Membre</h3>
                 <button onClick={() => setIsAdding(false)}><X className="text-gray-400 hover:text-red-500" /></button>
               </div>
               <div className="space-y-4">
                 <input 
                   className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none" 
                   placeholder="Nom du membre"
                   value={newUser.name}
                   onChange={e => setNewUser({...newUser, name: e.target.value})}
                 />
                 <div>
                   <label className="text-xs font-bold text-gray-500 ml-2 uppercase">Rôle</label>
                   <select 
                     className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none mt-1"
                     value={newUser.role}
                     onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                   >
                     <option value="CAISSIER">Caissier (POS uniquement)</option>
                     <option value="MANAGER">Manager (Accès Stock)</option>
                     <option value="ADMIN">Admin (Accès Total)</option>
                   </select>
                 </div>
                 <button onClick={handleCreate} className="w-full bg-primary text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                   <Save size={18} /> CRÉER LE COMPTE
                 </button>
               </div>
            </div>
         </div>
      )}

      {/* Modal Feedback IA */}
      {feedback && (
        <div className="fixed inset-0 bg-dark/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-scale-up text-center">
              <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                 <Sparkles className="text-indigo-600" size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">Feedback Manager IA</h3>
              <p className="text-gray-600 font-medium italic mb-6">"{feedback.text}"</p>
              <button onClick={() => setFeedback(null)} className="bg-dark text-white px-8 py-3 rounded-xl font-bold">Fermer</button>
           </div>
        </div>
      )}

      <header className="flex justify-between items-end">
        <div>
           <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1">Contrôle de l'Équipe SaaS</p>
           <h1 className="text-4xl font-black text-gray-900 leading-none">Membres & Rôles</h1>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-dark text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
        >
          <UserPlus size={20} />
          INVITER UN MEMBRE
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Membres Actifs</p>
            <h3 className="text-4xl font-black text-gray-900">{users.length}</h3>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Rôles Admin</p>
            <h3 className="text-4xl font-black text-primary">{users.filter(u => u.role === 'ADMIN').length}</h3>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">État Système</p>
               <h3 className="text-4xl font-black text-secondary">OK</h3>
            </div>
            <Activity className="text-secondary animate-pulse" />
         </div>
      </div>

      <div className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                     <th className="px-10 py-6">Collaborateur</th>
                     <th className="px-10 py-6">Rôle</th>
                     <th className="px-10 py-6">ID</th>
                     <th className="px-10 py-6 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {users.map(member => (
                     <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                 {member.avatar}
                              </div>
                              <span className="font-bold text-gray-900">{member.name}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${member.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {member.role}
                           </span>
                        </td>
                        <td className="px-10 py-6 font-mono text-xs text-gray-400">{member.id}</td>
                        <td className="px-10 py-6 text-right space-x-2">
                           <button 
                             onClick={() => handleGetFeedback(member)}
                             className="p-3 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded-xl transition-all"
                             title="Générer Feedback IA"
                           >
                             <MessageSquareQuote size={18} />
                           </button>
                           {member.role !== 'ADMIN' && (
                             <button 
                              onClick={() => onDeleteUser(member.id)}
                              className="p-3 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl"
                             >
                               <Trash2 size={18} />
                             </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default UsersView;
