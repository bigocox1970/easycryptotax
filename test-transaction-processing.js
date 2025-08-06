// Test script to verify transaction processing accuracy
// This simulates the app's processing logic with the user's actual 2024 data

const testData = [
  {
    Date: '18/03/2024',
    Transaction_Type: 'Received',
    Currency: 'BTC',
    Amount_of_Currency: '0.0148',
    Amount_of_Description: '780.83',
    Description: 'Received BTC'
  },
  {
    Date: '29/04/2024',
    Transaction_Type: 'Withdraw',
    Currency: 'GBP',
    Amount_of_Currency: '-2.00',
    Amount_of_Description: '-2.00',
    Description: 'Withdrew funds'
  },
  {
    Date: '13/12/2024',
    Transaction_Type: 'Sold',
    Currency: 'BTC',
    Amount_of_Currency: '-0.000126',
    Amount_of_Description: '-10.00',
    Description: 'Sold BTC'
  },
  {
    Date: '13/12/2024',
    Transaction_Type: 'Withdraw',
    Currency: 'GBP',
    Amount_of_Currency: '-9.00',
    Amount_of_Description: '-9.00',
    Description: 'Withdrew funds'
  }
];

// Simulate the app's processing logic
function processTransactions(data) {
  console.log('=== TRANSACTION PROCESSING TEST ===');
  console.log('Input data:', data);
  
  const transactions = data.map(row => {
    const transactionType = row.Transaction_Type?.toLowerCase();
    const currency = row.Currency;
    const amountGBP = parseFloat(row.Amount_of_Description) || 0;
    const amountCrypto = parseFloat(row.Amount_of_Currency) || 0;
    
    // Determine transaction type
    let normalizedType = 'unknown';
    if (transactionType?.includes('received') || transactionType?.includes('buy')) {
      normalizedType = 'buy';
    } else if (transactionType?.includes('sold') || transactionType?.includes('sell')) {
      normalizedType = 'sell';
    } else if (transactionType?.includes('withdraw')) {
      normalizedType = 'sell'; // Fiat withdrawals are treated as sells
    }
    
    return {
      transaction_date: row.Date,
      transaction_type: normalizedType,
      base_asset: currency,
      quantity: Math.abs(amountCrypto),
      price: amountGBP / Math.abs(amountCrypto) || null,
      amount_gbp: amountGBP,
      amount_crypto: amountCrypto,
      original_type: transactionType
    };
  });
  
  console.log('\n=== PROCESSED TRANSACTIONS ===');
  transactions.forEach((t, i) => {
    console.log(`Transaction ${i + 1}:`, {
      date: t.transaction_date,
      type: t.transaction_type,
      asset: t.base_asset,
      quantity: t.quantity,
      price: t.price,
      amount_gbp: t.amount_gbp,
      original_type: t.original_type
    });
  });
  
  return transactions;
}

