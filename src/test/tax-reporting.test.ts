import { TaxEvent, Transaction } from '../types/transaction';
import { getTaxRates, calculateTax } from '../lib/tax-rates';
import { HMRCAPIClient } from '../lib/hmrc-api-client';

interface TestScenario {
  name: string;
  description: string;
  transactions: Omit<Transaction, 'id' | 'created_at' | 'user_id'>[];
  expectedTaxEvents: Partial<TaxEvent>[];
  expectedTotals: {
    totalGains: number;
    totalLosses: number;
    taxableGains: number;
    estimatedTax: number;
  };
  year: number;
}

// Test data scenarios for UK tax reporting validation
const TEST_SCENARIOS: TestScenario[] = [
  {
    name: "Simple Buy-Sell Scenario",
    description: "Buy 1 BTC for £10,000, sell for £15,000 - should generate £5,000 gain",
    year: 2024,
    transactions: [
      {
        transaction_type: 'buy',
        base_asset: 'BTC',
        quantity: 1,
        price: 10000,
        transaction_date: '2024-01-15T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-1'
      },
      {
        transaction_type: 'sell',
        base_asset: 'BTC',
        quantity: 1,
        price: 15000,
        transaction_date: '2024-06-15T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-1'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'BTC',
        quantity_sold: 1,
        cost_basis: 10000,
        sale_price: 15000,
        gain_loss: 5000,
        holding_period_days: 152,
        is_long_term: false
      }
    ],
    expectedTotals: {
      totalGains: 5000,
      totalLosses: 0,
      taxableGains: 2000, // £5,000 - £3,000 allowance (2024)
      estimatedTax: 200 // 10% on taxable gains up to basic rate threshold
    }
  },
  {
    name: "FIFO Cost Basis Test",
    description: "Multiple buys at different prices, single sell - should use FIFO",
    year: 2024,
    transactions: [
      {
        transaction_type: 'buy',
        base_asset: 'ETH',
        quantity: 2,
        price: 1000,
        transaction_date: '2024-01-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-1'
      },
      {
        transaction_type: 'buy',
        base_asset: 'ETH',
        quantity: 3,
        price: 1500,
        transaction_date: '2024-02-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-2'
      },
      {
        transaction_type: 'sell',
        base_asset: 'ETH',
        quantity: 2.5,
        price: 2000,
        transaction_date: '2024-08-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-1'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'ETH',
        quantity_sold: 2.5,
        cost_basis: 2750, // 2 * 1000 + 0.5 * 1500 = 2750
        sale_price: 5000, // 2.5 * 2000 = 5000
        gain_loss: 2250, // 5000 - 2750 = 2250
        holding_period_days: 213
      }
    ],
    expectedTotals: {
      totalGains: 2250,
      totalLosses: 0,
      taxableGains: 0, // Below £3,000 allowance
      estimatedTax: 0
    }
  },
  {
    name: "Capital Loss Scenario",
    description: "Buy high, sell low - should generate capital loss",
    year: 2024,
    transactions: [
      {
        transaction_type: 'buy',
        base_asset: 'ADA',
        quantity: 10000,
        price: 0.50,
        transaction_date: '2024-01-01T10:00:00Z',
        exchange_name: 'Binance',
        transaction_id: 'buy-1'
      },
      {
        transaction_type: 'sell',
        base_asset: 'ADA',
        quantity: 10000,
        price: 0.30,
        transaction_date: '2024-12-01T10:00:00Z',
        exchange_name: 'Binance',
        transaction_id: 'sell-1'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'ADA',
        quantity_sold: 10000,
        cost_basis: 5000,
        sale_price: 3000,
        gain_loss: -2000,
        holding_period_days: 335
      }
    ],
    expectedTotals: {
      totalGains: 0,
      totalLosses: -2000,
      taxableGains: 0,
      estimatedTax: 0
    }
  },
  {
    name: "Mixed Gains and Losses",
    description: "Multiple assets with gains and losses - should net out correctly",
    year: 2024,
    transactions: [
      // Profitable BTC trade
      {
        transaction_type: 'buy',
        base_asset: 'BTC',
        quantity: 0.5,
        price: 20000,
        transaction_date: '2024-01-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-btc'
      },
      {
        transaction_type: 'sell',
        base_asset: 'BTC',
        quantity: 0.5,
        price: 30000,
        transaction_date: '2024-06-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-btc'
      },
      // Loss-making ETH trade
      {
        transaction_type: 'buy',
        base_asset: 'ETH',
        quantity: 5,
        price: 2000,
        transaction_date: '2024-02-01T10:00:00Z',
        exchange_name: 'Binance',
        transaction_id: 'buy-eth'
      },
      {
        transaction_type: 'sell',
        base_asset: 'ETH',
        quantity: 5,
        price: 1500,
        transaction_date: '2024-07-01T10:00:00Z',
        exchange_name: 'Binance',
        transaction_id: 'sell-eth'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'BTC',
        quantity_sold: 0.5,
        cost_basis: 10000,
        sale_price: 15000,
        gain_loss: 5000
      },
      {
        asset: 'ETH',
        quantity_sold: 5,
        cost_basis: 10000,
        sale_price: 7500,
        gain_loss: -2500
      }
    ],
    expectedTotals: {
      totalGains: 5000,
      totalLosses: -2500,
      taxableGains: 0, // Net gain £2,500 - £3,000 allowance = £0
      estimatedTax: 0
    }
  },
  {
    name: "Above Allowance Gains",
    description: "Large gain exceeding annual allowance - should trigger tax liability",
    year: 2024,
    transactions: [
      {
        transaction_type: 'buy',
        base_asset: 'BTC',
        quantity: 2,
        price: 15000,
        transaction_date: '2024-01-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-1'
      },
      {
        transaction_type: 'sell',
        base_asset: 'BTC',
        quantity: 2,
        price: 25000,
        transaction_date: '2024-08-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-1'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'BTC',
        quantity_sold: 2,
        cost_basis: 30000,
        sale_price: 50000,
        gain_loss: 20000,
        holding_period_days: 213
      }
    ],
    expectedTotals: {
      totalGains: 20000,
      totalLosses: 0,
      taxableGains: 17000, // £20,000 - £3,000 allowance
      estimatedTax: 1700 // 10% basic rate (assuming under £37,700)
    }
  },
  {
    name: "Fiat Withdrawal Exclusion",
    description: "Should exclude fiat withdrawals (GBP/USD) from taxable events",
    year: 2024,
    transactions: [
      {
        transaction_type: 'buy',
        base_asset: 'BTC',
        quantity: 1,
        price: 20000,
        transaction_date: '2024-01-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'buy-1'
      },
      {
        transaction_type: 'sell',
        base_asset: 'GBP', // Fiat withdrawal - should be excluded
        quantity: 25000,
        price: 1,
        transaction_date: '2024-06-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-fiat'
      },
      {
        transaction_type: 'sell',
        base_asset: 'BTC', // Actual crypto sale
        quantity: 1,
        price: 25000,
        transaction_date: '2024-07-01T10:00:00Z',
        exchange_name: 'Coinbase',
        transaction_id: 'sell-btc'
      }
    ],
    expectedTaxEvents: [
      {
        asset: 'BTC',
        quantity_sold: 1,
        cost_basis: 20000,
        sale_price: 25000,
        gain_loss: 5000
      }
    ],
    expectedTotals: {
      totalGains: 5000,
      totalLosses: 0,
      taxableGains: 2000, // £5,000 - £3,000 allowance
      estimatedTax: 200 // 10% basic rate
    }
  }
];

