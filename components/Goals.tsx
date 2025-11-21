import React, { useState, useMemo } from 'react';
import { GoalSettings, Transaction } from '../types';
import { formatCurrency, getISODate, getBillingPeriodRange } from '../utils';
import { Card } from './ui/Card';
import { Target, Calendar as CalIcon, ChevronLeft, ChevronRight } from './Icons';

interface GoalsProps {
  goalSettings: GoalSettings;
  transactions: Transaction[];
  onUpdateSettings: (settings: GoalSettings) => void;
}

export const Goals: React.FC<GoalsProps> = ({ goalSettings, transactions, onUpdateSettings }) => {
  const [viewDate, setViewDate] = useState(new Date());
  
  const today = new Date();
  const startDay = goalSettings.startDayOfMonth || 1;

  // Determine the billing period for the current view
  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDay), 
  [viewDate, startDay]);

  // Determine if we are viewing the current actual cycle
  const { startDate: currentCycleStart, endDate: currentCycleEnd } = useMemo(() => 
    getBillingPeriodRange(today, startDay), 
  [today, startDay]);

  const isCurrentCycleView = 
    startDate.getTime() === currentCycleStart.getTime() && 
    endDate.getTime() === currentCycleEnd.getTime();

  const isFutureView = startDate > currentCycleEnd;

  // Helper labels
  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const mainMonthLabel = useMemo(() => {
    // Usually the "Goal Month" is the one where the cycle ends, or the majority of days are.
    // Let's use the End Date's month as the "Fiscal Month" name.
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(endDate);
  }, [endDate]);

  // Navigation
  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  // 1. Calculate Progress (Only relevant for Current Cycle)
  const currentPeriodIncome = useMemo(() => {
    if (!isCurrentCycleView) return 0;
    
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'income' && tDate >= startDate && tDate <= endDate;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, isCurrentCycleView, startDate, endDate]);

  const remainingAmount = Math.max(0, goalSettings.monthlyGoal - currentPeriodIncome);
  const progressPercent = Math.min(100, (currentPeriodIncome / (goalSettings.monthlyGoal || 1)) * 100);

  // 2. Generate Calendar Days for the Cycle
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  // 3. Calculate Work Days Logic within the Cycle
  const calculateWorkDays = () => {
    let workDays = 0;
    // For current cycle, start counting from today (remaining days)
    // For future/past, count all days in cycle
    
    calendarDays.forEach(date => {
      const dateStr = getISODate(date);
      const isOff = goalSettings.daysOff.includes(dateStr);
      
      if (!isOff) {
        if (isCurrentCycleView) {
            // Only count if date is today or future
            // Normalize to start of day for comparison
            const dTime = new Date(date).setHours(0,0,0,0);
            const tTime = new Date(today).setHours(0,0,0,0);
            if (dTime >= tTime) workDays++;
        } else {
            workDays++;
        }
      }
    });
    return workDays;
  };

  const workDaysCount = calculateWorkDays();

  // 4. Calculate Daily Target
  let dailyTarget = 0;
  let helperText = '';

  if (isCurrentCycleView) {
    dailyTarget = workDaysCount > 0 ? remainingAmount / workDaysCount : 0;
    helperText = `Para bater a meta em ${workDaysCount} dias restantes`;
  } else if (isFutureView) {
    dailyTarget = workDaysCount > 0 ? goalSettings.monthlyGoal / workDaysCount : 0;
    helperText = `Previsão baseada em ${workDaysCount} dias de trabalho`;
  } else {
    dailyTarget = 0;
    helperText = 'Ciclo encerrado';
  }

  // Handlers
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({
      ...goalSettings,
      monthlyGoal: parseFloat(e.target.value) || 0,
    });
  };

  const handleDayClick = (date: Date) => {
    const dateStr = getISODate(date);
    // Prevent editing past days in current cycle
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

  // Render Grid
  const renderCalendarGrid = () => {
    const gridItems = [];
    
    // Empty cells for start offset
    const firstDayOfWeek = startDate.getDay(); // 0 = Sun
    for (let i = 0; i < firstDayOfWeek; i++) {
       gridItems.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    calendarDays.forEach((date) => {
      const dateStr = getISODate(date);
      const dayNum = date.getDate();
      const isFirstOfMonth = dayNum === 1;
      const isOff = goalSettings.daysOff.includes(dateStr);
      
      // Date comparison for visuals
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < new Date(new Date().setHours(0,0,0,0));
      
      gridItems.push(
        <div 
          key={dateStr}
          onClick={() => (!isCurrentCycleView || !isPast) && handleDayClick(date)}
          className={`
            relative h-10 w-10 rounded-lg flex flex-col items-center justify-center text-sm font-bold cursor-pointer transition-all border border-transparent
            ${isPast ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500' : ''}
            ${isToday ? 'ring-2 ring-amber-500 z-10' : ''}
            ${!isPast && isOff ? 'bg-rose-900/50 text-rose-400 border-rose-800/50' : ''}
            ${!isPast && !isOff ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : ''}
          `}
        >
          {/* Small Month Label on 1st of month */}
          {isFirstOfMonth && (
             <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase bg-slate-950 text-slate-400 px-1 rounded">
               {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)}
             </span>
          )}
          
          <span>{dayNum}</span>
          
          {isOff && !isPast && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></div>}
        </div>
      );
    });
    return gridItems;
  };

  return (
    <div className="flex flex-col gap-6 pb-24 pt-8 px-2">
       <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-100">Metas & Planejamento 🎯</h1>
        <p className="text-slate-400 text-sm">Defina quanto quer ganhar</p>
      </header>

      {/* Cycle Navigator */}
      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
        <button onClick={() => changePeriod(-1)} className="p-2 text-slate-400 hover:text-white active:bg-slate-800 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-lg font-bold capitalize text-slate-100">{mainMonthLabel}</div>
          <div className="text-xs text-slate-500 font-medium">{periodLabel}</div>
        </div>
        <button onClick={() => changePeriod(1)} className="p-2 text-slate-400 hover:text-white active:bg-slate-800 rounded-lg">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Goal Input */}
      <Card title={`Meta do Ciclo`} className="bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center gap-2 mt-2">
          <span className="text-2xl text-slate-400 font-bold">R$</span>
          <input 
            type="number" 
            value={goalSettings.monthlyGoal} 
            onChange={handleGoalChange}
            className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none border-b border-slate-600 focus:border-amber-500 pb-1"
          />
        </div>
      </Card>

      {/* Conditional Progress View - Only for Current Cycle */}
      {isCurrentCycleView && (
        <div className="grid grid-cols-2 gap-4">
          <Card title="Já Feito" className="bg-slate-900">
            <div className="text-emerald-400 text-xl font-bold mt-1">
              {formatCurrency(currentPeriodIncome)}
            </div>
            <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-2">
              {Math.round(progressPercent)}% da meta
            </div>
          </Card>
          <Card title="Falta" className="bg-slate-900">
            <div className="text-slate-300 text-xl font-bold mt-1">
              {formatCurrency(remainingAmount)}
            </div>
          </Card>
        </div>
      )}

      {/* Daily Target */}
      <Card title={isFutureView ? "Diária Necessária (Previsão)" : "Meta Diária Atual"} className="border border-amber-500/30 bg-amber-950/10">
         <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20 text-amber-500">
               <Target size={24} />
            </div>
            <div>
               <div className="text-3xl font-bold text-amber-400">
                  {formatCurrency(dailyTarget)}
               </div>
               <div className="text-xs text-amber-300/70 mt-1">
                  {helperText}
               </div>
            </div>
         </div>
      </Card>

      {/* Calendar Day Off Planner */}
      <Card 
        title="Planejamento de Folgas" 
        subtitle={`Ciclo: ${periodLabel}`} 
        icon={<CalIcon className="text-slate-400"/>}
      >
        <div className="mt-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
             {['D','S','T','Q','Q','S','S'].map((d, i) => (
               <div key={i} className="text-xs text-slate-500 font-bold">{d}</div>
             ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 place-items-center">
             {renderCalendarGrid()}
          </div>
          
          <div className="mt-4 flex gap-4 text-xs text-slate-400 justify-center">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-800 border border-slate-700"></div> Trabalho</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-rose-900/50 border border-rose-800"></div> Folga</div>
          </div>
        </div>
      </Card>
    </div>
  );
};