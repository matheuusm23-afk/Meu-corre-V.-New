import React, { useState, useMemo, useRef } from 'react';
import { Card } from './ui/Card';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, isSameMonth, getISODate, getWeekNumber, getStartOfWeek } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Edit2, Calendar, ChevronLeft } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

type DetailView = 'none' | 'today' | 'week' | 'month';

const DELIVERY_APPS = ['iFood', '99', 'Rappi', 'Lalamove', 'Uber'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
  const [detailView, setDetailView] = useState<DetailView>('none');
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  // Modal State for Add/Edit
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(getISODate(new Date()));
  
  // Control visibility of manual description input
  const [customInputVisible, setCustomInputVisible] = useState(false);

  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const today = new Date();

  // Calculations
  const stats = useMemo(() => {
    const calc = (filterFn: (t: Transaction) => boolean) => {
      const filtered = transactions.filter(filterFn);
      const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return { income, expense, balance: income - expense, list: filtered };
    };

    return {
      today: calc(t => isSameDay(new Date(t.date), today)),
      week: calc(t => isSameWeek(new Date(t.date), today)),
      month: calc(t => isSameMonth(new Date(t.date), today)),
    };
  }, [transactions]);

  // Weekly Chart Data Calculation
  const weeklyChartData = useMemo(() => {
    const startOfWeek = getStartOfWeek(new Date());
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      const dayTransactions = transactions.filter(t => isSameDay(new Date(t.date), currentDay));
      const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const balance = income - expense;

      days.push({
        date: currentDay,
        dayName: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(currentDay).slice(0, 3),
        balance,
        isToday: isSameDay(currentDay, today)
      });
    }
    
    const maxVal = Math.max(...days.map(d => Math.abs(d.balance)));
    return { days, maxVal: maxVal === 0 ? 1 : maxVal }; // Prevent division by zero
  }, [transactions]);

  const handleOpenForm = (type: TransactionType, transactionToEdit?: Transaction) => {
    if (transactionToEdit) {
      setFormType(transactionToEdit.type);
      setFormAmount(transactionToEdit.amount.toString());
      setFormDesc(transactionToEdit.description);
      setFormDate(transactionToEdit.date.split('T')[0]);
      setIsEditingId(transactionToEdit.id);
      
      // Determine if we should show the text input
      if (transactionToEdit.type === 'expense') {
        setCustomInputVisible(true);
      } else {
        // Income: Show input only if description is NOT one of the preset apps
        setCustomInputVisible(!DELIVERY_APPS.includes(transactionToEdit.description));
      }
    } else {
      setFormType(type);
      setFormAmount('');
      setFormDesc('');
      setFormDate(getISODate(new Date()));
      setIsEditingId(null);
      
      // Default: Hide input for Income (force button selection), Show for Expense
      setCustomInputVisible(type === 'expense');
    }
    setShowForm(true);
  };

  const handleQuickAction = (appName: string) => {
    setFormDesc(appName);
    setCustomInputVisible(false);
  };

  const handleManualAction = () => {
    setFormDesc('');
    setCustomInputVisible(true);
    // Focus logic
    setTimeout(() => {
      descriptionInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDesc) return;

    const transactionData: Transaction = {
      id: isEditingId || uuidv4(),
      amount: parseFloat(formAmount),
      description: formDesc,
      type: formType,
      date: new Date(formDate + 'T12:00:00').toISOString(),
    };

    if (isEditingId) {
      onUpdateTransaction(transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    setShowForm(false);
  };

  // --- Sub-Views ---

  const renderTransactionList = (
    title: string, 
    list: Transaction[], 
    allowEdit: boolean, 
    groupedByWeek: boolean = false
  ) => {
    // Sort by date desc
    const sortedList = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let content;

    if (groupedByWeek) {
      // Group logic for Month view
      const weeks: Record<string, Transaction[]> = {};
      sortedList.forEach(t => {
        const weekNum = getWeekNumber(new Date(t.date));
        const key = `Semana ${weekNum}`;
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(t);
      });

      const currentWeekNum = getWeekNumber(today);

      content = Object.entries(weeks).map(([weekName, weekTransactions]) => {
        const weekNum = parseInt(weekName.replace('Semana ', ''));
        const isCurrentWeek = weekNum === currentWeekNum;
        // Prompt restriction: Can only edit PAST weeks in month view. Current week edited in Week view.
        const canEditThisGroup = !isCurrentWeek; 

        return (
          <div key={weekName} className="mb-6">
            <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 sticky top-0 bg-slate-950 py-2">
              {weekName} {isCurrentWeek && <span className="text-amber-500">(Atual)</span>}
            </h3>
            <div className="space-y-3">
              {weekTransactions.map(t => (
                <TransactionItem 
                  key={t.id} 
                  t={t} 
                  canEdit={canEditThisGroup} 
                  onEdit={() => handleOpenForm(t.type, t)}
                  onDelete={() => onDeleteTransaction(t.id)}
                />
              ))}
            </div>
          </div>
        );
      });
    } else {
      // Standard list
      content = (
        <div className="space-y-3">
          {sortedList.length === 0 ? (
            <div className="text-slate-500 text-center py-10">Nenhuma movimentação.</div>
          ) : (
            sortedList.map(t => (
              <TransactionItem 
                key={t.id} 
                t={t} 
                canEdit={allowEdit} 
                onEdit={() => handleOpenForm(t.type, t)}
                onDelete={() => onDeleteTransaction(t.id)}
              />
            ))
          )}
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={() => setDetailView('none')} className="p-2 bg-slate-800 rounded-full text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           {content}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="flex flex-col gap-4 pb-24">
      <header className="pt-8 pb-2 px-2">
        <h1 className="text-2xl font-bold text-slate-100">Meu Corre 🏍️</h1>
        <p className="text-slate-400 text-sm">Controle suas entregas</p>
      </header>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 gap-4 px-1 mb-2">
        <button 
          onClick={() => handleOpenForm('income')}
          className="bg-emerald-600 active:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-900/20 transition-transform active:scale-95"
        >
          <div className="p-2 bg-emerald-500/30 rounded-full mb-1">
            <Plus size={24} />
          </div>
          Receita
        </button>
        <button 
          onClick={() => handleOpenForm('expense')}
          className="bg-rose-600 active:bg-rose-700 text-white py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-900/20 transition-transform active:scale-95"
        >
          <div className="p-2 bg-rose-500/30 rounded-full mb-1">
            <TrendingDown size={24} />
          </div>
          Despesa
        </button>
      </div>

      {/* Modern Weekly Chart - Floating Design */}
      <div className="mt-4 mb-6 px-2">
        <div className="flex justify-between items-end mb-2">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Resumo da Semana</h3>
        </div>
        
        <div className="flex justify-between items-end h-40 gap-2 sm:gap-3">
          {weeklyChartData.days.map((day, index) => {
            const percentage = Math.min(100, (Math.abs(day.balance) / weeklyChartData.maxVal) * 100);
            const isPositive = day.balance >= 0;
            const isZero = day.balance === 0;
            
            // Dynamic Styles based on value
            const gradient = isZero 
              ? 'bg-slate-800' 
              : isPositive 
                ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
                : 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.3)]';
            
            const textColor = isZero ? 'text-slate-600' : isPositive ? 'text-emerald-400' : 'text-rose-400';

            return (
              <div key={index} className="group flex flex-col items-center justify-end flex-1 h-full relative cursor-default">
                
                {/* Floating Value Label (Animated) */}
                <div className={`
                  absolute -top-6 text-[10px] font-bold transition-all duration-300 
                  opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
                  ${textColor}
                `}>
                  {isZero ? '' : Math.round(day.balance)}
                </div>
                
                {/* The Bar */}
                <div 
                  className={`
                    w-full rounded-2xl transition-all duration-500 ease-out relative
                    group-hover:scale-110 group-hover:brightness-110
                    ${gradient}
                  `}
                  style={{ height: isZero ? '4px' : `${percentage}%` }}
                ></div>

                {/* Day Label */}
                <div className={`mt-3 text-[10px] sm:text-xs font-medium uppercase transition-colors ${day.isToday ? 'text-amber-400 font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {day.dayName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <Card 
        title="Saldo do Dia" 
        value={formatCurrency(stats.today.balance)} 
        subtitle={`${stats.today.list.length} transações hoje`}
        icon={<Wallet className="text-emerald-400" />}
        onClick={() => setDetailView('today')}
        className="border-l-4 border-l-emerald-500"
      />

      <Card 
        title="Saldo da Semana" 
        value={formatCurrency(stats.week.balance)}
        subtitle="Toque para ver detalhes semanais"
        icon={<Calendar className="text-blue-400" />}
        onClick={() => setDetailView('week')}
        className="border-l-4 border-l-blue-500"
      />

      <Card 
        title="Saldo do Mês" 
        value={formatCurrency(stats.month.balance)}
        subtitle="Histórico mensal por semanas"
        icon={<TrendingUp className="text-amber-400" />}
        onClick={() => setDetailView('month')}
        className="border-l-4 border-l-amber-500"
      />

      {/* Detail Views (Modals) */}
      {detailView === 'today' && renderTransactionList('Movimentações de Hoje', stats.today.list, true)}
      {detailView === 'week' && renderTransactionList('Movimentações da Semana', stats.week.list, true)}
      {detailView === 'month' && renderTransactionList('Histórico Mensal', stats.month.list, false, true)}

      {/* Add/Edit Form Modal - Centered & Adjusted */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowForm(false)}
          />
          
          {/* Modal Content - Centered */}
          <div className="relative bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 z-10 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {isEditingId ? 'Editar' : 'Nova'} {formType === 'income' ? 'Receita' : 'Despesa'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Value Input */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">Valor</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-3xl p-4 rounded-xl focus:border-amber-500 focus:outline-none placeholder:text-slate-700 font-bold"
                  inputMode="decimal"
                />
              </div>
              
              {/* Date Input */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">Data</label>
                <input 
                  type="date" 
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none appearance-none"
                />
              </div>

              {/* Quick Actions for Income */}
              {formType === 'income' && (
                <div className="py-1">
                  <label className="block text-xs text-slate-400 mb-2 uppercase font-bold">App / Origem</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DELIVERY_APPS.map(app => {
                      const isActive = !customInputVisible && formDesc === app;
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => handleQuickAction(app)}
                          className={`py-2.5 px-1 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                            isActive
                              ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg shadow-amber-500/20' 
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {app}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleManualAction}
                      className={`py-2.5 px-1 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                         customInputVisible
                            ? 'bg-slate-700 text-white border-slate-600 ring-2 ring-slate-600' 
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      Outro
                    </button>
                  </div>
                </div>
              )}

              {/* Description Input (Manual/Confirmation) - Hidden by default for Income */}
              {customInputVisible && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">
                    Descrição
                  </label>
                  <input 
                    ref={descriptionInputRef}
                    type="text" 
                    required={customInputVisible}
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Ex: Gasolina, Gorjeta..."
                    className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none transition-all"
                  />
                </div>
              )}

              <button 
                type="submit"
                className={`w-full py-4 rounded-xl font-bold text-lg mt-2 transition-transform active:scale-95 shadow-lg ${
                  formType === 'income' 
                    ? 'bg-emerald-600 text-white shadow-emerald-900/30 hover:bg-emerald-500' 
                    : 'bg-rose-600 text-white shadow-rose-900/30 hover:bg-rose-500'
                }`}
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TransactionItemProps {
  t: Transaction;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ t, canEdit, onEdit, onDelete }) => (
  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
    <div className="flex gap-3 items-center">
      <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div>
        <div className="font-semibold text-slate-200">{t.description}</div>
        <div className="text-xs text-slate-500">{formatDate(t.date)}</div>
      </div>
    </div>
    <div className="text-right">
      <div className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
      </div>
      {canEdit && (
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onEdit} className="text-slate-600 hover:text-amber-500 p-1"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="text-slate-600 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  </div>
);