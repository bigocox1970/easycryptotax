import { supabase } from '@/integrations/supabase/client';
import { taxDataScraper } from './tax-data-scraper';

export interface CountryTaxData {
  country: string;
  year: number;
  rates: TaxRate[];
  allowances: TaxAllowance[];
  rules: TaxRules;
  lastUpdated: Date;
  source: string;
}

export interface TaxRate {
  country: string;
  year: number;
  type: 'capital_gains' | 'income' | 'corporate';
  rate: number;
  threshold?: number;
  maxThreshold?: number;
  source: string;
  lastUpdated: Date;
}

export interface TaxAllowance {
  country: string;
  year: number;
  type: 'personal_allowance' | 'capital_gains_allowance';
  amount: number;
  currency: string;
  source: string;
  lastUpdated: Date;
}

export interface TaxRules {
  country: string;
  year: number;
  sameDayRule: boolean;
  bedAndBreakfastRule: boolean;
  washSaleRule: boolean;
  holdingPeriodDays?: number;
  source: string;
  lastUpdated: Date;
}

class TaxDataManager {
  private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly COUNTRIES = [
    { code: 'UK', name: 'United Kingdom', sources: ['HMRC'] },
    { code: 'US', name: 'United States', sources: ['IRS'] },
    { code: 'CA', name: 'Canada', sources: ['CRA'] },
    { code: 'AU', name: 'Australia', sources: ['ATO'] },
    { code: 'DE', name: 'Germany', sources: ['Bundesfinanzministerium'] },
    { code: 'FR', name: 'France', sources: ['Direction Générale des Finances Publiques'] },
    { code: 'NL', name: 'Netherlands', sources: ['Belastingdienst'] },
    { code: 'SE', name: 'Sweden', sources: ['Skatteverket'] },
    { code: 'NO', name: 'Norway', sources: ['Skatteetaten'] },
    { code: 'DK', name: 'Denmark', sources: ['Skat'] },
    { code: 'FI', name: 'Finland', sources: ['Verohallinto'] },
    { code: 'CH', name: 'Switzerland', sources: ['Eidgenössische Steuerverwaltung'] }
  ];

  async initializeTaxData(): Promise<void> {
    console.log('Initializing tax data for all supported countries...');
    
    for (const country of this.COUNTRIES) {
      await this.updateCountryTaxData(country.code);
    }
  }

  async updateCountryTaxData(countryCode: string): Promise<void> {
    try {
      console.log(`Updating tax data for ${countryCode}...`);
      
      const currentYear = new Date().getFullYear();
      
      // Get fresh data from scraper
      const taxData = await taxDataScraper.getTaxData(countryCode, currentYear);
      
      // Store in database
      await this.storeCountryTaxData(countryCode, currentYear, taxData);
      
      console.log(`Tax data updated for ${countryCode}`);
    } catch (error) {
      console.error(`Failed to update tax data for ${countryCode}:`, error);
    }
  }

  async getCountryTaxData(countryCode: string, year: number): Promise<CountryTaxData | null> {
    try {
      // First try to get from database
      const { data, error } = await supabase
        .from('tax_data')
        .select('*')
        .eq('country', countryCode)
        .eq('year', year)
        .single();

      if (error || !data) {
        // If not in database, try to fetch fresh data once
        console.log(`No data found for ${countryCode} ${year}, attempting to fetch...`);
        try {
          await this.updateCountryTaxData(countryCode);
          // Try to get the data again after updating
          const { data: newData, error: newError } = await supabase
            .from('tax_data')
            .select('*')
            .eq('country', countryCode)
            .eq('year', year)
            .single();
          
          if (newError || !newData) {
            console.log(`Failed to fetch data for ${countryCode} ${year}, using fallback`);
            return this.getFallbackTaxData(countryCode, year);
          }
          
          return this.parseTaxData(newData);
        } catch (updateError) {
          console.error(`Failed to update tax data for ${countryCode}:`, updateError);
          return this.getFallbackTaxData(countryCode, year);
        }
      }

      // Check if data is stale (older than 24 hours)
      const lastUpdated = new Date(data.last_updated);
      const isStale = Date.now() - lastUpdated.getTime() > this.UPDATE_INTERVAL;

      if (isStale) {
        // Update in background without blocking
        this.updateCountryTaxData(countryCode).catch(error => {
          console.error(`Background update failed for ${countryCode}:`, error);
        });
      }

      return this.parseTaxData(data);
    } catch (error) {
      console.error(`Failed to get tax data for ${countryCode}:`, error);
      return this.getFallbackTaxData(countryCode, year);
    }
  }

