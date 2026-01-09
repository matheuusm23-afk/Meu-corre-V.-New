
import React, { useMemo, useState } from 'react';
import { GoalSettings } from '../types';
import { Card } from './ui/Card';
import { getISODate, formatCurrency } from '../utils';
import { PieChart, TrendingUp, ChevronLeft, ChevronRight, CheckCircle2, Info } from './Icons';

interface YearlyGoalsProps {
  goalSettings: GoalSettings;
  onUpdateSettings: (s: GoalSettings) => void;
}

export const YearlyGoals: React.FC<YearlyGoalsProps> = ({ goalSettings, onUpdateSettings }) => {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const daysInMonth = (month: number) => new Date(currentYear, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number) => new Date(currentYear, month, 1).getDay();

  const handleToggleDay = (dateStr: string) => {
    const isSaved = goalSettings.savingsDates.includes(dateStr);
    let newDates;
    if (isSaved) {
      newDates = goalSettings.savingsDates.filter(d => d !== dateStr);
    } else {
      newDates = [...goalSettings.savingsDates, dateStr];
    }
    onUpdateSettings({ ...goalSettings, savingsDates: newDates });
    if (!isSaved && navigator.vibrate) navigator.vibrate(50);
  };

  const stats = useMemo(() => {
    const totalSaved = goalSettings.savingsDates.length * goalSettings.dailySavingTarget;
    
    // Calcula dias restantes no ano
    const today = new Date();
    const endOfYear = new Date(currentYear, 11, 31);
    const msPerDay = 1000 * 60 * 60 * 24;
    const remainingDays = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / msPerDay));
    
    const projectedFinal = totalSaved + (remainingDays * goalSettings.dailySavingTarget);
    
    return {
      totalDaysMarked: goalSettings.savingsDates.length,
      totalSaved,
      projectedFinal,
      remainingDays
    };
  }, [goalSettings.savingsDates, goalSettings.dailySavingTarget, currentYear]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const renderCalendar = (monthIdx: number) => {
    const days = [];
    const totalDays = daysInMonth(monthIdx);
    const startOffset = firstDayOfMonth(monthIdx);

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="w-full aspect-square" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentYear, monthIdx, d);
      const dateStr = getISODate(date);
      const isMarked = goalSettings.savingsDates.includes(dateStr);
      const isToday = dateStr === getISODate(new Date());
      const isPast = date < new Date(new Date().setHours(0,0,0,0));

      days.push(
        <button
          key={d}
          onClick={() => handleToggleDay(dateStr)}
          className={`
            relative w-full aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 border
            ${isMarked 
              ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-105 z-10' 
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-700'}
            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950' : ''}
          `}
        >
          {d}
          {isMarked && <CheckCircle2 size={8} className="absolute bottom-1 right-1 opacity-80" />}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Metas do Ano 💰</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Sua reserva de emergência e futuro.</p>
      </header>

      <Card title="Configurar Economia" icon={<TrendingUp size={16} className="text-blue-500" />}>
        <div className="mt-2 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Quanto você quer guardar por dia?</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
              <input 
                type="number" 
                value={goalSettings.dailySavingTarget || ''} 
                onChange={(e) => onUpdateSettings({ ...goalSettings, dailySavingTarget: parseFloat(e.target.value) || 0 })}
                placeholder="Ex: 10,00"
                className="w-full bg-slate-50 dark:bg-slate-950 p-4 pl-12 rounded-2xl font-bold text-lg focus:outline-none border border-slate-200 dark:border-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Total Guardado" variant="success" className="p-4 shadow-emerald-500/20">
          <div className="text-xl font-bold">{formatCurrency(stats.totalSaved)}</div>
          <div className="text-[10px] opacity-80 font-medium mt-1">{stats.totalDaysMarked} dias concluídos</div>
        </Card>
        <Card title="Projeção Dez/31" variant="primary" className="p-4 shadow-blue-500/20">
          <div className="text-xl font-bold">{formatCurrency(stats.projectedFinal)}</div>
          <div className="text-[10px] opacity-80 font-medium mt-1">Se mantiver o foco diário</div>
        </Card>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-[2rem] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setSelectedMonth(prev => Math.max(0, prev - 1))}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-lg font-bold capitalize text-slate-900 dark:text-slate-100">{monthNames[selectedMonth]}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentYear}</div>
          </div>
          <button 
            onClick={() => setSelectedMonth(prev => Math.min(11, prev + 1))}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['D','S','T','Q','Q','S','S'].map((d, i) => (
            <div key={i} className="text-[10px] text-slate-400 font-bold">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {renderCalendar(selectedMonth)}
        </div>

        <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
          <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Marque os dias em que você conseguiu separar o valor. O cálculo de projeção assume que você continuará guardando o valor diário nos dias restantes do ano.
          </p>
        </div>
      </div>
    </div>
  );
};
