
import { getCountryByCode, DEFAULT_COUNTRY, type CountryCode } from './countries-data';

/**
 * Get a converted price from a base XOF (FCFA) amount to the target country's currency.
 * Using approximate fixed rates for demonstration/landing purposes.
 * 
 * @param baseXOF - Amount in FCFA (XOF)
 * @param targetCountryCode - Destination country code
 * @returns Converted amount
 */
export function getConvertedPrice(baseXOF: number | undefined, targetCountryCode: CountryCode = DEFAULT_COUNTRY): number {
  if (baseXOF === undefined || baseXOF === null || baseXOF === 0) return 0;
  
  const country = getCountryByCode(targetCountryCode);
  const currencyCode = country?.currencyCode || 'XOF';
  
  switch (currencyCode) {
    case 'XOF':
    case 'XAF':
      return baseXOF; // 1:1 ratio for CFA zones
    case 'GNF':
      return baseXOF * 15; // Approx 15 GNF per FCFA
    case 'CDF':
      return Math.round(baseXOF * 5 / 100) * 100; // Approx 5 CDF per FCFA
    case 'MGA':
      return Math.round(baseXOF * 8 / 100) * 100; // Approx 8 MGA per FCFA
    case 'HTG':
      return Math.round(baseXOF * 0.2); // Approx 0.2 HTG per FCFA
    case 'EUR':
      return Number((baseXOF / 655.957).toFixed(2)); // Official fixed rate
    default:
      return baseXOF;
  }
}

/**
 * Format a monetary amount with the correct currency symbol for a given country.
 *
 * @param amount  - The numeric amount to format.
 * @param countryCode - ISO country code (defaults to 'CI').
 * @param shouldConvert - If true, treats the amount as XOF and converts it first.
 * @returns A locale-formatted string, e.g. "250 000 FCFA", "15 000 GNF", "500,00 €".
 */
export function formatCurrency(
  amount: number | undefined, 
  countryCode: CountryCode = DEFAULT_COUNTRY,
  shouldConvert: boolean = false
): string {
  const finalAmount = shouldConvert ? getConvertedPrice(amount, countryCode) : amount;
  
  if (finalAmount === undefined || finalAmount === null) {
    return `0 ${getCountryByCode(countryCode)?.currency || 'FCFA'}`;
  }

  const country = getCountryByCode(countryCode);
  if (!country) {
    return `${finalAmount.toLocaleString('fr-FR')} FCFA`;
  }

  // For EUR use Intl built-in currency formatting
  if (country.currencyCode === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(finalAmount);
  }

  // For all other currencies, use the display symbol from countries-data
  return `${finalAmount.toLocaleString('fr-FR')} ${country.currency}`;
}

/**
 * Get the display currency symbol for a country (e.g. "FCFA", "GNF", "€").
 */
export function getCurrencySymbol(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  return getCountryByCode(countryCode)?.currency || 'FCFA';
}

/**
 * Get the ISO currency code for a country (e.g. "XOF", "GNF", "EUR").
 */
export function getCurrencyCode(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  return getCountryByCode(countryCode)?.currencyCode || 'XOF';
}

/**
 * Get the full currency name (e.g. "FRANCS CFA", "FRANCS GUINÉENS", "EUROS").
 */
export function getCurrencyName(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  const code = getCurrencyCode(countryCode);
  switch (code) {
    case 'XOF':
    case 'XAF':
      return 'FRANCS CFA';
    case 'GNF':
      return 'FRANCS GUINÉENS';
    case 'CDF':
      return 'FRANCS CONGOLAIS';
    case 'MGA':
      return 'ARIARY';
    case 'HTG':
      return 'GOURDES';
    case 'EUR':
      return 'EUROS';
    default:
      return 'FRANCS CFA';
  }
}

/**
 * Format currency for use in Intl.NumberFormat (analytics charts, etc.)
 */
export function formatCurrencyIntl(
  amount: number, 
  countryCode: CountryCode = DEFAULT_COUNTRY,
  shouldConvert: boolean = false
): string {
  const finalAmount = shouldConvert ? getConvertedPrice(amount, countryCode) : amount;
  const country = getCountryByCode(countryCode);
  const code = country?.currencyCode || 'XOF';
  const symbol = country?.currency || 'CFA';

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(finalAmount).replace(code, symbol);
  } catch {
    // Fallback if currency code is not supported by Intl
    return `${finalAmount.toLocaleString('fr-FR')} ${symbol}`;
  }
}
