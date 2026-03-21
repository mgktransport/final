/**
 * Date Utilities for MGK Transport Application
 * 
 * Supports two modes:
 * - LOCAL: Uses the browser's local timezone
 * - MOROCCO_UTC: Uses Morocco timezone (Africa/Casablanca, UTC+0/+1)
 * 
 * This module ensures consistent date handling across the application.
 */

// Morocco timezone identifier
export const MOROCCO_TIMEZONE = 'Africa/Casablanca';

// Date mode enum
export enum DateMode {
  LOCAL = 'LOCAL',
  MOROCCO_UTC = 'MOROCCO_UTC'
}

// Default mode - can be overridden by user preference
let currentDateMode: DateMode = DateMode.MOROCCO_UTC;

// Cache for the date mode from API
let dateModeLoaded = false;

/**
 * Set the current date mode
 */
export function setDateMode(mode: DateMode): void {
  currentDateMode = mode;
  dateModeLoaded = true;
}

/**
 * Get the current date mode
 */
export function getDateMode(): DateMode {
  return currentDateMode;
}

/**
 * Get the timezone to use based on current mode
 */
export function getTimezone(): string | undefined {
  if (currentDateMode === DateMode.MOROCCO_UTC) {
    return MOROCCO_TIMEZONE;
  }
  return undefined; // Use local timezone
}

/**
 * Create a UTC date at noon for a given date string (YYYY-MM-DD)
 * This avoids timezone issues where the date could shift by one day
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to UTC noon (12:00:00)
 */
export function createDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Use noon UTC to avoid any day shift issues
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Get today's date as a date-only string (YYYY-MM-DD)
 * 
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return formatDateToString(new Date());
}

/**
 * Convert a Date object to a date-only string (YYYY-MM-DD)
 * 
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToString(date: Date): string {
  const timezone = getTimezone();
  
  if (timezone) {
    // Use Morocco timezone
    const moroccoDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const year = moroccoDate.getFullYear();
    const month = String(moroccoDate.getMonth() + 1).padStart(2, '0');
    const day = String(moroccoDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else {
    // Use local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Format a date for display in French
 * 
 * @param date - Date object or date string
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const timezone = getTimezone();
  
  if (timezone) {
    // Use Morocco timezone for display
    return new Intl.DateTimeFormat('fr-MA', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } else {
    // Use local timezone
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }
}

/**
 * Format a date with time for display in French
 * 
 * @param date - Date object or date string
 * @returns Formatted datetime string (DD/MM/YYYY HH:MM)
 */
