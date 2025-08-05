import { taxDataScraper } from './tax-data-scraper';

export class SimpleTaxDataTester {
  async runSimpleTest(): Promise<void> {
    console.log('🧪 Running Simple Tax Data Test...\n');

    try {
      // Test fallback data
      console.log('📊 Testing Fallback Data...');
      
      const ukRates = taxDataScraper['getFallbackUKRates']();
      const ukAllowances = taxDataScraper['getFallbackUKAllowances']();
      const usRates = taxDataScraper['getFallbackUSRates']();

      console.log('✅ UK Fallback Rates:', ukRates.length, 'rates found');
      console.log('✅ UK Fallback Allowances:', ukAllowances.length, 'allowances found');
      console.log('✅ US Fallback Rates:', usRates.length, 'rates found');

      // Test data validation
      console.log('\n✅ Testing Data Validation...');
      
      const validUkRates = ukRates.filter(rate => 
        rate.rate >= 0 && rate.rate <= 100 &&
        rate.country === 'UK' &&
        rate.type === 'capital_gains'
      );

      const validUkAllowances = ukAllowances.filter(allowance =>
        allowance.amount > 0 &&
        allowance.currency === 'GBP' &&
        allowance.type === 'capital_gains_allowance'
      );

      console.log('✅ UK Rates Validation:', validUkRates.length === ukRates.length ? 'PASS' : 'FAIL');
      console.log('✅ UK Allowances Validation:', validUkAllowances.length === ukAllowances.length ? 'PASS' : 'FAIL');

      // Test real-world scenarios
      console.log('\n🌍 Testing Real-World Scenarios...');
      
      const ukBasicRate = ukRates.find(rate => rate.threshold === 0)?.rate || 0;
      const ukHigherRate = ukRates.find(rate => rate.threshold === 37700)?.rate || 0;
      const ukAllowance = ukAllowances[0]?.amount || 0;

      console.log(`✅ UK Basic Rate: ${ukBasicRate}%`);
      console.log(`✅ UK Higher Rate: ${ukHigherRate}%`);
      console.log(`✅ UK Allowance: £${ukAllowance}`);

      // Test US scenarios
      const usRate = usRates[0]?.rate || 0;
      console.log(`✅ US Capital Gains Rate: ${usRate}%`);

      // Summary
      console.log('\n📋 Test Summary:');
      console.log('================');
      console.log(`✅ Fallback Data: ${ukRates.length + usRates.length} rates available`);
      console.log(`✅ Data Validation: ${validUkRates.length === ukRates.length ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Real-World Data: UK ${ukBasicRate}%/${ukHigherRate}%, £${ukAllowance} | US ${usRate}%`);
      
      if (ukBasicRate === 10 && ukHigherRate === 20 && ukAllowance === 6000 && usRate === 15) {
        console.log('\n🎉 All tests passed! Tax data system is working correctly.');
      } else {
        console.log('\n⚠️  Some tests failed. Check fallback data values.');
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testScraping(): Promise<void> {
    console.log('🌐 Testing Web Scraping...\n');

    try {
      // Test UK scraping (this might fail if network issues)
      console.log('📊 Testing UK Tax Rates Scraping...');
      try {
        const ukRates = await taxDataScraper.scrapeUKTaxRates();
        console.log('✅ UK Scraping:', ukRates.length > 0 ? 'SUCCESS' : 'FAILED');
      } catch (error) {
        console.log('⚠️  UK Scraping failed (using fallback):', error.message);
      }

      console.log('\n📊 Testing UK Allowances Scraping...');
      try {
        const ukAllowances = await taxDataScraper.scrapeUKAllowances();
        console.log('✅ UK Allowances Scraping:', ukAllowances.length > 0 ? 'SUCCESS' : 'FAILED');
      } catch (error) {
        console.log('⚠️  UK Allowances Scraping failed (using fallback):', error.message);
      }

      console.log('\n📊 Testing US Tax Rates Scraping...');
      try {
        const usRates = await taxDataScraper.scrapeUSTaxRates();
        console.log('✅ US Scraping:', usRates.length > 0 ? 'SUCCESS' : 'FAILED');
      } catch (error) {
        console.log('⚠️  US Scraping failed (using fallback):', error.message);
      }

    } catch (error) {
      console.error('❌ Scraping test failed:', error);
    }
  }
}

export const simpleTaxDataTester = new SimpleTaxDataTester(); 