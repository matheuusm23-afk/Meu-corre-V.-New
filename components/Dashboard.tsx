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
        
        <div className="flex justify-between items-end h-48 gap-2 sm:gap-3">
          {weeklyChartData.days.map((day, index) => {
            const percentage = Math.min(100, (Math.abs(day.balance) / weeklyChartData.maxVal) * 100);
            const isPositive = day.balance >= 0;
            const isZero = day.balance === 0;
            
            const barGradient = isZero 
              ? 'bg-slate-200 dark:bg-slate-800' 
              : isPositive 
                ? 'bg-gradient-to-t from-emerald-500 to-emerald-300 dark:from-emerald-600 dark:to-emerald-400' 
                : 'bg-gradient-to-t from-rose-500 to-rose-300 dark:from-rose-600 dark:to-rose-400';
            
            const textColor = isZero 
              ? 'text-slate-300 dark:text-slate-600' 
              : isPositive 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400';

            return (
              <div key={index} className="group flex flex-col items-center justify-end flex-1 h-full relative cursor-default">
                <div className={`absolute -top-8 text-[10px] font-bold z-10 transition-all duration-300 ${textColor}`}>
                  {isZero ? '' : Math.round(day.balance)}
                </div>
                <div className="w-full h-full absolute bottom-0 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl -z-10 border border-slate-200/30 dark:border-slate-700/30"></div>
                <div 
                  className={`w-full rounded-2xl transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) relative ${barGradient} ${!isZero ? 'shadow-lg' : ''}`}
                  style={{ 
                    height: isZero ? '4px' : `${percentage}%`,
                    opacity: isZero ? 0.5 : 1 
                  }}
                ></div>
                <div className={`mt-3 text-[10px] sm:text-xs font-bold uppercase transition-colors ${day.isToday ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-600'}`}>
                  {day.dayName}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <Card 
            title="Saldo do Dia" 
            value={formatCurrency(stats.today.balance)} 
            subtitle={`${stats.today.list.length} hoje`}
            icon={<Wallet className="text-emerald-500 dark:text-emerald-400" />}
            variant="default"
            onClick={() => setDetailView('today')}
            valueClassName="text-xl sm:text-2xl"
            className="border-l-[6px] border-l-emerald-500 dark:border-l-emerald-500"
          />
          <Card 
            title="Saldo da Semana" 
            value={formatCurrency(stats.week.balance)}
            subtitle="Ver detalhes"
            icon={<Calendar className="text-blue-500 dark:text-blue-400" />}
            onClick={() => setDetailView('week')}
            valueClassName="text-xl sm:text-2xl"
            className="border-l-[6px] border-l-blue-500 dark:border-l-blue-500"
          />
        </div>
        <Card 
          title="Saldo do Mês" 
          value={formatCurrency(stats.month.balance)}
          subtitle={`Ciclo: ${billingPeriodLabel}`}
          icon={<TrendingUp className="text-amber-500 dark:text-amber-400" />}
          onClick={() => setDetailView('month')}
          className="border-l-[6px] border-l-amber-500 dark:border-l-amber-500"
        />
        <Card 
          title="Combustível"
          value={formatCurrency(Math.abs(fuelExpensesMonth))}
          subtitle="Total no ciclo"
          icon={<Fuel className="text-rose-500 dark:text-rose-400" />}
          className="border-l-[6px] border-l-rose-500 dark:border-l-rose-500"
        />
      </div>

      {detailView === 'today' && renderTransactionList('Movimentações de Hoje', stats.today.list, true)}
      {detailView === 'week' && renderTransactionList('Movimentações da Semana', stats.week.list, true)}
      {detailView === 'month' && renderTransactionList(`Ciclo ${billingPeriodLabel}`, stats.month.list, true, true)}

      {isFabOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      <div className="fixed bottom-32 right-6 z-50 flex flex-col items-end gap-4">
        <div className={`flex items-center gap-4 transition-all duration-300 delay-75 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-4 py-2 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
            Despesa
          </span>
          <button 
            onClick={() => handleOpenForm('expense')}
            className="w-14 h-14 bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center text-white hover:bg-rose-500 active:scale-90 transition-all border-2 border-white/10"
          >
            <TrendingDown size={24} />
          </button>
        </div>
        <div className={`flex items-center gap-4 transition-all duration-300 delay-100 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
          <span className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-4 py-2 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
            Receita
          </span>
          <button 
            onClick={() => handleOpenForm('income')}
            className="w-14 h-14 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center text-white hover:bg-emerald-500 active:scale-90 transition-all border-2 border-white/10"
          >
            <TrendingUp size={24} />
          </button>
        </div>
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-[1.25rem] shadow-2xl shadow-amber-500/30 flex items-center justify-center text-white transition-all duration-300 active:scale-95 border-4 border-slate-50 dark:border-slate-950 ${
            isFabOpen ? 'bg-slate-800 rotate-[135deg]' : 'bg-gradient-to-br from-amber-500 to-amber-600'
          }`}
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {isEditingId ? 'Editar' : 'Nova'} {formType === 'income' ? 'Receita' : 'Despesa'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">Preencha os detalhes abaixo</p>
              </div>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-3 uppercase font-bold tracking-wider">Valor</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl transition-colors group-focus-within:text-amber-500">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-4xl pl-14 pr-6 py-6 rounded-3xl focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-300 font-bold transition-all border border-transparent focus:border-amber-500/20"
                    inputMode="decimal"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-3 uppercase font-bold tracking-wider">Data</label>
                <input 
                  type="date" 
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5 rounded-3xl focus:ring-2 focus:ring-amber-500 focus:outline-none appearance-none transition-all font-medium border border-transparent focus:border-amber-500/20"
                />
              </div>

              <div className="py-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-3 uppercase font-bold tracking-wider">
                   {formType === 'income' ? 'Origem' : 'Categoria'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(formType === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(item => {
                    const isActive = !customInputVisible && formDesc === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleQuickAction(item)}
                        className={`py-3.5 px-2 rounded-2xl text-sm font-semibold transition-all active:scale-95 whitespace-nowrap overflow-hidden text-ellipsis ${
                          isActive
                            ? formType === 'income' 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900'
                              : 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={item}
                      >
                        {item}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleManualAction}
                    className={`py-3.5 px-2 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${
                       customInputVisible
                          ? 'bg-slate-800 text-white shadow-lg ring-2 ring-slate-800 ring-offset-2 dark:ring-offset-slate-900' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Outro
                  </button>
                </div>
              </div>

              {customInputVisible && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <input 
                    ref={descriptionInputRef}
                    type="text" 
                    required={customInputVisible}
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Digite a descrição..."
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5 rounded-3xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all border border-transparent"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {isEditingId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Apagar essa movimentação?')) {
                         onDeleteTransaction(isEditingId);
                         setShowForm(false);
                      }
                    }}
                    className="flex-1 py-5 rounded-3xl font-bold text-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 transition-all active:scale-95 hover:bg-rose-200 dark:hover:bg-rose-900/50"
                  >
                    Excluir
                  </button>
                )}
                <button 
                  type="submit"
                  className={`flex-[2] py-5 rounded-3xl font-bold text-lg transition-all active:scale-95 shadow-xl ${
                    formType === 'income' 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 hover:brightness-110' 
                      : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-rose-500/30 hover:brightness-110'
                  }`}
                >
                  Salvar {formType === 'income' ? 'Receita' : 'Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};