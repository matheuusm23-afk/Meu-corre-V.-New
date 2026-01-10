
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
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
  const maxDays = getDaysInMonth(year, month);
  const day = Math.min(startDay, maxDays);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Calcula o intervalo do período de faturamento.
 * Respeita o dia de início e o dia de término (ou automático).
 */
export const getBillingPeriodRange = (referenceDate: Date, startDay: number, endDay?: number) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  // Lógica Automática Corrigida: 
  // Se endDay for undefined (Automático), o ciclo deve terminar no dia anterior ao início.
  // Se o início for dia 1, o término é o último dia do mês atual (getDaysInMonth).
  // Se o início for dia 15, o término é o dia 14.
  const actualEndDay = endDay !== undefined 
    ? endDay 
    : (startDay === 1 ? getDaysInMonth(year, month) : startDay - 1);

  // Data de início deste mês de referência (Clampado para o limite do mês, ex: 31/Nov vira 30/Nov)
  const currentStart = getCycleStartDate(year, month, startDay);
  
  // Data de término deste mês de referência
  const currentEnd = getCycleStartDate(year, month, actualEndDay);

  let startDate: Date;
  let endDate: Date;

  // Caso o ciclo atravesse a virada do mês (ex: Início 15, Fim 14)
  if (actualEndDay < startDay) {
    if (ref.getTime() >= currentStart.getTime()) {
      // Estamos na primeira parte do ciclo (do Início do mês atual até o Fim do mês seguinte)
      startDate = currentStart;
      endDate = getCycleStartDate(year, month + 1, actualEndDay);
    } else {
      // Estamos na segunda parte do ciclo (do Início do mês anterior até o Fim do mês atual)
      startDate = getCycleStartDate(year, month - 1, startDay);
      endDate = currentEnd;
    }
  } else {
    // Ciclo dentro do mesmo mês (ex: Início 01, Fim 30)
    if (ref.getTime() > currentEnd.getTime()) {
      // Referência após o fim do ciclo atual
      startDate = getCycleStartDate(year, month + 1, startDay);
      endDate = getCycleStartDate(year, month + 1, actualEndDay);
    } else if (ref.getTime() < currentStart.getTime()) {
      // Referência antes do início do ciclo atual
      startDate = getCycleStartDate(year, month - 1, startDay);
      endDate = getCycleStartDate(year, month - 1, actualEndDay);
    } else {
      // Dentro do intervalo
      startDate = currentStart;
      endDate = currentEnd;
    }
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
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
      // Tenta encontrar o dia no mês de início ou fim do período
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