  async storeCountryTaxData(countryCode: string, year: number, data: any): Promise<void> {
    try {
      const taxData = {
        country: countryCode,
        year: year,
        rates: JSON.stringify(data.rates || []),
        allowances: JSON.stringify(data.allowances || []),
        rules: JSON.stringify(data.rules || {}),
        source: data.source || 'manual',
        last_updated: new Date().toISOString()
      };

      // Upsert to database
      const { error } = await supabase
        .from('tax_data')
        .upsert(taxData, { onConflict: 'country,year' });

      if (error) {
        console.error('Failed to store tax data:', error);
      }
    } catch (error) {
      console.error('Failed to store tax data:', error);
    }
  }

  private parseTaxData(dbData: any): CountryTaxData {
    return {
      country: dbData.country,
      year: dbData.year,
      rates: JSON.parse(dbData.rates || '[]'),
      allowances: JSON.parse(dbData.allowances || '[]'),
      rules: JSON.parse(dbData.rules || '{}'),
      lastUpdated: new Date(dbData.last_updated),
      source: dbData.source
    };
  }

  private getFallbackTaxData(countryCode: string, year: number): CountryTaxData {
    // Fallback data for when scraping fails
    const fallbackData: { [key: string]: CountryTaxData } = {
      'UK': {
        country: 'UK',
        year: year,
        rates: [
          {
            country: 'UK',
            year: year,
            type: 'capital_gains',
            rate: 10,
            threshold: 0,
            maxThreshold: 37700,
            source: 'fallback',
            lastUpdated: new Date()
          },
          {
            country: 'UK',
            year: year,
            type: 'capital_gains',
            rate: 20,
            threshold: 37700,
            source: 'fallback',
            lastUpdated: new Date()
          }
        ],
        allowances: [
          {
            country: 'UK',
            year: year,
            type: 'capital_gains_allowance',
            amount: 6000,
            currency: 'GBP',
            source: 'fallback',
            lastUpdated: new Date()
          }
        ],
        rules: {
          country: 'UK',
          year: year,
          sameDayRule: true,
          bedAndBreakfastRule: true,
          washSaleRule: false,
          holdingPeriodDays: 30,
          source: 'fallback',
          lastUpdated: new Date()
        },
        lastUpdated: new Date(),
        source: 'fallback'
      },
      'US': {
        country: 'US',
        year: year,
        rates: [
          {
            country: 'US',
            year: year,
            type: 'capital_gains',
            rate: 15,
            threshold: 0,
            maxThreshold: 445850,
            source: 'fallback',
            lastUpdated: new Date()
          }
        ],
        allowances: [],
        rules: {
          country: 'US',
          year: year,
          sameDayRule: false,
          bedAndBreakfastRule: false,
          washSaleRule: true,
          holdingPeriodDays: 30,
          source: 'fallback',
          lastUpdated: new Date()
        },
        lastUpdated: new Date(),
        source: 'fallback'
      }
    };

    return fallbackData[countryCode] || fallbackData['UK'];
  }

  async scheduleUpdates(): Promise<void> {
    // Schedule daily updates
    setInterval(async () => {
      console.log('Running scheduled tax data update...');
      await this.initializeTaxData();
    }, this.UPDATE_INTERVAL);
  }

  async getSupportedCountries(): Promise<Array<{ code: string; name: string }>> {
    return this.COUNTRIES.map(country => ({
      code: country.code,
      name: country.name
    }));
  }

  async getTaxRate(countryCode: string, year: number, income: number): Promise<number> {
    const taxData = await this.getCountryTaxData(countryCode, year);
    
    if (!taxData) {
      return 0;
    }

    // Find applicable tax rate based on income
    const applicableRate = taxData.rates.find(rate => 
      income >= (rate.threshold || 0) && 
      income <= (rate.maxThreshold || Infinity)
    );

    return applicableRate?.rate || 0;
  }

  async getAllowance(countryCode: string, year: number, type: string): Promise<number> {
    const taxData = await this.getCountryTaxData(countryCode, year);
    
    if (!taxData) {
      return 0;
    }

    const allowance = taxData.allowances.find(a => a.type === type);
    return allowance?.amount || 0;
  }
}

export const taxDataManager = new TaxDataManager(); 