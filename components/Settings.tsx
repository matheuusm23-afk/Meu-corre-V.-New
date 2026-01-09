
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Trash2, Calendar, Edit2, Lock, X, Users, Activity, BarChart3, Smartphone, ChevronRight, CreditCard as CardIcon, Plus, CheckCircle2 } from './Icons';
import { GoalSettings, Transaction, CreditCard } from '../types';
import { getISODate, formatCurrency } from '../utils';
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

const CARD_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a'];

export const Settings: React.FC<SettingsProps> = ({ 
  onClearData, goalSettings, onUpdateSettings, currentTheme, onToggleTheme, transactions, creditCards, onAddCard, onDeleteCard
}) => {
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [hasLimitOption, setHasLimitOption] = useState(true);

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;
    if (hasLimitOption && !cardLimit) return;
    
    onAddCard({
      id: uuidv4(),
      name: cardName,
      color: cardColor,
      limit: hasLimitOption ? parseFloat(cardLimit) : 0
    });
    
    setCardName('');
    setCardLimit('');
    setHasLimitOption(true);
    setShowCardForm(false);
  };

  const handleEndDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onUpdateSettings({ ...goalSettings, endDayOfMonth: value === 'auto' ? undefined : parseInt(value) });
  };

  const currentStartDay = goalSettings.startDayOfMonth || 1;
  const isManualMode = goalSettings.endDayOfMonth !== undefined;
  const displayManualStartDay = isManualMode ? (goalSettings.endDayOfMonth! >= 31 ? 1 : goalSettings.endDayOfMonth! + 1) : null;

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações ⚙️</h1>
      </header>

      <Card title="Aparência" icon={<Edit2 className="text-blue-500" />}>
        <div className="flex items-center justify-between mt-2">
          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Modo Escuro</span>
          <button onClick={onToggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${currentTheme === 'dark' ? 'bg-amber-500' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transition-transform ${currentTheme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      <Card title="Meus Cartões" icon={<CardIcon className="text-purple-500" />}>
        <div className="mt-2 space-y-3">
          {creditCards.map(card => (
            <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{card.name}</span>
                  <span className="text-[10px] text-slate-400 uppercase">Limite: {card.limit > 0 ? formatCurrency(card.limit) : 'Ilimitado/Pré-pago'}</span>
                </div>
              </div>
              <button onClick={() => onDeleteCard(card.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          {showCardForm ? (
            <form onSubmit={handleAddCardSubmit} className="mt-4 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-3">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome do Cartão"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-sm"
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

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase">Cartão com Limite?</span>
                    <button 
                      type="button"
                      onClick={() => setHasLimitOption(!hasLimitOption)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${hasLimitOption ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${hasLimitOption ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {hasLimitOption && (
                    <div className="relative animate-in fade-in zoom-in-95">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                      <input 
                        type="number"
                        placeholder="0,00"
                        value={cardLimit}
                        onChange={e => setCardLimit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 p-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-purple-500/20">Salvar Cartão</button>
                  <button type="button" onClick={() => setShowCardForm(false)} className="px-4 py-2.5 text-slate-400 text-xs font-bold">Cancelar</button>
                </div>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowCardForm(true)}
              className="w-full py-2.5 mt-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
            >
              <Plus size={14} />
              Adicionar Novo Cartão
            </button>
          )}
        </div>
      </Card>

      <Card title="Ciclo Financeiro" icon={<Calendar className="text-amber-500" />}>
        <div className="mt-2 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Dia de Fechamento</label>
            <select 
              value={goalSettings.endDayOfMonth === undefined ? 'auto' : goalSettings.endDayOfMonth} 
              onChange={handleEndDayChange}
              className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white"
            >
              <option value="auto">Automático (Dia Anterior ao Início)</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
             <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Início do Próximo Ciclo</div>
             <div className="text-lg font-bold text-slate-900 dark:text-white">Dia {displayManualStartDay || goalSettings.startDayOfMonth}</div>
          </div>
        </div>
      </Card>

      <Card title="Dados e Backup">
        <button 
          onClick={onClearData}
          className="w-full py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Trash2 size={18} />
          Apagar Todos os Dados
        </button>
      </Card>
    </div>
  );
};
