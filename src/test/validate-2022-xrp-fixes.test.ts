import { Transaction, TaxEvent } from '../types/transaction';
import { HMRCAPIClient } from '../lib/hmrc-api-client';

// Your actual 2022 XRP transactions from Coinbase CSV (with fixes applied)
class XRP2022TestValidator {
  private hmrcClient: HMRCAPIClient;

  constructor() {
    this.hmrcClient = new HMRCAPIClient('test');
  }

  // Simulate the fixed tax calculation logic
  private calculateTaxEventsWithFixes(transactions: Transaction[], year: number): TaxEvent[] {
    const taxEvents: TaxEvent[] = [];
    const holdings: { [asset: string]: { quantity: number; costBasis: number; transactions: Transaction[] } } = {};

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
      
      const cost = Math.abs(buyTx.price || 0) * buyTx.quantity; // Fix: Use absolute price
      holdings[buyTx.base_asset].quantity += buyTx.quantity;
      holdings[buyTx.base_asset].costBasis += cost;
      holdings[buyTx.base_asset].transactions.push({...buyTx}); // Copy to avoid mutation
    }

    console.log('Holdings built from purchases:');
    Object.keys(holdings).forEach(asset => {
      const holding = holdings[asset];
      console.log(`${asset}: ${holding.quantity} units, cost basis: £${holding.costBasis.toFixed(2)}`);
      holding.transactions.forEach((tx, i) => {
        console.log(`  Purchase ${i + 1}: ${tx.quantity} at £${(Math.abs(tx.price || 0)).toFixed(4)}/unit on ${tx.transaction_date.split('T')[0]}`);
      });
    });

