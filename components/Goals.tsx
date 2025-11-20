import React, { useMemo } from 'react';
import { GoalSettings, Transaction } from '../types';
import { formatCurrency, getDaysInMonth, getISODate, isSameMonth } from '../utils';
import { Card } from './ui/Card';
import { Target, Calendar as CalIcon, CheckCircle2, AlertCircle } from './Icons';

interface GoalsProps {
  goalSettings: GoalSettings;
  transactions: Transaction[];
  onUpdateSettings: (settings: GoalSettings) => void;
}

export const Goals: React.FC<GoalsProps> = ({ goalSettings, transactions, onUpdateSettings }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  // 1. Calculate Progress
  const currentMonthIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && isSameMonth(new Date(t.date), today))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const remainingAmount = Math.max(0, goalSettings.monthlyGoal - currentMonthIncome);
  const progressPercent = Math.min(100, (currentMonthIncome / (goalSettings.monthlyGoal || 1)) * 100);

  // 2. Calculate Work Days Left
  // We only care about "future" days in the current month including today
  const calculateWorkDaysLeft = () => {
    let workDays = 0;
    for (let day = today.getDate(); day <= daysInMonth; day++) {
      const dateStr = getISODate(new Date(year, month, day));
      // If it's not marked as a day off, it's a work day
      if (!goalSettings.daysOff.includes(dateStr)) {
        workDays++;
      }
    }
    return workDays;
  };

  const workDaysLeft = calculateWorkDaysLeft();
  const dailyTarget = workDaysLeft > 0 ? remainingAmount / workDaysLeft : 0;

  // Handlers
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({
      ...goalSettings,
      monthlyGoal: parseFloat(e.target.value) || 0,
    });
  };

  const toggleDayOff = (day: number) => {
    const dateStr = getISODate(new Date(year, month, day));
    const isOff = goalSettings.daysOff.includes(dateStr);
    let newDaysOff;
    if (isOff) {
      newDaysOff = goalSettings.daysOff.filter(d => d !== dateStr);
    } else {
      newDaysOff = [...goalSettings.daysOff, dateStr];
    }
    onUpdateSettings({ ...goalSettings, daysOff: newDaysOff });
  };

  // Calendar Grid Generation
  const renderCalendar = () => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = getISODate(date);
      const isOff = goalSettings.daysOff.includes(dateStr);
      const isPast = i < today.getDate();
      const isToday = i === today.getDate();
      
      days.push(
        <div 
          key={i}
          onClick={() => !isPast && toggleDayOff(i)}
          className={`
            relative h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold cursor-pointer transition-all
            ${isPast ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500' : ''}
            ${isToday ? 'ring-2 ring-amber-500 z-10' : ''}
            ${!isPast && isOff ? 'bg-rose-900/50 text-rose-400 border border-rose-800' : ''}
            ${!isPast && !isOff ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : ''}
          `}
        >
          {i}
          {isOff && !isPast && <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></div>}
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

      {/* Goal Input */}
      <Card title="Sua Meta Mensal" className="bg-gradient-to-br from-slate-900 to-slate-800">
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

      {/* Progress */}
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

      {/* Daily Target */}
      <Card title="Meta Diária Necessária" className="border border-amber-500/30 bg-amber-950/10">
         <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/20 text-amber-500">
               <Target size={24} />
            </div>
            <div>
               <div className="text-3xl font-bold text-amber-400">
                  {formatCurrency(dailyTarget)}
               </div>
               <div className="text-xs text-amber-300/70 mt-1">
                  Para bater a meta em <b>{workDaysLeft} dias</b> de trabalho
               </div>
            </div>
         </div>
      </Card>

      {/* Calendar Day Off Planner */}
      <Card title="Planejamento de Folgas" subtitle="Toque nos dias que não vai trabalhar" icon={<CalIcon className="text-slate-400"/>}>
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 justify-between">
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