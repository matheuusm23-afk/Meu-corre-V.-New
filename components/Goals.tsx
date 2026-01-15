import React, { useState, useMemo } from 'react';
import { GoalSettings, Transaction, FixedExpense } from '../types';
import { formatCurrency, getISODate, getBillingPeriodRange, getFixedExpensesForPeriod, parseDateLocal, isSameDay } from '../utils';
import { Card } from './ui/Card';
import { Target, Calendar as CalIcon, ChevronLeft, ChevronRight, AlertCircle, TrendingUp, TrendingDown, Clock } from './Icons';

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
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startDay = goalSettings.startDayOfMonth || 1;
  const endDay = goalSettings.endDayOfMonth;

  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDay, endDay), 
  [viewDate, startDay, endDay]);

  const { startDate: currentCycleStart, endDate: currentCycleEnd } = useMemo(() => 
    getBillingPeriodRange(today, startDay, endDay), 
  [today, startDay, endDay]);

  const isCurrentCycleView = startDate.getTime() === currentCycleStart.getTime();
  const isFutureView = startDate > currentCycleEnd;

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
    while (iter <= endDate) {
      days.push(new Date(iter));
      iter.setDate(iter.getDate() + 1);
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
        const dTime = new Date(date).setHours(0,0,0,0);
        const tTime = new Date(today).setHours(0,0,0,0);
        
        if (dTime > tTime) futureDays++;
        if (dTime === tTime) isTodayWorkDay = true;
        totalInCycle++; 
      }
    });

    return { futureDays, isTodayWorkDay, totalInCycle };
  }, [calendarDays, goalSettings.daysOff, today]);

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
            <p className="text-[10px] text-emerald-950 dark:text-emerald-200 mt-2 font-black bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
               Parabéns vc bateu sua meta hoje e sua diária partir de amanhã ficará mais baixa 🚀
            </p>
          );
       } else {
          cardVariant = 'danger';
          messageNode = (
            <p className="text-[10px] text-rose-950 dark:text-rose-200 mt-2 font-black bg-rose-100 dark:bg-rose-900/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
               Que pena você não bateu a meta hoje, amanhã sua meta ficará um pouco maior 📉
            </p>
          );
       }
       
       comparisonNode = (
          <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 bg-white/50 dark:bg-slate-900/50 rounded-xl text-[10px] border border-slate-300 dark:border-slate-700">
             <div>
                <span className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">Meta de Hoje</span>
                <span className="block font-black text-slate-900 dark:text-slate-100 text-xs">{formatCurrency(startOfDayTarget)}</span>
             </div>
             <div>
                <span className="block text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">Feito Hoje</span>
                <span className={`block font-black text-xs ${hitGoal ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
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

  // Lógica de Blocos de Tempo (Semanas e Residuais)
  const timeBlocks = useMemo(() => {
    if (!isCurrentCycleView) return [];
    
    const blocks: { label: string; workingDays: number; value: number; isMain: boolean; daysText: string; rangeText: string }[] = [];
    const iter = new Date(today);
    iter.setHours(0,0,0,0);
    
    let currentBlockDays = 0;
    let weekIndex = 0;
    let blockStart = new Date(iter);

    const closeBlock = (isFirst: boolean, isTail: boolean, count: number, start: Date, end: Date) => {
      if (count === 0 && !isFirst) return;
      
      let label = "";
      if (isFirst) label = "Esta Semana";
      else if (isTail) label = "Finais do Ciclo";
      else {
        weekIndex++;
        if (weekIndex === 1) label = "Próxima Semana";
        else label = `${weekIndex + 1}ª Semana`;
      }

      const startD = start.getDate();
      const endD = end.getDate();
      const startM = start.getMonth();
      const endM = end.getMonth();
      
      let rangeText = "";
      if (startM === endM) {
        rangeText = `do dia ${startD} ao dia ${endD}`;
      } else {
        const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
        rangeText = `do dia ${startD}/${monthFmt.format(start)} ao dia ${endD}/${monthFmt.format(end)}`;
      }

      // O valor do bloco é o somatório das diárias ajustadas para os dias de trabalho desse bloco
      blocks.push({
        label,
        workingDays: count,
        value: count * dailyTargetDisplay,
        isMain: isFirst,
        daysText: count === 1 ? '1 dia de trampo' : `${count} dias de trampo`,
        rangeText
      });
    };

    while (iter <= endDate) {
      const dStr = getISODate(iter);
      const dayOfWeek = iter.getDay(); // 0: Dom, 1: Seg...
      const isOff = goalSettings.daysOff.includes(dStr);

      if (!isOff) {
        currentBlockDays++;
      }

      const isLastDayOfCycle = iter.getTime() === new Date(endDate).setHours(0,0,0,0);

      // Fecha bloco se for Domingo (final da semana) ou o último dia do ciclo de faturamento
      if (dayOfWeek === 0 || isLastDayOfCycle) {
        const isFirstBlock = blocks.length === 0;
        const isTailBlock = isLastDayOfCycle && dayOfWeek !== 0;
        
        closeBlock(isFirstBlock, isTailBlock && !isFirstBlock, currentBlockDays, blockStart, new Date(iter));
        
        const nextStart = new Date(iter);
        nextStart.setDate(nextStart.getDate() + 1);
        blockStart = new Date(nextStart);
        currentBlockDays = 0;
      }
      
      iter.setDate(iter.getDate() + 1);
    }

    return blocks;
  }, [today, endDate, goalSettings.daysOff, dailyTargetDisplay, isCurrentCycleView]);

  const mainWeekBlock = timeBlocks.find(b => b.isMain);
  const futureBlocks = timeBlocks.filter(b => !b.isMain);

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
       gridItems.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
    }
    calendarDays.forEach((date, index) => {
      const dateStr = getISODate(date);
      const dayNum = date.getDate();
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
            ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-950 z-10 shadow-lg' : ''}
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
    <div className="flex flex-col gap-5 pb-32 pt-4 px-2">
       <header className="px-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organização 🎯</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">Acompanhe seu progresso diário.</p>
      </header>

      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-800 shadow-sm">
        <button onClick={() => changePeriod(-1)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-sm font-bold capitalize text-slate-900 dark:text-slate-100">{mainMonthLabel}</div>
          <div className="text-[10px] text-slate-500 font-medium">{periodLabel}</div>
        </div>
        <button onClick={() => changePeriod(1)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {isCurrentCycleView && (
        <div className="grid grid-cols-2 gap-3">
          <Card title="Corre do Mês" className="p-4">
            <div className={`text-lg font-bold mt-1 tracking-tight ${netWorkProfit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(netWorkProfit)}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 mt-2.5 rounded-full overflow-hidden border border-slate-100 dark:border-slate-700">
              <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[9px] text-slate-400 font-medium mt-1.5">
              {Math.round(progressPercent)}% concluído
            </div>
          </Card>
          <Card title="Gap a Cobrir" className="p-4">
            <div className="text-slate-800 dark:text-slate-200 text-lg font-bold mt-1 tracking-tight">
              {formatCurrency(remainingToEarn)}
            </div>
            <div className="text-[10px] text-slate-400 mt-2.5">
              Considerando fixos 🏍️
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card 
          title={isFutureView ? "Previsão Diária" : "Meta de Hoje"} 
          className={`p-5 ${
            cardVariant === 'default' 
              ? 'border border-amber-300 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30' 
              : cardVariant === 'success' 
                  ? 'border border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border border-rose-300 dark:border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/30'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                cardVariant === 'default' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                cardVariant === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
              }`}>
                <Target size={24} />
              </div>
              <div>
                <div className={`text-2xl font-black tracking-tighter ${
                  cardVariant === 'default' ? 'text-amber-900 dark:text-amber-300' :
                  cardVariant === 'success' ? 'text-emerald-900 dark:text-emerald-300' :
                  'text-rose-900 dark:text-rose-300'
                }`}>
                    {formatCurrency(dailyTargetDisplay)}
                </div>
                <div className="text-[10px] mt-0.5 font-black uppercase opacity-60">
                    {helperText}
                </div>
              </div>
          </div>
          {comparisonNode}
          {messageNode}
        </Card>

        {/* METAS DO CICLO - CORES ESCURECIDAS PARA MÁXIMA VISIBILIDADE */}
        <Card 
          title="Metas do Ciclo" 
          subtitle="Valores por período para atingir o total"
          icon={<Clock size={16} className="text-blue-800 dark:text-blue-400" />}
          className="p-5 bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900/50 shadow-md"
        >
           <div className="mt-1 flex flex-col gap-4">
              {/* BLOCO ATUAL (MAIOR DESTAQUE) */}
              {mainWeekBlock ? (
                <div className="bg-white/60 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] text-blue-950 dark:text-blue-200 font-black uppercase tracking-wider">
                       {mainWeekBlock.label}
                    </p>
                    <p className="text-[8px] text-blue-900 dark:text-blue-400 font-black uppercase">{mainWeekBlock.daysText}</p>
                  </div>
                  <div className="text-3xl font-black text-blue-950 dark:text-blue-100 tracking-tighter leading-none mb-2">
                     {formatCurrency(mainWeekBlock.value)}
                  </div>
                  <p className="text-[10px] text-blue-900/80 dark:text-blue-400 font-black italic">{mainWeekBlock.rangeText}</p>
                </div>
              ) : (
                <div className="text-blue-800 dark:text-blue-400 text-[10px] font-black italic">Ciclo finalizado!</div>
              )}
              
              {/* BLOCOS FUTUROS (VALORES CALCULADOS) */}
              {futureBlocks.length > 0 && (
                <div className="pt-3 border-t border-blue-300 dark:border-blue-800/80 space-y-4">
                  {futureBlocks.map((block, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-[10px] font-black text-blue-950 dark:text-blue-200 uppercase tracking-widest leading-none">{block.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-blue-900 dark:text-blue-400 font-black uppercase">{block.rangeText}</span>
                           <span className="text-[8px] text-slate-500 dark:text-slate-500 font-bold">• {block.daysText}</span>
                        </div>
                      </div>
                      <div className="text-base font-black text-blue-950 dark:text-blue-200 tracking-tight">
                         {formatCurrency(block.value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SALDO TOTAL DO CICLO */}
              {isCurrentCycleView && (
                <div className="pt-3 border-t border-blue-400/50 dark:border-blue-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest">Saldo Restante</span>
                    <p className="text-[8px] text-blue-800/60 dark:text-blue-500 font-bold uppercase mt-0.5">Total a fazer no mês</p>
                  </div>
                  <div className="text-xl font-black text-blue-950 dark:text-blue-200">
                     {formatCurrency(remainingToEarn)}
                  </div>
                </div>
              )}
           </div>
        </Card>
      </div>

      <Card 
        title="Folgas" 
        subtitle={`Toque nos dias que não terá corre`} 
        icon={<CalIcon size={16} className="text-slate-400"/>}
        className="p-5"
      >
        <div className="mt-3 overflow-hidden">
          <div className="grid grid-cols-7 gap-1.5 mb-2.5 text-center">
             {['D','S','T','Q','Q','S','S'].map((d, i) => (
               <div key={i} className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{d}</div>
             ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 place-items-center">
             {renderCalendarGrid()}
          </div>
          <div className="mt-4 flex gap-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:bg-slate-700 dark:border-slate-600"></div> Trampo</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-200 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-800"></div> Folga</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
