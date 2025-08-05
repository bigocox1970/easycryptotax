# Testing Guide for Tax Data Scraping System

## 🧪 **Overview**

This guide explains how to test the tax data scraping system in EasyCryptoTax. The system includes automated scraping from government websites, data validation, and fallback mechanisms.

## 🚀 **Quick Start Testing**

### **1. Command Line Testing**

Run the comprehensive test suite from the command line:

```bash
# Run full test suite
npm run test:tax-data

# Run quick test only
npm run test:quick
```

### **2. Web Interface Testing**

Access the test interface in your browser:

```
http://localhost:5173/test-tax-data
```

## 📋 **Test Categories**

### **A. Scraping Tests**
- **UK Tax Rates**: Tests scraping from HMRC website
- **UK Allowances**: Tests scraping UK capital gains allowance
- **US Tax Rates**: Tests scraping from IRS website
- **Data Validation**: Ensures scraped data is valid

### **B. Data Management Tests**
- **Database Operations**: Tests storing and retrieving data
- **Fallback Data**: Tests when scraping fails
- **Country Support**: Tests supported countries list
- **Real-World Scenarios**: Tests actual tax calculations

### **C. System Tests**
- **Error Handling**: Tests network failures and timeouts
- **Data Freshness**: Tests 24-hour update cycle
- **Validation Rules**: Tests data integrity checks

## 🔧 **Manual Testing Steps**

### **Step 1: Basic Functionality**
```typescript
// Test basic data retrieval
const ukData = await taxDataManager.getCountryTaxData('UK', 2024);
const usData = await taxDataManager.getCountryTaxData('US', 2024);

console.log('UK Data:', ukData);
console.log('US Data:', usData);
```

### **Step 2: Tax Rate Calculations**
```typescript
// Test tax rate calculations
const ukRate = await taxDataManager.getTaxRate('UK', 2024, 50000);
const usRate = await taxDataManager.getTaxRate('US', 2024, 50000);

console.log('UK Tax Rate (50k income):', ukRate + '%');
console.log('US Tax Rate (50k income):', usRate + '%');
```

### **Step 3: Allowance Testing**
```typescript
// Test allowance retrieval
const ukAllowance = await taxDataManager.getAllowance('UK', 2024, 'capital_gains_allowance');
console.log('UK Capital Gains Allowance:', '£' + ukAllowance);
```

### **Step 4: Country Support**
```typescript
// Test supported countries
const countries = await taxDataManager.getSupportedCountries();
console.log('Supported Countries:', countries);
```

## 🛠️ **Advanced Testing**

### **Testing Scraping Directly**
```typescript
import { taxDataScraper } from '@/lib/tax-data-scraper';

// Test UK scraping
const ukRates = await taxDataScraper.scrapeUKTaxRates();
const ukAllowances = await taxDataScraper.scrapeUKAllowances();

console.log('UK Rates:', ukRates);
console.log('UK Allowances:', ukAllowances);
```

### **Testing Fallback Data**
```typescript
// Simulate network failure by testing fallback
const fallbackData = await taxDataManager.getCountryTaxData('UK', 2024);
console.log('Fallback Data Source:', fallbackData.source);
```

### **Testing Data Validation**
```typescript
// Test with invalid data
const testRates = [
  { rate: 10, threshold: 0 }, // Valid
  { rate: 150, threshold: 0 }, // Invalid (rate > 100)
  { rate: -5, threshold: 0 }, // Invalid (negative rate)
];

const validRates = testRates.filter(rate => 
  rate.rate >= 0 && rate.rate <= 100
);

console.log('Valid rates:', validRates.length);
```

## 📊 **Expected Results**

### **UK Tax Data (2024)**
- **Basic Rate**: 10% (up to £37,700)
- **Higher Rate**: 20% (above £37,700)
- **Annual Allowance**: £6,000
- **Source**: HMRC

### **US Tax Data (2024)**
- **Capital Gains Rate**: 15% (for most taxpayers)
- **Annual Allowance**: None
- **Source**: IRS