export function formatDateTimeDisplay(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const timezone = getTimezone();
  
  if (timezone) {
    // Use Morocco timezone for display
    return new Intl.DateTimeFormat('fr-MA', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } else {
    // Use local timezone
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
}

/**
 * Get month and year from a date
 * 
 * @param date - Date object
 * @returns Object with month (1-12) and year
 */
export function getMonthYear(date: Date): { month: number; year: number } {
  const timezone = getTimezone();
  
  if (timezone) {
    const moroccoDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return {
      month: moroccoDate.getMonth() + 1,
      year: moroccoDate.getFullYear(),
    };
  } else {
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  }
}

/**
 * Get month and year from a date string (YYYY-MM-DD)
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Object with month (1-12) and year
 */
export function getMonthYearFromString(dateStr: string): { month: number; year: number } {
  const [year, month] = dateStr.split('-').map(Number);
  return { month, year };
}

/**
 * Create a UTC date range for a given month/year
 * Used for filtering primes, avances, etc.
 * 
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Object with startDate and endDate as Date objects
 */
export function createMonthDateRangeUTC(month: number, year: number): { startDate: Date; endDate: Date } {
  // Start of month: 1st day at 00:00:00 UTC
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // End of month: 1st of next month at 00:00:00 UTC
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  
  return { startDate, endDate };
}

/**
 * Get days until a date (from now)
 * 
 * @param dateExpiration - Expiration date
 * @returns Number of days until expiration (negative if expired)
 */
export function getDaysUntil(dateExpiration: Date | string | null): number | null {
  if (!dateExpiration) return null;
  
  const expiration = typeof dateExpiration === 'string' ? new Date(dateExpiration) : dateExpiration;
  const now = new Date();
  
  const timezone = getTimezone();
  
  if (timezone) {
    // Use Morocco timezone
    const moroccoNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    moroccoNow.setHours(0, 0, 0, 0);
    
    const moroccoExpiration = new Date(expiration.toLocaleString('en-US', { timeZone: timezone }));
    moroccoExpiration.setHours(0, 0, 0, 0);
    
    return Math.ceil((moroccoExpiration.getTime() - moroccoNow.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // Use local timezone
    const localNow = new Date();
    localNow.setHours(0, 0, 0, 0);
    
    const localExpiration = new Date(expiration);
    localExpiration.setHours(0, 0, 0, 0);
    
    return Math.ceil((localExpiration.getTime() - localNow.getTime()) / (1000 * 60 * 60 * 24));
  }
}

/**
 * Check if a date is today
 * 
 * @param date - Date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDateToString(d) === getTodayDateString();
}

/**
 * Check if a date is in the past
 * 
 * @param date - Date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = getDaysUntil(d);
  return days !== null && days < 0;
}

/**
 * Get the current month and year
 * 
 * @returns Object with current month (1-12) and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  return getMonthYear(new Date());
}

/**
 * Month names in French
 */
export const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

/**
 * Get month name in French
 * 
 * @param month - Month number (1-12)
 * @returns Month name in French
 */
export function getMonthName(month: number): string {
  return MONTHS_FR[month - 1] || '';
}

/**
 * Parse a date string from input[type="date"] value
 * Ensures the date is stored as UTC at noon
 * 
 * @param inputValue - Value from input[type="date"] (YYYY-MM-DD)
 * @returns Date object set to UTC noon
 */
export function parseDateInput(inputValue: string): Date {
  return createDateUTC(inputValue);
}

/**
 * Get date string for an input[type="date"] from a Date object
 * 
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  return formatDateToString(d);
}

/**
 * Check if a salary has been paid for a specific month/year
 * 
 * @param salaires - Array of salaries
 * @param month - Month (1-12)
 * @param year - Year
 * @returns The paid salary if exists, null otherwise
 */
export function findPaidSalary<T extends { mois: number; annee: number; paye: boolean }>(
  salaires: T[] | undefined,
  month: number,
  year: number
): T | null {
  if (!salaires) return null;
  return salaires.find(s => s.mois === month && s.annee === year && s.paye) || null;
}

/**
 * Get display label for date mode
 */
export function getDateModeLabel(mode: DateMode): string {
  switch (mode) {
    case DateMode.LOCAL:
      return 'Local (fuseau horaire du navigateur)';
    case DateMode.MOROCCO_UTC:
      return 'UTC Maroc (Africa/Casablanca)';
    default:
      return 'Inconnu';
  }
}

/**
 * Initialize date mode from API settings
 * This should be called once when the app loads
 */
export async function initializeDateMode(): Promise<DateMode> {
  try {
    const response = await fetch('/api/parametres');
    if (response.ok) {
      const data = await response.json();
      const settings = data.data || [];
      const dateModeSetting = settings.find((s: { cle: string; valeur: string }) => s.cle === 'APP_DATE_MODE');
      
      if (dateModeSetting) {
        const mode = dateModeSetting.valeur as DateMode;
        if (mode === DateMode.LOCAL || mode === DateMode.MOROCCO_UTC) {
          currentDateMode = mode;
        }
      }
    }
  } catch (error) {
    console.error('Failed to load date mode setting:', error);
  }
  
  dateModeLoaded = true;
  return currentDateMode;
}
