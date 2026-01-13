
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FixedExpense, RecurrenceType, CreditCard, TransactionType } from '../types';
import { formatCurrency, getBillingPeriodRange, getISODate, getFixedExpensesForPeriod, parseDateLocal } from '../utils';
import { Card } from './ui/Card';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Receipt, ScrollText, Calendar, Repeat, Clock, TrendingUp, TrendingDown, Wallet, Edit2, CreditCard as CardIcon, CheckCircle2, AlertCircle, Info, ShoppingBag, ChevronDown, ChevronUp } from './Icons';
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
  const [viewingHistoryCard, setViewingHistoryCard] = useState<CreditCard | null>(null);
  const [isCardsExpanded, setIsCardsExpanded] = useState(false);
  
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

  const mainMonthLabel = useMemo(() => {
    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(midPoint);
  }, [startDate, endDate]);

  const periodLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  }, [startDate, endDate]);

  const changePeriod = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const activeItems = useMemo(() => {
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
  }, [fixedExpenses, startDate, endDate]);

  const totalExpenses = useMemo(() => activeItems.filter(i => i.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0), [activeItems]);
  const totalIncomes = useMemo(() => activeItems.filter(i => i.type === 'income').reduce((acc, curr) => acc + curr.amount, 0), [activeItems]);
  const forecastValue = Math.max(0, totalExpenses - totalIncomes);

  // Calcula a fatura do mês atual por cartão
  const invoiceByCard = useMemo(() => {
    const totals: Record<string, number> = {};
    activeItems.forEach(item => {
      if (item.cardId && item.type === 'expense') {
        totals[item.cardId] = (totals[item.cardId] || 0) + item.amount;
      }
    });
    return totals;
  }, [activeItems]);

  // Calcula o total comprometido (saldo devedor total) de cada cartão
  const committedByCard = useMemo(() => {
    const totals: Record<string, number> = {};
    fixedExpenses.forEach(exp => {
      if (exp.cardId && exp.type === 'expense') {
        if (exp.recurrence === 'installments' && exp.installments) {
          totals[exp.cardId] = (totals[exp.cardId] || 0) + (exp.amount * exp.installments);
        } else {
          totals[exp.cardId] = (totals[exp.cardId] || 0) + exp.amount;
        }
      }
    });
    return totals;
  }, [fixedExpenses]);

  const creditCardExpenses = useMemo(() => activeItems.filter(i => !!i.cardId), [activeItems]);
  const otherItems = useMemo(() => activeItems.filter(i => !i.cardId), [activeItems]);
  const totalCardExpenses = useMemo(() => creditCardExpenses.reduce((acc, curr) => acc + curr.amount, 0), [creditCardExpenses]);

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

  const confirmDelete = () => {
    if (deleteModal.item) {
      onDeleteExpense(deleteModal.item.id);
      setDeleteModal({ isOpen: false, item: null });
    }
  };

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

    if (editingId) onUpdateExpense(expenseData);
    else onAddExpense(expenseData);

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
    setFormDate(getISODate(new Date()));
    setShowForm(true);
  };

  const renderList = (items: typeof activeItems) => (
    <div className="space-y-1.5">
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
            className={`flex items-center justify-between p-3 rounded-xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] bg-white dark:bg-slate-900 ${
               item.isPaid 
                 ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/10 opacity-70' 
                 : isIncome
                    ? 'border-emerald-100 dark:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : isCreditCard 
                      ? 'bg-purple-50/30 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/50' 
                      : 'border-slate-100 dark:border-slate-800'
            }`} 
         >
            <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center relative ${
                 isIncome
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : isCreditCard
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
               }`}>
                  {isIncome ? <TrendingUp size={14} /> : isCreditCard ? <CardIcon size={14} /> : <Receipt size={14} />}
                  {item.isPaid && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900">
                          <CheckCircle2 size={6} strokeWidth={4} />
                      </div>
                  )}
               </div>
               <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={`text-[7px] font-black uppercase tracking-widest leading-none ${isIncome ? 'text-emerald-600' : isCreditCard ? 'text-purple-600' : 'text-rose-500'}`}>
                      {isIncome ? 'Ganho' : isCreditCard ? 'No Cartão' : 'Gasto Fixo'}
                    </p>
                    {card && (
                      <span className="text-[6px] px-1 py-0.5 rounded-full font-black border border-purple-100 dark:border-purple-800 bg-white/50 dark:bg-slate-800/50" style={{ color: card.color }}>
                         {card.name}
                      </span>
                    )}
                  </div>
                  <p className={`font-black text-xs text-slate-900 dark:text-slate-100 truncate leading-none ${item.isPaid ? 'line-through opacity-50' : ''}`}>
                      {item.title}
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-2 pl-2 shrink-0">
               <span className={`font-black text-xs ${isIncome ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                 {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
               </span>
               <div className="flex items-center">
                 <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1 text-slate-300 hover:text-amber-500 transition-colors"><Edit2 size={12} /></button>
                 <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, item }); }} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
               </div>
            </div>
         </SwipeableListItem>
       )})}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-32 pt-4 px-1">
      <header className="px-2">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Fixas 🧾</h1>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Lançamentos Recorrentes</p>
      </header>

      {/* Selector - Compacted */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm mx-1">
        <button onClick={() => changePeriod(-1)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs font-black capitalize text-slate-900 dark:text-slate-100">{mainMonthLabel}</div>
          <div className="text-[9px] text-slate-500 font-bold">{periodLabel}</div>
        </div>
        <button onClick={() => changePeriod(1)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 rounded-xl transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-1">
        <div className="bg-blue-600 dark:bg-blue-700 p-2.5 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-500/20 border border-blue-400/30">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-lg text-white">
              <Info size={12} />
            </div>
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Déficit do Mês</span>
          </div>
          <div className="text-sm font-black text-white tracking-tight mr-1">
            {formatCurrency(forecastValue)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 px-1">
          <Card title="Ganhos Fixos" variant="success" className="p-2.5" valueClassName="text-sm">
             <div className="text-sm font-black tracking-tight">{formatCurrency(totalIncomes)}</div>
          </Card>
          <Card title="Gastos Fixos" variant="danger" className="p-2.5" valueClassName="text-sm">
             <div className="text-sm font-black tracking-tight">{formatCurrency(totalExpenses)}</div>
          </Card>
        </div>

        {creditCards.length > 0 && (
          <div className={`grid ${creditCards.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 px-1`}>
            {creditCards.map(card => {
              const monthInvoice = invoiceByCard[card.id] || 0;
              const committedTotal = committedByCard[card.id] || 0;
              const available = card.limit > 0 ? Math.max(0, card.limit - committedTotal) : null;
              
              return (
                <div 
                  key={card.id}
                  onClick={() => setViewingHistoryCard(card)}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-3 rounded-2xl active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }}></div>
                      <div className="text-[8px] font-black uppercase text-slate-500 truncate max-w-[60px]">{card.name}</div>
                    </div>
                    {available !== null && (
                      <div className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                         Livre: {formatCurrency(available)}
                      </div>
                    )}
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">{formatCurrency(monthInvoice)}</div>
                  <div className="text-[7px] text-slate-400 font-black uppercase mt-1 tracking-tight">Fatura do Mês</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2 mt-1 px-1">
         <div className="flex justify-between items-center px-2">
            <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <ScrollText size={12} /> Itens do Mês
            </h3>
         </div>
         {activeItems.length > 0 ? (
            <div className="space-y-2">
               {/* Lançamentos que NÃO são cartão */}
               {otherItems.length > 0 && renderList(otherItems)}
               
               {/* AGRUPAMENTO DE CARTÕES */}
               {creditCardExpenses.length > 0 && (
                 <div className="space-y-2 mt-1">
                    <div 
                      onClick={() => setIsCardsExpanded(!isCardsExpanded)}
                      className={`p-3 bg-purple-500/10 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all ${isCardsExpanded ? 'ring-2 ring-purple-500/20 shadow-lg' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                           <CardIcon size={20} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 leading-none mb-1">Resumo de Cartões</p>
                          <p className="font-black text-sm text-slate-900 dark:text-white leading-none">
                            {creditCardExpenses.length} lançamentos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-purple-700 dark:text-purple-400">{formatCurrency(totalCardExpenses)}</span>
                        {isCardsExpanded ? <ChevronUp size={16} className="text-purple-400" /> : <ChevronDown size={16} className="text-purple-400" />}
                      </div>
                    </div>

                    {isCardsExpanded && (
                      <div className="pl-2 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                         {renderList(creditCardExpenses)}
                      </div>
                    )}
                 </div>
               )}
            </div>
         ) : (
            <div className="text-center py-8 text-slate-400 bg-white/30 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
               <Receipt size={24} className="mx-auto mb-2 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">Sem previsões registradas</p>
            </div>
         )}
      </div>

      <button onClick={openForm} className="fixed bottom-28 right-4 z-50 w-10 h-10 bg-slate-900 dark:bg-white rounded-xl shadow-xl flex items-center justify-center text-white dark:text-slate-950 transition-all hover:scale-105 active:scale-95">
        <Plus size={20} strokeWidth={3} />
      </button>

      {/* Credit Card Details Modal */}
      {viewingHistoryCard && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewingHistoryCard(null)} />
           <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: viewingHistoryCard.color }}>
                      <CardIcon size={20} />
                   </div>
                   <div>
                     <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{viewingHistoryCard.name}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visão Geral do Cartão</p>
                   </div>
                </div>
                <button onClick={() => setViewingHistoryCard(null)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3 pb-6">
                {fixedExpenses.filter(e => e.cardId === viewingHistoryCard.id).length > 0 ? (
                  fixedExpenses
                    .filter(e => e.cardId === viewingHistoryCard.id)
                    .map(item => (
                      <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-none">{item.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] font-black uppercase bg-white dark:bg-slate-800 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-500">
                              {item.recurrence === 'monthly' ? 'Mensal' : item.recurrence === 'installments' ? `${item.installments}x` : 'Única'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                           <p className="font-black text-sm text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">Nenhum gasto fixo vinculado.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                 <div className="bg-slate-900 dark:bg-white p-4 rounded-2xl flex justify-between items-center shadow-xl">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-white/60 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Total Comprometido</span>
                       {viewingHistoryCard.limit > 0 && (
                          <span className="text-[11px] font-black text-emerald-500 uppercase">Disponível: {formatCurrency(Math.max(0, viewingHistoryCard.limit - (committedByCard[viewingHistoryCard.id] || 0)))}</span>
                       )}
                    </div>
                    <span className="text-xl font-black text-white dark:text-slate-900">
                       {formatCurrency(committedByCard[viewingHistoryCard.id] || 0)}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteModal({ isOpen: false, item: null })} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95">
             <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} />
             </div>
             <h3 className="text-center font-bold text-slate-900 dark:text-white mb-2 text-sm">Excluir Fixa?</h3>
             <p className="text-center text-[11px] text-slate-500 mb-6">Removerá este lançamento permanentemente de todos os meses futuros.</p>
             <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ isOpen: false, item: null })} className="flex-1 py-3 rounded-xl font-bold text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-[11px] text-white bg-rose-600 shadow-lg shadow-rose-500/20">Excluir</button>
             </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-5 shadow-2xl animate-in slide-in-from-bottom border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-lg font-black dark:text-white leading-none">{editingId ? 'Editar' : 'Novo'} Item Fixo</h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                  <TrendingUp size={16} /> Ganho
                </button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>
                  <TrendingDown size={16} /> Gasto
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">R$</span>
                  <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="w-full bg-slate-50 dark:bg-slate-950 text-2xl p-4 pl-12 rounded-2xl font-black focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
                </div>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="O que é? (ex: Internet)" className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl font-bold focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" />
              </div>

              {type === 'expense' && (
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardIcon size={16} className="text-purple-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Cartão?</span>
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
                    <div className="flex flex-col gap-2 pt-1 animate-in slide-in-from-top-2">
                      {creditCards.length > 0 ? (
                        creditCards.map(card => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setSelectedCardId(card.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedCardId === card.id ? 'bg-white dark:bg-slate-800 shadow-sm border-purple-500/50' : 'bg-slate-100/50 dark:bg-slate-900/50 opacity-60 border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }}></div>
                              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{card.name}</span>
                            </div>
                            {selectedCardId === card.id && <CheckCircle2 size={16} className="text-purple-500" />}
                          </button>
                        ))
                      ) : (
                        <div className="text-[9px] text-rose-500 font-black bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl text-center">
                          ADICIONE UM CARTÃO NOS AJUSTES
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Repeat size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recorrência</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                   {['monthly', 'installments', 'single'].map((r) => (
                      <button key={r} type="button" onClick={() => setRecurrence(r as RecurrenceType)} className={`py-2 rounded-xl text-[9px] font-black border transition-all ${recurrence === r ? 'bg-white dark:bg-slate-800 border-blue-500/50 shadow-sm text-blue-600' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400'}`}>
                         {r === 'monthly' ? 'MENSAL' : r === 'installments' ? 'PARCELADO' : 'AVULSO'}
                      </button>
                   ))}
                </div>
                {recurrence === 'installments' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest text-center">Quantidade de Parcelas</label>
                    <input 
                      type="number" 
                      value={installments} 
                      onChange={(e) => setInstallments(e.target.value)} 
                      placeholder="12" 
                      className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-lg font-black text-center focus:outline-none dark:text-white border border-slate-200 dark:border-slate-800" 
                    />
                  </div>
                )}
              </div>

              <button type="submit" className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl active:scale-95 transition-all mt-2 ${type === 'income' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-rose-600 shadow-rose-500/30'}`}>
                {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
