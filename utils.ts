
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
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  }).format(new Date(dateStr));
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
