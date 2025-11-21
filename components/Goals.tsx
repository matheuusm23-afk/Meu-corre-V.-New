import React, { useState, useMemo } from 'react';
import { GoalSettings, Transaction } from '../types';
import { formatCurrency, getDaysInMonth, getISODate, isSameMonth } from '../utils';
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
  const isCurrentMonthView = isSameMonth(viewDate, today);
  const isFutureView = viewDate > today && !isCurrentMonthView;
  
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  // Helper to change months
  const changeMonth = (offset: number) => {
    const newDate = new Date(viewYear, viewMonth + offset, 1);
    setViewDate(newDate);
  };

  const viewMonthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate);

  // 1. Calculate Progress (Only relevant for Current Month)
  const currentMonthIncome = useMemo(() => {
    if (!isCurrentMonthView) return 0;
    return transactions
      .filter(t => t.type === 'income' && isSameMonth(new Date(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, isCurrentMonthView, today]);

  const remainingAmount = Math.max(0, goalSettings.monthlyGoal - currentMonthIncome);
  const progressPercent = Math.min(100, (currentMonthIncome / (goalSettings.monthlyGoal || 1)) * 100);

  // 2. Calculate Work Days Logic
  const calculateWorkDays = () => {
    let workDays = 0;
    const startDay = isCurrentMonthView ? today.getDate() : 1;
    
    for (let day = startDay; day <= daysInMonth; day++) {
      const dateStr = getISODate(new Date(viewYear, viewMonth, day));
      if (!goalSettings.daysOff.includes(dateStr)) {
        workDays++;
      }
    }
    return workDays;
  };

  const workDaysCount = calculateWorkDays();

  // 3. Calculate Daily Target
  let dailyTarget = 0;
  let helperText = '';

  if (isCurrentMonthView) {
    dailyTarget = workDaysCount > 0 ? remainingAmount / workDaysCount : 0;
    helperText = `Para bater a meta em ${workDaysCount} dias restantes`;
  } else if (isFutureView) {
    dailyTarget = workDaysCount > 0 ? goalSettings.monthlyGoal / workDaysCount : 0;
    helperText = `Previsão baseada em ${workDaysCount} dias de trabalho`;
  } else {
    dailyTarget = 0;
    helperText = 'Mês encerrado';
  }

  // Handlers
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({
      ...goalSettings,
      monthlyGoal: parseFloat(e.target.value) || 0,
    });
  };

  const handleDayClick = (day: number) => {
    const dateStr = getISODate(new Date(viewYear, viewMonth, day));
    const isOff = goalSettings.daysOff.includes(dateStr);

    let newDaysOff;
    if (isOff) {
      // If it's already off, remove it
      newDaysOff = goalSettings.daysOff.filter(d => d !== dateStr);
    } else {
      // Add it
      newDaysOff = [...goalSettings.daysOff, dateStr];
    }
    onUpdateSettings({ ...goalSettings, daysOff: newDaysOff });
  };

  // Calendar Grid Generation
  const renderCalendar = () => {
    const days = [];
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    
    for (let i = 0; i < firstDayOfWeek; i++) {
       days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(viewYear, viewMonth, i);
      const dateStr = getISODate(date);
      const isOff = goalSettings.daysOff.includes(dateStr);
      const isPastDay = isCurrentMonthView && i < today.getDate();
      const isToday = isCurrentMonthView && i === today.getDate();
      
      days.push(
        <div 
          key={i}
          onClick={() => !isPastDay && handleDayClick(i)}
          className={`
            relative h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold cursor-pointer transition-all
            ${isPastDay ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500' : ''}
            ${isToday ? 'ring-2 ring-amber-500 z-10' : ''}
            ${!isPastDay && isOff ? 'bg-rose-900/50 text-rose-400 border border-rose-800' : ''}
            ${!isPastDay && !isOff ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : ''}
          `}
        >
          {i}
          {isOff && !isPastDay && <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></div>}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col gap-6 pb-24 pt-8 px-2">
       <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-100">Metas & Planejamento 🎯</h1>
        <p className="text-slate-400 text-sm">Defina quanto quer ganhar</p>
      </header>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800">
        <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-white active:bg-slate-800 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <div className="text-lg font-bold capitalize text-slate-100">{viewMonthLabel}</div>
          {isCurrentMonthView && <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold">Mês Atual</div>}
          {isFutureView && <div className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">Previsão Futura</div>}
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-white active:bg-slate-800 rounded-lg">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Goal Input */}
      <Card title={`Meta de ${viewMonthLabel}`} className="bg-gradient-to-br from-slate-900 to-slate-800">
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

      {/* Conditional Progress View - Only for Current Month */}
      {isCurrentMonthView && (
        <div className="grid grid-cols-2 gap-4">
          <Card title="Já Feito" className="bg-slate-900">
            <div className="text-emerald-400 text-xl font-bold mt-1">
              {formatCurrency(currentMonthIncome)}
            </div>
            <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
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
      <Card title="Planejamento de Folgas" subtitle={`Toque nos dias de ${viewMonthLabel} que não vai trabalhar`} icon={<CalIcon className="text-slate-400"/>}>
        <div className="mt-4">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
             {['D','S','T','Q','Q','S','S'].map((d, i) => (
               <div key={i} className="text-xs text-slate-500 font-bold">{d}</div>
             ))}
          </div>
          
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-start">
             {renderCalendar()}
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