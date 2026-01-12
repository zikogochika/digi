
import React, { useState, useEffect } from 'react';
import { Store, User, Lock, Mail, ArrowRight, Loader2, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { db } from '../services/db';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
  initialPlan?: string | null;
  onBack: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialPlan, onBack }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: ''
  });

  useEffect(() => {
    if (initialPlan) {
      setIsRegistering(true);
    }
  }, [initialPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Register
        await db.register({
            ...formData,
            email: formData.email.trim(),
            password: formData.password.trim(),
            planId: initialPlan || 'plan_basic'
        });
        
        // Auto login logic:
        const data = await db.login(formData.email.trim(), formData.password.trim());
        if (data && data.token) {
             localStorage.setItem('atlas_token', data.token);
             localStorage.setItem('atlas_user', JSON.stringify(data.user));
             onLoginSuccess(data.user);
        } else {
             setIsRegistering(false);
             setError('Compte créé ! Veuillez vous connecter.');
             setFormData(prev => ({ ...prev, password: '' }));
        }

      } else {
        // Login
        const data = await db.login(formData.email.trim(), formData.password.trim());
        
        if (data && data.token) {
            localStorage.setItem('atlas_token', data.token);
            localStorage.setItem('atlas_user', JSON.stringify(data.user));
            onLoginSuccess(data.user);
        } else {
            setError("Erreur inconnue: Pas de token reçu.");
        }
      }
    } catch (e: any) {
        console.error("Login View Error:", e);
        
        let msg = "Erreur inconnue";
        if (e instanceof Error) {
            msg = e.message;
        } else if (typeof e === 'string') {
            msg = e;
        } else if (e && typeof e === 'object') {
            msg = e.message || e.error_description || JSON.stringify(e);
        }
        
        if (msg.includes("Invalid login credentials")) {
            msg = "Email ou mot de passe incorrect.";
        } else if(msg.includes("already registered")) {
            msg = "Ce compte existe déjà. Connectez-vous.";
        }
        
        setError(msg);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark to-gray-900 flex items-center justify-center p-4">
       <button onClick={onBack} className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 font-bold uppercase text-xs transition-colors z-10">
          <ArrowLeft size={16} /> Retour Accueil
       </button>

       <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-scale-up">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
          
          <div className="text-center mb-10">
             <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-4">
                 <Store className="h-10 w-10 text-primary" />
             </div>
             <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic">Atlas<span className="text-primary">PRO</span> SaaS</h1>
             <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">
                {isRegistering ? (initialPlan ? `Inscription Plan ${initialPlan.replace('plan_', '').toUpperCase()}` : "Création de Compte") : "Espace Client"}
             </p>
          </div>

          {error && (
             <div className={`mb-6 p-4 rounded-xl text-center text-sm font-bold flex flex-col items-center justify-center gap-2 ${error.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                <div className="flex items-center gap-2">
                    {error.includes('succès') ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{error}</span>
                </div>
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
             {isRegistering && (
                 <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    <input 
                      type="text" 
                      placeholder="Nom de votre Entreprise"
                      className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 placeholder-gray-400 transition-all"
                      value={formData.companyName}
                      onChange={e => setFormData({...formData, companyName: e.target.value})}
                      required={isRegistering}
                    />
                 </div>
             )}

             <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                <input 
                  type="email" 
                  placeholder="Email (ex: Admin@admin.com)"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 placeholder-gray-400 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
             </div>

             <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                <input 
                  type="password" 
                  placeholder="Mot de passe"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 placeholder-gray-400 transition-all"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                />
             </div>

             <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-dark text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
             >
                {isLoading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'VALIDER INSCRIPTION' : 'CONNEXION')}
             </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                {isRegistering ? 'Déjà un compte ?' : 'Pas encore client ?'}
             </p>
             <button 
               onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
               className="text-primary font-black hover:underline"
             >
                {isRegistering ? 'Se connecter' : "S'inscrire"}
             </button>
          </div>
       </div>
    </div>
  );
};

export default LoginView;
