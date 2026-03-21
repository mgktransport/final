// MGK Transport - Formatting Utilities

import { formatDateDisplay as formatDateUtil, formatDateTimeDisplay as formatDateTimeUtil, getDaysUntil } from './date-utils';

/**
 * Format a number as Moroccan Dirham currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('MAD', 'DH');
}

/**
 * Format a date to French locale (Morocco timezone)
 */
export function formatDate(date: Date | string | null | undefined): string {
  return formatDateUtil(date);
}

/**
 * Format a date with time (Morocco timezone)
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDateTimeUtil(date);
}

/**
 * Get days until expiration (uses app date mode setting)
 */
export function getDaysUntilExpiration(dateExpiration: Date | string | null): number | null {
  return getDaysUntil(dateExpiration);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  return phone;
}

/**
 * Format RIB (24 digits) - Format marocain
 * Format: XXX XXX XXXXXXXXXXXXXXXX XX (Code banque - Code guichet - Numéro compte - Clé RIB)
 * Exemple: 011 780 0000123456789012 34
 */
export function formatRIB(rib: string): string {
  if (!rib) return rib;
  // Supprimer tous les caractères non numériques
  const cleaned = rib.replace(/\D/g, '');
  if (cleaned.length !== 24) return rib;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 22)} ${cleaned.slice(22, 24)}`;
}

/**
 * Parse RIB from formatted string (remove spaces)
 */
export function parseRIB(rib: string): string {
  return rib.replace(/\s/g, '');
}

/**
 * Validate RIB format (24 digits)
 */
export function isValidRIB(rib: string): boolean {
  const cleaned = rib.replace(/\D/g, '');
  return cleaned.length === 24;
}
