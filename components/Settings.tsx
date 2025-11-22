
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Trash2, Calendar, Edit2, Lock, X, Users, Activity, BarChart3, Smartphone, ChevronRight } from './Icons';
import { GoalSettings } from '../types';

interface SettingsProps {
  onClearData: () => void;
  goalSettings: GoalSettings;
  onUpdateSettings: (s: GoalSettings) => void;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  onClearData, 
  goalSettings, 
  onUpdateSettings,
  currentTheme,
  onToggleTheme
}) => {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [showDevDashboard, setShowDevDashboard] = useState(false);
  const [devUser, setDevUser] = useState('');
  const [devPass, setDevPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleClear = () => {
    if (window.confirm('Tem certeza? Isso apagará todas as transações e configurações.')) {
      onClearData();
    }
  };

  const handleStartDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const startDay = parseInt(e.target.value);
    onUpdateSettings({
      ...goalSettings,
      startDayOfMonth: startDay
    });
  };

  const handleEndDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'auto') {
      onUpdateSettings({
        ...goalSettings,
        endDayOfMonth: undefined
      });
    } else {
      onUpdateSettings({
        ...goalSettings,
        endDayOfMonth: parseInt(value)
      });
    }
  };

  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (devUser === 'matheuusm23' && devPass === 'm23f07s94') {
      setShowDevLogin(false);
      setShowDevDashboard(true);
      setLoginError('');
      setDevUser('');
      setDevPass('');
    } else {
      setLoginError('Acesso negado. Credenciais inválidas.');
    }
  };

  const currentStartDay = goalSettings.startDayOfMonth || 1;
  const isManualMode = goalSettings.endDayOfMonth !== undefined;
  
  const currentEndDayValue = goalSettings.endDayOfMonth === undefined ? 'auto' : goalSettings.endDayOfMonth.toString();
  const manualStartDay = isManualMode ? (goalSettings.endDayOfMonth! + 1) : null;
  const displayManualStartDay = manualStartDay && manualStartDay > 31 ? 1 : manualStartDay;

  // Mock data for Dev Dashboard
  const audienceData = [45, 62, 58, 81, 65, 92, 88]; // Last 7 days

  return (
    <div className="flex flex-col gap-6 pb-24 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações ⚙️</h1>
      </header>

      <Card title="Aparência" icon={<Edit2 className="text-blue-500" />}>
        <div className="flex items-center justify-between mt-2">
          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Modo Escuro</span>
          <button 
            onClick={onToggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
              currentTheme === 'dark' ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${
                currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card title="Ciclo Financeiro" icon={<Calendar className="text-amber-500 dark:text-amber-400" />}>
        <div className="mt-2 space-y-4">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">
              Dia de Fechamento do Mês
            </label>
            <div className="relative">
              <select 
                value={currentEndDayValue} 
                onChange={handleEndDayChange}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-3 rounded-xl appearance-none focus:border-amber-500 focus:outline-none transition-colors"
              >
                <option value="auto" className="font-bold text-amber-600 dark:text-amber-500">
                  Automático (Baseado no início)
                </option>
                <option disabled>──────────</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>Dia {day}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                ▼
              </div>
            </div>
          </div>

          {isManualMode ? (
             <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
               <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                 Início do Ciclo (Automático)
               </div>
               <div className="text-slate-900 dark:text-slate-200 font-medium">
                 Dia {displayManualStartDay}
               </div>
               <div className="text-xs text-slate-400 mt-1">
                 O ciclo começa automaticamente no dia seguinte ao fechamento.
               </div>
             </div>
          ) : (
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">Dia de Início</label>
              <div className="relative">
                <select 
                  value={currentStartDay} 
                  onChange={handleStartDayChange}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-3 rounded-xl appearance-none focus:border-amber-500 focus:outline-none transition-colors"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  ▼
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-1 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
            {!isManualMode 
              ? "Modo Automático: Escolha o dia de INÍCIO, e o fechamento será no dia anterior."
              : `Modo Manual: O ciclo fecha dia ${goalSettings.endDayOfMonth} e o novo ciclo começa dia ${displayManualStartDay}. Isso mantém seus meses organizados sequencialmente.`}
          </p>
        </div>
      </Card>

      <Card title="Dados">
        <div className="mt-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            Todos os dados ficam salvos apenas no seu celular (navegador).
          </p>
          <button 
            onClick={handleClear}
            className="w-full py-3 px-4 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-center gap-2 font-semibold active:bg-rose-200 dark:active:bg-rose-900 transition-colors"
          >
            <Trash2 size={18} />
            Limpar Tudo
          </button>
        </div>
      </Card>

      {/* Developer Trigger Card */}
      <Card 
        title="Área do Desenvolvedor" 
        icon={<Lock className="text-slate-400" />}
        onClick={() => setShowDevLogin(true)}
        className="active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acesso restrito para manutenção e análise.
            </p>
            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
        </div>
      </Card>

      <Card title="Sobre">
        <div className="text-slate-500 dark:text-slate-400 text-sm space-y-2">
          <p>Versão 1.3.1</p>
          <p>Feito para ajudar no corre do dia a dia.</p>
        </div>
      </Card>

      {/* Login Modal */}
      {showDevLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div 
             className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"
             onClick={() => setShowDevLogin(false)}
           />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock size={20} className="text-amber-500"/>
                  Acesso Dev
                </h3>
                <button onClick={() => setShowDevLogin(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                  <X size={20} />
                </button>
             </div>

             <form onSubmit={handleDevLogin} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Login</label>
                 <input 
                   type="text" 
                   value={devUser}
                   onChange={(e) => setDevUser(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:outline-none dark:text-white font-medium"
                   placeholder="Usuário"
                   autoCapitalize="none"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Senha</label>
                 <input 
                   type="password" 
                   value={devPass}
                   onChange={(e) => setDevPass(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:outline-none dark:text-white font-medium"
                   placeholder="••••••••"
                 />
               </div>
               
               {loginError && (
                 <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg">{loginError}</p>
               )}

               <button 
                 type="submit"
                 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity"
               >
                 Entrar
               </button>
             </form>
           </div>
        </div>
      )}

      {/* Developer Dashboard Modal */}
      {showDevDashboard && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-emerald-400" />
              Dev Analytics
            </h2>
            <button 
              onClick={() => setShowDevDashboard(false)}
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
             
             {/* Stats Grid */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Users size={64} className="text-blue-500" />
                   </div>
                   <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Acessos Totais</div>
                   <div className="text-3xl font-bold text-white">14.203</div>
                   <div className="text-emerald-500 text-xs font-medium flex items-center gap-1 mt-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     App ativo
                   </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Smartphone size={64} className="text-purple-500" />
                   </div>
                   <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Online Agora</div>
                   <div className="text-3xl font-bold text-white">42</div>
                   <div className="text-purple-400 text-xs font-medium mt-2">
                     Tempo real
                   </div>
                </div>

                <div className="col-span-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-between">
                   <div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Cadastros Realizados</div>
                      <div className="text-3xl font-bold text-white">3.592</div>
                   </div>
                   <div className="bg-slate-800 p-3 rounded-xl text-amber-500">
                      <Users size={24} />
                   </div>
                </div>
             </div>

             {/* Chart */}
             <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                   <BarChart3 className="text-blue-500" size={20} />
                   <h3 className="font-bold text-white">Audiência da Semana</h3>
                </div>
                
                <div className="h-40 flex items-end justify-between gap-2">
                   {audienceData.map((val, idx) => {
                     const height = (val / 100) * 100;
                     return (
                       <div key={idx} className="w-full flex flex-col items-center gap-2 group">
                          <div className="relative w-full bg-slate-800 rounded-t-lg overflow-hidden h-32 flex items-end">
                             <div 
                               style={{ height: `${height}%` }}
                               className="w-full bg-blue-600 group-hover:bg-blue-500 transition-colors"
                             />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">
                             {['D','S','T','Q','Q','S','S'][idx]}
                          </span>
                       </div>
                     )
                   })}
                </div>
                <div className="mt-4 flex justify-between text-xs text-slate-500 font-medium pt-4 border-t border-slate-800">
                   <span>Média diária: 70 acessos</span>
                   <span className="text-emerald-500">+12% vs semana anterior</span>
                </div>
             </div>

             <div className="text-center text-xs text-slate-600 mt-8">
                Painel Administrativo v1.0 • Acesso Seguro
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
