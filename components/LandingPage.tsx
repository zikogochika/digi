
import React from 'react';
import { Store, Zap, Shield, TrendingUp, Check, ArrowRight, Star, BarChart3, Smartphone, X, Circle, Box, Sparkles } from 'lucide-react';
import { LandingPageConfig, Plan } from '../types';

interface LandingPageProps {
  config: LandingPageConfig;
  plans: Plan[];
  onLogin: () => void;
  onSelectPlan: (planId: string) => void;
}

// Map string icons to Lucide components if needed, or use generics
const IconMap: Record<string, any> = {
    Smartphone, BarChart3, Zap, Shield, Store, TrendingUp, Star, Circle, Box, Sparkles
};

const LandingPage: React.FC<LandingPageProps> = ({ config, plans, onLogin, onSelectPlan }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-xl text-white">
              <Store size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter italic">Atlas<span className="text-primary">PRO</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500">
            <a href="#features" className="hover:text-primary transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Tarifs</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLogin} className="text-sm font-bold text-gray-900 hover:text-primary transition-colors">Se connecter</button>
            <a href="#pricing" className="bg-dark text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-dark/20">
              Commencer
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 opacity-10">
            <TrendingUp size={600} />
        </div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
              <Star size={12} className="fill-current" /> Système Cloud Marocain
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
              {config.heroTitle}
            </h1>
            <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-lg">
              {config.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#pricing" className="px-8 py-5 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:bg-emerald-700 transition-all hover:-translate-y-1">
                Voir les offres <ArrowRight size={20} />
              </a>
              <button onClick={onLogin} className="px-8 py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:border-primary/30 transition-all">
                Démo Admin
              </button>
            </div>
          </div>
          <div className="relative animate-scale-up hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-[3rem] blur-3xl"></div>
            <img 
              src={config.heroImage}
              alt="Dashboard App" 
              className="relative rounded-[2.5rem] shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500 object-cover h-[500px] w-full"
            />
          </div>
        </div>
      </section>

      {/* Features - Dynamic */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black mb-4">{config.featuresTitle}</h2>
            <p className="text-gray-500 text-lg">Tout est prêt pour vous aider à réussir.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {config.features?.map((feature, i) => {
              const IconComp = IconMap[feature.icon] || Star;
              return (
                <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-2 group">
                  <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                    <IconComp size={28} />
                  </div>
                  <h3 className="text-xl font-black mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed font-medium">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dynamic Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black mb-4">{config.plansTitle}</h2>
            <p className="text-gray-500 text-lg">Choisissez le plan adapté.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`p-8 rounded-[2.5rem] border transition-all relative flex flex-col h-full
                  ${plan.isPopular 
                    ? 'border-2 border-primary bg-dark text-white shadow-2xl scale-105 z-10' 
                    : 'border-gray-200 bg-white hover:border-primary/30'
                  }`}
              >
                {plan.isPopular && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-secondary text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                     Recommandé
                   </div>
                )}
                
                <h3 className={`text-xl font-black mb-2 ${plan.isPopular ? 'text-primary' : 'text-gray-500'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-black ${plan.isPopular ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className="text-xl font-bold text-gray-400">DH/mois</span>
                </div>
                <p className={`text-sm font-medium mb-8 ${plan.isPopular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</p>
                
                <button 
                  onClick={() => onSelectPlan(plan.id)} 
                  className={`w-full py-4 rounded-xl font-black transition-all mb-8 uppercase tracking-widest
                    ${plan.isPopular 
                        ? 'bg-primary text-white hover:bg-emerald-600 shadow-lg shadow-primary/20' 
                        : 'border-2 border-gray-100 text-gray-900 hover:border-gray-900'
                    }`}
                >
                  Choisir {plan.name}
                </button>
                
                <ul className={`space-y-4 text-sm font-bold flex-1 ${plan.isPopular ? 'text-gray-300' : 'text-gray-600'}`}>
                  {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-3"><Check size={16} className="text-primary"/> {feat}</li>
                  ))}
                  {/* Visual module checks based on data */}
                  <li className={`flex items-center gap-3 ${plan.modules.ai ? '' : 'opacity-50 line-through'}`}>
                      {plan.modules.ai ? <Check size={16} className="text-primary"/> : <X size={16} />} 
                      Module IA
                  </li>
                  <li className={`flex items-center gap-3 ${plan.modules.stock ? '' : 'opacity-50 line-through'}`}>
                      {plan.modules.stock ? <Check size={16} className="text-primary"/> : <X size={16} />} 
                      Stock Avancé
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-xl text-white">
              <Store size={20} />
            </div>
            <span className="text-lg font-black tracking-tighter italic">Atlas<span className="text-primary">PRO</span></span>
          </div>
          <p className="text-gray-500 text-sm font-bold">© 2024 AtlasPOS SaaS. Fait avec ❤️ au Maroc.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
