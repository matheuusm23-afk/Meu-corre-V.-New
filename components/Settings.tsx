
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Trash2, Calendar, Edit2, Lock, X, Users, Activity, BarChart3, Smartphone, ChevronRight, CreditCard as CardIcon, Plus, CheckCircle2, Clock } from './Icons';
import { GoalSettings, Transaction, CreditCard } from '../types';
import { getISODate, formatCurrency, getBillingPeriodRange } from '../utils';
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
  onUpdateCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
}

const CARD_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a'];

export const Settings: React.FC<SettingsProps> = ({ 
  onClearData, goalSettings, onUpdateSettings, currentTheme, onToggleTheme, transactions, creditCards, onAddCard, onUpdateCard, onDeleteCard
}) => {
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [hasLimitOption, setHasLimitOption] = useState(true);

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;
    if (hasLimitOption && !cardLimit) return;
    
    const cardData: CreditCard = {
      id: editingCardId || uuidv4(),
      name: cardName,
      color: cardColor,
      limit: hasLimitOption ? parseFloat(cardLimit) : 0
    };

    if (editingCardId) {
      onUpdateCard(cardData);
    } else {
      onAddCard(cardData);
    }
    
    resetCardForm();
  };

  const resetCardForm = () => {
    setCardName('');
    setCardLimit('');
    setHasLimitOption(true);
    setEditingCardId(null);
    setShowCardForm(false);
  };

  const handleEditCard = (card: CreditCard) => {
    setCardName(card.name);
    setCardLimit(card.limit > 0 ? card.limit.toString() : '');
    setCardColor(card.color);
    setHasLimitOption(card.limit > 0);
    setEditingCardId(card.id);
    setShowCardForm(true);
  };

  const handleStartDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateSettings({ ...goalSettings, startDayOfMonth: parseInt(e.target.value) });
  };

  const handleEndDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onUpdateSettings({ ...goalSettings, endDayOfMonth: value === 'auto' ? undefined : parseInt(value) });
  };

  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(new Date(), goalSettings.startDayOfMonth, goalSettings.endDayOfMonth),
    [goalSettings.startDayOfMonth, goalSettings.endDayOfMonth]
  );

  const cycleDuration = useMemo(() => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    // Removido o "+ 1" porque endDate já termina em 23:59:59.999
    // Math.ceil sobre 30.999 dias já resulta em 31.
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-5 pb-32 pt-4 px-2">
      <header className="px-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ajustes ⚙️</h1>
      </header>

      <Card title="Aparência" icon={<Edit2 size={16} className="text-blue-500" />} className="p-5">
        <div className="flex items-center justify-between mt-1">
          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Modo Escuro</span>
          <button onClick={onToggleTheme} className={`relative w-11 h-5.5 rounded-full transition-colors ${currentTheme === 'dark' ? 'bg-amber-500' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full shadow-md transition-transform ${currentTheme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      <Card title="Ciclo de Trabalho" icon={<Calendar size={16} className="text-amber-500" />} className="p-5">
        <div className="mt-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Início
              </label>
              <select 
                value={goalSettings.startDayOfMonth} 
                onChange={handleStartDayChange}
                className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-xs font-bold"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Dia {d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Término
              </label>
              <select 
                value={goalSettings.endDayOfMonth === undefined ? 'auto' : goalSettings.endDayOfMonth} 
                onChange={handleEndDayChange}
                className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-xs font-bold"
              >
                <option value="auto">Automático</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Dia {d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Duração</p>
                <p className="text-base font-extrabold text-amber-900 dark:text-amber-300">{cycleDuration} Dias</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-400 uppercase">Período Atual</p>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                {startDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})} - {endDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Meus Cartões" icon={<CardIcon size={16} className="text-purple-500" />} className="p-5">
        <div className="mt-1 space-y-2.5">
          {creditCards.map(card => (
            <div key={card.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{card.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase">{card.limit > 0 ? formatCurrency(card.limit) : 'S/ Limite'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleEditCard(card)}
                  className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDeleteCard(card.id)} 
                  className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          
          {showCardForm ? (
            <form onSubmit={handleAddCardSubmit} className="mt-3 p-3.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5 animate-in slide-in-from-top-2">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">
                  {editingCardId ? 'Editar' : 'Novo'} Cartão
                </h4>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome do Cartão"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-xs"
                />
                
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCardColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${cardColor === color ? 'scale-110 border-slate-400 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Possui Limite?</span>
                    <button 
                      type="button"
                      onClick={() => setHasLimitOption(!hasLimitOption)}
                      className={`relative w-9 h-4.5 rounded-full transition-colors ${hasLimitOption ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${hasLimitOption ? 'translate-x-4.5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {hasLimitOption && (
                    <div className="relative animate-in fade-in">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input 
                        type="number"
                        placeholder="0,00"
                        value={cardLimit}
                        onChange={e => setCardLimit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 p-2.5 pl-8 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-bold text-[10px] shadow-lg">
                    {editingCardId ? 'Salvar' : 'Adicionar'}
                  </button>
                  <button type="button" onClick={resetCardForm} className="px-3 text-slate-400 text-[10px] font-bold">Cancelar</button>
                </div>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setShowCardForm(true)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold transition-all"
            >
              <Plus size={12} />
              Adicionar Cartão
            </button>
          )}
        </div>
      </Card>

      <Card title="Sistema" className="p-5">
        <button 
          onClick={onClearData}
          className="w-full py-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all"
        >
          <Trash2 size={16} />
          Zerar Aplicativo
        </button>
      </Card>
    </div>
  );
};
