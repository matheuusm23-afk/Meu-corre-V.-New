
import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './ui/Card';
import { Transaction, TransactionType, ViewMode, FixedExpense } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, getBillingPeriodRange, getISODate, formatDateFull, getStartOfWeek, parseDateLocal, getFixedExpensesForPeriod } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Fuel, Info } from './Icons';
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
const EXPENSE_CATEGORIES = ['Combustível', 'Manutenção', 'Alimentação', 'Aluguel', 'Financiamento', 'Multa', 'Outros'];

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
  const [showDayInfo, setShowDayInfo] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getISODate(new Date()));
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('');

  // Scroll Listener for FAB Visibility
  useEffect(() => {
    const handleScroll = () => {
      // Show only if we are very close to the top (e.g., < 20px)
      setIsFabVisible(window.scrollY < 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- CALCULATIONS ---

  // 1. Billing Period for the "Month View"
  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDayOfMonth, endDayOfMonth), 
  [viewDate, startDayOfMonth, endDayOfMonth]);

  // 2. Real-time Reference (Today)
  const today = new Date();

  // 3. Filter Transactions for the SELECTED CYCLE
  // We use parseDateLocal to ensure we are comparing local calendar dates against the billing period
  const currentPeriodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseDateLocal(t.date);
      return tDate >= startDate && tDate <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate]);

  // 4. Group Transactions by Day for List
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    currentPeriodTransactions.forEach(t => {
      const day = t.date.split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(t);
    });
    return groups;
  }, [currentPeriodTransactions]);

  // 5. Chart Data Preparation (Current Week: Mon-Sun)
  const chartData = useMemo(() => {
    const data = [];
    // Always show current real-time week to match "Saldo da Semana"
    const startOfWeek = getStartOfWeek(new Date()); 
    
    for (let i = 0; i < 7; i++) {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      const dayStr = getISODate(current);
      
      // Get strict daily income
      const dailyIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(dayStr))
        .reduce((acc, t) => acc + t.amount, 0);
        
      data.push({
        date: current,
        dayStr,
        income: dailyIncome,
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(current).slice(0, 1).toUpperCase(), // D, S, T...
        fullDay: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(current).slice(0, 3) // Seg, Ter...
      });
    }
    return data;
  }, [transactions]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.income));
    return max > 0 ? max : 100; 
  }, [chartData]);

  // 6. Balances
  
  // Today's Balance (Strictly today)
  // Logic: Strictly counts INCOME only (Gross Daily), ignoring ALL expenses (Manual & Fixed) per user request.
  const todayBalance = useMemo(() => {
    return transactions
      .filter(t => isSameDay(parseDateLocal(t.date), today))
      .reduce((acc, t) => {
        if (t.type === 'income') {
          return acc + t.amount;
        }
        // Expenses (manual or fixed) are ignored for "Saldo do Dia"
        return acc;
      }, 0);
  }, [transactions, today]);

  // Week's Balance (Current Week)
  const weekBalance = useMemo(() => {
    return transactions
      .filter(t => isSameWeek(parseDateLocal(t.date), today))
      .reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  }, [transactions, today]);

  // Month Balance (Based on selected Billing Cycle)
  // Logic: 
  // 1. Manual Net = Manual Income - Manual Expenses
  // 2. Paid Fixed Expenses = Sum of fixed expenses marked as paid in this cycle
  // 3. Result = Manual Net - Paid Fixed Expenses
  const monthBalance = useMemo(() => {
    // 1. Manual Transactions Balance
    const manualTotal = currentPeriodTransactions.reduce((acc, t) => {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);

    // 2. Paid Fixed Expenses for this period
    const relevantFixedExpenses = getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
    const paidFixedExpensesTotal = relevantFixedExpenses
      .filter(e => e.type !== 'income' && e.isPaid)
      .reduce((acc, e) => acc + e.amount, 0);

    return manualTotal - paidFixedExpensesTotal;
  }, [currentPeriodTransactions, fixedExpenses, startDate, endDate]);

  // Month Gross Income (Total Earnings without expenses)
  const monthGrossIncome = useMemo(() => {
    return currentPeriodTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [currentPeriodTransactions]);

  // Fuel Expenses (Based on selected Billing Cycle)
  const fuelExpenses = useMemo(() => {
    const keys = ['combustível', 'gasolina', 'etanol', 'diesel', 'abastec', 'posto'];
    return currentPeriodTransactions
      .filter(t => 
        t.type === 'expense' && 
        keys.some(k => t.description.toLowerCase().includes(k))
      )
      .reduce((acc, t) => acc + t.amount, 0);
  }, [currentPeriodTransactions]);

  // Labels
  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const mainMonthLabel = useMemo(() => {
    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(midPoint);
  }, [startDate, endDate]);

  // --- HANDLERS ---

  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const handleOpenForm = (t?: Transaction) => {
    if (t) {
      setEditingId(t.id);
      setAmount(t.amount.toString());
      setDescription(t.description);
      setDate(t.date.split('T')[0]); // Ensure YYYY-MM-DD
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

    const transactionData: Transaction = {
      id: editingId || uuidv4(),
      amount: parseFloat(amount),
      description: description + (category ? ` - ${category}` : ''),
      date: date, 
      type,
    };

    if (editingId) {
      onUpdateTransaction(transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-32 pt-4 px-2">
      <header className="flex items-center justify-between px-2">
        <Logo />
      </header>

      {/* Period Navigation - Top of Page */}
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

      {/* Day & Week Balance */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          title="Saldo do Dia" 
          value={formatCurrency(todayBalance)} 
          valueClassName="text-xl"
          icon={
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDayInfo(!showDayInfo);
              }}
              className="flex items-center justify-center transition-colors hover:text-blue-500 focus:outline-none"
            >
              <Info size={16}/>
            </button>
          }
          variant={todayBalance >= 0 ? 'default' : 'danger'}
          className={todayBalance < 0 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800" : ""}
        >
        </Card>
        <Card 
          title="Saldo da Semana" 
          value={formatCurrency(weekBalance)} 
          valueClassName="text-xl"
          icon={<TrendingUp size={16}/>}
        />
      </div>

      {/* Month Balance */}
      <Card 
        title="Saldo da Conta" 
        value={formatCurrency(monthBalance)} 
        variant="primary"
        valueClassName="text-3xl"
      >
        <div className="flex items-center justify-between mt-2">
           <span className="text-[10px] text-blue-100/60 font-medium">
              Ciclo selecionado
           </span>
           <span className="text-xs font-bold text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-sm">
              Bruto: {formatCurrency(monthGrossIncome)}
           </span>
        </div>
      </Card>

      {/* Fuel Expenses Card (Cycle-Based) */}
      <Card
        title="Gastos com Combustível"
        value={formatCurrency(fuelExpenses)}
        icon={<Fuel size={16} />}
        className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
        valueClassName="text-xl text-orange-700 dark:text-orange-400"
      >
        <div className="text-[10px] text-orange-600/60 dark:text-orange-400/60 mt-1 font-medium">
           Total no ciclo selecionado
        </div>
      </Card>

      {/* BAR CHART (Current Week Mon-Sun) */}
      <div className="mt-2 px-2">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider">
          Ganhos da Semana
        </h2>
        
        <div className="grid grid-cols-7 gap-2 h-48 items-end pb-2">
            {chartData.map((day) => {
              const height = (day.income / maxChartValue) * 100;
              const isToday = isSameDay(day.date, today);
              const hasIncome = day.income > 0;
              
              // Compact currency format for chart labels
              const displayValue = day.income >= 1000 
                ? `${(day.income/1000).toFixed(1)}k` 
                : Math.floor(day.income).toString();

              return (
                <div key={day.dayStr} className="flex flex-col items-center justify-end h-full w-full gap-2 group">
                  
                  {/* Bar Area (Includes Label + Track) */}
                  <div className="relative w-full flex-1 flex items-end justify-center">
                     
                     {/* Floating Value Label */}
                     <div 
                        className={`absolute bottom-0 mb-1 flex flex-col items-center transition-all duration-500 ease-out z-10 ${
                            hasIncome ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ bottom: `${Math.max(height, 0)}%` }}
                     >
                        <span className={`text-[9px] font-bold whitespace-nowrap px-1 py-0.5 rounded bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700 ${
                            isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                            R$ {displayValue}
                        </span>
                     </div>

                     {/* Bar Track */}
                     <div className="w-3 sm:w-4 bg-slate-100 dark:bg-slate-800 rounded-full h-full relative overflow-hidden">
                        {/* Filled Bar */}
                        <div 
                           style={{ height: `${Math.max(height, 2)}%` }} 
                           className={`w-full absolute bottom-0 transition-all duration-700 ease-out rounded-full ${
                              hasIncome 
                              ? 'bg-emerald-500' 
                              : 'bg-transparent'
                           } ${isToday ? 'ring-[2px] ring-emerald-200 dark:ring-emerald-900' : ''}`}
                        />
                     </div>
                  </div>
                  
                  {/* Day Label */}
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                      {day.fullDay}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Extrato</h2>
        </div>

        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>Nenhum corre neste período.</p>
          </div>
        ) : (
          Object.keys(groupedTransactions).sort().reverse().map(dateKey => (
            <div key={dateKey} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mt-4">
                {formatDateFull(dateKey)}
              </h3>
              {groupedTransactions[dateKey].map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleOpenForm(t)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.type === 'income' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.type === 'income' ? <Wallet size={18} /> : <Fuel size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{t.description}</p>
                      <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}
                      {formatCurrency(t.amount)}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTransaction(t.id);
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => handleOpenForm()}
        className={`fixed bottom-32 right-6 z-40 w-16 h-16 bg-slate-900 dark:bg-white rounded-[1.25rem] shadow-2xl shadow-slate-900/30 flex items-center justify-center text-white dark:text-slate-900 transition-all duration-300 border-4 border-slate-50 dark:border-slate-950 ${
          isFabVisible 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-0 opacity-0 translate-y-12 pointer-events-none'
        } active:scale-95`}
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {/* Info Tooltip Overlay - Rendered OUTSIDE the Card/Scroll container */}
      {showDayInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowDayInfo(false)}>
           <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" />
           <div 
             className="relative bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-2xl shadow-2xl max-w-xs text-center border border-slate-700 dark:border-slate-600 animate-in zoom-in-95"
             onClick={(e) => e.stopPropagation()} 
           >
              <div className="flex justify-center mb-2 text-slate-400">
                <Info size={24} />
              </div>
              <p className="text-sm font-medium leading-relaxed">
                As despesas aplicadas no dia não serão descontado no valor do dia, somente no valor do mês.
              </p>
              <button 
                onClick={() => setShowDayInfo(false)}
                className="mt-4 text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider py-2 px-4 bg-slate-900/50 rounded-lg w-full"
              >
                Entendi
              </button>
           </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 mb-2 sm:mb-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar' : 'Novo'} Lançamento
              </h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Type Toggle */}
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex relative">
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                    type === 'income' 
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <TrendingUp size={16} />
                  Ganho
                </button>
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                    type === 'expense' 
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <TrendingDown size={16} />
                  Despesa
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Valor</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-2xl pl-12 pr-3 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold transition-all border border-transparent"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Data</label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none transition-all font-medium border border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={type === 'income' ? "Ex: iFood, 99..." : "Ex: Gasolina..."}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium border border-transparent text-sm"
                />
                
                {/* Quick Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(type === 'income' ? DELIVERY_APPS : EXPENSE_CATEGORIES).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setDescription(tag)}
                      className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors ${
                        description === tag 
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 mt-1 text-white ${
                  type === 'income' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                }`}
              >
                {editingId ? 'Salvar Alteração' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
