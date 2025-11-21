export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  type: TransactionType;
}

export interface GoalSettings {
  monthlyGoal: number;
  daysOff: string[]; // Array of ISO date strings (YYYY-MM-DD)
  startDayOfMonth: number; // 1-31
}

export type ViewMode = 'home' | 'goals' | 'settings';

export interface SummaryData {
  income: number;
  expense: number;
  balance: number;
}