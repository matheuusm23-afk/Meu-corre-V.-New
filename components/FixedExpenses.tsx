import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FixedExpense, RecurrenceType } from '../types';
import { formatCurrency, getBillingPeriodRange, getISODate, getFixedExpensesForPeriod } from '../utils';
import { Card } from './ui/Card';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Receipt, ScrollText, Calendar, Repeat, Clock, TrendingUp, TrendingDown, Wallet, Edit2, CreditCard, CheckCircle2 } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface FixedExpensesProps {
  fixedExpenses: FixedExpense[];
  startDayOfMonth: number;
  endDayOfMonth?: number;
  onAddExpense: (expense: FixedExpense) => void;
  onUpdateExpense: (expense: FixedExpense) => void;
  onDeleteExpense: (id: string) => void;
}

const EXPENSE_CATEGORIES = ['Aluguel', 'Financiamento', 'Internet', 'Alimentação', 'Luz', 'Água', 'Cartão'];

// --- Swipeable Item Component ---
interface SwipeableListItemProps {
  children: React.ReactNode;
  onTogglePaid: () => void;
  isPaid: boolean;
  className?: string;
  onClick?: () => void;
}

const SwipeableListItem: React.FC<SwipeableListItemProps> = ({ children, onTogglePaid, isPaid, className, onClick }) => {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const THRESHOLD = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    if (diff > 0 && diff < 200) {
       setDragX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragX > THRESHOLD) {
       onTogglePaid();
       if (navigator.vibrate) navigator.vibrate(50);
    }
    setDragX(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl select-none group touch-pan-y">
      <div 
        className={`absolute inset-0 flex items-center pl-6 transition-colors duration-300 ${
          dragX > 0 ? (isPaid ? 'bg-slate-300' : 'bg-emerald-500') : 'bg-transparent'
        }`}
      >
        <div className={`transition-opacity duration-200 ${dragX > 40 ? 'opacity-100' : 'opacity-0'} text-white font-bold flex items-center gap-2`}>
           <CheckCircle2 size={24} />
           {isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative transition-transform duration-200 ease-out ${className}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        {children}
      </div>
    </div>
  );
};

export const FixedExpenses: React.FC<FixedExpensesProps> = ({
  fixedExpenses,
  startDayOfMonth,
  endDayOfMonth,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showCreditCardDetails, setShowCreditCardDetails] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: (FixedExpense & { occurrenceDate: string }) | null }>({ isOpen: false, item: null });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [installments, setInstallments] = useState('12');

  useEffect(() => {
    const handleScroll = () => {
      setIsFabVisible(window.scrollY < 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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

  const activeItems = useMemo(() => {
    // Only filter for expenses, ignore any existing fixed incomes
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate).filter(i => i.type !== 'income');
  }, [fixedExpenses, startDate, endDate]);

  const activeExpenses = activeItems;

  const creditCardExpenses = useMemo(() => activeExpenses.filter(i => 
    i.title.toLowerCase().includes('cartão') || 
    i.category.toLowerCase().includes('cartão') ||
    i.title.toLowerCase().includes('fatura') ||
    i.title.toLowerCase().includes('card')
  ), [activeExpenses]);

  const otherExpenses = useMemo(() => activeExpenses.filter(i => 
    !creditCardExpenses.includes(i)
  ), [activeExpenses, creditCardExpenses]);

  const totalExpenses = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCreditCard = creditCardExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    const expenseData: FixedExpense = {
      id: editingId || uuidv4(),
      title,
      amount: parseFloat(amount),
      category: category || title,
      recurrence,
      startDate: formDate, 
      installments: recurrence === 'installments' ? parseInt(installments) : undefined,
      type: 'expense',
      excludedDates: editingId ? fixedExpenses.find(f => f.id === editingId)?.excludedDates : [],
      paidDates: editingId ? fixedExpenses.find(f => f.id === editingId)?.paidDates : []
    };

    if (editingId) {
      onUpdateExpense(expenseData);
    } else {
      onAddExpense(expenseData);
    }

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('');
    setAmount('');
    setFormDate('');
    setRecurrence('monthly');
    setInstallments('12');
  };

  const handleQuickCategory = (cat: string) => {
    if (cat === 'Cartão') {
      setCategory('Cartão');
    } else {
      setTitle(cat);
      setCategory(cat);
    }
  };

  const openForm = () => {
    resetForm();
    const today = new Date();
    if (today >= startDate && today <= endDate) {
        setFormDate(getISODate(today));
    } else {
        setFormDate(getISODate(startDate));
    }
    setShowForm(true);
  };

  const handleEdit = (item: FixedExpense) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setAmount(item.amount.toString());
    setRecurrence(item.recurrence);
    setInstallments(item.installments ? item.installments.toString() : '12');
    setFormDate(item.startDate);
    setShowForm(true);
  };

  const handleDeleteClick = (item: FixedExpense & { occurrenceDate: string }) => {
    if (item.recurrence === 'single') {
      onDeleteExpense(item.id);
    } else {
      setDeleteModal({ isOpen: true, item });
    }
  };

  const handleConfirmDelete = (mode: 'single' | 'all') => {
    if (!deleteModal.item) return;

    if (mode === 'all') {
      onDeleteExpense(deleteModal.item.id);
    } else {
      const currentItem = fixedExpenses.find(f => f.id === deleteModal.item!.id);
      if (currentItem) {
        const updatedExcluded = [...(currentItem.excludedDates || []), deleteModal.item.occurrenceDate];
        onUpdateExpense({ ...currentItem, excludedDates: updatedExcluded });
      }
    }
    setDeleteModal({ isOpen: false, item: null });
  };

  const handleTogglePaid = (item: FixedExpense & { occurrenceDate: string, isPaid: boolean }) => {
    const currentItem = fixedExpenses.find(f => f.id === item.id);
    if (!currentItem) return;

    const currentPaidDates = currentItem.paidDates || [];
    let updatedPaidDates;

    if (item.isPaid) {
        updatedPaidDates = currentPaidDates.filter(d => d !== item.occurrenceDate);
    } else {
        updatedPaidDates = [...currentPaidDates, item.occurrenceDate];
    }
    
    onUpdateExpense({ ...currentItem, paidDates: updatedPaidDates });
  };

  const renderList = (items: typeof activeItems) => (
    <div className="space-y-3">
       {items.map(item => {
         const isCreditCard = (
            item.title.toLowerCase().includes('cartão') || 
            item.category.toLowerCase().includes('cartão') ||
            item.title.toLowerCase().includes('fatura') ||
            item.title.toLowerCase().includes('card')
         );

         let remainingBalance = null;
         if (item.recurrence === 'installments' && item.currentInstallment && item.installments) {
             const remainingCount = item.installments - (item.currentInstallment - 1);
             remainingBalance = remainingCount * item.amount;
         }

         return (
         <SwipeableListItem 
            key={`${item.id}-${item.occurrenceDate}`}
            isPaid={item.isPaid}
            onTogglePaid={() => handleTogglePaid(item)}
            onClick={() => handleEdit(item)}
            className={`flex items-center justify-between p-3 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] bg-white dark:bg-slate-900 ${
               item.isPaid 
                 ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10' 
                 : isCreditCard 
                    ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' 
                    : 'border-slate-100 dark:border-slate-800'
            }`} 
         >
            <div className={`flex items-center gap-3 flex-1 min-w-0 ${item.isPaid ? 'opacity-60 grayscale-[0.5]' : ''}`}>
               <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center relative ${
                 isCreditCard
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
               }`}>
                  {isCreditCard ? <CreditCard size={18} /> : <Receipt size={18} />}
                  
                  {item.isPaid && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                          <CheckCircle2 size={10} strokeWidth={3} />
                      </div>
                  )}
               </div>
               <div className="min-w-0 flex-1">
                  {isCreditCard && (
                    <p className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5 leading-none truncate">
                      Cartão de Crédito
                    </p>
                  )}
                  <p className={`font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight ${item.isPaid ? 'line-through decoration-emerald-500/50' : ''}`}>
                      {item.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {item.recurrence === 'installments' && item.currentInstallment && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        {item.currentInstallment}/{item.installments}
                      </span>
                    )}
                    {item.recurrence === 'single' && (
                       <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap">
                          Única
                       </span>
                    )}
                    {item.recurrence === 'monthly' && (
                       <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">
                          Mensal
                       </span>
                    )}
                     {item.isPaid && (
                         <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">PAGO</span>
                     )}
                  </div>
               </div>
            </div>
            <div className={`flex flex-col items-end pl-2 shrink-0 ${item.isPaid ? 'opacity-60' : ''}`}>
               <span className={`font-bold text-sm whitespace-nowrap ${isCreditCard ? 'text-purple-700 dark:text-purple-400' : 'text-slate-900 dark:text-slate-100'}`}>
                 {formatCurrency(item.amount)}
               </span>
               
               {remainingBalance !== null && (
                   <span className="text-[9px] text-slate-400 font-medium mt-[-2px] whitespace-nowrap">
                       Resta: {formatCurrency(remainingBalance)}
                   </span>
               )}

               <div className="flex items-center -mr-1 mt-1">
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleEdit(item);
                   }}
                   className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
                 >
                   <Edit2 size={14} />
                 </button>
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleDeleteClick(item);
                   }}
                   className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                 >
                   <Trash2 size={14} />
                 </button>
               </div>
            </div>
         </SwipeableListItem>
       )})}
    </div>
  );

  const formTotalValue = useMemo(() => {
      if (recurrence === 'installments' && amount && installments) {
          return parseFloat(amount) * parseInt(installments);
      }
      return 0;
  }, [recurrence, amount, installments]);

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contas Fixas 🧾</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Contas do mês. <br/><span className="text-xs opacity-70">Deslize para direita para marcar como pago 👉</span></p>
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

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-rose-500 to-rose-700 text-white border-none shadow-lg shadow-rose-500/20 p-4">
             <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Total a Pagar</div>
             <div className="text-xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</div>
        </Card>
        <Card 
          onClick={() => setShowCreditCardDetails(true)}
          className="bg-gradient-to-br from-purple-600 to-violet-800 text-white border-none shadow-lg shadow-purple-500/20 cursor-pointer active:scale-[0.99] p-4"
        >
             <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1 flex items-center gap-1.5">
                    <CreditCard size={10} />
                    Cartão
                  </div>
                  <div className="text-xl font-bold tracking-tight">{formatCurrency(totalCreditCard)}</div>
                </div>
                <div className="text-[10px] text-white/60 mt-2 font-medium flex items-center gap-1 justify-end">
                  Ver <ChevronRight size={10} />
                </div>
             </div>
        </Card>
      </div>

      <div className="space-y-3">
         <div className="flex justify-between items-center px-2 mt-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={14} />
              Contas do Mês
            </h3>
            {activeExpenses.length === 0 && (
              <span className="text-[10px] text-slate-400">Nenhuma conta</span>
            )}
         </div>

         {creditCardExpenses.length > 0 && (
            <div 
                onClick={() => setShowCreditCardDetails(true)}
                className="flex items-center justify-between p-3 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <CreditCard size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-0.5 leading-none truncate">
                            Fatura Atual
                        </p>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight">
                            Cartão de Crédito
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-medium uppercase whitespace-nowrap">
                            {creditCardExpenses.length} lançamentos
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pl-2 shrink-0">
                <span className="font-bold text-sm whitespace-nowrap text-purple-700 dark:text-purple-400">
                    {formatCurrency(totalCreditCard)}
                </span>
                <ChevronRight size={16} className="text-purple-300 dark:text-purple-500" />
                </div>
            </div>
         )}

         {otherExpenses.length > 0 && renderList(otherExpenses)}
      </div>

      <button 
        onClick={openForm}
        className={`fixed bottom-32 right-6 z-50 w-16 h-16 bg-blue-600 rounded-[1.25rem] shadow-2xl shadow-blue-500/30 flex items-center justify-center text-white transition-all duration-300 border-4 border-slate-50 dark:border-slate-950 hover:bg-blue-500 ${
          isFabVisible 
            ? 'scale-100 opacity-100 translate-y-0' 
            : 'scale-0 opacity-0 translate-y-12 pointer-events-none'
        } active:scale-95`}
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {showCreditCardDetails && (
         <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-4 py-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
                 <button 
                    onClick={() => setShowCreditCardDetails(false)}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                 >
                    <ChevronLeft size={24} />
                 </button>
                 <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cartão de Crédito</h2>
                    <p className="text-xs text-slate-500">{periodLabel}</p>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
                 <div className="bg-gradient-to-br from-purple-600 to-violet-800 rounded-[2rem] p-6 text-white shadow-xl shadow-purple-500/20 mb-6">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <CreditCard size={18} />
                        <span className="text-sm font-bold uppercase tracking-wider">Fatura Atual</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalCreditCard)}</div>
                 </div>

                 <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-2">
                    Lançamentos
                 </h3>
                 
                 {creditCardExpenses.length > 0 ? (
                     renderList(creditCardExpenses)
                 ) : (
                     <div className="text-center py-10 text-slate-400">
                        <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhum lançamento de cartão neste período.</p>
                     </div>
                 )}
            </div>
         </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 mb-2 sm:mb-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar' : 'Adicionar'} Conta
              </h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Valor</label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-2xl pl-10 pr-3 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold transition-all border border-transparent"
                    inputMode="decimal"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Data de Vencimento</label>
                <input 
                  type="date" 
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none appearance-none transition-all font-medium border border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Aluguel"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleQuickCategory(cat)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                        category === cat
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
                  className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                    recurrence === 'monthly' 
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Repeat size={14} />
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('installments')}
                  className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                    recurrence === 'installments' 
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Clock size={14} />
                  Parcelas
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('single')}
                  className={`py-2 rounded-lg text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                    recurrence === 'single' 
                      ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Calendar size={14} />
                  Única
                </button>
              </div>

              {recurrence === 'installments' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Número de Parcelas</label>
                   <input 
                    type="number" 
                    min="1"
                    max="999"
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium text-sm"
                  />
                  {formTotalValue > 0 && (
                      <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <div className="bg-amber-200 dark:bg-amber-800 p-1 rounded-full">
                              <TrendingUp size={10} className="text-amber-800 dark:text-amber-200"/>
                          </div>
                          <div className="text-[10px] font-medium">
                             <span className="opacity-70 mr-1">Total:</span> 
                             <span className="font-bold text-xs">{formatCurrency(formTotalValue)}</span>
                          </div>
                      </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 mt-1 text-white bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"
              >
                {editingId ? 'Salvar Alterações' : 'Salvar Conta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div 
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
               onClick={() => setDeleteModal({ isOpen: false, item: null })}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
               <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Trash2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Item Recorrente</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                     Você deseja apagar somente deste mês ou parar de cobrar para sempre?
                  </p>
               </div>
               
               <div className="space-y-3">
                  <button 
                     onClick={() => handleConfirmDelete('single')}
                     className="w-full py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                     Apenas deste mês
                  </button>
                  <button 
                     onClick={() => handleConfirmDelete('all')}
                     className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 active:scale-95 transition-all"
                  >
                     Apagar Tudo (Todos os meses)
                  </button>
                  <button 
                     onClick={() => setDeleteModal({ isOpen: false, item: null })}
                     className="w-full py-2 text-slate-400 dark:text-slate-500 text-sm font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                     Cancelar
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};