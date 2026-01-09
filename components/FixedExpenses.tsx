
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FixedExpense, RecurrenceType, CreditCard, TransactionType } from '../types';
import { formatCurrency, getBillingPeriodRange, getISODate, getFixedExpensesForPeriod } from '../utils';
import { Card } from './ui/Card';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Receipt, ScrollText, Calendar, Repeat, Clock, TrendingUp, TrendingDown, Wallet, Edit2, CreditCard as CardIcon, CheckCircle2, AlertCircle, Info } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface FixedExpensesProps {
  fixedExpenses: FixedExpense[];
  creditCards: CreditCard[];
  startDayOfMonth: number;
  endDayOfMonth?: number;
  onAddExpense: (expense: FixedExpense) => void;
  onUpdateExpense: (expense: FixedExpense) => void;
  onDeleteExpense: (id: string) => void;
}

const EXPENSE_CATEGORIES = ['Aluguel', 'Financiamento', 'Internet', 'Alimentação', 'Luz', 'Água', 'Salário', 'Bônus', 'Cartão'];

// --- Swipeable Item Component ---
interface SwipeableListItemProps {
  children: React.ReactNode;
  onTogglePaid: () => void;
  isPaid: boolean;
  type: TransactionType;
  className?: string;
  onClick?: () => void;
}

