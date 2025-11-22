
import React, { useState, useMemo } from 'react';
import { FixedExpense, RecurrenceType } from '../types';
import { formatCurrency, getBillingPeriodRange, getISODate, getFixedExpensesForPeriod } from '../utils';
import { Card } from './ui/Card';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Receipt, ScrollText, Calendar, Repeat, Clock, TrendingUp, TrendingDown, Wallet, Edit2, CreditCard } from './Icons';
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
const INCOME_CATEGORIES = ['Salário', 'Aposentadoria', 'Aluguel', 'Benefício', 'Extra'];

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
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: (FixedExpense & { occurrenceDate: string }) | null }>({ isOpen: false, item: null });

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [formDate, setFormDate] = useState('');
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

  // Calculate active expenses for this period
  // Note: getFixedExpensesForPeriod now returns items with 'occurrenceDate'
  const activeItems = useMemo(() => {
    return getFixedExpensesForPeriod(fixedExpenses, startDate, endDate);
  }, [fixedExpenses, startDate, endDate]);

  const activeIncomes = activeItems.filter(i => i.type === 'income');
  const activeExpenses = activeItems.filter(i => i.type !== 'income');

  const totalIncome = activeIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  // Credit Card Specific Calculation
  const creditCardExpenses = activeExpenses.filter(i => 
    i.title.toLowerCase().includes('cartão') || 
    i.category.toLowerCase().includes('cartão') ||
    i.title.toLowerCase().includes('fatura') ||
    i.title.toLowerCase().includes('card')
  );
  const totalCreditCard = creditCardExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const netValue = totalExpenses - totalIncome;
  const isSurplus = netValue < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;

    const expenseData: FixedExpense = {
      id: editingId || uuidv4(),
      title,
      amount: parseFloat(amount),
      category: title,
      recurrence,
      // If editing, keep original start date unless explicitly changed by user logic (omitted for simplicity, assumes formDate is master)
      // For new items, formDate is used. If user is in a specific month view, formDate defaults to that month.
      startDate: formDate, 
      installments: recurrence === 'installments' ? parseInt(installments) : undefined,
      type: formType,
      excludedDates: editingId ? fixedExpenses.find(f => f.id === editingId)?.excludedDates : []
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
    setAmount('');
    setFormDate('');
    setRecurrence('monthly');
    setFormType('expense');
    setInstallments('12');
  };

  const handleQuickCategory = (cat: string) => {
    setTitle(cat);
  };

  const openForm = (type: 'income' | 'expense') => {
    resetForm();
    setFormType(type);
    
    // Default date logic:
    // If today is within the viewed period, use today.
    // Otherwise, use the start date of the viewed period.
    // This ensures new recurring expenses start from the VIEWED month onwards.
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
    setFormType(item.type || 'expense');
    setTitle(item.title);
    setAmount(item.amount.toString());
    setRecurrence(item.recurrence);
    setInstallments(item.installments ? item.installments.toString() : '12');
    setFormDate(item.startDate);
    setShowForm(true);
  };

  const handleDeleteClick = (item: FixedExpense & { occurrenceDate: string }) => {
    if (item.recurrence === 'single') {
      // Instant delete for single items
      onDeleteExpense(item.id);
    } else {
      // Show modal for recurring items
      setDeleteModal({ isOpen: true, item });
    }
  };

  const handleConfirmDelete = (mode: 'single' | 'all') => {
    if (!deleteModal.item) return;

    if (mode === 'all') {
      onDeleteExpense(deleteModal.item.id);
    } else {
      // Add current occurrence date to excluded list
      const currentItem = fixedExpenses.find(f => f.id === deleteModal.item!.id);
      if (currentItem) {
        const updatedExcluded = [...(currentItem.excludedDates || []), deleteModal.item.occurrenceDate];
        onUpdateExpense({ ...currentItem, excludedDates: updatedExcluded });
      }
    }
    setDeleteModal({ isOpen: false, item: null });
  };

  const renderList = (items: typeof activeItems, isIncome: boolean) => (
    <div className="space-y-3">
       {items.map(item => {
         const isCreditCard = !isIncome && (
            item.title.toLowerCase().includes('cartão') || 
            item.category.toLowerCase().includes('cartão') ||
            item.title.toLowerCase().includes('fatura') ||
            item.title.toLowerCase().includes('card')
         );

         return (
         <div 
            key={item.id} 
            className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.99] ${
               isCreditCard 
                 ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' 
                 : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            }`} 
            onClick={() => handleEdit(item)}
         >
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                 isIncome 
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                  : isCreditCard
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    : 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
               }`}>
                  {isIncome ? <TrendingUp size={18} /> : isCreditCard ? <CreditCard size={18} /> : <Receipt size={18} />}
               </div>
               <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.recurrence === 'installments' && item.currentInstallment && (
                      <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                        {item.currentInstallment}/{item.installments}
                      </span>
                    )}
                    {item.recurrence === 'single' && (
                       <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-md uppercase">
                          Única
                       </span>
                    )}
                    {item.recurrence === 'monthly' && (
                       <span className="text-[10px] text-slate-400 font-medium uppercase">
                          Mensal
                       </span>
                    )}
                     <span className="text-[10px] text-slate-400 font-medium uppercase">
                        {item.recurrence === 'installments' ? 'Parcelado' : ''}
                     </span>
                     {isCreditCard && (
                        <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md uppercase">
                          Cartão
                       </span>
                     )}
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <span className={`font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : isCreditCard ? 'text-purple-700 dark:text-purple-400' : 'text-slate-900 dark:text-slate-100'}`}>
                 {formatCurrency(item.amount)}
               </span>
               <div className="flex items-center -mr-2">
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleEdit(item);
                   }}
                   className="p-2 text-slate-300 hover:text-amber-500 transition-colors"
                 >
                   <Edit2 size={16} />
                 </button>
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleDeleteClick(item);
                   }}
                   className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
            </div>
         </div>
       )})}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-32 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Fixas & Recorrentes 🧾</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Contas e receitas do mês.</p>
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
        <Card className={`text-white border-none shadow-lg ${isSurplus ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/20' : 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/20'}`}>
             <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">{isSurplus ? 'Sobra Prevista' : 'Total a Pagar'}</div>
             <div className="text-xl font-bold tracking-tight">{formatCurrency(Math.abs(netValue))}</div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none shadow-lg shadow-blue-500/20">
             <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Receitas Fixas</div>
             <div className="text-xl font-bold tracking-tight">{formatCurrency(totalIncome)}</div>
        </Card>
        {/* New Credit Card Summary */}
        <Card className="col-span-2 bg-gradient-to-br from-purple-600 to-violet-800 text-white border-none shadow-lg shadow-purple-500/20">
             <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1 flex items-center gap-2">
                    <CreditCard size={12} />
                    Cartão de Crédito
                  </div>
                  <div className="text-2xl font-bold tracking-tight">{formatCurrency(totalCreditCard)}</div>
                </div>
                <div className="bg-white/20 p-3 rounded-xl text-white/90">
                   <CreditCard size={24} />
                </div>
             </div>
        </Card>
      </div>

      {/* Incomes Section */}
      {activeIncomes.length > 0 && (
        <div className="space-y-3">
           <div className="flex justify-between items-center px-2 mt-2">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={14} />
                Entradas Previstas
              </h3>
           </div>
           {renderList(activeIncomes, true)}
        </div>
      )}

      {/* Expenses Section */}
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
         {activeExpenses.length > 0 ? renderList(activeExpenses, false) : null}
      </div>

      {/* Floating Add Button */}
      <button 
        onClick={() => openForm('expense')}
        className="fixed bottom-32 right-6 z-50 w-16 h-16 bg-blue-600 rounded-[1.25rem] shadow-2xl shadow-blue-500/30 flex items-center justify-center text-white transition-all duration-300 active:scale-95 border-4 border-slate-50 dark:border-slate-950 hover:bg-blue-500"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Editar' : 'Adicionar'} Item
              </h3>
              <button onClick={() => setShowForm(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Type Toggle */}
              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex relative">
                <button
                  type="button"
                  onClick={() => setFormType('expense')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                    formType === 'expense' 
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Receipt size={16} />
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('income')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${
                    formType === 'income' 
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Wallet size={16} />
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Valor</label>
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
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Data de Início/Vencimento</label>
                <input 
                  type="date" 
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none appearance-none transition-all font-medium border border-transparent"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-2">A cobrança iniciará a partir desta data.</p>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={formType === 'income' ? "Ex: Salário" : "Ex: Aluguel"}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {(formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
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
                  Mensal
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
                   <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-bold tracking-wider">Número de {formType === 'income' ? 'Recebimentos' : 'Parcelas'}</label>
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
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-95 mt-2 text-white ${
                  formType === 'income' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                }`}
              >
                {editingId ? 'Salvar Alterações' : `Salvar ${formType === 'income' ? 'Receita' : 'Despesa'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Recurring Items */}
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
