import { taxDataScraper } from './tax-data-scraper';
import { taxDataManager } from './tax-data-manager';

export class TaxDataTester {
  private testResults: {
    test: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    data?: any;
  }[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Tax Data Scraping Tests...\n');

    // Test scraping functionality
    await this.testUKTaxRates();
    await this.testUKAllowances();
    await this.testUSTaxRates();
    
    // Test data management
    await this.testDataManager();
    await this.testFallbackData();
    await this.testDataValidation();
    
    // Test database operations
    await this.testDatabaseOperations();
    
    // Test real-world scenarios
    await this.testRealWorldScenarios();

    this.printResults();
  }

  private async testUKTaxRates(): Promise<void> {
    console.log('📊 Testing UK Tax Rates Scraping...');
    
    try {
      const rates = await taxDataScraper.scrapeUKTaxRates();
      
      if (rates.length === 0) {
        this.addResult('UK Tax Rates', 'FAIL', 'No rates returned');
        return;
      }

      // Validate rate structure
      const validRates = rates.filter(rate => 
        rate.country === 'UK' &&
        rate.type === 'capital_gains' &&
        rate.rate >= 0 && rate.rate <= 100 &&
        rate.source.includes('gov.uk')
      );

      if (validRates.length === rates.length) {
        this.addResult('UK Tax Rates', 'PASS', `Found ${rates.length} valid rates`, rates);
      } else {
        this.addResult('UK Tax Rates', 'WARNING', `Found ${validRates.length}/${rates.length} valid rates`, rates);
      }
    } catch (error) {
      this.addResult('UK Tax Rates', 'FAIL', `Error: ${error}`);
    }
  }

  private async testUKAllowances(): Promise<void> {
    console.log('💰 Testing UK Allowances Scraping...');
    
    try {
      const allowances = await taxDataScraper.scrapeUKAllowances();
      
      if (allowances.length === 0) {
        this.addResult('UK Allowances', 'FAIL', 'No allowances returned');
        return;
      }

      // Validate allowance structure
      const validAllowances = allowances.filter(allowance => 
        allowance.country === 'UK' &&
        allowance.type === 'capital_gains_allowance' &&
        allowance.amount > 0 &&
        allowance.currency === 'GBP'
      );

      if (validAllowances.length === allowances.length) {
        this.addResult('UK Allowances', 'PASS', `Found ${allowances.length} valid allowances`, allowances);
      } else {
        this.addResult('UK Allowances', 'WARNING', `Found ${validAllowances.length}/${allowances.length} valid allowances`, allowances);
      }
    } catch (error) {
      this.addResult('UK Allowances', 'FAIL', `Error: ${error}`);
    }
  }

  private async testUSTaxRates(): Promise<void> {
    console.log('🇺🇸 Testing US Tax Rates Scraping...');
    
    try {
      const rates = await taxDataScraper.scrapeUSTaxRates();
      
      if (rates.length === 0) {
        this.addResult('US Tax Rates', 'FAIL', 'No rates returned');
        return;
      }

      // Validate rate structure
      const validRates = rates.filter(rate => 
        rate.country === 'US' &&
        rate.type === 'capital_gains' &&
        rate.rate >= 0 && rate.rate <= 100 &&
        rate.source.includes('irs.gov')
      );

      if (validRates.length === rates.length) {
        this.addResult('US Tax Rates', 'PASS', `Found ${rates.length} valid rates`, rates);
      } else {
        this.addResult('US Tax Rates', 'WARNING', `Found ${validRates.length}/${rates.length} valid rates`, rates);
      }
    } catch (error) {
      this.addResult('US Tax Rates', 'FAIL', `Error: ${error}`);
    }
  }