### **Test Pass Criteria**
- ✅ All scraping tests return valid data
- ✅ Fallback data is available when scraping fails
- ✅ Tax rate calculations are accurate
- ✅ Database operations work correctly
- ✅ Error handling works as expected

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Scraping Failures**
```bash
# Check network connectivity
curl https://www.gov.uk/capital-gains-tax/rates
curl https://www.irs.gov/taxtopics/tc409
```

#### **2. Database Connection Issues**
```typescript
// Test Supabase connection
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase
  .from('tax_data')
  .select('*')
  .limit(1);

console.log('Database connection:', error ? 'FAILED' : 'OK');
```

#### **3. Data Validation Issues**
```typescript
// Test data structure
const testData = await taxDataManager.getCountryTaxData('UK', 2024);

if (testData) {
  console.log('Data structure valid:', {
    hasRates: testData.rates.length > 0,
    hasAllowances: testData.allowances.length > 0,
    hasRules: testData.rules !== null,
    source: testData.source
  });
}
```

### **Debug Mode**
```typescript
// Enable debug logging
const originalConsoleLog = console.log;
console.log = (...args) => {
  originalConsoleLog('[TAX-DATA-DEBUG]', ...args);
};

// Run tests with debug output
await taxDataTester.runAllTests();
```

## 📈 **Performance Testing**

### **Load Testing**
```typescript
// Test multiple concurrent requests
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(taxDataManager.getCountryTaxData('UK', 2024));
}

const results = await Promise.all(promises);
console.log('Concurrent requests completed:', results.length);
```

### **Memory Testing**
```typescript
// Monitor memory usage
const startMemory = process.memoryUsage();
await taxDataTester.runAllTests();
const endMemory = process.memoryUsage();

console.log('Memory usage:', {
  start: startMemory.heapUsed,
  end: endMemory.heapUsed,
  difference: endMemory.heapUsed - startMemory.heapUsed
});
```

## 🔄 **Continuous Testing**

### **Automated Test Schedule**
```typescript
// Run tests every hour
setInterval(async () => {
  console.log('Running scheduled tests...');
  await taxDataTester.runQuickTest();
}, 60 * 60 * 1000); // 1 hour
```

### **Test Notifications**
```typescript
// Send notifications for failed tests
const results = await taxDataTester.runAllTests();
const failedTests = results.filter(r => r.status === 'FAIL');

if (failedTests.length > 0) {
  console.error('❌ Tests failed:', failedTests);
  // Send notification (email, Slack, etc.)
}
```

## 📝 **Test Reports**

### **Generate Test Report**
```typescript
// Create detailed test report
const report = {
  timestamp: new Date().toISOString(),
  tests: results,
  summary: {
    passed: results.filter(r => r.status === 'PASS').length,
    failed: results.filter(r => r.status === 'FAIL').length,
    warnings: results.filter(r => r.status === 'WARNING').length,
    total: results.length
  }
};

console.log('Test Report:', JSON.stringify(report, null, 2));
```

## 🎯 **Best Practices**

### **1. Test Regularly**
- Run quick tests daily
- Run full tests weekly
- Monitor for data changes

### **2. Validate Data**
- Check rate ranges (0-100%)
- Verify allowance amounts
- Ensure source attribution

### **3. Monitor Performance**
- Track response times
- Monitor memory usage
- Check error rates

### **4. Update Test Data**
- Keep fallback data current
- Update expected values
- Test new countries

## 🚀 **Production Deployment**

### **Pre-Deployment Checklist**
- [ ] All tests pass
- [ ] No failed scraping attempts
- [ ] Fallback data is current
- [ ] Database migrations applied
- [ ] Error handling tested
- [ ] Performance benchmarks met

### **Post-Deployment Monitoring**
- [ ] Monitor scraping success rates
- [ ] Track data freshness
- [ ] Alert on failures
- [ ] Validate calculations
- [ ] Check user feedback

---

**Note**: Always verify tax calculations with qualified professionals before using in production tax filings. 