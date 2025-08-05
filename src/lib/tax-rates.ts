export interface TaxRates {
  shortTermRate: number;
  longTermRate: number;
  allowance: number;
  currency: string;
  jurisdiction: string;
}

export const TAX_RATES: Record<string, TaxRates> = {
  UK: {
    shortTermRate: 0.20, // 20% for basic rate taxpayers
    longTermRate: 0.10,  // 10% for basic rate taxpayers
    allowance: 6000,     // £6,000 annual allowance (2024/25)
    currency: 'GBP',
    jurisdiction: 'UK'
  },
  US: {
    shortTermRate: 0.22, // 22% federal rate (varies by income)
    longTermRate: 0.15,  // 15% for most taxpayers
    allowance: 0,        // No annual allowance in US
    currency: 'USD',
    jurisdiction: 'US'
  },
  CA: {
    shortTermRate: 0.26, // 26% federal rate
    longTermRate: 0.13,  // 13% federal rate
    allowance: 0,        // No annual allowance
    currency: 'CAD',
    jurisdiction: 'CA'
  },
  AU: {
    shortTermRate: 0.325, // 32.5% for most taxpayers
    longTermRate: 0.325,  // Same rate for long-term in AU
    allowance: 0,         // No annual allowance
    currency: 'AUD',
    jurisdiction: 'AU'
  },
  DE: {
    shortTermRate: 0.42, // 42% for high earners
    longTermRate: 0.42,  // Same rate
    allowance: 600,      // €600 annual allowance
    currency: 'EUR',
    jurisdiction: 'DE'
  },
  FR: {
    shortTermRate: 0.30, // 30% flat rate
    longTermRate: 0.30,  // Same rate
    allowance: 0,        // No annual allowance
    currency: 'EUR',
    jurisdiction: 'FR'
  }
};

export function getTaxRates(jurisdiction: string): TaxRates {
  return TAX_RATES[jurisdiction] || TAX_RATES.UK;
}

export function calculateTax(gainLoss: number, isLongTerm: boolean, jurisdiction: string): number {
  const rates = getTaxRates(jurisdiction);
  const rate = isLongTerm ? rates.longTermRate : rates.shortTermRate;
  
  // Apply annual allowance
  if (gainLoss <= rates.allowance) {
    return 0;
  }
  
  const taxableAmount = Math.max(0, gainLoss - rates.allowance);
  return taxableAmount * rate;
} 