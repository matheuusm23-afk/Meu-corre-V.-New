import React, { useState, useMemo } from 'react';
import { FixedExpense, RecurrenceType } from '../types';
import { formatCurrency, getBillingPeriodRange, getISODate, getFixedExpensesForPeriod } from '../utils';
import { Card } from './ui/Card';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Receipt, ScrollText, Calendar, Repeat, Clock } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface FixedExpensesProps {
  fixedExpenses: FixedExpense[];
  startDayOfMonth: number;
  endDayOfMonth?: number;
  onAddExpense: (expense: FixedExpense) => void;
  onDeleteExpense: (id: string) => void;
}

const FIXED_CATEGORIES = ['Aluguel', 'Financiamento', 'Internet', 'Alimentação', 'Luz', 'Água', 'Cartão'];

export const FixedExpenses: React.FC<FixedExpensesProps> = ({
  fixedExpenses,
  startDayOfMonth,
  endDayOfMonth,
  onAddExpense,
  onDeleteExpense
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [installments, setInstallments] = useState('12');
  
  const { startDate, endDate } = useMemo(() => 
    getBillingPeriodRange(viewDate, startDayOfMonth, endDayOfMonth), 
  [viewDate, startDayOfMonth, endDayOfMonth]);

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

  const activeExpenses = useMemo(() => {
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
  }, [fixedExpenses, startDate, endDate]);

  const totalAmount = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    const newExpense: FixedExpense = {
      id: uuidv4(),
      title,
      amount: parseFloat(amount),
      category: title,
      recurrence,
      startDate: getISODate(startDate),
      installments: recurrence === 'installments' ? parseInt(installments) : undefined
    };

    onAddExpense(newExpense);
    setShowForm(false);
    setTitle('');
    setAmount('');
    setRecurrence('monthly');
  };

  const handleQuickCategory = (cat: string) => {
    setTitle(cat);
  };

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contas Fixas 🧾</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Planeje seus boletos e contas.</p>
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

      <Card 
        title="Total de Contas" 
        className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl shadow-slate-900/20"
      >
         <div className="flex items-center gap-4 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
               <ScrollText className="text-white" size={24} />
            </div>
            <div>
                <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalAmount)}</div>
                <div className="text-xs text-white/60 font-medium">Este valor será sua meta mensal</div>
            </div>
         </div>
      </Card>

      <div className="space-y-3">
         <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Neste Ciclo</h3>
            <button 
              onClick={() => setShowForm(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
            >
              <Plus size={14} />
              Adicionar Conta
            </button>
         </div>

         {activeExpenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-600">
              <Receipt size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma conta fixa para este mês.</p>
            </div>
         ) : (
           activeExpenses.map(expense => (
             <div key={expense.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                      <Receipt size={18} />
                   </div>
                   <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{expense.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {expense.recurrence === 'installments' && expense.currentInstallment && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                            {expense.currentInstallment}/{expense.installments}
                          </span>
                        )}
                        {expense.recurrence === 'single' && (
                           <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase">
                              Única
                           </span>
                        )}
                        {expense.recurrence === 'monthly' && (
                           <span className="text-[10px] text-slate-400 font-medium uppercase">
                              Mensal
                           </span>
                        )}
                         <span className="text-[10px] text-slate-400 font-medium uppercase">
                            {expense.recurrence === 'installments' ? 'Parcelado' : ''}
                         </span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(expense.amount)}</span>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       onDeleteExpense(expense.id);
                     }}
                     className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
             </div>
           ))
         )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nova Conta Fixa</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Valor da Parcela/Conta</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-3xl pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold transition-all border border-transparent"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Nome da Conta</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Aluguel"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {FIXED_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleQuickCategory(cat)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        title === cat 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-1 rounded-xl grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setRecurrence('monthly')}
                  className={`py-3 rounded-lg text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                    recurrence === 'monthly' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Repeat size={16} />
                  Fixa
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('installments')}
                  className={`py-3 rounded-lg text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                    recurrence === 'installments' 
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Clock size={16} />
                  Parcelas
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('single')}
                  className={`py-3 rounded-lg text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                    recurrence === 'single' 
                      ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Calendar size={16} />
                  Única
                </button>
              </div>

              {recurrence === 'installments' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Número de Parcelas</label>
                   <input 
                    type="number" 
                    min="1"
                    max="999"
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 mt-2"
              >
                Salvar Conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};