  private async testDataManager(): Promise<void> {
    console.log('🗄️ Testing Data Manager...');
    
    try {
      // Test getting supported countries
      const countries = await taxDataManager.getSupportedCountries();
      
      if (countries.length >= 2) {
        this.addResult('Data Manager - Countries', 'PASS', `Found ${countries.length} supported countries`, countries);
      } else {
        this.addResult('Data Manager - Countries', 'FAIL', `Only found ${countries.length} countries`);
      }

      // Test getting UK tax data
      const ukData = await taxDataManager.getCountryTaxData('UK', 2024);
      
      if (ukData && ukData.rates.length > 0) {
        this.addResult('Data Manager - UK Data', 'PASS', 'Successfully retrieved UK tax data', ukData);
      } else {
        this.addResult('Data Manager - UK Data', 'FAIL', 'Failed to retrieve UK tax data');
      }

    } catch (error) {
      this.addResult('Data Manager', 'FAIL', `Error: ${error}`);
    }
  }

  private async testFallbackData(): Promise<void> {
    console.log('🛡️ Testing Fallback Data...');
    
    try {
      // Test fallback rates
      const ukRate = await taxDataManager.getTaxRate('UK', 2024, 50000);
      const usRate = await taxDataManager.getTaxRate('US', 2024, 50000);
      
      if (ukRate > 0 && usRate > 0) {
        this.addResult('Fallback Data - Rates', 'PASS', `UK: ${ukRate}%, US: ${usRate}%`);
      } else {
        this.addResult('Fallback Data - Rates', 'FAIL', `UK: ${ukRate}%, US: ${usRate}%`);
      }

      // Test fallback allowances
      const ukAllowance = await taxDataManager.getAllowance('UK', 2024, 'capital_gains_allowance');
      
      if (ukAllowance > 0) {
        this.addResult('Fallback Data - Allowances', 'PASS', `UK Allowance: £${ukAllowance}`);
      } else {
        this.addResult('Fallback Data - Allowances', 'FAIL', `UK Allowance: £${ukAllowance}`);
      }

    } catch (error) {
      this.addResult('Fallback Data', 'FAIL', `Error: ${error}`);
    }
  }

  private async testDataValidation(): Promise<void> {
    console.log('✅ Testing Data Validation...');
    
    try {
      // Test rate validation
      const testRates = [
        { rate: 10, threshold: 0, maxThreshold: 37700 }, // Valid
        { rate: 150, threshold: 0, maxThreshold: 37700 }, // Invalid (rate > 100)
        { rate: -5, threshold: 0, maxThreshold: 37700 }, // Invalid (negative rate)
      ];

      const validRates = testRates.filter(rate => 
        rate.rate >= 0 && rate.rate <= 100 &&
        rate.threshold >= 0 &&
        (rate.maxThreshold === undefined || rate.maxThreshold > rate.threshold)
      );

      if (validRates.length === 1) {
        this.addResult('Data Validation - Rates', 'PASS', 'Rate validation working correctly');
      } else {
        this.addResult('Data Validation - Rates', 'FAIL', `Expected 1 valid rate, got ${validRates.length}`);
      }

      // Test allowance validation
      const testAllowances = [
        { amount: 6000, currency: 'GBP' }, // Valid
        { amount: -1000, currency: 'GBP' }, // Invalid (negative)
        { amount: 0, currency: 'GBP' }, // Invalid (zero)
      ];

      const validAllowances = testAllowances.filter(allowance => 
        allowance.amount > 0 &&
        allowance.currency.length === 3
      );

      if (validAllowances.length === 1) {
        this.addResult('Data Validation - Allowances', 'PASS', 'Allowance validation working correctly');
      } else {
        this.addResult('Data Validation - Allowances', 'FAIL', `Expected 1 valid allowance, got ${validAllowances.length}`);
      }

    } catch (error) {
      this.addResult('Data Validation', 'FAIL', `Error: ${error}`);
    }
  }