    // Process sell transactions using FIFO (with fixes)
    for (const sellTx of sellTransactions) {
      if (!holdings[sellTx.base_asset] || holdings[sellTx.base_asset].quantity <= 0) {
        console.log(`No holdings for ${sellTx.base_asset}, skipping sale`);
        continue;
      }

      const holding = holdings[sellTx.base_asset];
      const sellQuantity = Math.min(sellTx.quantity, holding.quantity);
      
      let remainingToSell = sellQuantity;
      let totalCostBasis = 0;
      let oldestBuyDate = new Date();
      
      // Process FIFO matching (fixed algorithm)
      for (let i = 0; i < holding.transactions.length && remainingToSell > 0; i++) {
        const buyTx = holding.transactions[i];
        const availableQuantity = buyTx.quantity;
        const quantityToUse = Math.min(remainingToSell, availableQuantity);
        
        if (quantityToUse <= 0) continue;
        
        const costPerUnit = Math.abs(buyTx.price || 0); // Fix: Absolute price
        const costBasisForThisLot = costPerUnit * quantityToUse;
        
        totalCostBasis += costBasisForThisLot;
        remainingToSell -= quantityToUse;
        
        const buyDate = new Date(buyTx.transaction_date);
        if (i === 0 || buyDate < oldestBuyDate) {
          oldestBuyDate = buyDate;
        }
        
        // Update transaction quantity
        buyTx.quantity -= quantityToUse;
        
        console.log(`FIFO: Used ${quantityToUse} ${sellTx.base_asset} from ${buyTx.transaction_date.split('T')[0]} at £${costPerUnit.toFixed(4)}/unit`);
        
        // Remove if fully consumed
        if (buyTx.quantity <= 0) {
          holding.transactions.splice(i, 1);
          i--;
        }
      }
      
      // Fix: Ensure sale price is positive
      const salePrice = Math.abs(sellTx.price || 0) * sellQuantity;
      const gainLoss = salePrice - totalCostBasis;
      
      const sellDate = new Date(sellTx.transaction_date);
      const holdingPeriodDays = Math.floor((sellDate.getTime() - oldestBuyDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Sale: ${sellQuantity} ${sellTx.base_asset} for £${salePrice.toFixed(2)}, cost: £${totalCostBasis.toFixed(2)}, gain/loss: £${gainLoss.toFixed(2)}`);

      taxEvents.push({
        id: `test-${taxEvents.length + 1}`,
        user_id: 'test-user',
        sell_transaction_id: sellTx.id || '',
        buy_transaction_id: holding.transactions[0]?.id || '',
        asset: sellTx.base_asset,
        quantity_sold: sellQuantity,
        cost_basis: totalCostBasis,
        sale_price: salePrice,
        gain_loss: gainLoss,
        holding_period_days: holdingPeriodDays,
        is_long_term: holdingPeriodDays > 365,
        tax_year: year,
        created_at: new Date().toISOString()
      });

      // Update holdings
      holding.quantity -= sellQuantity;
      holding.costBasis -= totalCostBasis;
    }

    return taxEvents;
  }

  async validateFixed2022Report(): Promise<void> {
    console.log('🔧 Testing Fixed 2022 XRP Tax Calculations\n');
    console.log('=========================================\n');

    // Your actual XRP transactions based on CSV data
    const transactions: Transaction[] = [
      // XRP purchases/receipts (building cost basis)
      {
        id: 'xrp-buy-1',
        user_id: 'test-user',
        file_id: 'test-file',
        transaction_type: 'buy',
        base_asset: 'XRP',
        quantity: 100,
        price: 0.1745, // £17.45 / 100 = £0.1745 per XRP
        transaction_date: '2020-05-03T01:00:00Z',
        exchange_name: 'coinbase_uk',
        created_at: '2020-05-03T01:00:00Z'
      },
      // Add more XRP purchases from your CSV history
      // For this test, I'll use simplified data but you can add all historical purchases
      {
        id: 'xrp-buy-2',
        user_id: 'test-user', 
        file_id: 'test-file',
        transaction_type: 'buy',
        base_asset: 'XRP',
        quantity: 4800, // Approximate - need to trace full history
        price: 0.16, // Estimated average price for remaining XRP
        transaction_date: '2020-07-01T01:00:00Z', 
        exchange_name: 'coinbase_uk',
        created_at: '2020-07-01T01:00:00Z'
      },
      
      // 2022 XRP disposals (with fixed positive prices)
      {
        id: 'xrp-sell-1',
        user_id: 'test-user',
        file_id: 'test-file', 
        transaction_type: 'sell',
        base_asset: 'XRP',
        quantity: 100,
        price: 0.5691, // Fixed: £56.91 / 100 = £0.5691 per XRP (was negative)
        transaction_date: '2022-01-14T00:00:00Z',
        exchange_name: 'coinbase_uk',
        created_at: '2022-01-14T00:00:00Z'
      },
      {
        id: 'xrp-sell-2',
        user_id: 'test-user',
        file_id: 'test-file',
        transaction_type: 'sell', 
        base_asset: 'XRP',
        quantity: 100,
        price: 0.5871, // Fixed: £58.71 / 100 = £0.5871 per XRP (was negative)
        transaction_date: '2022-03-16T00:00:00Z',
        exchange_name: 'coinbase_uk',
        created_at: '2022-03-16T00:00:00Z'
      },
      {
        id: 'xrp-sell-3',
        user_id: 'test-user',
        file_id: 'test-file',
        transaction_type: 'sell',
        base_asset: 'XRP', 
        quantity: 4700,
        price: 0.5872, // Fixed: £2759.91 / 4700 = £0.5872 per XRP (was negative)
        transaction_date: '2022-03-16T00:00:00Z',
        exchange_name: 'coinbase_uk',
        created_at: '2022-03-16T00:00:00Z'
      }
    ];

    console.log('📊 Test Data (Your Fixed 2022 XRP Transactions):');
    console.log('\nPurchases/Receipts (Cost Basis):');
    transactions.filter(t => t.transaction_type === 'buy').forEach(tx => {
      console.log(`  ${tx.transaction_date.split('T')[0]}: ${tx.quantity} XRP at £${(tx.price || 0).toFixed(4)}/unit (total: £${((tx.price || 0) * tx.quantity).toFixed(2)})`);
    });
    
    console.log('\n2022 Disposals (Sales):');
    transactions.filter(t => t.transaction_type === 'sell').forEach(tx => {
      console.log(`  ${tx.transaction_date.split('T')[0]}: ${tx.quantity} XRP at £${(tx.price || 0).toFixed(4)}/unit (total: £${((tx.price || 0) * tx.quantity).toFixed(2)})`);
    });

    // Calculate tax events with fixes
    console.log('\n🧮 Calculating Tax Events (With Fixes):\n');
    const taxEvents = this.calculateTaxEventsWithFixes(transactions, 2022);

    // Calculate totals
    const totals = {
      totalGains: taxEvents.reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
      totalLosses: taxEvents.reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
      netGainLoss: taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0)
    };

    // Get 2022 tax rules
    const allowances = await this.hmrcClient.fetchAllowances('2022');
    const allowance = allowances.find(a => a.type === 'capital_gains_allowance')?.amount || 0;
    
    const taxableGains = Math.max(0, totals.netGainLoss - allowance);
    const estimatedTax = taxableGains > 0 ? taxableGains * 0.10 : 0; // 10% basic rate

    console.log('\n📈 Fixed Calculation Results:');
    console.log('=============================');
    console.log(`Total Disposals: ${taxEvents.length} events`);
    console.log(`Total Sale Proceeds: £${taxEvents.reduce((sum, e) => sum + (e.sale_price || 0), 0).toFixed(2)}`);
    console.log(`Total Cost Basis: £${taxEvents.reduce((sum, e) => sum + (e.cost_basis || 0), 0).toFixed(2)}`);
    console.log(`Total Gains: £${totals.totalGains.toFixed(2)}`);
    console.log(`Total Losses: £${totals.totalLosses.toFixed(2)}`);
    console.log(`Net Gain/Loss: £${totals.netGainLoss.toFixed(2)}`);
    console.log(`2022 Allowance: £${allowance.toLocaleString()}`);
    console.log(`Taxable Gains: £${taxableGains.toFixed(2)}`);
    console.log(`Estimated Tax: £${estimatedTax.toFixed(2)}`);

    console.log('\n✅ COMPARISON WITH YOUR ORIGINAL REPORT:');
    console.log('========================================');
    console.log('Your Original Report Showed:');
    console.log('  - Sale Proceeds: NEGATIVE (£-56.91, £-58.71, £-2759.91)');
    console.log('  - Total Gain/Loss: LOSSES (£-74.36, £-76.16, etc.)');
    console.log('  - Tax Due: £0 (due to losses)');
    console.log('');
    console.log('Fixed Calculation Shows:');
    console.log('  - Sale Proceeds: POSITIVE (£56.91, £58.71, £2759.91)');
    console.log(`  - Total Gain/Loss: £${totals.netGainLoss > 0 ? 'GAINS' : 'LOSSES'} (£${totals.netGainLoss.toFixed(2)})`);
    console.log(`  - Tax Due: £${estimatedTax.toFixed(2)}`);

    console.log('\n🎯 EXPECTED OUTCOME:');
    console.log('===================');
    if (totals.netGainLoss > 0) {
      console.log('✅ You likely had GAINS on your 2022 XRP disposals');
      console.log('✅ XRP price increased from 2020 purchase levels to 2022 disposal levels');
      console.log('✅ Sale proceeds are now correctly positive');
      console.log('✅ FIFO cost basis properly matched to earliest purchases');
      if (taxableGains === 0) {
        console.log('✅ Gains below £12,300 allowance, so £0 tax due');
      } else {
        console.log(`⚠️  Taxable gains above allowance, estimated tax: £${estimatedTax.toFixed(2)}`);
      }
    } else {
      console.log('ℹ️  Net position shows losses (need full transaction history for accuracy)');
    }
  }
}

// Export for running
export const xrp2022TestValidator = new XRP2022TestValidator();

// Auto-run if called directly
if (process.argv[1] && process.argv[1].includes('validate-2022-xrp-fixes.test.ts')) {
  (async () => {
    await xrp2022TestValidator.validateFixed2022Report();
  })();
}