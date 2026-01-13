
// Fix: Use the correct TransactionType and FixedExpense type for balance calculation.
import { GoogleGenAI } from "@google/genai";
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/Card';
import { ExpensePieChart } from './ui/PieChart';
import { Transaction, TransactionType, ViewMode, FixedExpense } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, getBillingPeriodRange, getISODate, formatDateFull, getStartOfWeek, parseDateLocal, getFixedExpensesForPeriod } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Fuel, Utensils, Wrench, Home, AlertCircle, Smartphone, ShoppingBag, PieChart as PieIcon, Edit2, Info, Receipt } from './Icons';
import { Logo } from './ui/Logo';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  startDayOfMonth: number;
  endDayOfMonth?: number;
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onChangeView: (view: ViewMode) => void;
}

const DELIVERY_APPS = ['iFood', '99', 'Rappi', 'Lalamove', 'Uber', 'Loggi', 'Borborema', 'Particular'];
const EXPENSE_CATEGORIES = ['Combustível', 'Manutenção', 'Alimentação', 'Aluguel', 'Financiamento', 'Gastos na Rua', 'Outros'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  fixedExpenses,
  startDayOfMonth,
  endDayOfMonth,
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFabVisible, setIsFabVisible] = useState(true);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getISODate(new Date()));
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsFabVisible(window.scrollY < 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDayOfMonth, endDayOfMonth), 
  [viewDate, startDayOfMonth, endDayOfMonth]);

  const today = new Date();

  const currentPeriodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseDateLocal(t.date);
      return tDate >= startDate && tDate <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate]);

  const relevantFixed = useMemo(() => {
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
  }, [fixedExpenses, startDate, endDate]);

  const balanceComposition = useMemo(() => {
    const manualItems = currentPeriodTransactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      isFixed: false,
      originalTransaction: t
    }));

    const fixedItems = relevantFixed
      .filter(e => e.type === 'income' || (e.type === 'expense' && e.isPaid))
      .map(e => ({
        id: e.id,
        description: e.title,
        amount: e.amount,
        type: e.type,
        date: e.occurrenceDate,
        isFixed: true,
        originalTransaction: null
      }));

    return [...manualItems, ...fixedItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPeriodTransactions, relevantFixed]);

  const chartData = useMemo(() => {
    const data = [];
    const startOfWeek = getStartOfWeek(new Date()); 
    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      const dayStr = getISODate(current);
      const dailyIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(dayStr))
        .reduce((acc, t) => acc + t.amount, 0);
      data.push({
        date: current,
        dayStr,
        income: dailyIncome,
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(current).slice(0, 1).toUpperCase(),
        fullDay: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(current).slice(0, 3)
      });
    }
    return data;
  }, [transactions]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.income));
    return max > 0 ? max : 100; 
  }, [chartData]);

  const todayBalance = useMemo(() => {
    return transactions
      .filter(t => isSameDay(parseDateLocal(t.date), today) && t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, today]);

  const weekBalance = useMemo(() => {
    return transactions
      .filter(t => isSameWeek(parseDateLocal(t.date), today) && t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, today]);

  const monthBalance = useMemo(() => {
    const manualBalance = currentPeriodTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    const fixedIncomes = relevantFixed.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
    const paidFixedExpenses = relevantFixed.filter(e => e.type === 'expense' && e.isPaid).reduce((acc, e) => acc + e.amount, 0);
    return manualBalance + fixedIncomes - paidFixedExpenses;
  }, [currentPeriodTransactions, relevantFixed]);

  const monthGrossIncome = useMemo(() => {
    const manualIncome = currentPeriodTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const fixedIncome = relevantFixed.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
    return manualIncome + fixedIncome;
  }, [currentPeriodTransactions, relevantFixed]);

  const monthTotalExpenses = useMemo(() => {
    const manualExpenses = currentPeriodTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const paidFixedExpenses = relevantFixed.filter(e => e.type === 'expense' && e.isPaid).reduce((acc, e) => acc + e.amount, 0);
    return manualExpenses + paidFixedExpenses;
  }, [currentPeriodTransactions, relevantFixed]);

  const monthFuelTotal = useMemo(() => {
    const manualFuel = currentPeriodTransactions
      .filter(t => t.type === 'expense' && t.description.toLowerCase().includes('combustível'))
      .reduce((acc, t) => acc + t.amount, 0);
      
    const fixedFuel = relevantFixed
      .filter(e => e.type === 'expense' && e.category.toLowerCase().includes('combustível'))
      .reduce((acc, e) => acc + e.amount, 0);
      
    return manualFuel + fixedFuel;
  }, [currentPeriodTransactions, relevantFixed]);

  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const mainMonthLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date((startDate.getTime() + endDate.getTime()) / 2)), [startDate, endDate]);

  const getTransactionIcon = (t: { description: string, type: string, isFixed?: boolean }) => {
    const text = t.description.toLowerCase();
    if (t.type === 'income') return <Smartphone size={18} />;
    if (text.includes('gasolina') || text.includes('posto') || text.includes('combustível')) return <Fuel size={18} />;
    if (t.isFixed) return <Receipt size={18} />;
    return <TrendingDown size={18} />;
  };

  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleOpenForm = (t?: Transaction | null) => {
    if (t) {
      setEditingId(t.id);
      setAmount(t.amount.toString());
      if (t.description.includes(' - ')) {
        const parts = t.description.split(' - ');
        const cat = parts.pop() || '';
        setCategory(cat);
        setDescription(parts.join(' - '));
      } else {
        setDescription(t.description);
        setCategory('');
      }
      setDate(t.date.split('T')[0]);
      setType(t.type);
    } else {
      setEditingId(null);
      setAmount('');
      setDescription('');
      setDate(getISODate(new Date()));
      setType('income');
      setCategory('');
    }
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      onDeleteTransaction(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    const finalDesc = category ? `${description} - ${category}` : description;
    const transactionData: Transaction = {
      id: editingId || uuidv4(),
      amount: parseFloat(amount),
      description: finalDesc,
      date: date, 
      type,
    };
    if (editingId) onUpdateTransaction(transactionData);
    else onAddTransaction(transactionData);
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-5 pb-32 pt-2 px-2">
      <header className="flex items-center justify-between px-2">
        <Logo />
      </header>

      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <button onClick={() => changePeriod(-1)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-sm font-bold capitalize text-slate-900 dark:text-slate-100">{mainMonthLabel}</div>
          <div className="text-[10px] text-slate-500 font-medium">{periodLabel}</div>
        </div>
        <button onClick={() => changePeriod(1)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Saldo do Dia" value={formatCurrency(todayBalance)} />
        <Card title="Saldo da Semana" value={formatCurrency(weekBalance)} icon={<TrendingUp size={16}/>} />
      </div>

      <Card 
        title="Saldo da Conta (Livre)" 
        value={formatCurrency(monthBalance)} 
        variant="primary" 
        valueClassName="text-3xl"
        onClick={() => setShowBalanceDetails(true)}
        icon={<Info size={16} className="text-white/60" />}
      >
        <div className="flex items-center justify-between mt-2">
           <span className="text-[10px] text-blue-100/60 font-medium tracking-tight">Toque para ver o extrato do ciclo</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Combustível (Ciclo)" value={formatCurrency(monthFuelTotal)} icon={<Fuel size={16} className="text-amber-500" />} />
        <Card title="Total Bruto (Ciclo)" value={formatCurrency(monthGrossIncome)} icon={<TrendingUp size={16} className="text-emerald-500" />} />
      </div>

      <div className="mt-2 px-2">
        <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-widest">Ganhos Diários</h2>
        <div className="grid grid-cols-7 gap-2.5 h-44 items-end pb-2 px-1">
            {chartData.map((day) => {
              const height = (day.income / maxChartValue) * 100;
              const isToday = isSameDay(day.date, today);
              return (
                <div key={day.dayStr} className="flex flex-col items-center justify-end h-full w-full gap-2 relative">
                  <div className={`absolute -top-6 text-[10px] font-black transition-all duration-500 ${day.income > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${isToday ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.income > 0 ? Math.round(day.income) : ''}
                  </div>
                  
                  <div className={`w-full bg-slate-100 dark:bg-slate-800/40 rounded-t-xl h-full relative overflow-hidden transition-all duration-300 ${isToday ? 'ring-2 ring-emerald-500/20 ring-offset-2 dark:ring-offset-slate-950' : ''}`}>
                    <div 
                      style={{ height: `${Math.max(height, 0)}%` }} 
                      className={`w-full absolute bottom-0 transition-all duration-1000 ease-out rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.1)] ${
                        isToday 
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' 
                          : 'bg-gradient-to-t from-slate-500 to-slate-300 dark:from-slate-600 dark:to-slate-400'
                      }`} 
                    />
                  </div>
                  
                  <div className={`text-[9px] font-bold uppercase tracking-tight ${isToday ? 'text-emerald-500 scale-110' : 'text-slate-400'}`}>
                    {day.fullDay}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <button 
        onClick={() => handleOpenForm()}
        className={`fixed bottom-32 right-6 z-40 w-11 h-11 bg-slate-900 dark:bg-white rounded-xl shadow-2xl flex items-center justify-center text-white dark:text-slate-900 transition-all ${isFabVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* BALANCE DETAILS MODAL */}
      {showBalanceDetails && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBalanceDetails(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Extrato do Ciclo</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Lançamentos deste período</p>
                </div>
                <button onClick={() => setShowBalanceDetails(false)} className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full text-slate-500 active:scale-90 transition-transform">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Recebido</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(monthGrossIncome)}</span>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-800/50">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Total Gasto</span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-400">{formatCurrency(monthTotalExpenses)}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 pb-8">
                {balanceComposition.length > 0 ? (
                  balanceComposition.map(item => (
                    <div key={item.id + item.date} className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                      item.type === 'income' 
                        ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30' 
                        : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {getTransactionIcon({ description: item.description, type: item.type, isFixed: item.isFixed })}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">{item.description}</p>
                             {item.isFixed && (
                               <span className="text-[7px] font-black bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Fixo</span>
                             )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-black text-sm ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                          {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                        </span>
                        {!item.isFixed && item.originalTransaction && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenForm(item.originalTransaction); }}
                              className="p-1.5 text-slate-300 hover:text-amber-500 rounded-full"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-full"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-sm font-medium">Nenhum lançamento no ciclo.</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto shrink-0">
                 <div className="bg-slate-900 dark:bg-white p-5 rounded-3xl flex justify-between items-center shadow-2xl">
                    <div>
                      <span className="text-[10px] font-black text-white/50 dark:text-slate-400 uppercase tracking-widest">Saldo Livre Hoje</span>
                      <p className="text-[8px] text-white/30 dark:text-slate-300 font-bold uppercase mt-0.5">Disponível para uso</p>
                    </div>
                    <span className="text-2xl font-black text-white dark:text-slate-900">
                       {formatCurrency(monthBalance)}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2rem] p-5 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Editar' : 'Novo'} Lançamento</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={16} /> Ganho</button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}><TrendingDown size={16} /> Despesa</button>
              </div>
              <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" className="w-full bg-slate-50 dark:bg-slate-950 text-2xl p-4 rounded-xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              <div className="flex flex-wrap gap-2">
                {(type === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(tag => (
                  <button key={tag} type="button" onClick={() => setCategory(tag)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${category === tag ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-transparent'}`}>{tag}</button>
                ))}
              </div>
              <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all ${type === 'income' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-600 shadow-rose-500/30'}`}>{editingId ? 'Salvar' : 'Adicionar'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
