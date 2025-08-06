import { supabase } from '../integrations/supabase/client';

interface TaxRate {
  country: string;
  year: number;
  type: string;
  rate: number;
  threshold: number;
  maxThreshold?: number;
  source: string;
  lastUpdated: string;
}

interface TaxAllowance {
  country: string;
  year: number;
  type: string;
  amount: number;
  currency: string;
  source: string;
  lastUpdated: string;
}

interface TaxRules {
  country: string;
  year: number;
  sameDayRule: boolean;
  bedAndBreakfastRule: boolean;
  washSaleRule: boolean;
  holdingPeriodDays: number;
  source: string;
  lastUpdated: string;
}

// Production UK Capital Gains Tax data (2020-2025)
const UK_TAX_DATA = {
  2020: {
    rates: [
      { country: 'UK', year: 2020, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37500, source: 'HMRC', lastUpdated: '2020-04-06T00:00:00Z' },
      { country: 'UK', year: 2020, type: 'capital_gains', rate: 20, threshold: 37500, source: 'HMRC', lastUpdated: '2020-04-06T00:00:00Z' }
    ],
    allowances: [
      { country: 'UK', year: 2020, type: 'capital_gains_allowance', amount: 12300, currency: 'GBP', source: 'HMRC', lastUpdated: '2020-04-06T00:00:00Z' }
    ],
    rules: { country: 'UK', year: 2020, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2020-04-06T00:00:00Z' }
  },
  2021: {
    rates: [
      { country: 'UK', year: 2021, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37500, source: 'HMRC', lastUpdated: '2021-04-06T00:00:00Z' },
      { country: 'UK', year: 2021, type: 'capital_gains', rate: 20, threshold: 37500, source: 'HMRC', lastUpdated: '2021-04-06T00:00:00Z' }
    ],
    allowances: [
      { country: 'UK', year: 2021, type: 'capital_gains_allowance', amount: 12300, currency: 'GBP', source: 'HMRC', lastUpdated: '2021-04-06T00:00:00Z' }
    ],
    rules: { country: 'UK', year: 2021, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2021-04-06T00:00:00Z' }
  },
  2022: {
    rates: [
      { country: 'UK', year: 2022, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37700, source: 'HMRC', lastUpdated: '2022-04-06T00:00:00Z' },
      { country: 'UK', year: 2022, type: 'capital_gains', rate: 20, threshold: 37700, source: 'HMRC', lastUpdated: '2022-04-06T00:00:00Z' }
    ],
    allowances: [
      { country: 'UK', year: 2022, type: 'capital_gains_allowance', amount: 12300, currency: 'GBP', source: 'HMRC', lastUpdated: '2022-04-06T00:00:00Z' }
    ],
    rules: { country: 'UK', year: 2022, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2022-04-06T00:00:00Z' }
  },
  2023: {
    rates: [
      { country: 'UK', year: 2023, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37700, source: 'HMRC', lastUpdated: '2023-04-06T00:00:00Z' },
      { country: 'UK', year: 2023, type: 'capital_gains', rate: 20, threshold: 37700, source: 'HMRC', lastUpdated: '2023-04-06T00:00:00Z' }
    ],
    allowances: [
      { country: 'UK', year: 2023, type: 'capital_gains_allowance', amount: 6000, currency: 'GBP', source: 'HMRC', lastUpdated: '2023-04-06T00:00:00Z' }
    ],
    rules: { country: 'UK', year: 2023, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2023-04-06T00:00:00Z' }
  },
  2024: {
    rates: [
      { country: 'UK', year: 2024, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37700, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' },
      { country: 'UK', year: 2024, type: 'capital_gains', rate: 20, threshold: 37700, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
    ],
    allowances: [
      { country: 'UK', year: 2024, type: 'capital_gains_allowance', amount: 3000, currency: 'GBP', source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
    ],
    rules: { country: 'UK', year: 2024, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
  },
  2025: {
    rates: [
      { country: 'UK', year: 2025, type: 'capital_gains', rate: 10, threshold: 0, maxThreshold: 37700, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' },
      { country: 'UK', year: 2025, type: 'capital_gains', rate: 20, threshold: 37700, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
    ],
          allowances: [
        { country: 'UK', year: 2025, type: 'capital_gains_allowance', amount: 3000, currency: 'GBP', source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
      ],
    rules: { country: 'UK', year: 2025, sameDayRule: true, bedAndBreakfastRule: true, washSaleRule: false, holdingPeriodDays: 30, source: 'HMRC', lastUpdated: '2024-04-06T00:00:00Z' }
  }
};

// US Capital Gains Tax data
const US_TAX_DATA = {
  2024: {
    rates: [
      {
        country: 'US',
        year: 2024,
        type: 'capital_gains',
        rate: 0,
        threshold: 0,
        maxThreshold: 44725,
        source: 'IRS',
        lastUpdated: '2024-01-01T00:00:00Z'
      },
      {
        country: 'US',
        year: 2024,
        type: 'capital_gains',
        rate: 15,
        threshold: 44725,
        maxThreshold: 518900,
        source: 'IRS',
        lastUpdated: '2024-01-01T00:00:00Z'
      },
      {
        country: 'US',
        year: 2024,
        type: 'capital_gains',
        rate: 20,
        threshold: 518900,
        source: 'IRS',
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    ],
    allowances: [],
    rules: {
      country: 'US',
      year: 2024,
      sameDayRule: false,
      bedAndBreakfastRule: false,
      washSaleRule: true,
      holdingPeriodDays: 30,
      source: 'IRS',
      lastUpdated: '2024-01-01T00:00:00Z'
    }
  }
};

export async function updateTaxRates() {
  try {
    console.log('Updating tax rates with production data for 2020-2025...');

    // Update UK data for all years (2020-2025)
    for (const year of [2020, 2021, 2022, 2023, 2024, 2025]) {
      const { error } = await supabase
        .from('tax_data')
        .upsert({
          country: 'UK',
          year: year,
          rates: UK_TAX_DATA[year].rates,
          allowances: UK_TAX_DATA[year].allowances,
          rules: UK_TAX_DATA[year].rules,
          source: 'HMRC',
          last_updated: new Date().toISOString()
        });

      if (error) {
        console.error(`Error updating UK ${year} tax data:`, error);
      } else {
        console.log(`Successfully updated UK ${year} tax data`);
      }
    }

    // Update US data for 2024
    const { error: us2024Error } = await supabase
      .from('tax_data')
      .upsert({
        country: 'US',
        year: 2024,
        rates: US_TAX_DATA[2024].rates,
        allowances: US_TAX_DATA[2024].allowances,
        rules: US_TAX_DATA[2024].rules,
        source: 'IRS',
        last_updated: new Date().toISOString()
      });

    if (us2024Error) {
      console.error('Error updating US 2024 tax data:', us2024Error);
    } else {
      console.log('Successfully updated US 2024 tax data');
    }

    console.log('Tax rates update completed');
  } catch (error) {
    console.error('Error updating tax rates:', error);
  }
}

// Function to potentially integrate with HMRC APIs in the future
export async function fetchHMRCTaxRates() {
  // This would be implemented when we have proper HMRC API credentials
  // and the specific API endpoints for tax rates
  console.log('HMRC API integration not yet implemented');
  
  // Example of how this might work:
  // const response = await fetch('https://api.service.hmrc.gov.uk/tax-rates/capital-gains', {
  //   headers: {
  //     'Authorization': `Bearer ${hmrcToken}`,
  //     'Accept': 'application/vnd.hmrc.1.0+json'
  //   }
  // });
  // return response.json();
} 