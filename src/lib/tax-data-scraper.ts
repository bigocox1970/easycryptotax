import axios from 'axios';
import * as cheerio from 'cheerio';

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

class TaxDataScraper {
  private cache: Map<string, any> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  async scrapeUKTaxRates(): Promise<TaxRate[]> {
    try {
      const response = await axios.get('https://www.gov.uk/capital-gains-tax/rates');
      const $ = cheerio.load(response.data);
      
      const rates: TaxRate[] = [];
      
      // Extract rates from HMRC page
      $('.govuk-table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const threshold = this.extractNumber($(cells[0]).text());
            const rate = this.extractNumber($(cells[1]).text());
            
            if (threshold !== null && rate !== null) {
              rates.push({
                country: 'UK',
                year: new Date().getFullYear(),
                type: 'capital_gains',
                rate: rate,
                threshold: threshold,
                source: 'https://www.gov.uk/capital-gains-tax/rates',
                lastUpdated: new Date()
              });
            }
          }
        });
      });
      
      return rates;
    } catch (error) {
      console.error('Failed to scrape UK tax rates:', error);
      return this.getFallbackUKRates();
    }
  }

  async scrapeUKAllowances(): Promise<TaxAllowance[]> {
    try {
      const response = await axios.get('https://www.gov.uk/capital-gains-tax/allowances');
      const $ = cheerio.load(response.data);
      
      const allowances: TaxAllowance[] = [];
      
      // Extract allowance amounts
      $('.govuk-body').each((_, element) => {
        const text = $(element).text();
        const amountMatch = text.match(/£([0-9,]+)/);
        
        if (amountMatch) {
          const amount = parseInt(amountMatch[1].replace(/,/g, ''));
          allowances.push({
            country: 'UK',
            year: new Date().getFullYear(),
            type: 'capital_gains_allowance',
            amount: amount,
            currency: 'GBP',
            source: 'https://www.gov.uk/capital-gains-tax/allowances',
            lastUpdated: new Date()
          });
        }
      });
      
      return allowances;
    } catch (error) {
      console.error('Failed to scrape UK allowances:', error);
      return this.getFallbackUKAllowances();
    }
  }

  async scrapeUSTaxRates(): Promise<TaxRate[]> {
    try {
      const response = await axios.get('https://www.irs.gov/taxtopics/tc409');
      const $ = cheerio.load(response.data);
      
      const rates: TaxRate[] = [];
      
      // Extract US capital gains rates
      $('table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const threshold = this.extractNumber($(cells[0]).text());
            const shortTermRate = this.extractNumber($(cells[1]).text());
            const longTermRate = this.extractNumber($(cells[2]).text());
            
            if (threshold !== null && shortTermRate !== null) {
              rates.push({
                country: 'US',
                year: new Date().getFullYear(),
                type: 'capital_gains',
                rate: shortTermRate,
                threshold: threshold,
                source: 'https://www.irs.gov/taxtopics/tc409',
                lastUpdated: new Date()
              });
            }
          }
        });
      });
      
      return rates;
    } catch (error) {
      console.error('Failed to scrape US tax rates:', error);
      return this.getFallbackUSRates();
    }
  }

  private extractNumber(text: string): number | null {
    const match = text.match(/([0-9,]+\.?[0-9]*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }

  private getFallbackUKRates(): TaxRate[] {
    return [
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains',
        rate: 10,
        threshold: 0,
        maxThreshold: 37700,
        source: 'fallback',
        lastUpdated: new Date()
      },
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains',
        rate: 20,
        threshold: 37700,
        source: 'fallback',
        lastUpdated: new Date()
      }
    ];
  }

  private getFallbackUKAllowances(): TaxAllowance[] {
    return [
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains_allowance',
        amount: 6000,
        currency: 'GBP',
        source: 'fallback',
        lastUpdated: new Date()
      }
    ];
  }

  private getFallbackUSRates(): TaxRate[] {
    return [
      {
        country: 'US',
        year: 2024,
        type: 'capital_gains',
        rate: 15,
        threshold: 0,
        maxThreshold: 445850,
        source: 'fallback',
        lastUpdated: new Date()
      }
    ];
  }

  async updateTaxData(): Promise<void> {
    console.log('Updating tax data from government sources...');
    
    try {
      // Scrape UK data
      const ukRates = await this.scrapeUKTaxRates();
      const ukAllowances = await this.scrapeUKAllowances();
      
      // Scrape US data
      const usRates = await this.scrapeUSTaxRates();
      
      // Store in database or cache
      await this.storeTaxData({
        rates: [...ukRates, ...usRates],
        allowances: ukAllowances
      });
      
      console.log('Tax data updated successfully');
    } catch (error) {
      console.error('Failed to update tax data:', error);
    }
  }

  private async storeTaxData(data: any): Promise<void> {
    // Store in Supabase or local storage
    // This would integrate with your database
    this.cache.set('taxData', {
      data,
      timestamp: Date.now()
    });
  }

  async getTaxData(country: string, year: number): Promise<any> {
    const cacheKey = `${country}_${year}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // Fetch fresh data
    await this.updateTaxData();
    return this.cache.get('taxData')?.data;
  }
}

export const taxDataScraper = new TaxDataScraper(); 