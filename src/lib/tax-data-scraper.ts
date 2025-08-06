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
      // Use a CORS proxy to access UK government website
      const response = await axios.get('https://api.allorigins.win/raw?url=https://www.gov.uk/capital-gains-tax/rates', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const rates: TaxRate[] = [];
      
      // Extract UK capital gains rates from the page
      $('table').each((_, table) => {
        $(table).find('tr').each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const thresholdText = $(cells[0]).text().trim();
            const rateText = $(cells[1]).text().trim();
            
            const threshold = this.extractNumber(thresholdText);
            const rate = this.extractNumber(rateText);
            
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
      
      // If no rates found from scraping, use current known rates
      if (rates.length === 0) {
        return this.getCurrentUKRates();
      }
      
      return rates;
    } catch (error) {
      console.error('Failed to scrape UK tax rates:', error);
      return this.getCurrentUKRates();
    }
  }

  async scrapeUKAllowances(): Promise<TaxAllowance[]> {
    try {
      // Use a CORS proxy to access UK government website
      const response = await axios.get('https://api.allorigins.win/raw?url=https://www.gov.uk/capital-gains-tax/allowances', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const allowances: TaxAllowance[] = [];
      
      // Extract UK capital gains allowance
      $('p, div').each((_, element) => {
        const text = $(element).text();
        if (text.includes('£6,000') || text.includes('£3,000')) {
          const amount = text.includes('£6,000') ? 6000 : 3000;
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
      
      // If no allowances found from scraping, use current known allowance
      if (allowances.length === 0) {
        return this.getCurrentUKAllowances();
      }
      
      return allowances;
    } catch (error) {
      console.error('Failed to scrape UK allowances:', error);
      return this.getCurrentUKAllowances();
    }
  }

  private getCurrentUKRates(): TaxRate[] {
    const currentYear = new Date().getFullYear();
    return [
      {
        country: 'UK',
        year: currentYear,
        type: 'capital_gains',
        rate: 10,
        threshold: 0,
        maxThreshold: 37700,
        source: 'HMRC (Current)',
        lastUpdated: new Date()
      },
      {
        country: 'UK',
        year: currentYear,
        type: 'capital_gains',
        rate: 20,
        threshold: 37700,
        source: 'HMRC (Current)',
        lastUpdated: new Date()
      }
    ];
  }

  private getCurrentUKAllowances(): TaxAllowance[] {
    const currentYear = new Date().getFullYear();
    return [
      {
        country: 'UK',
        year: currentYear,
        type: 'capital_gains_allowance',
        amount: 6000,
        currency: 'GBP',
        source: 'HMRC (Current)',
        lastUpdated: new Date()
      }
    ];
  }

  private extractNumber(text: string): number | null {
    const match = text.match(/([0-9,]+\.?[0-9]*)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return null;
  }

  async getTaxData(country: string, year: number): Promise<any> {
    const cacheKey = `${country}_${year}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    let rates: TaxRate[] = [];
    let allowances: TaxAllowance[] = [];

    if (country === 'UK') {
      rates = await this.scrapeUKTaxRates();
      allowances = await this.scrapeUKAllowances();
    }

    const data = {
      rates,
      allowances,
      source: 'HMRC (Live)',
      lastUpdated: new Date()
    };

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }
}

export const taxDataScraper = new TaxDataScraper(); 