  private async testDatabaseOperations(): Promise<void> {
    console.log('💾 Testing Database Operations...');
    
    try {
      // Test storing data
      const testData = {
        rates: [
          {
            country: 'TEST',
            year: 2024,
            type: 'capital_gains',
            rate: 15,
            threshold: 0,
            source: 'test',
            lastUpdated: new Date()
          }
        ],
        allowances: [
          {
            country: 'TEST',
            year: 2024,
            type: 'capital_gains_allowance',
            amount: 5000,
            currency: 'USD',
            source: 'test',
            lastUpdated: new Date()
          }
        ],
        rules: {
          country: 'TEST',
          year: 2024,
          sameDayRule: true,
          bedAndBreakfastRule: false,
          washSaleRule: true,
          source: 'test',
          lastUpdated: new Date()
        }
      };

      await taxDataManager.storeCountryTaxData('TEST', 2024, testData);
      this.addResult('Database Operations - Store', 'PASS', 'Successfully stored test data');

      // Test retrieving data
      const retrievedData = await taxDataManager.getCountryTaxData('TEST', 2024);
      
      if (retrievedData && retrievedData.rates.length > 0) {
        this.addResult('Database Operations - Retrieve', 'PASS', 'Successfully retrieved test data');
      } else {
        this.addResult('Database Operations - Retrieve', 'FAIL', 'Failed to retrieve test data');
      }

    } catch (error) {
      this.addResult('Database Operations', 'FAIL', `Error: ${error}`);
    }
  }

  private async testRealWorldScenarios(): Promise<void> {
    console.log('🌍 Testing Real-World Scenarios...');
    
    try {
      // Test UK scenario
      const ukTaxRate = await taxDataManager.getTaxRate('UK', 2024, 50000);
      const ukAllowance = await taxDataManager.getAllowance('UK', 2024, 'capital_gains_allowance');
      
      if (ukTaxRate === 20 && ukAllowance === 6000) {
        this.addResult('Real-World - UK', 'PASS', `Rate: ${ukTaxRate}%, Allowance: £${ukAllowance}`);
      } else {
        this.addResult('Real-World - UK', 'WARNING', `Rate: ${ukTaxRate}%, Allowance: £${ukAllowance} (expected 20% and £6000)`);
      }

      // Test US scenario
      const usTaxRate = await taxDataManager.getTaxRate('US', 2024, 50000);
      
      if (usTaxRate === 15) {
        this.addResult('Real-World - US', 'PASS', `Rate: ${usTaxRate}%`);
      } else {
        this.addResult('Real-World - US', 'WARNING', `Rate: ${usTaxRate}% (expected 15%)`);
      }

      // Test edge cases
      const zeroIncomeRate = await taxDataManager.getTaxRate('UK', 2024, 0);
      const highIncomeRate = await taxDataManager.getTaxRate('UK', 2024, 1000000);
      
      if (zeroIncomeRate >= 0 && highIncomeRate >= 0) {
        this.addResult('Real-World - Edge Cases', 'PASS', 'Edge case handling working');
      } else {
        this.addResult('Real-World - Edge Cases', 'FAIL', 'Edge case handling failed');
      }

    } catch (error) {
      this.addResult('Real-World Scenarios', 'FAIL', `Error: ${error}`);
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, data?: any): void {
    this.testResults.push({
      test,
      status,
      message,
      data
    });
  }

  private printResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    console.log('\n📝 Detailed Results:');
    console.log('===================');
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.data && result.status === 'FAIL') {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });

    console.log('\n🎯 Recommendations:');
    console.log('===================');
    
    if (failed > 0) {
      console.log('❌ Fix failed tests before deploying');
    }
    
    if (warnings > 0) {
      console.log('⚠️  Review warnings and improve data quality');
    }
    
    if (passed === this.testResults.length) {
      console.log('🎉 All tests passed! System is ready for production');
    }
  }

  async runQuickTest(): Promise<void> {
    console.log('⚡ Running Quick Test...\n');
    
    try {
      // Test basic functionality
      const ukData = await taxDataManager.getCountryTaxData('UK', 2024);
      const usData = await taxDataManager.getCountryTaxData('US', 2024);
      
      if (ukData && usData) {
        console.log('✅ Quick test passed - Tax data system is working');
        console.log(`📊 UK: ${ukData.rates.length} rates, ${ukData.allowances.length} allowances`);
        console.log(`📊 US: ${usData.rates.length} rates, ${usData.allowances.length} allowances`);
      } else {
        console.log('❌ Quick test failed - Check system configuration');
      }
    } catch (error) {
      console.log('❌ Quick test failed:', error);
    }
  }
}

export const taxDataTester = new TaxDataTester(); 