class TaxReportingValidator {
  private hmrcClient: HMRCAPIClient;

  constructor() {
    this.hmrcClient = new HMRCAPIClient('test');
  }

  // Simulate the tax calculation logic from TaxReportPage
  private calculateTaxEvents(transactions: Transaction[], year: number): TaxEvent[] {
    const taxEvents: TaxEvent[] = [];
    const holdings: { [asset: string]: { quantity: number; costBasis: number; transactions: Transaction[] } } = {};

    // Filter transactions for the year
    const yearTransactions = transactions.filter(t => 
      new Date(t.transaction_date).getFullYear() === year
    );

    // Get all buy transactions (including from previous years for cost basis)
    const buyTransactions = transactions
      .filter(t => t.transaction_type === 'buy' && t.quantity > 0)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    // Get sell transactions for the selected year (exclude fiat withdrawals)
    const sellTransactions = transactions
      .filter(t => t.transaction_type === 'sell' && t.quantity > 0)
      .filter(t => new Date(t.transaction_date).getFullYear() === year)
      .filter(t => !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase()))
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    // Build holdings from buy transactions
    for (const buyTx of buyTransactions) {
      if (!holdings[buyTx.base_asset]) {
        holdings[buyTx.base_asset] = { quantity: 0, costBasis: 0, transactions: [] };
      }
      
      const cost = (buyTx.price || 0) * buyTx.quantity;
      holdings[buyTx.base_asset].quantity += buyTx.quantity;
      holdings[buyTx.base_asset].costBasis += cost;
      holdings[buyTx.base_asset].transactions.push(buyTx);
    }

