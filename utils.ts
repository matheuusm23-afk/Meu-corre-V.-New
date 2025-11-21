export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateStr));
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
  return new Date(d.setDate(diff));
};

export const getWeekNumber = (date: Date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const isSameWeek = (d1: Date, d2: Date) => {
    // Simple check: same year and same week number
    if (d1.getFullYear() !== d2.getFullYear()) return false;
    return getWeekNumber(d1) === getWeekNumber(d2);
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
 * Uses clamped dates so setting startDay to 31 works for Feb (starts on 28/29).
 */
export const getBillingPeriodRange = (referenceDate: Date, startDay: number) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  // Calculate potential start date for the cycle belonging to the current calendar month
  // e.g. if today is Jan 5, startDay 10. Reference Month = Jan.
  // target start is Jan 10.
  const currentMonthCycleStart = getCycleStartDate(year, month, startDay);
  
  let startDate: Date;
  let endDate: Date;

  if (referenceDate.getTime() >= currentMonthCycleStart.getTime()) {
    // We are in the cycle that started this month
    // Cycle: [Month X, StartDay] to [Month X+1, StartDay - 1]
    startDate = currentMonthCycleStart;
    const nextMonthCycleStart = getCycleStartDate(year, month + 1, startDay);
    endDate = new Date(nextMonthCycleStart);
    endDate.setDate(endDate.getDate() - 1);
  } else {
    // We are in the cycle that started LAST month
    // Cycle: [Month X-1, StartDay] to [Month X, StartDay - 1]
    startDate = getCycleStartDate(year, month - 1, startDay);
    endDate = new Date(currentMonthCycleStart);
    endDate.setDate(endDate.getDate() - 1);
  }

  // Normalize times
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const isDateInBillingPeriod = (dateToCheck: Date, referenceDate: Date, startDay: number) => {
  const { startDate, endDate } = getBillingPeriodRange(referenceDate, startDay);
  const check = new Date(dateToCheck);
  return check.getTime() >= startDate.getTime() && check.getTime() <= endDate.getTime();
};