// Test tax event calculation
function calculateTaxEvents(transactions, year = 2024) {
  console.log('\n=== TAX EVENT CALCULATION ===');
  
  // Filter for the specific year
  const yearTransactions = transactions.filter(t => {
    const transactionYear = new Date(t.transaction_date.split('/').reverse().join('-')).getFullYear();
    return transactionYear === year;
  });
  
  console.log(`Transactions for ${year}:`, yearTransactions.length);
  
  // Categorize transactions
  const buyTransactions = yearTransactions.filter(t => t.transaction_type === 'buy');
  const sellTransactions = yearTransactions.filter(t => t.transaction_type === 'sell');
  const fiatWithdrawals = sellTransactions.filter(t => 
    ['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
  );
  const cryptoSales = sellTransactions.filter(t => 
    !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
  );
  
  console.log('\nTransaction Summary:');
  console.log(`- Total transactions: ${yearTransactions.length}`);
  console.log(`- Buy transactions: ${buyTransactions.length}`);
  console.log(`- Sell transactions: ${sellTransactions.length}`);
  console.log(`- Crypto sales: ${cryptoSales.length}`);
  console.log(`- Fiat withdrawals: ${fiatWithdrawals.length}`);
  
  // Calculate taxable events
  const taxableEvents = cryptoSales.map(sale => {
    // Find corresponding buy transaction for cost basis calculation
    const buyTransaction = buyTransactions.find(buy => buy.base_asset === sale.base_asset);
    
    const costBasis = buyTransaction ? buyTransaction.amount_gbp : 0;
    const saleProceeds = Math.abs(sale.amount_gbp);
    const gainLoss = saleProceeds - costBasis;
    
    return {
      asset: sale.base_asset,
      quantity_sold: sale.quantity,
      cost_basis: costBasis,
      sale_price: saleProceeds,
      gain_loss: gainLoss,
      sale_date: sale.transaction_date,
      acquisition_date: buyTransaction?.transaction_date || 'Unknown'
    };
  });
  
  console.log('\n=== TAXABLE EVENTS ===');
  if (taxableEvents.length === 0) {
    console.log('❌ NO TAXABLE EVENTS FOUND - THIS IS INCORRECT!');
    console.log('Expected: 1 taxable event (BTC sale on 13/12/2024)');
  } else {
    taxableEvents.forEach((event, i) => {
      console.log(`Taxable Event ${i + 1}:`, {
        asset: event.asset,
        quantity: event.quantity_sold,
        cost_basis: event.cost_basis,
        sale_price: event.sale_price,
        gain_loss: event.gain_loss,
        sale_date: event.sale_date
      });
    });
  }
  
  return {
    totalTransactions: yearTransactions.length,
    buyTransactions: buyTransactions.length,
    cryptoSales: cryptoSales.length,
    fiatWithdrawals: fiatWithdrawals.length,
    taxableEvents: taxableEvents.length,
    taxableEventsList: taxableEvents
  };
}

// Run the test
console.log('🧪 TESTING TRANSACTION PROCESSING ACCURACY');
console.log('==========================================\n');

const processedTransactions = processTransactions(testData);
const taxResults = calculateTaxEvents(processedTransactions, 2024);

console.log('\n=== EXPECTED RESULTS ===');
console.log('Based on user data, we should see:');
console.log('- 4 total transactions');
console.log('- 1 buy transaction (BTC received on 18/03/2024)');
console.log('- 1 crypto sale (BTC sold on 13/12/2024)');
console.log('- 2 fiat withdrawals (29/04/2024 and 13/12/2024)');
console.log('- 1 taxable event (the BTC sale)');

console.log('\n=== ACTUAL RESULTS ===');
console.log(`Total transactions: ${taxResults.totalTransactions}`);
console.log(`Buy transactions: ${taxResults.buyTransactions}`);
console.log(`Crypto sales: ${taxResults.cryptoSales}`);
console.log(`Fiat withdrawals: ${taxResults.fiatWithdrawals}`);
console.log(`Taxable events: ${taxResults.taxableEvents}`);

// Verify results
const expected = {
  totalTransactions: 4,
  buyTransactions: 1,
  cryptoSales: 1,
  fiatWithdrawals: 2,
  taxableEvents: 1
};

console.log('\n=== VERIFICATION ===');
let allCorrect = true;

if (taxResults.totalTransactions !== expected.totalTransactions) {
  console.log(`❌ Total transactions: Expected ${expected.totalTransactions}, got ${taxResults.totalTransactions}`);
  allCorrect = false;
} else {
  console.log(`✅ Total transactions: ${taxResults.totalTransactions}`);
}

if (taxResults.buyTransactions !== expected.buyTransactions) {
  console.log(`❌ Buy transactions: Expected ${expected.buyTransactions}, got ${taxResults.buyTransactions}`);
  allCorrect = false;
} else {
  console.log(`✅ Buy transactions: ${taxResults.buyTransactions}`);
}

if (taxResults.cryptoSales !== expected.cryptoSales) {
  console.log(`❌ Crypto sales: Expected ${expected.cryptoSales}, got ${taxResults.cryptoSales}`);
  allCorrect = false;
} else {
  console.log(`✅ Crypto sales: ${taxResults.cryptoSales}`);
}

if (taxResults.fiatWithdrawals !== expected.fiatWithdrawals) {
  console.log(`❌ Fiat withdrawals: Expected ${expected.fiatWithdrawals}, got ${taxResults.fiatWithdrawals}`);
  allCorrect = false;
} else {
  console.log(`✅ Fiat withdrawals: ${taxResults.fiatWithdrawals}`);
}

if (taxResults.taxableEvents !== expected.taxableEvents) {
  console.log(`❌ Taxable events: Expected ${expected.taxableEvents}, got ${taxResults.taxableEvents}`);
  allCorrect = false;
} else {
  console.log(`✅ Taxable events: ${taxResults.taxableEvents}`);
}

console.log('\n=== FINAL RESULT ===');
if (allCorrect) {
  console.log('🎉 ALL TESTS PASSED - Processing logic is correct!');
} else {
  console.log('🚨 TESTS FAILED - Processing logic has bugs!');
  console.log('\nThis explains why the app report was incorrect.');
} 