    // Process sell transactions using FIFO
    for (const sellTx of sellTransactions) {
      if (!holdings[sellTx.base_asset] || holdings[sellTx.base_asset].quantity <= 0) {
        continue;
      }

      const holding = holdings[sellTx.base_asset];
      const sellQuantity = Math.min(sellTx.quantity, holding.quantity);
      
      // Use FIFO: match against oldest buy transactions first
      let remainingToSell = sellQuantity;
      let totalCostBasis = 0;
      let oldestBuyDate = new Date();
      
      for (let i = 0; i < holding.transactions.length && remainingToSell > 0; i++) {
        const buyTx = holding.transactions[i];
        const availableQuantity = buyTx.quantity;
        const quantityToUse = Math.min(remainingToSell, availableQuantity);
        
        const costPerUnit = (buyTx.price || 0);
        const costBasisForThisLot = costPerUnit * quantityToUse;
        
        totalCostBasis += costBasisForThisLot;
        remainingToSell -= quantityToUse;
        
        const buyDate = new Date(buyTx.transaction_date);
        if (buyDate < oldestBuyDate) {
          oldestBuyDate = buyDate;
        }
      }
      
      const salePrice = (sellTx.price || 0) * sellQuantity;
      const gainLoss = salePrice - totalCostBasis;
      
      const sellDate = new Date(sellTx.transaction_date);
      const holdingPeriodDays = Math.floor((sellDate.getTime() - oldestBuyDate.getTime()) / (1000 * 60 * 60 * 24));
      const isLongTerm = holdingPeriodDays > 365;

      taxEvents.push({
        id: `test-${taxEvents.length + 1}`,
        user_id: 'test-user',
        sell_transaction_id: sellTx.transaction_id || '',
        buy_transaction_id: holding.transactions[0]?.transaction_id || '',
        asset: sellTx.base_asset,
        quantity_sold: sellQuantity,
        cost_basis: totalCostBasis,
        sale_price: salePrice,
        gain_loss: gainLoss,
        holding_period_days: holdingPeriodDays,
        is_long_term: isLongTerm,
        tax_year: year,
        created_at: new Date().toISOString()
      });

      // Update holdings
      holding.quantity -= sellQuantity;
      holding.costBasis -= totalCostBasis;
    }

