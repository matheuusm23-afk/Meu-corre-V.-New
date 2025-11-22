import React, { useState, useMemo, useRef } from 'react';
import { Card } from './ui/Card';
import { Transaction, TransactionType, ViewMode } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, isDateInBillingPeriod, getBillingPeriodRange, getISODate, getStartOfWeek } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Edit2, Calendar, Fuel } from './Icons';
import { Logo } from './ui/Logo';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  transactions: Transaction[];
  startDayOfMonth: number;
  endDayOfMonth?: number;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onChangeView: (view: ViewMode) => void;
}

type DetailView = 'none' | 'today' | 'week' | 'month';

const DELIVERY_APPS = ['iFood', '99', 'Rappi', 'Lalamove', 'Uber'];
const EXPENSE_CATEGORIES = ['Combustível', 'Manutenção', 'Alimentação', 'Aluguel', 'Financiamento', 'Internet'];

const TransactionItem: React.FC<{
  t: Transaction;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ t, canEdit, onEdit, onDelete }) => {
  const isIncome = t.type === 'income';
  
  return (
    <div 
      onClick={() => canEdit && onEdit()}
      className={`group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${canEdit ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isIncome 
            ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
        }`}>
          {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.description}</p>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
             {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(t.date))}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`font-bold text-sm whitespace-nowrap ${
          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
        }`}>
          {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
        </span>
        
        {canEdit && (
          <div className="flex items-center -mr-2">
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit(); }}
               className="p-2 text-slate-300 hover:text-amber-500 transition-colors"
             >
               <Edit2 size={16} />
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
             >
               <Trash2 size={16} />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  startDayOfMonth = 1,
  endDayOfMonth,
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  onChangeView
}) => {
  const [detailView, setDetailView] = useState<DetailView>('none');
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(getISODate(new Date()));
  
  const [customInputVisible, setCustomInputVisible] = useState(false);

  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const today = new Date();

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
      month: calc(t => isDateInBillingPeriod(new Date(t.date), today, startDayOfMonth, endDayOfMonth)),
    };
  }, [transactions, startDayOfMonth, endDayOfMonth]);

  const fuelExpensesMonth = useMemo(() => {
    return stats.month.list
      .filter(t => t.type === 'expense' && t.description === 'Combustível')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [stats.month.list]);

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
    return { days, maxVal: maxVal === 0 ? 1 : maxVal };
  }, [transactions]);

  const billingPeriodLabel = useMemo(() => {
    const { startDate, endDate } = getBillingPeriodRange(today, startDayOfMonth, endDayOfMonth);
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDayOfMonth, endDayOfMonth]);

  const handleOpenForm = (type: TransactionType, transactionToEdit?: Transaction) => {
    setIsFabOpen(false);
    if (transactionToEdit) {
      setFormType(transactionToEdit.type);
      setFormAmount(transactionToEdit.amount.toString());
      setFormDesc(transactionToEdit.description);
      setFormDate(transactionToEdit.date.split('T')[0]);
      setIsEditingId(transactionToEdit.id);
      
      if (transactionToEdit.type === 'expense') {
        setCustomInputVisible(!EXPENSE_CATEGORIES.includes(transactionToEdit.description));
      } else {
        setCustomInputVisible(!DELIVERY_APPS.includes(transactionToEdit.description));
      }
    } else {
      setFormType(type);
      setFormAmount('');
      setFormDesc('');
      setFormDate(getISODate(new Date()));
      setIsEditingId(null);
      setCustomInputVisible(false);
    }
    setShowForm(true);
  };

  const handleQuickAction = (desc: string) => {
    setFormDesc(desc);
    setCustomInputVisible(false);
  };

  const handleManualAction = () => {
    setFormDesc('');
    setCustomInputVisible(true);
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

  const renderTransactionList = (
    title: string, 
    list: Transaction[], 
    allowEdit: boolean, 
    groupedByWeek: boolean = false
  ) => {
    const sortedList = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let content;

    if (groupedByWeek) {
      const weeks: Record<string, Transaction[]> = {};
      sortedList.forEach(t => {
        const date = new Date(t.date);
        const startOfWeek = getStartOfWeek(date);
        const key = getISODate(startOfWeek); 
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(t);
      });

      const sortedKeys = Object.keys(weeks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const currentWeekStart = getStartOfWeek(today);
      const currentWeekKey = getISODate(currentWeekStart);

      content = sortedKeys.map((weekStartStr) => {
        const transactions = weeks[weekStartStr];
        const isCurrentWeek = weekStartStr === currentWeekKey;
        const start = new Date(weekStartStr + 'T12:00:00'); 
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const label = `${formatDate(start)} até ${formatDate(end)}`;
        const canEditThisGroup = allowEdit;

        return (
          <div key={weekStartStr} className="mb-8">
            <h3 className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold mb-4 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm py-3 flex justify-between items-center z-10 tracking-wider">
              <span>{label}</span>
              {isCurrentWeek && <span className="text-amber-600 dark:text-amber-400 font-bold text-[9px] bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">ATUAL</span>}
            </h3>
            <div className="space-y-3">
              {transactions.map(t => (
                <TransactionItem 
                  key={t.id} 
                  t={t} 
                  canEdit={canEditThisGroup} 
                  onEdit={() => handleOpenForm(t.type, t)}
                  onDelete={() => {
                    if (window.confirm('Apagar essa movimentação?')) {
                      onDeleteTransaction(t.id);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );
      });
    } else {
      content = (
        <div className="space-y-3">
          {sortedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
                 <Wallet className="opacity-50" size={32} />
              </div>
              <p className="font-medium">Nenhuma movimentação.</p>
            </div>
          ) : (
            sortedList.map(t => (
              <TransactionItem 
                key={t.id} 
                t={t} 
                canEdit={allowEdit} 
                onEdit={() => handleOpenForm(t.type, t)}
                onDelete={() => {
                  if (window.confirm('Apagar essa movimentação?')) {
                    onDeleteTransaction(t.id);
                  }
                }}
              />
            ))
          )}
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
          <button onClick={() => setDetailView('none')} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-32">
           {content}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-32">
      <header className="pt-8 pb-2 px-2 flex items-center justify-between">
        <Logo />
        <div className="text-right">
           <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">Hoje</p>
           <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">{formatDate(today)}</p>
        </div>
      </header>

      <div className="px-2 mb-12 relative z-0">
        <div className="flex justify-between items-end mb-8">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={14} />
            Resumo da Semana
          </h3>
        </div>
        
        {/* Minimalist Weekly Chart */}
        <div className="flex justify-between items-end h-32 px-2">
          {weeklyChartData.days.map((day, i) => {
            const heightPercent = Math.max(15, Math.min(100, (Math.abs(day.balance) / weeklyChartData.maxVal) * 100));
            const isPositive = day.balance >= 0;
            
            return (
              <div key={i} className="flex flex-col items-center gap-3 group w-full">
                 {/* Bar */}
                <div className="relative w-full flex justify-center h-full items-end">
                   <div 
                      style={{ height: `${heightPercent}%` }}
                      className={`w-2.5 sm:w-4 rounded-full transition-all duration-500 relative ${
                        day.isToday 
                          ? (isPositive ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]')
                          : (isPositive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-800')
                      } group-hover:scale-110`}
                   >
                    {/* Tooltip-ish value on hover */}
                    {day.balance !== 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
                        {formatCurrency(day.balance)}
                      </div>
                    )}
                   </div>
                </div>
                {/* Day Label */}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${day.isToday ? 'text-amber-500' : 'text-slate-400'}`}>
                  {day.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Card
        title="Saldo Atual"
        subtitle={billingPeriodLabel}
        onClick={() => setDetailView('month')}
        value={formatCurrency(stats.month.balance)}
        variant={stats.month.balance >= 0 ? 'default' : 'default'}
        className={`border-l-[6px] ${stats.month.balance >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
        valueClassName={`text-3xl mb-1 ${stats.month.balance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}
      >
         <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
               {stats.month.list.length} lançamentos
            </span>
         </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card 
          title="Receita" 
          value={formatCurrency(stats.month.income)} 
          icon={<TrendingUp size={18} className="text-emerald-500"/>}
          onClick={() => setDetailView('month')}
          valueClassName="text-emerald-500"
        />
        <Card 
          title="Despesa" 
          value={formatCurrency(stats.month.expense)} 
          icon={<TrendingDown size={18} className="text-rose-500"/>}
          onClick={() => setDetailView('month')}
          valueClassName="text-rose-500"
        />
      </div>
      
      {/* Fuel Card Highlight */}
      <Card 
        title="Gasto com Combustível" 
        value={formatCurrency(fuelExpensesMonth)}
        icon={<Fuel size={18} className="text-amber-500"/>}
        className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30"
        valueClassName="text-amber-600 dark:text-amber-500"
      />

      <div className="grid grid-cols-2 gap-4 mt-2">
         <button 
            onClick={() => setDetailView('today')}
            className="p-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
         >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoje</span>
            <span className={`text-lg font-bold ${stats.today.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
               {formatCurrency(stats.today.balance)}
            </span>
         </button>
         <button 
            onClick={() => setDetailView('week')}
            className="p-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
         >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semana</span>
            <span className={`text-lg font-bold ${stats.week.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
               {formatCurrency(stats.week.balance)}
            </span>
         </button>
      </div>

      {/* Floating Action Button (Main) */}
      <div className="fixed bottom-32 right-6 z-40 flex flex-col items-end gap-4">
        {isFabOpen && (
          <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-4 duration-200">
            <button 
              onClick={() => handleOpenForm('income')}
              className="flex items-center gap-3 pr-2 group"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">Receita</span>
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white">
                <TrendingUp size={20} />
              </div>
            </button>
            <button 
              onClick={() => handleOpenForm('expense')}
              className="flex items-center gap-3 pr-2 group"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">Despesa</span>
              <div className="w-12 h-12 bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/30 flex items-center justify-center text-white">
                <TrendingDown size={20} />
              </div>
            </button>
          </div>
        )}
        
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 bg-slate-900 dark:bg-white rounded-[1.25rem] shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${isFabOpen ? 'rotate-45 bg-slate-800 dark:bg-slate-200' : ''}`}
        >
          <Plus size={32} className={`transition-colors ${isFabOpen ? 'text-white dark:text-slate-900' : 'text-white dark:text-slate-900'}`} strokeWidth={2.5} />
        </button>
      </div>

      {/* Add Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
             
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isEditingId ? 'Editar' : 'Nova'} Movimentação
                </h3>
                <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                  <X size={20} />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Toggle */}
                <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex relative">
                   <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                        formType === 'income' 
                          ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                   >
                      <TrendingUp size={16} />
                      Entrada
                   </button>
                   <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                        formType === 'expense' 
                          ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                   >
                      <TrendingDown size={16} />
                      Saída
                   </button>
                </div>

                <div>
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Valor</label>
                   <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        required
                        value={formAmount}
                        onChange={e => setFormAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-4xl pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold transition-all border border-transparent"
                        inputMode="decimal"
                        autoFocus={!isEditingId}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Descrição</label>
                   
                   {!customInputVisible ? (
                     <div className="grid grid-cols-2 gap-3 mb-3">
                        {(formType === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(app => (
                           <button
                              key={app}
                              type="button"
                              onClick={() => handleQuickAction(app)}
                              className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                                formDesc === app 
                                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                           >
                              {app}
                           </button>
                        ))}
                        <button
                           type="button"
                           onClick={handleManualAction}
                           className="col-span-2 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-dashed border-slate-200 dark:border-slate-700"
                        >
                           Outro...
                        </button>
                     </div>
                   ) : (
                      <div className="relative animate-in fade-in slide-in-from-bottom-2">
                        <input 
                          ref={descriptionInputRef}
                          type="text" 
                          required
                          value={formDesc}
                          onChange={e => setFormDesc(e.target.value)}
                          placeholder="Digite a descrição..."
                          className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium border border-transparent"
                        />
                        <button 
                           type="button"
                           onClick={() => setCustomInputVisible(false)}
                           className="absolute right-2 top-2 p-2 text-slate-400 hover:text-slate-600"
                        >
                           <X size={16} />
                        </button>
                      </div>
                   )}
                </div>
                
                <div>
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Data</label>
                   <input 
                     type="date" 
                     required
                     value={formDate}
                     onChange={e => setFormDate(e.target.value)}
                     className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none appearance-none transition-all font-medium border border-transparent"
                   />
                </div>

                <button 
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 mt-2 text-white ${
                    formType === 'income' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' 
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                  }`}
                >
                  {isEditingId ? 'Salvar Alterações' : 'Confirmar'}
                </button>
             </form>
          </div>
        </div>
      )}

      {detailView !== 'none' && renderTransactionList(
        detailView === 'today' ? 'Transações de Hoje' : detailView === 'week' ? 'Transações da Semana' : 'Extrato Mensal',
        stats[detailView].list,
        true,
        detailView === 'month' // Group by week only for monthly view
      )}
    </div>
  );
};