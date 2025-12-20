
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Trash2, Calendar, Edit2, Lock, X, Users, Activity, BarChart3, Smartphone, ChevronRight, CreditCard as CardIcon, Plus } from './Icons';
import { GoalSettings, Transaction, CreditCard } from '../types';
import { getISODate } from '../utils';
import { v4 as uuidv4 } from 'uuid';

interface SettingsProps {
  onClearData: () => void;
  goalSettings: GoalSettings;
  onUpdateSettings: (s: GoalSettings) => void;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  transactions: Transaction[];
  creditCards: CreditCard[];
  onAddCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
}

const CARD_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#0f172a', // slate-900
];

export const Settings: React.FC<SettingsProps> = ({ 
  onClearData, 
  goalSettings, 
  onUpdateSettings,
  currentTheme,
  onToggleTheme,
  transactions,
  creditCards,
  onAddCard,
  onDeleteCard
}) => {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [showDevDashboard, setShowDevDashboard] = useState(false);
  const [devUser, setDevUser] = useState('');
  const [devPass, setDevPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Credit Card Form State
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);

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

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;
    onAddCard({
      id: uuidv4(),
      name: cardName,
      color: cardColor
    });
    setCardName('');
    setShowCardForm(false);
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

  // Real Analytics Data
  const appVisits = typeof window !== 'undefined' ? (localStorage.getItem('app_visits') || '1') : '1';
  const totalRecords = transactions.length;

  // Calculate chart data from transactions (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getISODate(d);
      
      const count = transactions.filter(t => t.date.startsWith(dateStr)).length;
      
      data.push({
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(d).toUpperCase(),
        value: count
      });
    }
    return data;
  }, [transactions]);

  const maxChartValue = Math.max(...chartData.map(d => d.value), 5); 

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
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

      <Card title="Meus Cartões" icon={<CardIcon className="text-purple-500" />}>
        <div className="mt-2 space-y-3">
          {creditCards.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhum cartão cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {creditCards.map(card => (
                <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{card.name}</span>
                  </div>
                  <button 
                    onClick={() => onDeleteCard(card.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {showCardForm ? (
            <form onSubmit={handleAddCardSubmit} className="mt-4 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-in slide-in-from-top-2">
              <div className="space-y-3">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome do Cartão (ex: Nubank)"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:outline-none dark:text-white text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCardColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${cardColor === color ? 'scale-110 border-slate-400 dark:border-white shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-xl font-bold text-xs shadow-lg shadow-purple-500/20">Salvar</button>
                  <button type="button" onClick={() => setShowCardForm(false)} className="px-4 py-2 text-slate-400 text-xs font-bold">Cancelar</button>
                </div>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowCardForm(true)}
              className="w-full py-2.5 mt-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus size={14} />
              Adicionar Novo Cartão
            </button>
          )}
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
          <p>Versão 1.4.0</p>
          <p>Feito para ajudar no corre do dia a dia.</p>
        </div>
      </Card>

      {showDevLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div 
             className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"
             onClick={() => setShowDevLogin(false)}
           />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
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

      {showDevDashboard && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-emerald-400" />
              Dev Analytics (Real)
            </h2>
            <button 
              onClick={() => setShowDevDashboard(false)}
              className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Users size={64} className="text-blue-500" />
                   </div>
                   <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Acessos Totais</div>
                   <div className="text-3xl font-bold text-white">{appVisits}</div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