    return taxEvents;
  }

  async validateScenario(scenario: TestScenario): Promise<{
    passed: boolean;
    errors: string[];
    actualTaxEvents: TaxEvent[];
    actualTotals: any;
  }> {
    const errors: string[] = [];
    
    try {
      // Convert test transactions to full Transaction objects
      const fullTransactions: Transaction[] = scenario.transactions.map((tx, index) => ({
        id: `test-tx-${index + 1}`,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        ...tx
      }));

      // Calculate tax events
      const actualTaxEvents = this.calculateTaxEvents(fullTransactions, scenario.year);
      
      // Calculate totals
      const actualTotals = {
        totalGains: actualTaxEvents.reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
        totalLosses: actualTaxEvents.reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
        netGainLoss: actualTaxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0)
      };

      // Get allowance for the year
      const allowances = await this.hmrcClient.fetchAllowances(scenario.year.toString());
      const allowance = allowances.find(a => a.type === 'capital_gains_allowance')?.amount || 0;
      
      // UK allows losses to be offset against gains
      const netGains = actualTotals.totalGains + actualTotals.totalLosses; // totalLosses is already negative
      actualTotals.taxableGains = Math.max(0, netGains - allowance);
      
      // Calculate tax using proper UK rates
      const rates = await this.hmrcClient.fetchCapitalGainsRates(scenario.year.toString());
      const basicRate = rates.find(r => r.rate === 10) || { rate: 10, threshold: 0, maxThreshold: 37700 };
      const higherRate = rates.find(r => r.rate === 20) || { rate: 20, threshold: 37700 };
      
      let estimatedTax = 0;
      if (actualTotals.taxableGains > 0) {
        const basicRateAmount = Math.min(actualTotals.taxableGains, basicRate.maxThreshold || 37700);
        const higherRateAmount = Math.max(0, actualTotals.taxableGains - (basicRate.maxThreshold || 37700));
        
        estimatedTax = (basicRateAmount * basicRate.rate / 100) + (higherRateAmount * higherRate.rate / 100);
      }
      
      actualTotals.estimatedTax = estimatedTax;

      // Validate number of tax events
      if (actualTaxEvents.length !== scenario.expectedTaxEvents.length) {
        errors.push(`Expected ${scenario.expectedTaxEvents.length} tax events, got ${actualTaxEvents.length}`);
      }

      // Validate each tax event
      scenario.expectedTaxEvents.forEach((expectedEvent, index) => {
        const actualEvent = actualTaxEvents[index];
        if (!actualEvent) {
          errors.push(`Missing tax event ${index + 1}`);
          return;
        }

        // Check key fields
        Object.keys(expectedEvent).forEach(key => {
          const expected = expectedEvent[key];
          const actual = actualEvent[key];
          
          if (typeof expected === 'number') {
            const tolerance = 0.01; // Allow small rounding differences
            if (Math.abs(actual - expected) > tolerance) {
              errors.push(`Tax event ${index + 1}: Expected ${key} = ${expected}, got ${actual}`);
            }
          } else if (expected !== actual) {
            errors.push(`Tax event ${index + 1}: Expected ${key} = ${expected}, got ${actual}`);
          }
        });
      });

      // Validate totals
      const totalFields = ['totalGains', 'totalLosses', 'taxableGains', 'estimatedTax'];
      totalFields.forEach(field => {
        const expected = scenario.expectedTotals[field];
        const actual = actualTotals[field];
        const tolerance = 0.01;
        
        if (Math.abs(actual - expected) > tolerance) {
          errors.push(`Expected ${field} = ${expected}, got ${actual}`);
        }
      });

      return {
        passed: errors.length === 0,
        errors,
        actualTaxEvents,
        actualTotals
      };

    } catch (error) {
      errors.push(`Exception during validation: ${error.message}`);
      return {
        passed: false,
        errors,
        actualTaxEvents: [],
        actualTotals: {}
      };
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Tax Reporting Validation Tests\n');
    console.log('=========================================\n');
    
    let passedTests = 0;
    let totalTests = TEST_SCENARIOS.length;

    for (const scenario of TEST_SCENARIOS) {
      console.log(`📊 ${scenario.name}`);
      console.log(`Description: ${scenario.description}`);
      console.log(`Year: ${scenario.year}`);
      console.log(`Transactions: ${scenario.transactions.length}`);
      
      const result = await this.validateScenario(scenario);
      
      if (result.passed) {
        console.log('✅ PASSED\n');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        result.errors.forEach(error => console.log(`   - ${error}`));
        console.log('\nActual Tax Events:');
        result.actualTaxEvents.forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.asset}: ${event.quantity_sold} sold for £${event.sale_price}, gain/loss: £${event.gain_loss}`);
        });
        console.log(`\nActual Totals:`, result.actualTotals);
        console.log('');
      }
    }

    console.log('=========================================');
    console.log(`📈 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Tax reporting calculations are working correctly.');
    } else {
      console.log(`⚠️  ${totalTests - passedTests} tests failed. Please review the tax calculation logic.`);
      process.exit(1);
    }
  }

  // Test HMRC API integration
  async testHMRCIntegration(): Promise<void> {
    console.log('🔗 Testing HMRC API Integration\n');
    
    try {
      // Test rate fetching for different years
      const years = [2020, 2021, 2022, 2023, 2024, 2025];
      
      for (const year of years) {
        const rates = await this.hmrcClient.fetchCapitalGainsRates(year.toString());
        const allowances = await this.hmrcClient.fetchAllowances(year.toString());
        
        console.log(`${year}:`);
        console.log(`  Rates: ${rates.length} found`);
        rates.forEach(rate => {
          console.log(`    ${rate.rate}% (£${rate.threshold} - £${rate.maxThreshold || 'unlimited'})`);
        });
        console.log(`  Allowances: ${allowances.length} found`);
        allowances.forEach(allowance => {
          console.log(`    ${allowance.type}: £${allowance.amount}`);
        });
        console.log('');
      }
      
      console.log('✅ HMRC API integration working correctly');
    } catch (error) {
      console.log('❌ HMRC API integration failed:', error.message);
      process.exit(1);
    }
  }
}

// Export for use in npm scripts
export const taxReportingValidator = new TaxReportingValidator();

// Auto-run if called directly
if (process.argv[1] && process.argv[1].includes('tax-reporting.test.ts')) {
  (async () => {
    await taxReportingValidator.testHMRCIntegration();
    console.log('');
    await taxReportingValidator.runAllTests();
  })();
}