import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate, isSameDay, isSameWeek, isSameMonth, getISODate, getWeekNumber } from '../utils';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Edit2, Calendar } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

type DetailView = 'none' | 'today' | 'week' | 'month';

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction 
}) => {
  const [detailView, setDetailView] = useState<DetailView>('none');
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  // Modal State for Add/Edit
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(getISODate(new Date()));

  const today = new Date();

  // Calculations
  const stats = useMemo(() => {
    const calc = (filterFn: (t: Transaction) => boolean) => {
      const filtered = transactions.filter(filterFn);
      const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return { income, expense, balance: income - expense, list: filtered };
    };

    return {
      today: calc(t => isSameDay(new Date(t.date), today)),
      week: calc(t => isSameWeek(new Date(t.date), today)),
      month: calc(t => isSameMonth(new Date(t.date), today)),
    };
  }, [transactions]);

  const handleOpenForm = (type: TransactionType, transactionToEdit?: Transaction) => {
    if (transactionToEdit) {
      setFormType(transactionToEdit.type);
      setFormAmount(transactionToEdit.amount.toString());
      setFormDesc(transactionToEdit.description);
      setFormDate(transactionToEdit.date.split('T')[0]);
      setIsEditingId(transactionToEdit.id);
    } else {
      setFormType(type);
      setFormAmount('');
      setFormDesc('');
      setFormDate(getISODate(new Date()));
      setIsEditingId(null);
    }
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDesc) return;

    const transactionData: Transaction = {
      id: isEditingId || uuidv4(),
      amount: parseFloat(formAmount),
      description: formDesc,
      type: formType,
      date: new Date(formDate + 'T12:00:00').toISOString(),
    };

    if (isEditingId) {
      onUpdateTransaction(transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    setShowForm(false);
  };

  // --- Sub-Views ---

  const renderTransactionList = (
    title: string, 
    list: Transaction[], 
    allowEdit: boolean, 
    groupedByWeek: boolean = false
  ) => {
    // Sort by date desc
    const sortedList = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let content;

    if (groupedByWeek) {
      // Group logic for Month view
      const weeks: Record<string, Transaction[]> = {};
      sortedList.forEach(t => {
        const weekNum = getWeekNumber(new Date(t.date));
        const key = `Semana ${weekNum}`;
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(t);
      });

      const currentWeekNum = getWeekNumber(today);

      content = Object.entries(weeks).map(([weekName, weekTransactions]) => {
        const weekNum = parseInt(weekName.replace('Semana ', ''));
        const isCurrentWeek = weekNum === currentWeekNum;
        // Prompt restriction: Can only edit PAST weeks in month view. Current week edited in Week view.
        const canEditThisGroup = !isCurrentWeek; 

        return (
          <div key={weekName} className="mb-6">
            <h3 className="text-slate-400 text-xs uppercase font-bold mb-3 sticky top-0 bg-slate-950 py-2">
              {weekName} {isCurrentWeek && <span className="text-amber-500">(Atual)</span>}
            </h3>
            <div className="space-y-3">
              {weekTransactions.map(t => (
                <TransactionItem 
                  key={t.id} 
                  t={t} 
                  canEdit={canEditThisGroup} 
                  onEdit={() => handleOpenForm(t.type, t)}
                  onDelete={() => onDeleteTransaction(t.id)}
                />
              ))}
            </div>
          </div>
        );
      });
    } else {
      // Standard list
      content = (
        <div className="space-y-3">
          {sortedList.length === 0 ? (
            <div className="text-slate-500 text-center py-10">Nenhuma movimentação.</div>
          ) : (
            sortedList.map(t => (
              <TransactionItem 
                key={t.id} 
                t={t} 
                canEdit={allowEdit} 
                onEdit={() => handleOpenForm(t.type, t)}
                onDelete={() => onDeleteTransaction(t.id)}
              />
            ))
          )}
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-slate-950 z-40 flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={() => setDetailView('none')} className="p-2 bg-slate-800 rounded-full text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           {content}
        </div>
        {!groupedByWeek && (
          <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
             <button 
               onClick={() => handleOpenForm('income')}
               className="flex-1 bg-emerald-600 active:bg-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
             >
               <Plus size={20} /> Ganho
             </button>
             <button 
               onClick={() => handleOpenForm('expense')}
               className="flex-1 bg-rose-600 active:bg-rose-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
             >
               <TrendingDown size={20} /> Despesa
             </button>
          </div>
        )}
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="flex flex-col gap-4 pb-24">
      <header className="pt-8 pb-4 px-2">
        <h1 className="text-2xl font-bold text-slate-100">Meu Corre 🏍️</h1>
        <p className="text-slate-400 text-sm">Visão geral dos seus ganhos</p>
      </header>

      {/* Cards */}
      <Card 
        title="Saldo do Dia" 
        value={formatCurrency(stats.today.balance)} 
        subtitle={`${stats.today.list.length} transações hoje`}
        icon={<Wallet className="text-emerald-400" />}
        onClick={() => setDetailView('today')}
        className="border-l-4 border-l-emerald-500"
      />

      <Card 
        title="Saldo da Semana" 
        value={formatCurrency(stats.week.balance)}
        subtitle="Toque para ver detalhes semanais"
        icon={<Calendar className="text-blue-400" />}
        onClick={() => setDetailView('week')}
        className="border-l-4 border-l-blue-500"
      />

      <Card 
        title="Saldo do Mês" 
        value={formatCurrency(stats.month.balance)}
        subtitle="Histórico mensal por semanas"
        icon={<TrendingUp className="text-amber-400" />}
        onClick={() => setDetailView('month')}
        className="border-l-4 border-l-amber-500"
      />

      {/* Detail Views (Modals) */}
      {detailView === 'today' && renderTransactionList('Movimentações de Hoje', stats.today.list, true)}
      {detailView === 'week' && renderTransactionList('Movimentações da Semana', stats.week.list, true)}
      {detailView === 'month' && renderTransactionList('Histórico Mensal', stats.month.list, false, true)}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {isEditingId ? 'Editar' : 'Adicionar'} {formType === 'income' ? 'Ganho' : 'Despesa'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">Valor</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-2xl p-4 rounded-xl focus:border-amber-500 focus:outline-none placeholder:text-slate-700"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Ex: Entrega iFood, Gasolina..."
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase font-bold">Data</label>
                <input 
                  type="date" 
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-xl focus:border-amber-500 focus:outline-none appearance-none"
                />
              </div>

              <button 
                type="submit"
                className={`w-full py-4 rounded-xl font-bold text-lg mt-4 transition-transform active:scale-95 ${
                  formType === 'income' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TransactionItemProps {
  t: Transaction;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ t, canEdit, onEdit, onDelete }) => (
  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
    <div className="flex gap-3 items-center">
      <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div>
        <div className="font-semibold text-slate-200">{t.description}</div>
        <div className="text-xs text-slate-500">{formatDate(t.date)}</div>
      </div>
    </div>
    <div className="text-right">
      <div className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
      </div>
      {canEdit && (
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={onEdit} className="text-slate-600 hover:text-amber-500 p-1"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="text-slate-600 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  </div>
);