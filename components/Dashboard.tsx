import { GoogleGenAI } from "@google/genai";
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/Card';
import { ExpensePieChart } from './ui/PieChart';
import { Transaction, TransactionType, ViewMode, FixedExpense } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, getBillingPeriodRange, getISODate, getStartOfWeek, parseDateLocal, getFixedExpensesForPeriod } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, Fuel, Utensils, Wrench, Home, AlertCircle, Smartphone, ShoppingBag, PieChart as PieIcon, Edit2, Info, Receipt } from './Icons';
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
const QUICK_AMOUNTS = [2, 5, 10, 20, 50, 100];

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  fixedExpenses,
  startDayOfMonth,
  endDayOfMonth,
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
  // Use today as the reference date and don't allow changing it on Home page
  const viewDate = useMemo(() => new Date(), []);
  
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
      .filter(e => e.type === 'expense' && e.isPaid)
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

  const weekBalance = useMemo(() => {
    return transactions
      .filter(t => isSameWeek(parseDateLocal(t.date), today) && t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, today]);

  const monthBalance = useMemo(() => {
    const manualBalance = currentPeriodTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    const paidFixedExpenses = relevantFixed.filter(e => e.type === 'expense' && e.isPaid).reduce((acc, e) => acc + e.amount, 0);
    return manualBalance - paidFixedExpenses;
  }, [currentPeriodTransactions, relevantFixed]);

  const monthGrossIncome = useMemo(() => {
    return currentPeriodTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  }, [currentPeriodTransactions]);

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

  // Histórico Mensal
  const monthlyGrossTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'income') {
        const date = parseDateLocal(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        totals[monthKey] = (totals[monthKey] || 0) + t.amount;
      }
    });
    
    return Object.entries(totals)
      .sort((a, b) => b[0].localeCompare(a[0])) // Descendente
      .map(([key, value]) => {
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
        return { monthName, value, key };
      });
  }, [transactions]);

  const getTransactionIcon = (t: { description: string, type: string, isFixed?: boolean }) => {
    const text = t.description.toLowerCase();
    if (t.type === 'income') return <Smartphone size={16} />;
    if (text.includes('gasolina') || text.includes('posto') || text.includes('combustível')) return <Fuel size={16} />;
    if (t.isFixed) return <Receipt size={16} />;
    return <TrendingDown size={16} />;
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

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
    if (navigator.vibrate) navigator.vibrate(20);
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
    <div className="flex flex-col gap-3 pb-32">
      {/* FULL WIDTH GREEN HEADER - SQUARE DESIGN */}
      <div className="bg-emerald-600 dark:bg-emerald-700 w-full pt-8 pb-8 px-6 flex flex-col gap-8 shadow-lg">
        <header className="flex items-center justify-between">
          <Logo variant="light" />
          <div className="flex flex-col items-end">
             <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                <Home size={20} />
             </div>
          </div>
        </header>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-emerald-100/70 text-[10px] font-black uppercase tracking-[0.2em]">Faturamento do Mês</span>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-4xl font-black tracking-tighter">{formatCurrency(monthGrossIncome)}</span>
              <div className="bg-emerald-500/30 p-1 rounded-lg ml-2">
                <TrendingUp size={20} className="text-emerald-300" />
              </div>
            </div>
          </div>
          
          {/* INTERACTIVE SALDO LIVRE SECTION - COMPACTED FONT SIZES */}
          <div 
            onClick={() => setShowBalanceDetails(true)}
            className="flex flex-col items-end text-right cursor-pointer group active:scale-95 transition-all"
          >
             <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-full mb-1 group-hover:bg-white/20 transition-colors">
                <span className="text-emerald-50 text-[8px] font-black uppercase tracking-widest leading-none">Saldo Livre</span>
                <Info size={8} className="text-emerald-100" />
             </div>
             <span className="text-white text-xl font-black leading-none drop-shadow-sm">{formatCurrency(monthBalance)}</span>
             <span className="text-emerald-100/50 text-[7px] font-bold uppercase mt-1 tracking-tighter">Ver Extrato 🧾</span>
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3 mt-3">
        {/* Main balance summary cards aligned below the header with a small distance */}
        <div className="grid grid-cols-2 gap-2">
          <Card 
            title="Ganhos da Semana" 
            value={formatCurrency(weekBalance)} 
            icon={<TrendingUp size={14} className="text-emerald-500"/>} 
            valueClassName="text-base" 
            className="shadow-sm"
          />
          <Card 
            title="Combustível (Ciclo)" 
            value={formatCurrency(monthFuelTotal)} 
            icon={<Fuel size={14} className="text-amber-500" />} 
            valueClassName="text-base"
            className="shadow-sm"
          />
        </div>

        {/* Weekly Chart */}
        <div className="mt-4 px-1">
          <h2 className="text-[9px] font-black text-slate-400 dark:text-slate-500 mb-6 uppercase tracking-[0.2em] text-center">Desempenho Semanal</h2>
          <div className="grid grid-cols-7 gap-2 h-36 items-end pb-1 px-1">
              {chartData.map((day) => {
                const height = (day.income / maxChartValue) * 100;
                const isToday = isSameDay(day.date, today);
                return (
                  <div key={day.dayStr} className="flex flex-col items-center justify-end h-full w-full gap-1.5 relative">
                    <div className={`absolute -top-5 text-[9px] font-black transition-all duration-500 ${day.income > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${isToday ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {day.income > 0 ? Math.round(day.income) : ''}
                    </div>
                    
                    <div className={`w-full bg-slate-100 dark:bg-slate-800/40 rounded-t-lg h-full relative overflow-hidden transition-all duration-300 ${isToday ? 'ring-1 ring-emerald-500/20' : ''}`}>
                      <div 
                        style={{ height: `${Math.max(height, 0)}%` }} 
                        className={`w-full absolute bottom-0 transition-all duration-700 ease-out rounded-t-lg ${
                          isToday 
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' 
                            : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600'
                        }`} 
                      />
                    </div>
                    
                    <div className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {day.fullDay}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* HISTÓRICO MENSAL LIST */}
        <div className="space-y-2 mt-6">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2">Faturamento por Mês</h2>
          <div className="space-y-1.5 pb-4">
            {monthlyGrossTotals.length > 0 ? (
              monthlyGrossTotals.map(item => (
                <div key={item.key} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center group transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Calendar size={14} />
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 capitalize">{item.monthName}</span>
                  </div>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum faturamento registrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button 
        onClick={() => handleOpenForm()}
        className={`fixed bottom-28 right-4 z-40 w-10 h-10 bg-slate-900 dark:bg-white rounded-xl shadow-xl flex items-center justify-center text-white dark:text-slate-900 transition-all ${isFabVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      >
        <Plus size={20} strokeWidth={3} />
      </button>

      {/* BALANCE DETAILS MODAL */}
      {showBalanceDetails && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBalanceDetails(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Extrato do Ciclo</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Lançamentos de Corre e Fixas</p>
                </div>
                <button onClick={() => setShowBalanceDetails(false)} className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full text-slate-500 active:scale-90 transition-transform">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Ganhos de Corre</span>
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
                      <span className="text-[10px] font-black text-white/50 dark:text-slate-400 uppercase tracking-widest">Saldo Livre do Corre</span>
                      <p className="text-[8px] text-white/30 dark:text-slate-300 font-bold uppercase mt-0.5">Dinheiro do bolso (Sem fixas)</p>
                    </div>
                    <span className="text-2xl font-black text-white dark:text-slate-900">
                       {formatCurrency(monthBalance)}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-5 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{editingId ? 'Editar' : 'Novo'} Lançamento</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><TrendingUp size={16} /> Ganho</button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}><TrendingDown size={16} /> Despesa</button>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                  <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full bg-slate-50 dark:bg-slate-950 text-2xl p-4 pl-12 rounded-2xl font-black focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                </div>

                {/* BOTÕES DE SOM RÁPIDA */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                   {QUICK_AMOUNTS.map(val => (
                     <button 
                       key={val} 
                       type="button" 
                       onClick={() => handleQuickAmount(val)}
                       className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 active:bg-emerald-500 active:text-white transition-all"
                     >
                       +{val}
                     </button>
                   ))}
                   <button 
                     type="button" 
                     onClick={() => setAmount('')}
                     className="shrink-0 px-4 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl text-[10px] font-black border border-rose-100 dark:border-rose-900 transition-all"
                   >
                     Limpar
                   </button>
                </div>
              </div>

              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="O que foi?" className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              <div className="flex flex-wrap gap-2">
                {(type === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(tag => (
                  <button key={tag} type="button" onClick={() => setCategory(tag)} className={`text-[10px] font-black px-3 py-2 rounded-xl border transition-all ${category === tag ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-transparent'}`}>{tag}</button>
                ))}
              </div>
              <button type="submit" className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl active:scale-95 transition-all mt-2 ${type === 'income' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-600 shadow-rose-500/30'}`}>{editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};