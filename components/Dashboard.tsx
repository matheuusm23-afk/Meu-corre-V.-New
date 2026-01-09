
// Fix: Use the correct TransactionType and FixedExpense type for balance calculation.
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/Card';
import { ExpensePieChart } from './ui/PieChart';
import { Transaction, TransactionType, ViewMode, FixedExpense } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, getBillingPeriodRange, getISODate, formatDateFull, getStartOfWeek, parseDateLocal, getFixedExpensesForPeriod } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Fuel, Utensils, Wrench, Home, AlertCircle, Smartphone, ShoppingBag, PieChart as PieIcon, Edit2 } from './Icons';
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

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    currentPeriodTransactions.forEach(t => {
      const day = t.date.split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(t);
    });
    return groups;
  }, [currentPeriodTransactions]);

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
    const relevantFixed = getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
    
    const fixedIncomes = relevantFixed.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
    const paidFixedExpenses = relevantFixed.filter(e => e.type === 'expense' && e.isPaid).reduce((acc, e) => acc + e.amount, 0);
    
    return manualBalance + fixedIncomes - paidFixedExpenses;
  }, [currentPeriodTransactions, fixedExpenses, startDate, endDate]);

  const monthGrossIncome = useMemo(() => {
    const manualIncome = currentPeriodTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const relevantFixed = getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
    const fixedIncome = relevantFixed.filter(e => e.type === 'income').reduce((acc, e) => acc + e.amount, 0);
    return manualIncome + fixedIncome;
  }, [currentPeriodTransactions, fixedExpenses, startDate, endDate]);

  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const mainMonthLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date((startDate.getTime() + endDate.getTime()) / 2)), [startDate, endDate]);

  const getTransactionIcon = (t: Transaction) => {
    const text = t.description.toLowerCase();
    if (t.type === 'income') return <Smartphone size={18} />;
    if (text.includes('gasolina') || text.includes('posto')) return <Fuel size={18} />;
    return <TrendingDown size={18} />;
  };

  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleOpenForm = (t?: Transaction) => {
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
    <div className="flex flex-col gap-6 pb-32 pt-4 px-2">
      <header className="flex items-center justify-between px-2">
        <Logo />
      </header>

      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-2 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <button onClick={() => changePeriod(-1)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-2xl transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-lg font-bold capitalize text-slate-900 dark:text-slate-100">{mainMonthLabel}</div>
          <div className="text-xs text-slate-500 font-medium">{periodLabel}</div>
        </div>
        <button onClick={() => changePeriod(1)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-2xl transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Saldo do Dia" value={formatCurrency(todayBalance)} />
        <Card title="Saldo da Semana" value={formatCurrency(weekBalance)} icon={<TrendingUp size={16}/>} />
      </div>

      <Card title="Saldo da Conta" value={formatCurrency(monthBalance)} variant="primary" valueClassName="text-3xl">
        <div className="flex items-center justify-between mt-2">
           <span className="text-[10px] text-blue-100/60 font-medium">Incluindo fixos e manuais</span>
           <span className="text-xs font-bold text-white/90 bg-white/20 px-2 py-1 rounded-lg">Bruto: {formatCurrency(monthGrossIncome)}</span>
        </div>
      </Card>

      <div className="mt-2 px-2">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider">Ganhos da Semana</h2>
        <div className="grid grid-cols-7 gap-3 h-40 items-end pb-2 px-2">
            {chartData.map((day) => {
              const height = (day.income / maxChartValue) * 100;
              const isToday = isSameDay(day.date, today);
              return (
                <div key={day.dayStr} className="flex flex-col items-center justify-end h-full w-full gap-3">
                  <div className="w-5 sm:w-6 bg-slate-100/80 dark:bg-slate-800/50 rounded-full h-full relative overflow-hidden">
                    <div style={{ height: `${Math.max(height, 4)}%` }} className={`w-full absolute bottom-0 transition-all duration-700 ${day.income > 0 ? 'bg-emerald-500' : 'bg-transparent'} ${isToday ? 'ring-2 ring-emerald-400' : ''}`} />
                  </div>
                  <div className={`text-[10px] font-bold uppercase ${isToday ? 'text-emerald-500' : 'text-slate-400'}`}>{day.fullDay}</div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 px-2">Extrato</h2>
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 text-slate-400"><p>Nenhum corre neste período.</p></div>
        ) : (
          Object.keys(groupedTransactions).sort().reverse().map(dateKey => (
            <div key={dateKey} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mt-4">{formatDateFull(dateKey)}</h3>
              {groupedTransactions[dateKey].map(t => {
                const isIncome = t.type === 'income';
                const parts = t.description.split(' - ');
                const displayDesc = parts[0];
                const displayCat = parts.length > 1 ? parts[parts.length - 1] : '';

                return (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenForm(t)}
                    className={`p-4 rounded-2xl border shadow-sm flex justify-between items-center active:scale-[0.99] transition-all cursor-pointer group ${
                      isIncome 
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/50' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {getTransactionIcon(t)}
                      </div>
                      <div>
                        {displayCat && (
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider block mb-0.5 ${isIncome ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {displayCat}
                          </span>
                        )}
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{displayDesc}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(t.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                        {t.type === 'expense' ? '- ' : '+ '}{formatCurrency(t.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenForm(t); }}
                          className="p-2 text-slate-400 hover:text-amber-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => handleOpenForm()}
        className={`fixed bottom-32 right-6 z-40 w-16 h-16 bg-slate-900 dark:bg-white rounded-[1.25rem] shadow-2xl flex items-center justify-center text-white dark:text-slate-900 transition-all ${isFabVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

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