const SwipeableListItem: React.FC<SwipeableListItemProps> = ({ children, onTogglePaid, isPaid, type, className, onClick }) => {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  
  const THRESHOLD = 100;
  const EDGE_MARGIN = 60; 

  const handleTouchStart = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    if (touchX > EDGE_MARGIN) {
      startX.current = null;
      return;
    }

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
    if (startX.current !== null && dragX > THRESHOLD) {
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
          dragX > 0 ? (isPaid ? 'bg-slate-300' : (type === 'income' ? 'bg-blue-500' : 'bg-emerald-500')) : 'bg-transparent'
        }`}
      >
        <div className={`transition-opacity duration-200 ${dragX > 40 ? 'opacity-100' : 'opacity-0'} text-white font-bold flex items-center gap-2`}>
           <CheckCircle2 size={24} />
           {isPaid ? 'Marcar como Pendente' : (type === 'income' ? 'Marcar como Recebido' : 'Marcar como Pago')}
        </div>
      </div>

      <div
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
  creditCards,
  startDayOfMonth,
  endDayOfMonth,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: (FixedExpense & { occurrenceDate: string }) | null }>({ isOpen: false, item: null });

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [installments, setInstallments] = useState('12');
  const [isCardExpense, setIsCardExpense] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>(undefined);

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
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
  }, [fixedExpenses, startDate, endDate]);

  const totalExpenses = activeItems.filter(i => i.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncomes = activeItems.filter(i => i.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  
  // Forecast: Total Expenses - Total Ganhos Fixos
  const forecastValue = Math.max(0, totalExpenses - totalIncomes);

  const totalsByCard = useMemo(() => {
    const totals: Record<string, number> = {};
    activeItems.forEach(exp => {
      if (exp.cardId) {
        totals[exp.cardId] = (totals[exp.cardId] || 0) + exp.amount;
      }
    });
    return totals;
  }, [activeItems]);

  const creditCardExpenses = useMemo(() => activeItems.filter(i => !!i.cardId), [activeItems]);
  const otherItems = useMemo(() => activeItems.filter(i => !i.cardId), [activeItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    const expenseData: FixedExpense = {
      id: editingId || uuidv4(),
      title,
      amount: parseFloat(amount),
      category: category || title,
      type,
      recurrence,
      startDate: formDate, 
      installments: recurrence === 'installments' ? parseInt(installments) : undefined,
      excludedDates: editingId ? fixedExpenses.find(f => f.id === editingId)?.excludedDates : [],
      paidDates: editingId ? fixedExpenses.find(f => f.id === editingId)?.paidDates : [],
      cardId: isCardExpense ? selectedCardId : undefined
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
    setType('expense');
    setRecurrence('monthly');
    setInstallments('12');
    setIsCardExpense(false);
    setSelectedCardId(undefined);
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
    setType(item.type || 'expense');
    setRecurrence(item.recurrence);
    setInstallments(item.installments ? item.installments.toString() : '12');
    setFormDate(item.startDate);
    setIsCardExpense(!!item.cardId);
    setSelectedCardId(item.cardId);
    setShowForm(true);
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

  const confirmDelete = () => {
    if (deleteModal.item) {
      onDeleteExpense(deleteModal.item.id);
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const renderList = (items: typeof activeItems) => (
    <div className="space-y-3">
       {items.map(item => {
         const card = creditCards.find(c => c.id === item.cardId);
         const isCreditCard = !!item.cardId;
         const isIncome = item.type === 'income';

         return (
         <SwipeableListItem 
            key={`${item.id}-${item.occurrenceDate}`}
            isPaid={item.isPaid}
            type={item.type}
            onTogglePaid={() => handleTogglePaid(item)}
            onClick={() => handleEdit(item)}
            className={`flex items-center justify-between p-3 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] bg-white dark:bg-slate-900 ${
               item.isPaid 
                 ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10' 
                 : isIncome
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : isCreditCard 
                      ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' 
                      : 'border-slate-100 dark:border-slate-800'
            }`} 
         >
            <div className={`flex items-center gap-3 flex-1 min-w-0 ${item.isPaid ? 'opacity-60 grayscale-[0.5]' : ''}`}>
               <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center relative ${
                 isIncome
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : isCreditCard
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
               }`}>
                  {isIncome ? <TrendingUp size={16} /> : isCreditCard ? <CardIcon size={16} /> : <Receipt size={16} />}
                  {item.isPaid && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                          <CheckCircle2 size={8} strokeWidth={3} />
                      </div>
                  )}
               </div>
               <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={`text-[8px] font-extrabold uppercase tracking-wider leading-none truncate ${isIncome ? 'text-emerald-600' : isCreditCard ? 'text-purple-600' : 'text-rose-500'}`}>
                      {isIncome ? 'Ganho Fixo' : isCreditCard ? 'Cartão' : 'Gasto Fixo'}
                    </p>
                    {card && (
                      <span className="text-[7px] px-1 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800" style={{ color: card.color }}>
                         {card.name}
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight ${item.isPaid ? 'line-through decoration-emerald-500/50' : ''}`}>
                      {item.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {item.recurrence === 'installments' && item.currentInstallment && (
                      <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded-md whitespace-nowrap">
                        {item.currentInstallment}/{item.installments}
                      </span>
                    )}
                    {item.recurrence === 'monthly' && (
                       <span className="text-[8px] text-slate-400 font-medium uppercase whitespace-nowrap">Mensal</span>
                    )}
                  </div>
               </div>
            </div>
            <div className={`flex flex-col items-end pl-2 shrink-0 ${item.isPaid ? 'opacity-60' : ''}`}>
               <span className={`font-bold text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600' : isCreditCard ? 'text-purple-700 dark:text-purple-400' : 'text-slate-900 dark:text-slate-100'}`}>
                 {isIncome ? '+ ' : '- '}{formatCurrency(item.amount)}
               </span>
               <div className="flex items-center -mr-1 mt-0.5">
                 <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1 text-slate-300 hover:text-amber-500"><Edit2 size={12} /></button>
                 <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, item }); }} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={12} /></button>
               </div>
            </div>
         </SwipeableListItem>
       )})}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-32 pt-4 px-2">
      <header className="px-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Fixas 🧾</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">Organize seus compromissos recorrentes.</p>
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

      <div className="px-2">
        <div className="bg-blue-600 dark:bg-blue-700 p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-lg text-white">
              <Info size={14} />
            </div>
            <span className="text-[10px] font-bold text-white/90 uppercase tracking-tight">Previsão Real</span>
          </div>
          <div className="text-base font-extrabold text-white tracking-tight">
            {formatCurrency(forecastValue)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Card title="Ganhos Fixos" variant="success" className="p-4">
             <div className="text-lg font-bold tracking-tight">{formatCurrency(totalIncomes)}</div>
          </Card>
          <Card title="Gastos Fixos" variant="danger" className="p-4">
             <div className="text-lg font-bold tracking-tight">{formatCurrency(totalExpenses)}</div>
          </Card>
        </div>

        {creditCards.length > 0 && (
          <div className={`grid ${creditCards.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {creditCards.map(card => {
              const cardTotal = totalsByCard[card.id] || 0;
              const available = card.limit > 0 ? card.limit - cardTotal : null;
              return (
                <Card 
                  key={card.id}
                  className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm p-3.5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }}></div>
                    <div className="text-[9px] font-bold uppercase text-slate-500 truncate">{card.name}</div>
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cardTotal)}</div>
                  {available !== null && (
                    <div className={`mt-1.5 text-[9px] font-bold ${available >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {available >= 0 ? 'Livre: ' : 'Faltou: '} {formatCurrency(Math.abs(available))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
         <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ScrollText size={12} /> Itens do Mês
            </h3>
         </div>
         {activeItems.length > 0 ? (
            <div className="space-y-3">
               {otherItems.length > 0 && renderList(otherItems)}
               {creditCardExpenses.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[9px] font-bold text-slate-400 uppercase ml-2 flex items-center gap-1">
                       <CardIcon size={10} /> No Cartão
                    </div>
                    {renderList(creditCardExpenses)}
                  </div>
               )}
            </div>
         ) : (
            <div className="text-center py-8 text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-[1.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <Receipt size={32} className="mx-auto mb-2 opacity-20" />
               <p className="text-xs font-medium">Nada previsto.</p>
            </div>
         )}
      </div>

      <button onClick={openForm} className="fixed bottom-32 right-6 z-50 w-14 h-14 bg-slate-900 dark:bg-white rounded-2xl shadow-2xl flex items-center justify-center text-white dark:text-slate-950 transition-all">
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Confirmation Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteModal({ isOpen: false, item: null })} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
             <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} />
             </div>
             <h3 className="text-center font-bold text-slate-900 dark:text-white mb-2 text-sm">Excluir Item?</h3>
             <p className="text-center text-[11px] text-slate-500 mb-6">Esta ação removerá o item permanentemente de todos os ciclos.</p>
             <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ isOpen: false, item: null })} className="flex-1 py-3 rounded-xl font-bold text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-[11px] text-white bg-rose-600 shadow-lg shadow-rose-500/20">Excluir</button>
             </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-5 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">{editingId ? 'Editar' : 'Novo'} Item Fixo</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                  <TrendingUp size={16} /> Ganho
                </button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>
                  <TrendingDown size={16} /> Gasto
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                  <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full bg-slate-50 dark:bg-slate-950 text-2xl p-4 pl-10 rounded-xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                </div>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome (ex: Aluguel / Salário)" className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl font-medium focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                <div className="flex flex-wrap gap-2">
                  {(type === 'expense' ? EXPENSE_CATEGORIES : ['Salário', 'Freelance', 'Bônus', 'Outros']).map(cat => (
                    <button 
                      key={cat} 
                      type="button" 
                      onClick={() => {
                        setCategory(cat);
                        if (cat === 'Cartão') setIsCardExpense(true);
                        else if (type === 'income') setIsCardExpense(false);
                      }} 
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${category === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD SELECTION SECTION */}
              {type === 'expense' && (
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardIcon size={16} className="text-purple-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">No Cartão?</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCardExpense(!isCardExpense);
                        if (!isCardExpense && creditCards.length > 0 && !selectedCardId) {
                          setSelectedCardId(creditCards[0].id);
                        }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isCardExpense ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isCardExpense ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {isCardExpense && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      {creditCards.length > 0 ? (
                        <div className="flex flex-col gap-2 pt-2">
                          {creditCards.map(card => (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => setSelectedCardId(card.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedCardId === card.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100/50 dark:bg-slate-900/50 opacity-60 border-transparent'}`}
                              style={{ borderColor: selectedCardId === card.id ? card.color : 'transparent' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }}></div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{card.name}</span>
                              </div>
                              {selectedCardId === card.id && <CheckCircle2 size={16} style={{ color: card.color }} />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg text-center">
                          Vá em Ajustes para adicionar cartões.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Repeat size={16} className="text-blue-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Recorrência</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                   <button type="button" onClick={() => setRecurrence('monthly')} className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${recurrence === 'monthly' ? 'bg-white dark:bg-slate-800 border-blue-500/50 shadow-sm text-blue-600' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400'}`}>Mensal</button>
                   <button type="button" onClick={() => setRecurrence('installments')} className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${recurrence === 'installments' ? 'bg-white dark:bg-slate-800 border-amber-500/50 shadow-sm text-amber-600' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400'}`}>Parcelas</button>
                   <button type="button" onClick={() => setRecurrence('single')} className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${recurrence === 'single' ? 'bg-white dark:bg-slate-800 border-purple-500/50 shadow-sm text-purple-600' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400'}`}>Avulsa</button>
                </div>
                {recurrence === 'installments' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Quantidade de Parcelas</label>
                    <input type="number" value={installments} onChange={e => setInstallments(e.target.value)} placeholder="Ex: 12" className="w-full bg-white dark:bg-slate-900 p-3 rounded-lg text-sm font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                  </div>
                )}
              </div>

              <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${type === 'income' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-600 shadow-rose-500/30'}`}>
                {editingId ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
