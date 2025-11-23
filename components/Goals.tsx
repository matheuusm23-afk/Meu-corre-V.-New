
import React, { useState, useMemo } from 'react';
import { GoalSettings, Transaction, FixedExpense } from '../types';
import { formatCurrency, getISODate, getBillingPeriodRange, getFixedExpensesForPeriod, parseDateLocal, isSameDay } from '../utils';
import { Card } from './ui/Card';
import { Target, Calendar as CalIcon, ChevronLeft, ChevronRight, AlertCircle, TrendingUp, TrendingDown } from './Icons';

interface GoalsProps {
  goalSettings: GoalSettings;
  transactions: Transaction[];
  onUpdateSettings: (settings: GoalSettings) => void;
  fixedExpenses: FixedExpense[];
}

export const Goals: React.FC<GoalsProps> = ({ 
  goalSettings, 
  transactions, 
  onUpdateSettings,
  fixedExpenses
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  
  // Normalize today to start of day for consistent comparisons
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startDay = goalSettings.startDayOfMonth || 1;
  const endDay = goalSettings.endDayOfMonth;

  // Determine the billing period for the current view
  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDay, endDay), 
  [viewDate, startDay, endDay]);

  // Determine if we are viewing the current actual cycle
  const { startDate: currentCycleStart, endDate: currentCycleEnd } = useMemo(() => 
    getBillingPeriodRange(today, startDay, endDay), 
  [today, startDay, endDay]);

  const isCurrentCycleView = startDate.getTime() === currentCycleStart.getTime();
  const isFutureView = startDate > currentCycleEnd;

  // Calculate Income specifically for TODAY
  const incomeToday = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && isSameDay(parseDateLocal(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, today]);

  // Calculate Cycle Goal based on Fixed Expenses MINUS Fixed Income for the viewed period
  const cycleGoal = useMemo(() => {
    const relevantExpenses = getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
    const totalExpenses = relevantExpenses
      .filter(e => e.type !== 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = relevantExpenses
      .filter(e => e.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return Math.max(0, totalExpenses - totalIncome);
  }, [fixedExpenses, startDate, endDate]);

  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const mainMonthLabel = useMemo(() => {
    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(midPoint);
  }, [startDate, endDate]);

  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const currentPeriodBalance = useMemo(() => {
    // 1. Manual Transactions Balance
    const manualBalance = transactions
      .filter(t => {
        const tDate = parseDateLocal(t.date);
        return tDate >= startDate && tDate <= endDate;
      })
      .reduce((acc, t) => {
        if (t.type === 'income') return acc + t.amount;
        if (t.type === 'expense') return acc - t.amount;
        return acc;
      }, 0);

    // 2. Paid Fixed Expenses for this period (Subtract from balance)
    const relevantFixedExpenses = getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
    const paidFixedExpensesTotal = relevantFixedExpenses
      .filter(e => e.type !== 'income' && e.isPaid)
      .reduce((acc, e) => acc + e.amount, 0);

    return manualBalance - paidFixedExpensesTotal;
  }, [transactions, fixedExpenses, startDate, endDate]);

  const remainingAmount = Math.max(0, cycleGoal - currentPeriodBalance);
  
  const progressPercent = cycleGoal > 0 
    ? Math.max(0, Math.min(100, (currentPeriodBalance / cycleGoal) * 100))
    : (currentPeriodBalance >= 0 ? 100 : 0);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const curr = new Date(startDate);
    const maxIterations = 90; 
    let count = 0;
    const iter = new Date(curr);
    while (iter <= endDate && count < maxIterations) {
      days.push(new Date(iter));
      iter.setDate(iter.getDate() + 1);
      count++;
    }
    return days;
  }, [startDate, endDate]);

  // Calculate workdays details
  const workDaysDetails = useMemo(() => {
    let futureDays = 0; // Strictly future
    let isTodayWorkDay = false;
    let totalInCycle = 0;

    calendarDays.forEach(date => {
      const dateStr = getISODate(date);
      const isOff = goalSettings.daysOff.includes(dateStr);
      
      if (!isOff) {
        if (isCurrentCycleView) {
            const dTime = new Date(date).setHours(0,0,0,0);
            const tTime = new Date(today).setHours(0,0,0,0);
            
            if (dTime > tTime) futureDays++;
            if (dTime === tTime) isTodayWorkDay = true;
        } else {
            // For future/past views, just count total
        }
        totalInCycle++; // Approximate total for other views
      }
    });

    return { futureDays, isTodayWorkDay, totalInCycle };
  }, [calendarDays, goalSettings.daysOff, isCurrentCycleView, today]);

  // --- Daily Target Logic ---

  let dailyTargetDisplay = 0;
  let helperText = '';
  let messageNode = null;
  let comparisonNode = null;
  let cardVariant: 'default' | 'success' | 'danger' = 'default';

  if (isCurrentCycleView) {
    // 1. Calculate Baseline (Start of Day State)
    // To know if we "hit" the goal, we need to know what the goal WAS at 00:00 today.
    // Baseline Remaining = Current Remaining + Income Today
    // Baseline Days = Future Days + (1 if today is workday)
    const baselineRemaining = remainingAmount + incomeToday;
    const baselineDays = workDaysDetails.futureDays + (workDaysDetails.isTodayWorkDay ? 1 : 0);
    const startOfDayTarget = baselineDays > 0 ? baselineRemaining / baselineDays : 0;

    // 2. Determine Current State
    if (incomeToday > 0) {
       // SCENARIO: WORKED TODAY
       // The target displayed should be the RECALCULATED target for tomorrow onwards.
       // Remaining Amount is already updated (lower).
       // Days count should be FUTURE days only.
       
       const futureDays = workDaysDetails.futureDays;
       
       // If no future days left, target is 0 (or simply remaining if any)
       dailyTargetDisplay = futureDays > 0 ? remainingAmount / futureDays : remainingAmount;
       
       // Feedback Logic
       // Check if we hit the "Start of Day" target
       const hitGoal = incomeToday >= startOfDayTarget;
       
       if (hitGoal) {
          cardVariant = 'success';
          messageNode = (
            <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-2 font-medium bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
               Parabéns vc bateu sua meta hoje e sua diária partir de amanhã ficará mais baixa 🚀
            </p>
          );
       } else {
          cardVariant = 'danger';
          messageNode = (
            <p className="text-xs text-rose-800 dark:text-rose-200 mt-2 font-medium bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
               Que pena você não bateu a meta hoje, amanhã sua meta ficará um pouco maior 📉
            </p>
          );
       }
       
       // Comparison Breakdown
       comparisonNode = (
          <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl text-xs border border-slate-200/50 dark:border-slate-700/50">
             <div>
                <span className="block text-slate-500 dark:text-slate-400">Meta de Hoje</span>
                <span className="block font-bold text-slate-700 dark:text-slate-300">{formatCurrency(startOfDayTarget)}</span>
             </div>
             <div>
                <span className="block text-slate-500 dark:text-slate-400">Feito Hoje</span>
                <span className={`block font-bold ${hitGoal ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {formatCurrency(incomeToday)}
                </span>
             </div>
          </div>
       );
       
       helperText = futureDays > 0 
          ? `Nova meta para os ${futureDays} dias restantes`
          : 'Ciclo finalizado!';

    } else {
       // SCENARIO: HAVEN'T WORKED YET
       // The target displayed is the Start of Day Target.
       // Days count includes today.
       
       dailyTargetDisplay = startOfDayTarget;
       
       helperText = baselineDays > 0 
          ? `Para bater a meta em ${baselineDays} dias (incluindo hoje)` 
          : 'Sem dias úteis restantes';
    }

  } else if (isFutureView) {
    const totalDays = workDaysDetails.totalInCycle;
    dailyTargetDisplay = totalDays > 0 ? cycleGoal / totalDays : 0;
    helperText = `Previsão baseada em ${totalDays} dias de trabalho`;
  } else {
    // Past View
    dailyTargetDisplay = 0;
    helperText = 'Ciclo encerrado';
  }

  const handleDayClick = (date: Date) => {
    const dateStr = getISODate(date);
    if (isCurrentCycleView && date < new Date(new Date().setHours(0,0,0,0))) return;

    const isOff = goalSettings.daysOff.includes(dateStr);
    let newDaysOff;
    if (isOff) {
      newDaysOff = goalSettings.daysOff.filter(d => d !== dateStr);
    } else {
      newDaysOff = [...goalSettings.daysOff, dateStr];
    }
    onUpdateSettings({ ...goalSettings, daysOff: newDaysOff });
  };

  const renderCalendarGrid = () => {
    const gridItems = [];
    const firstDayOfWeek = startDate.getDay();
    
    for (let i = 0; i < firstDayOfWeek; i++) {
       gridItems.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    calendarDays.forEach((date) => {
      const dateStr = getISODate(date);
      const dayNum = date.getDate();
      const isFirstOfMonth = dayNum === 1;
      const isOff = goalSettings.daysOff.includes(dateStr);
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < new Date(new Date().setHours(0,0,0,0));
      
      gridItems.push(
        <div 
          key={dateStr}
          onClick={() => (!isCurrentCycleView || !isPast) && handleDayClick(date)}
          className={`
            relative h-12 w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold cursor-pointer transition-all duration-200 border border-transparent
            ${isPast ? 'opacity-40 grayscale cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : ''}
            ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 z-10 shadow-lg' : ''}
            ${!isPast && isOff ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : ''}
            ${!isPast && !isOff ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95' : ''}
          `}
        >
          {isFirstOfMonth && (
             <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-20">
               {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)}
             </span>
          )}
          
          <span>{dayNum}</span>
          
          {isOff && !isPast && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm"></div>}
        </div>
      );
    });
    return gridItems;
  };

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
       <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Metas & Foco 🎯</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Planeje seu corre.</p>
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

      <Card title="Meta do Mês (Contas Fixas)" className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl shadow-slate-900/20">
        <div className="flex items-center gap-3 mt-2">
          <div className="text-3xl font-bold text-white w-full">
            {formatCurrency(cycleGoal)}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-300 bg-white/10 p-2 rounded-lg">
           <AlertCircle size={12} className="shrink-0 mt-0.5" />
           <p>Valor definido automaticamente pelo total de Contas Fixas menos Receitas Fixas.</p>
        </div>
      </Card>

      {isCurrentCycleView && (
        <div className="grid grid-cols-2 gap-5">
          <Card title="Já Feito">
            <div className={`text-xl font-bold mt-1 tracking-tight ${currentPeriodBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(currentPeriodBalance)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 mt-3 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
              <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-2">
              {Math.round(progressPercent)}% concluído
            </div>
          </Card>
          <Card title="Falta">
            <div className="text-slate-800 dark:text-slate-200 text-xl font-bold mt-1 tracking-tight">
              {formatCurrency(remainingAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              Força no corre! 🏍️
            </div>
          </Card>
        </div>
      )}

      {/* Daily Goal Card with Feedback Logic */}
      <Card 
        title={isFutureView ? "Diária (Previsão)" : "Meta Diária"} 
        className={`${
           cardVariant === 'default' 
             ? 'border border-amber-200/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20' 
             : cardVariant === 'success' 
                ? 'border border-emerald-200/50 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border border-rose-200/50 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
        } backdrop-blur-sm`}
      >
         <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
               cardVariant === 'default'
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500'
                : cardVariant === 'success'
                   ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500'
                   : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500'
            }`}>
               <Target size={28} />
            </div>
            <div>
               <div className={`text-2xl font-bold tracking-tight ${
                 cardVariant === 'default' ? 'text-amber-700 dark:text-amber-400' :
                 cardVariant === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                 'text-rose-700 dark:text-rose-400'
               }`}>
                  {formatCurrency(dailyTargetDisplay)}
               </div>
               <div className={`text-xs mt-1 font-medium ${
                 cardVariant === 'default' ? 'text-amber-700/70 dark:text-amber-400/70' :
                 cardVariant === 'success' ? 'text-emerald-700/70 dark:text-emerald-400/70' :
                 'text-rose-700/70 dark:text-rose-400/70'
               }`}>
                  {helperText}
               </div>
            </div>
         </div>
         
         {comparisonNode}
         {messageNode}
      </Card>

      <Card 
        title="Calendário" 
        subtitle={`Toque para marcar folgas`} 
        icon={<CalIcon className="text-slate-400"/>}
      >
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-2 mb-3 text-center">
             {['D','S','T','Q','Q','S','S'].map((d, i) => (
               <div key={i} className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{d}</div>
             ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2 place-items-center">
             {renderCalendarGrid()}
          </div>
          
          <div className="mt-6 flex gap-6 text-xs font-medium text-slate-500 dark:text-slate-400 justify-center">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border border-slate-300 dark:bg-slate-700 dark:border-slate-600 shadow-sm"></div> Trabalho</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-200 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-800 shadow-sm"></div> Folga</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
