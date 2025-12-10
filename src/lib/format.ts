export function formatDateUTC(value: string | number | Date, locale = 'en-IN') {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { timeZone: 'UTC' });
  } catch {
    return '';
  }
}

export function formatDateTimeUTC(value: string | number | Date, locale = 'en-IN') {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(locale, { timeZone: 'UTC' });
  } catch {
    return '';
  }
}

// Convert amount to lakh (1 lakh = 100,000)
export function amountToLakh(amount: number): number {
  if (!amount || isNaN(amount)) return 0;
  return amount / 100000;
}

// Convert lakh to actual amount
export function lakhToAmount(lakh: number | string): number {
  if (!lakh || lakh === '') return 0;
  const num = typeof lakh === 'string' ? parseFloat(lakh) : lakh;
  if (isNaN(num)) return 0;
  return num * 100000;
}

// Format amount in lakh with "L" suffix
export function formatLakh(amount: number): string {
  if (!amount || isNaN(amount)) return '0L';
  const lakh = amountToLakh(amount);
  return `${lakh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;
}

// Standard currency formatter that always shows in lakh format
// Use this for all display purposes (cards, tables, stats, etc.)
export function formatCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return '₹0';
  const lakh = amountToLakh(amount);
  
  // For very large amounts (>= 100 lakh = 1 crore), show in crores
  if (lakh >= 100) {
    const crore = lakh / 100;
    return `₹${crore.toFixed(2)}Cr`;
  }
  
  // For amounts >= 1 lakh, show in lakh
  if (lakh >= 1) {
    return `₹${lakh.toFixed(2)}L`;
  }
  
  // For amounts < 1 lakh, show in thousands
  const thousands = amount / 1000;
  if (thousands >= 1) {
    return `₹${thousands.toFixed(1)}K`;
  }
  
  // For very small amounts, show full amount
  return `₹${amount.toLocaleString('en-IN')}`;
}
