
// Fix: Use the correct types for FixedExpense items in goal calculation, as they do not have a .type property.
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

  // --- CALCULATIONS FOR THE SELECTED PERIOD ---

  const relevantFixedItems = useMemo(() => 
    getFixedExpensesForPeriod(fixedExpenses, startDate, endDate),
    [fixedExpenses, startDate, endDate]
  );

  const netBillsGap = useMemo(() => {
    const totalExpenses = relevantFixedItems
      .filter(e => e.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const totalFixedIncome = relevantFixedItems
      .filter(e => e.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // If income > expenses, gap is zero (user is already covered)
    return Math.max(0, totalExpenses - totalFixedIncome);
  }, [relevantFixedItems]);

  const netWorkProfit = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = parseDateLocal(t.date);
        return tDate >= startDate && tDate <= endDate;
      })
      .reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }, 0);
  }, [transactions, startDate, endDate]);

  const remainingToEarn = useMemo(() => {
    return Math.max(0, netBillsGap - netWorkProfit);
  }, [netBillsGap, netWorkProfit]);

  const incomeToday = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && isSameDay(parseDateLocal(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, today]);

  const progressPercent = netBillsGap > 0 
    ? Math.max(0, Math.min(100, (netWorkProfit / netBillsGap) * 100))
    : (netWorkProfit >= 0 ? 100 : 0);

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

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const iter = new Date(startDate);
    const maxIterations = 45; 
    let count = 0;
    while (iter <= endDate && count < maxIterations) {
      days.push(new Date(iter));
      iter.setDate(iter.getDate() + 1);
      count++;
    }
    return days;
  }, [startDate, endDate]);

  const workDaysDetails = useMemo(() => {
    let futureDays = 0; 
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
        }
        totalInCycle++; 
      }
    });

    return { futureDays, isTodayWorkDay, totalInCycle };
  }, [calendarDays, goalSettings.daysOff, isCurrentCycleView, today]);

  let dailyTargetDisplay = 0;
  let helperText = '';
  let messageNode = null;
  let comparisonNode = null;
  let cardVariant: 'default' | 'success' | 'danger' = 'default';

  if (isCurrentCycleView) {
    const baselineRemaining = remainingToEarn + incomeToday;
    const baselineDays = workDaysDetails.futureDays + (workDaysDetails.isTodayWorkDay ? 1 : 0);
    const startOfDayTarget = baselineDays > 0 ? baselineRemaining / baselineDays : 0;

    if (incomeToday > 0) {
       const futureDays = workDaysDetails.futureDays;
       dailyTargetDisplay = futureDays > 0 ? remainingToEarn / futureDays : remainingToEarn;
       
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
       dailyTargetDisplay = startOfDayTarget;
       helperText = baselineDays > 0 
          ? `Para bater a meta em ${baselineDays} dias (incluindo hoje)` 
          : 'Sem dias úteis restantes';
    }

  } else if (isFutureView) {
    const totalDays = workDaysDetails.totalInCycle;
    dailyTargetDisplay = totalDays > 0 ? netBillsGap / totalDays : 0;
    helperText = `Previsão baseada em ${totalDays} dias de trabalho`;
  } else {
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
    
    // Consistent structure for empty cells
    for (let i = 0; i < firstDayOfWeek; i++) {
       gridItems.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    }

    calendarDays.forEach((date, index) => {
      const dateStr = getISODate(date);
      const dayNum = date.getDate();
      
      // Mostrar rótulo do mês no primeiro dia do ciclo e quando o mês vira (dia 1)
      const isFirstDayOfCycle = index === 0;
      const isFirstOfMonth = dayNum === 1;
      const showMonthLabel = isFirstDayOfCycle || isFirstOfMonth;

      const isOff = goalSettings.daysOff.includes(dateStr);
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < new Date(new Date().setHours(0,0,0,0));
      
      gridItems.push(
        <div 
          key={dateStr}
          onClick={() => (!isCurrentCycleView || !isPast) && handleDayClick(date)}
          className={`
            relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold cursor-pointer transition-all duration-200 border border-transparent
            ${isPast ? 'opacity-40 grayscale cursor-not-allowed bg-slate-100 dark:bg-slate-800/50' : ''}
            ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 z-10 shadow-lg' : ''}
            ${!isPast && isOff ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : ''}
            ${!isPast && !isOff ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 active:scale-95' : ''}
          `}
        >
          {showMonthLabel && (
             <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap z-20 ${
               isFirstDayOfCycle ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'
             }`}>
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Organização de trabalho 🎯</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Acompanhe seu progresso.</p>
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

      {isCurrentCycleView && (
        <div className="grid grid-cols-2 gap-5">
          <Card title="Corre do Mês">
            <div className={`text-xl font-bold mt-1 tracking-tight ${netWorkProfit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(netWorkProfit)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 mt-3 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
              <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-2">
              {Math.round(progressPercent)}% das contas cobertas
            </div>
          </Card>
          <Card title="Gap a Cobrir">
            <div className="text-slate-800 dark:text-slate-200 text-xl font-bold mt-1 tracking-tight">
              {formatCurrency(remainingToEarn)}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              Abatendo ganhos fixos 🏍️
            </div>
          </Card>
        </div>
      )}

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
        title="Folgas" 
        subtitle={`Toque para marcar dias sem corre`} 
        icon={<CalIcon className="text-slate-400"/>}
      >
        <div className="mt-4 overflow-hidden">
          <div className="grid grid-cols-7 gap-2 mb-3 text-center">
             {['D','S','T','Q','Q','S','S'].map((d, i) => (
               <div key={i} className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{d}</div>
             ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2 place-items-center pb-2">
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
