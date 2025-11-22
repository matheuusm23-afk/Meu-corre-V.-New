

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  type: TransactionType;
}

export type RecurrenceType = 'monthly' | 'installments' | 'single';

export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  startDate: string; // ISO Date (YYYY-MM-DD) indicating when this expense starts
  recurrence: RecurrenceType;
  installments?: number; // Total number of installments if recurrence is 'installments'
  type?: 'income' | 'expense'; // Added to support fixed incomes. Defaults to 'expense' if undefined.
  excludedDates?: string[]; // Array of ISO Date strings (YYYY-MM-DD) for specific occurrences that were deleted
}

export interface GoalSettings {
  monthlyGoal: number; // Deprecated in favor of dynamic calculation, but kept for structure
  monthlyGoals?: Record<string, number>; // Deprecated, kept for migration
  daysOff: string[]; // Array of ISO date strings (YYYY-MM-DD)
  startDayOfMonth: number; // 1-31
  endDayOfMonth?: number; // 1-31, or undefined for automatic (startDay - 1)
}

export type ViewMode = 'home' | 'goals' | 'settings' | 'fixed-expenses';

export interface SummaryData {
  income: number;
  expense: number;
  balance: number;
}