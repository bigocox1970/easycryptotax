import { taxDataTester } from './lib/tax-data-test';

// Test runner for tax data scraping system
async function runTests() {
  console.log('🚀 EasyCryptoTax - Tax Data Scraping Test Suite');
  console.log('================================================\n');

  try {
    // Run quick test first
    await taxDataTester.runQuickTest();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run full test suite
    await taxDataTester.runAllTests();
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests }; 