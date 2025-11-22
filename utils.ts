
import { FixedExpense } from './types';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string | Date) => {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(d);
};

export const formatDateFull = (dateStr: string) => {
  const d = typeof dateStr === 'string' ? parseDateLocal(dateStr) : dateStr;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).format(d);
};

// Helper to get ISO date part only YYYY-MM-DD
export const getISODate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when week starts (Monday)
  const newDate = new Date(d.setDate(diff));
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getWeekNumber = (date: Date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const isSameWeek = (d1: Date, d2: Date) => {
    const start1 = getStartOfWeek(d1);
    const start2 = getStartOfWeek(d2);
    return start1.getTime() === start2.getTime();
};

export const isSameMonth = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
};

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Helper to get a date clamped to the number of days in that month.
 * e.g. getCycleStartDate(2024, 1, 31) returns Feb 29, 2024 (Leap year) instead of Mar 2.
 */
export const getCycleStartDate = (year: number, month: number, startDay: number) => {
  const maxDays = new Date(year, month + 1, 0).getDate();
  const day = Math.min(startDay, maxDays);
  return new Date(year, month, day);
};

/**
 * Calculates the start and end date of the billing period for a given reference date.
 * Supports automatic (contiguous) cycles or custom start/end days.
 */
export const getBillingPeriodRange = (referenceDate: Date, startDay: number, explicitEndDay?: number) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  // AUTO MODE: If no explicit end day, use standard logic (End = Start - 1)
  if (explicitEndDay === undefined) {
    const currentMonthCycleStart = getCycleStartDate(year, month, startDay);
    
    let startDate: Date;
    let endDate: Date;

    if (referenceDate.getTime() >= currentMonthCycleStart.getTime()) {
      // We are in the cycle that started this month
      startDate = currentMonthCycleStart;
      const nextMonthCycleStart = getCycleStartDate(year, month + 1, startDay);
      endDate = new Date(nextMonthCycleStart);
      endDate.setDate(endDate.getDate() - 1);
    } else {
      // We are in the cycle that started LAST month
      startDate = getCycleStartDate(year, month - 1, startDay);
      endDate = new Date(currentMonthCycleStart);
      endDate.setDate(endDate.getDate() - 1);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // MANUAL MODE (Linked Logic)
  // Rule: If Closing Day is X, Start Day is ALWAYS X + 1.
  
  const closingDay = explicitEndDay;
  const derivedStartDay = closingDay + 1;

  // Check the Closing Date for the CURRENT calendar month of the reference date.
  const closingDateThisMonth = getCycleStartDate(year, month, closingDay);
  
  let startDate: Date;
  let endDate: Date;

  if (referenceDate.getTime() > closingDateThisMonth.setHours(23, 59, 59, 999)) {
    // We are PAST the closing date of this month.
    // Cycle is: Start [Day+1] of This Month -> End [Day] of Next Month.
    startDate = getCycleStartDate(year, month, derivedStartDay);
    endDate = getCycleStartDate(year, month + 1, closingDay);
  } else {
    // We are BEFORE or ON the closing date of this month.
    // Cycle is: Start [Day+1] of Last Month -> End [Day] of This Month.
    startDate = getCycleStartDate(year, month - 1, derivedStartDay);
    endDate = getCycleStartDate(year, month, closingDay);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const isDateInBillingPeriod = (dateToCheck: Date, referenceDate: Date, startDay: number, endDay?: number) => {
  const { startDate, endDate } = getBillingPeriodRange(referenceDate, startDay, endDay);
  const check = new Date(dateToCheck);
  return check.getTime() >= startDate.getTime() && check.getTime() <= endDate.getTime();
};

/**
 * Helper to safely parse YYYY-MM-DD (or ISO) to a Local Date object (00:00:00)
 * Correctly handles strings to avoid UTC timezone shifts.
 */
export const parseDateLocal = (dateStr: string) => {
  // Handle full ISO strings by taking the first part
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [y, m, d] = cleanDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Returns the list of fixed expenses that are active for a given billing cycle period.
 */
export const getFixedExpensesForPeriod = (
  expenses: FixedExpense[], 
  periodStart: Date, 
  periodEnd: Date
) => {
  return expenses.map(expense => {
    // Use local parsing to ensure YYYY-MM-DD matches the local date period start/end
    const startDate = parseDateLocal(expense.startDate);
    
    // If expense starts after this period ends, it doesn't count
    if (startDate > periodEnd) return null;

    if (expense.recurrence === 'single') {
      // For single expenses, the startDate acts as the occurrence date.
      // We check if this date falls strictly within the current billing period.
      // Using getTime() for safe comparison
      if (startDate.getTime() >= periodStart.getTime() && startDate.getTime() <= periodEnd.getTime()) {
          return { ...expense, currentInstallment: null };
      }
      return null;
    }

    if (expense.recurrence === 'monthly') {
      return { ...expense, currentInstallment: null };
    }

    if (expense.recurrence === 'installments' && expense.installments) {
      // Calculate month difference to see if it's still valid
      // Simple approximation using year/month math
      const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
      const currentMonthIndex = periodStart.getFullYear() * 12 + periodStart.getMonth();
      
      const monthDiff = currentMonthIndex - startMonthIndex;
      
      // Note: monthDiff 0 is the first installment (1/X)
      if (monthDiff >= 0 && monthDiff < expense.installments) {
        return { ...expense, currentInstallment: monthDiff + 1 };
      }
    }
    return null;
  }).filter((e): e is (FixedExpense & { currentInstallment: number | null }) => e !== null);
};
