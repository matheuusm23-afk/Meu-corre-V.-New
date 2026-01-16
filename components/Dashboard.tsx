import { GoogleGenAI } from "@google/genai";
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/Card';
import { ExpensePieChart } from './ui/PieChart';
import { Transaction, TransactionType, ViewMode, FixedExpense } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, getBillingPeriodRange, getISODate, getStartOfWeek, parseDateLocal, getFixedExpensesForPeriod } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, Fuel, Utensils, Wrench, Home, AlertCircle, Smartphone, ShoppingBag, PieChart as PieIcon, Edit2, Info, Receipt, Clock, ChevronDown, ChevronUp } from './Icons';
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
  const viewDate = useMemo(() => new Date(), []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const [showForm, setShowForm] = useState(false);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

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

  // --- Lógica de Ganhos e Gastos de Hoje ---
  const todayStats = useMemo(() => {
    const dayTransactions = transactions.filter(t => isSameDay(parseDateLocal(t.date), today));
    const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions, today]);

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

  // --- Linha do Tempo: Agrupamento por Semana e Dia ---
  const weeklyHistory = useMemo(() => {
    const groups: Record<string, { 
      weekKey: string,
      weekStart: Date, 
      weekEnd: Date, 
      totalIncome: number, 
      days: Record<string, { 
        income: number, 
        expense: number, 
        transactions: Transaction[] 
      }> 
    }> = {};

    transactions.forEach(t => {
      const tDate = parseDateLocal(t.date);
      const weekStart = getStartOfWeek(tDate);
      const weekKey = weekStart.toISOString().split('T')[0];
      const dayKey = t.date.split('T')[0];

      if (!groups[weekKey]) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        groups[weekKey] = { weekKey, weekStart, weekEnd, totalIncome: 0, days: {} };
      }

      if (!groups[weekKey].days[dayKey]) {
        groups[weekKey].days[dayKey] = { income: 0, expense: 0, transactions: [] };
      }

      if (t.type === 'income') {
        groups[weekKey].totalIncome += t.amount;
        groups[weekKey].days[dayKey].income += t.amount;
      } else {
        groups[weekKey].days[dayKey].expense += t.amount;
      }
      groups[weekKey].days[dayKey].transactions.push(t);
    });

    const sortedGroups = Object.values(groups)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
      .map(week => ({
        ...week,
        days: Object.entries(week.days)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, data]) => ({ 
            date, 
            ...data, 
            transactions: data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
          }))
      }));

    if (sortedGroups.length > 0 && expandedWeeks.size === 0) {
      setExpandedWeeks(new Set([sortedGroups[0].weekKey]));
    }

    return sortedGroups;
  }, [transactions]);

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) newExpanded.delete(weekKey);
    else newExpanded.add(weekKey);
    setExpandedWeeks(newExpanded);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const getTransactionIcon = (t: { description: string, type: string, isFixed?: boolean }) => {
    const text = t.description.toLowerCase();
    if (t.type === 'income') return <Smartphone size={16} />;
    if (text.includes('gasolina') || text.includes('posto') || text.includes('combustível')) return <Fuel size={16} />;
    if (t.isFixed) return <Receipt size={16} />;
    return <TrendingDown size={16} />;
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      onDeleteTransaction(id);
    }
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
      {/* HEADER */}
      <div className="bg-emerald-600 dark:bg-emerald-700 w-full pt-8 pb-8 px-6 flex flex-col gap-8 shadow-lg">
        <header className="flex items-center justify-between">
          <Logo variant="light" />
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
            <Home size={20} />
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
          
          <div onClick={() => setShowBalanceDetails(true)} className="flex flex-col items-end text-right cursor-pointer group active:scale-95 transition-all">
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
        {/* RESUMOS RÁPIDOS */}
        <div className="grid grid-cols-2 gap-2">
          <Card title="Ganhos da Semana" value={formatCurrency(weekBalance)} icon={<TrendingUp size={14} className="text-emerald-500"/>} valueClassName="text-base" className="shadow-sm border-slate-200 dark:border-slate-800" />
          <Card title="Combustível (Ciclo)" value={formatCurrency(monthFuelTotal)} icon={<Fuel size={14} className="text-amber-500" />} valueClassName="text-base" className="shadow-sm border-slate-200 dark:border-slate-800" />
        </div>

        {/* --- CARD DE GANHOS DE HOJE --- */}
        <div className="px-1">
           <div className="p-4 rounded-3xl border flex items-center justify-between shadow-md transition-colors bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500 text-white">
                    <TrendingUp size={20} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-emerald-600">Ganhos de Hoje</p>
                    <p className="text-xl font-black leading-none text-emerald-900 dark:text-emerald-100">
                       {formatCurrency(todayStats.income)}
                    </p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Entradas: <span className="text-emerald-600">{formatCurrency(todayStats.income)}</span></p>
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">Gastos: <span className="text-rose-600">{formatCurrency(todayStats.expense)}</span></p>
              </div>
           </div>
        </div>

        {/* GRÁFICO */}
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
                      <div style={{ height: `${Math.max(height, 0)}%` }} className={`w-full absolute bottom-0 transition-all duration-700 ease-out rounded-t-lg ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600'}`} />
                    </div>
                    <div className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {day.fullDay}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* --- LINHA DO TEMPO DO CORRE (CONTROLE TOTAL) --- */}
        <div className="space-y-4 mt-10">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Histórico do Corre</h2>
              <Clock size={14} className="text-slate-300" />
           </div>

           <div className="space-y-4 pb-12">
              {weeklyHistory.length > 0 ? (
                weeklyHistory.map((week, wIdx) => {
                  const isExpanded = expandedWeeks.has(week.weekKey);
                  const isCurrentWeek = wIdx === 0;

                  return (
                    <div key={week.weekKey} className="space-y-3">
                      {/* Seletor de Semana */}
                      <button 
                        onClick={() => toggleWeek(week.weekKey)}
                        className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all active:scale-[0.99] ${isExpanded ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}`}
                      >
                         <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isExpanded ? 'bg-white/10 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                               <Calendar size={18} />
                            </div>
                            <div className="text-left">
                               <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isExpanded ? 'text-white/60 dark:text-slate-400' : 'text-slate-400'}`}>
                                 {isCurrentWeek ? 'Esta Semana' : `Semana de ${week.weekStart.toLocaleDateString('pt-BR', { month: 'long' })}`}
                               </p>
                               <p className={`text-xs font-black leading-none ${isExpanded ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-slate-100'}`}>
                                 {week.weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {week.weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                               <p className={`text-sm font-black leading-none mb-1 ${isExpanded ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  {formatCurrency(week.totalIncome)}
                               </p>
                               <p className={`text-[7px] font-black uppercase tracking-tighter ${isExpanded ? 'text-white/40' : 'text-slate-400'}`}>Total Ganhos</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} className={isExpanded ? 'text-white dark:text-slate-900' : 'text-slate-400'} /> : <ChevronDown size={16} className="text-slate-400" />}
                         </div>
                      </button>

                      {/* Lista de Dias na Semana */}
                      {isExpanded && (
                        <div className="space-y-6 pt-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800 ml-5 animate-in slide-in-from-top-2 duration-300">
                           {week.days.map((day) => (
                             <div key={day.date} className="space-y-2">
                                <div className="flex items-center justify-between px-2 mb-1">
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></div>
                                      <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.1em]">
                                        {parseDateLocal(day.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
                                      </span>
                                   </div>
                                   <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                                      Líquido: {formatCurrency(day.income - day.expense)}
                                   </span>
                                </div>

                                <div className="space-y-1.5">
                                   {day.transactions.map((t) => (
                                     <div key={t.id} className={`p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group transition-all shadow-sm ${t.type === 'expense' ? 'border-rose-100 dark:border-rose-950/30' : 'border-emerald-100 dark:border-emerald-950/30'}`}>
                                        <div className="flex items-center gap-3 min-w-0" onClick={() => handleOpenForm(t)}>
                                           <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'}`}>
                                              {getTransactionIcon({ description: t.description, type: t.type })}
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none mb-1 truncate">{t.description}</p>
                                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                 {t.type === 'income' ? 'Ganho' : 'Gasto'} • {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                           </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 shrink-0">
                                           <span className={`text-sm font-black tracking-tight ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                              {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                           </span>
                                           
                                           {/* Ações Rápidas */}
                                           <div className="flex items-center gap-0.5">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenForm(t); }}
                                                className="p-1.5 text-slate-300 hover:text-amber-500 active:scale-90 transition-all"
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 active:scale-90 transition-all"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                           </div>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Inicie seu primeiro corre para ver o histórico!</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Botão de Adicionar */}
      <button onClick={() => handleOpenForm()} className={`fixed bottom-28 right-4 z-40 w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl shadow-xl flex items-center justify-center text-white dark:text-slate-900 transition-all ${isFabVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
        <Plus size={24} strokeWidth={3} />
      </button>

      {/* MODAL DE EXTRATO DETALHADO */}
      {showBalanceDetails && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBalanceDetails(false)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Extrato do Ciclo</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Geral de Ganhos e Fixas</p>
                </div>
                <button onClick={() => setShowBalanceDetails(false)} className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-full text-slate-500 active:scale-90 transition-transform"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Entradas</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(monthGrossIncome)}</span>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-800/50">
                  <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Saídas</span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-400">{formatCurrency(monthTotalExpenses)}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 pb-8">
                {balanceComposition.map(item => (
                  <div key={item.id + item.date} className={`p-4 rounded-2xl border flex justify-between items-center ${item.type === 'income' ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {getTransactionIcon({ description: item.description, type: item.type, isFixed: item.isFixed })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[120px]">{item.description}</p>
                           {item.isFixed && <span className="text-[7px] font-black bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase">Fixo</span>}
                        </div>
                        <p className="text-[10px] text-slate-500">{formatDate(item.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                       <span className={`font-black text-sm ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}</span>
                       {!item.isFixed && (
                         <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenForm(item.originalTransaction); }} className="p-1 text-slate-300 hover:text-amber-500"><Edit2 size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={12} /></button>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto shrink-0">
                 <div className="bg-slate-900 dark:bg-white p-5 rounded-3xl flex justify-between items-center shadow-2xl">
                    <div>
                      <span className="text-[10px] font-black text-white/50 dark:text-slate-400 uppercase tracking-widest">Saldo Livre</span>
                      <p className="text-[8px] text-white/30 dark:text-slate-300 font-bold uppercase mt-0.5">Dinheiro Real no Bolso</p>
                    </div>
                    <span className="text-2xl font-black text-white dark:text-slate-900">{formatCurrency(monthBalance)}</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] p-5 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black dark:text-white leading-none">{editingId ? 'Editar' : 'Novo'} Corre</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}><TrendingUp size={16} /> Ganho</button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}><TrendingDown size={16} /> Gasto</button>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                  <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full bg-slate-50 dark:bg-slate-950 text-2xl p-4 pl-12 rounded-2xl font-black focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                   {QUICK_AMOUNTS.map(val => (
                     <button key={val} type="button" onClick={() => { const current = parseFloat(amount) || 0; setAmount((current + val).toString()); }} className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700">+{val}</button>
                   ))}
                </div>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="O que foi?" className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                <div className="flex flex-wrap gap-2">
                  {(type === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(tag => (
                    <button key={tag} type="button" onClick={() => setCategory(tag)} className={`text-[10px] font-black px-3 py-2 rounded-xl border transition-all ${category === tag ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{tag}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl active:scale-95 transition-all mt-2 ${type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};