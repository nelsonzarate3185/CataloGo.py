/**
 * Utility functions for CataloGo Paraguayan SaaS application
 */

/**
 * Formats a numeric amount in Paraguayan Guaraníes (PYG).
 * Thousands separator is a period (dot) and there are absolutely no decimals.
 * Example: 150000 -> "Gs. 150.000"
 */
export function formatGS(amount: number): string {
  const cleanInteger = Math.round(amount || 0);
  const formattedNumber = cleanInteger.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Gs. ${formattedNumber}`;
}

/**
 * Generate a clean URL-friendly slug from a business name.
 * Example: "Nelson's Calzados S.A.!" -> "nelsons-calzados-sa"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // remove accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
    .trim()
    .replace(/\s+/g, '-') // collapse whitespace to single dash
    .replace(/-+/g, '-'); // collapse multiple dashes to single
}

/**
 * Safely normalizes and validates a phone number format into 595XXXXXXXXX.
 * Standard format: 595 followed by 9 digits (Paraguay mobile country prefix is 595).
 */
export function formatWhatsAppPhone(phone: string): string {
  // Extract only digits
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('595')) {
    return digits;
  }
  // If it starts with 098... or 98..., replace or prepend 595
  if (digits.startsWith('09') && digits.length === 10) {
    return '595' + digits.substring(1);
  }
  if (digits.startsWith('9') && digits.length === 9) {
    return '595' + digits;
  }
  return digits;
}
