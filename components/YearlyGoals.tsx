
import React, { useMemo, useState } from 'react';
import { GoalSettings } from '../types';
import { Card } from './ui/Card';
import { getISODate, formatCurrency } from '../utils';
import { PieChart, TrendingUp, ChevronLeft, ChevronRight, CheckCircle2, Info, X, Plus, TrendingDown } from './Icons';

interface YearlyGoalsProps {
  goalSettings: GoalSettings;
  onUpdateSettings: (s: GoalSettings) => void;
}

export const YearlyGoals: React.FC<YearlyGoalsProps> = ({ goalSettings, onUpdateSettings }) => {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingDay, setEditingDay] = useState<{ date: Date; dateStr: string } | null>(null);
  const [tempExtra, setTempExtra] = useState('');
  const [tempWithdrawal, setTempWithdrawal] = useState('');

  const daysInMonth = (month: number) => new Date(currentYear, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number) => new Date(currentYear, month, 1).getDay();

  const savingsAdjustments = goalSettings.savingsAdjustments || {};
  const savingsWithdrawals = goalSettings.savingsWithdrawals || {};

  const handleOpenEdit = (date: Date, dateStr: string) => {
    const currentExtra = savingsAdjustments[dateStr] || 0;
    const currentWithdrawal = savingsWithdrawals[dateStr] || 0;
    setTempExtra(currentExtra > 0 ? currentExtra.toString() : '');
    setTempWithdrawal(currentWithdrawal > 0 ? currentWithdrawal.toString() : '');
    setEditingDay({ date, dateStr });
  };

  const handleSaveDay = () => {
    if (!editingDay) return;
    const { dateStr } = editingDay;
    const extraVal = parseFloat(tempExtra) || 0;
    const withdrawalVal = parseFloat(tempWithdrawal) || 0;
    
    // Atualiza Ajustes (Extras)
    const newAdjustments = { ...savingsAdjustments };
    if (extraVal > 0) {
      newAdjustments[dateStr] = extraVal;
    } else {
      delete newAdjustments[dateStr];
    }

    // Atualiza Retiradas
    const newWithdrawals = { ...savingsWithdrawals };
    if (withdrawalVal > 0) {
      newWithdrawals[dateStr] = withdrawalVal;
    } else {
      delete newWithdrawals[dateStr];
    }

    onUpdateSettings({ 
      ...goalSettings, 
      savingsAdjustments: newAdjustments,
      savingsWithdrawals: newWithdrawals
    });
    setEditingDay(null);
  };

  const toggleBaseGoal = () => {
    if (!editingDay) return;
    const { dateStr } = editingDay;
    const isMarked = goalSettings.savingsDates.includes(dateStr);
    let newDates;
    if (isMarked) {
      newDates = goalSettings.savingsDates.filter(d => d !== dateStr);
    } else {
      newDates = [...goalSettings.savingsDates, dateStr];
    }
    onUpdateSettings({ ...goalSettings, savingsDates: newDates });
    if (!isMarked && navigator.vibrate) navigator.vibrate(50);
  };

  const stats = useMemo(() => {
    const baseSaved = goalSettings.savingsDates.length * goalSettings.dailySavingTarget;
    const totalAdjustments = (Object.values(savingsAdjustments) as number[]).reduce((acc, v) => acc + v, 0);
    const totalWithdrawals = (Object.values(savingsWithdrawals) as number[]).reduce((acc, v) => acc + v, 0);
    
    const totalSaved = baseSaved + totalAdjustments - totalWithdrawals;
    
    const today = new Date();
    const endOfYear = new Date(currentYear, 11, 31);
    const msPerDay = 1000 * 60 * 60 * 24;
    const remainingDays = Math.max(0, Math.ceil((endOfYear.getTime() - today.getTime()) / msPerDay));
    
    const projectedFinal = totalSaved + (remainingDays * goalSettings.dailySavingTarget);
    
    return {
      totalDaysMarked: goalSettings.savingsDates.length,
      totalSaved,
      totalWithdrawals,
      projectedFinal,
      remainingDays
    };
  }, [goalSettings.savingsDates, goalSettings.dailySavingTarget, savingsAdjustments, savingsWithdrawals, currentYear]);

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
      const extra = savingsAdjustments[dateStr] || 0;
      const withdrawal = savingsWithdrawals[dateStr] || 0;
      const isToday = dateStr === getISODate(new Date());

      days.push(
        <button
          key={d}
          onClick={() => handleOpenEdit(date, dateStr)}
          className={`
            relative w-full aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 border
            ${isMarked 
              ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-105 z-10' 
              : extra > 0
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : withdrawal > 0
                  ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-700'}
            ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-950' : ''}
          `}
        >
          {d}
          {isMarked && <CheckCircle2 size={8} className="absolute bottom-1 right-1 opacity-80" />}
          {extra > 0 && (
            <div className={`absolute top-1 left-1 text-[7px] font-extrabold ${isMarked ? 'text-white' : 'text-blue-500'}`}>
              +{Math.round(extra)}
            </div>
          )}
          {withdrawal > 0 && !isMarked && (
            <div className={`absolute top-1 right-1 text-[7px] font-extrabold text-rose-500`}>
              -{Math.round(withdrawal)}
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col gap-5 pb-32 pt-4 px-2">
      <header className="px-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ano 💰</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">Sua reserva de emergência.</p>
      </header>

      <Card title="Guardar Diário" icon={<TrendingUp size={14} className="text-blue-500" />} className="p-4">
        <div className="mt-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase">Valor fixo diário</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">R$</span>
            <input 
              type="number" 
              value={goalSettings.dailySavingTarget || ''} 
              onChange={(e) => onUpdateSettings({ ...goalSettings, dailySavingTarget: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              className="w-full bg-slate-50 dark:bg-slate-950 p-3 pl-10 rounded-xl font-bold text-base focus:outline-none border border-slate-200 dark:border-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="Saldo Reserva" variant="success" className="p-4 shadow-emerald-500/20">
          <div className="text-lg font-bold">{formatCurrency(stats.totalSaved)}</div>
          <div className="text-[9px] opacity-80 font-medium mt-1">
            {stats.totalWithdrawals > 0 && `(-${formatCurrency(stats.totalWithdrawals)} retirados)`}
          </div>
        </Card>
        <Card title="Previsão Final" variant="primary" className="p-4 shadow-blue-500/20">
          <div className="text-lg font-bold">{formatCurrency(stats.projectedFinal)}</div>
          <div className="text-[9px] opacity-80 font-medium mt-1">Estimativa de saldo</div>
        </Card>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-3 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setSelectedMonth(prev => Math.max(0, prev - 1))}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <div className="text-sm font-bold capitalize text-slate-900 dark:text-slate-100">{monthNames[selectedMonth]}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentYear}</div>
          </div>
          <button 
            onClick={() => setSelectedMonth(prev => Math.min(11, prev + 1))}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
          {['D','S','T','Q','Q','S','S'].map((d, i) => (
            <div key={i} className="text-[9px] text-slate-400 font-bold">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {renderCalendar(selectedMonth)}
        </div>

        <div className="mt-4 p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-2.5">
          <Info size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[9px] text-amber-800 dark:text-amber-300 leading-tight">
            Toque nos dias para marcar que guardou o valor diário, adicionar um valor extra ou registrar uma retirada.
          </p>
        </div>
      </div>

      {/* Editing Day Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingDay(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  Dia {editingDay.date.getDate()} de {monthNames[editingDay.date.getMonth()]}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mt-0.5">Gestão da Reserva</p>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Toggle Base Saving */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Meta Diária</p>
                    <p className="text-[10px] text-slate-500">Guardou {formatCurrency(goalSettings.dailySavingTarget)}?</p>
                  </div>
                </div>
                <button 
                  onClick={toggleBaseGoal}
                  className={`relative w-12 h-6 rounded-full transition-colors ${goalSettings.savingsDates.includes(editingDay.dateStr) ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${goalSettings.savingsDates.includes(editingDay.dateStr) ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Grid of Inputs */}
              <div className="grid grid-cols-1 gap-4">
                {/* Extra Value Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Plus size={16} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Extra Guardado</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                    <input 
                      type="number" 
                      value={tempExtra}
                      onChange={(e) => setTempExtra(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-slate-50 dark:bg-slate-950 p-4 pl-10 rounded-2xl font-bold text-xl border border-slate-200 dark:border-slate-800 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                {/* Withdrawal Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={16} className="text-rose-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-rose-500">Retirada da Reserva</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-rose-300">R$</span>
                    <input 
                      type="number" 
                      value={tempWithdrawal}
                      onChange={(e) => setTempWithdrawal(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-rose-50/50 dark:bg-rose-950/20 p-4 pl-10 rounded-2xl font-bold text-xl border border-rose-100 dark:border-rose-900 focus:outline-none text-rose-600 dark:text-rose-400"
                    />
                  </div>
                  <p className="text-[9px] text-rose-500/70 font-medium px-1">
                    Use para registrar gastos emergenciais pagos com a reserva.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSaveDay}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl active:scale-95 transition-all mt-2"
              >
                Confirmar Lançamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
