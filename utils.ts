
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
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

export const getCycleStartDate = (year: number, month: number, startDay: number) => {
  const maxDays = new Date(year, month + 1, 0).getDate();
  const day = Math.min(startDay, maxDays);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Calcula o intervalo do período de faturamento.
 * Ex: Se começa dia 11 de Jan, termina dia 10 de Fev.
 */
export const getBillingPeriodRange = (referenceDate: Date, startDay: number, explicitEndDay?: number) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  // Normalize reference date to start of day for accurate comparison
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  if (explicitEndDay === undefined) {
    const currentMonthStart = getCycleStartDate(year, month, startDay);
    
    let startDate: Date;
    let endDate: Date;

    if (ref.getTime() >= currentMonthStart.getTime()) {
      // Período que começou NESTE mês (ex: 11 Jan)
      startDate = currentMonthStart;
      // Termina no dia anterior ao início do próximo ciclo (ex: 10 Fev)
      const nextMonthStart = getCycleStartDate(year, month + 1, startDay);
      endDate = new Date(nextMonthStart);
      endDate.setDate(endDate.getDate() - 1);
    } else {
      // Período que começou no mês PASSADO (ex: 11 Dez)
      startDate = getCycleStartDate(year, month - 1, startDay);
      // Termina no dia anterior ao ciclo atual (ex: 10 Jan)
      endDate = new Date(currentMonthStart);
      endDate.setDate(endDate.getDate() - 1);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // MODO MANUAL (Fim de Ciclo definido pelo usuário)
  const closingDay = explicitEndDay;
  const closingDateThisMonth = getCycleStartDate(year, month, closingDay);
  
  let startDate: Date;
  let endDate: Date;

  if (ref.getTime() > closingDateThisMonth.getTime()) {
    startDate = getCycleStartDate(year, month, closingDay + 1);
    endDate = getCycleStartDate(year, month + 1, closingDay);
  } else {
    startDate = getCycleStartDate(year, month - 1, closingDay + 1);
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

export const parseDateLocal = (dateStr: string) => {
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [y, m, d] = cleanDateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getFixedExpensesForPeriod = (
  expenses: FixedExpense[], 
  periodStart: Date, 
  periodEnd: Date
) => {
  return expenses.map(expense => {
    const startDate = parseDateLocal(expense.startDate);
    if (startDate > periodEnd) return null;

    let currentOccurrenceDate: Date | null = null;

    if (expense.recurrence === 'single') {
      if (startDate.getTime() >= periodStart.getTime() && startDate.getTime() <= periodEnd.getTime()) {
          currentOccurrenceDate = startDate;
      }
    } else {
      const targetDay = startDate.getDate();
      let candidateDate = new Date(periodStart.getFullYear(), periodStart.getMonth(), Math.min(targetDay, getDaysInMonth(periodStart.getFullYear(), periodStart.getMonth())));
      
      if (candidateDate < periodStart) {
        candidateDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), Math.min(targetDay, getDaysInMonth(periodEnd.getFullYear(), periodEnd.getMonth())));
      }

      if (candidateDate >= periodStart && candidateDate <= periodEnd && candidateDate >= startDate) {
        currentOccurrenceDate = candidateDate;
      }
    }

    if (currentOccurrenceDate) {
        const occurrenceStr = getISODate(currentOccurrenceDate);
        if (expense.excludedDates?.includes(occurrenceStr)) {
            return null;
        }

        const isPaid = expense.paidDates?.includes(occurrenceStr) || false;
        
        const baseReturn = {
           ...expense, 
           occurrenceDate: occurrenceStr,
           isPaid
        };

        if (expense.recurrence === 'single' || expense.recurrence === 'monthly') {
           return { ...baseReturn, currentInstallment: null };
        }

        if (expense.recurrence === 'installments' && expense.installments) {
          const startMonthIndex = startDate.getFullYear() * 12 + startDate.getMonth();
          const currentMonthIndex = currentOccurrenceDate!.getFullYear() * 12 + currentOccurrenceDate!.getMonth();
          const monthDiff = currentMonthIndex - startMonthIndex;
          
          if (monthDiff >= 0 && monthDiff < expense.installments) {
            return { ...baseReturn, currentInstallment: monthDiff + 1 };
          }
        }
    }
    return null;
  }).filter((e): e is (FixedExpense & { currentInstallment: number | null, occurrenceDate: string, isPaid: boolean }) => e !== null);
};
