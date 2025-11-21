import React from 'react';
import { Card } from './ui/Card';
import { Trash2, Calendar, Wallet } from './Icons'; // Using Wallet as icon for Appearance just for now, or could import Moon/Sun
import { GoalSettings } from '../types';
import { Edit2 } from 'lucide-react';

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
  const handleClear = () => {
    if (window.confirm('Tem certeza? Isso apagará todas as transações e configurações.')) {
      onClearData();
    }
  };

  const handleStartDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({
      ...goalSettings,
      startDayOfMonth: parseInt(e.target.value)
    });
  };

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
        <div className="mt-2">
          <label className="block text-slate-500 dark:text-slate-400 text-sm mb-2">Dia de início do mês</label>
          <div className="relative">
            <select 
              value={goalSettings.startDayOfMonth || 1} 
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
          <p className="text-xs text-slate-500 mt-2">
            Seu mês fecha automaticamente no dia anterior ao selecionado.
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

      <Card title="Sobre">
        <div className="text-slate-500 dark:text-slate-400 text-sm space-y-2">
          <p>Versão 1.1.0</p>
          <p>Feito para ajudar no corre do dia a dia.</p>
        </div>
      </Card>
    </div>
  );
};