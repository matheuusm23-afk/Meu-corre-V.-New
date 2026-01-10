
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  type: TransactionType;
}

export type RecurrenceType = 'monthly' | 'installments' | 'single';

export interface CreditCard {
  id: string;
  name: string;
  color: string;
  limit: number;
}

export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TransactionType; // 'income' or 'expense'
  startDate: string; // ISO Date (YYYY-MM-DD) indicating when this expense starts
  recurrence: RecurrenceType;
  installments?: number; // Total number of installments if recurrence is 'installments'
  excludedDates?: string[]; // Array of ISO Date strings (YYYY-MM-DD) for specific occurrences that were deleted
  paidDates?: string[]; // Array of ISO Date strings (YYYY-MM-DD) for specific occurrences that were marked as paid
  cardId?: string; // Optional reference to a CreditCard
}

export interface GoalSettings {
  monthlyGoal: number; // Deprecated
  monthlyGoals?: Record<string, number>; // Deprecated
  daysOff: string[]; // Array of ISO date strings (YYYY-MM-DD)
  startDayOfMonth: number; // 1-31
  endDayOfMonth?: number; // 1-31, or undefined for automatic (startDay - 1)
  dailySavingTarget: number; // Valor que o usuário quer guardar por dia
  savingsDates: string[]; // Dias em que o usuário efetivamente guardou o dinheiro
  savingsAdjustments?: Record<string, number>; // Valores extras guardados por dia { "2024-12-20": 50 }
  savingsWithdrawals?: Record<string, number>; // Retiradas da reserva { "2024-12-25": 100 }
}

export type ViewMode = 'home' | 'goals' | 'yearly-goals' | 'settings' | 'fixed-expenses';

export interface SummaryData {
  income: number;
  expense: number;
  balance: number;
}
