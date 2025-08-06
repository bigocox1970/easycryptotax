import { updateTaxRates } from './src/lib/tax-rates-updater.js';

console.log('Starting tax rates update...');

updateTaxRates()
  .then(() => {
    console.log('Tax rates update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating tax rates:', error);
    process.exit(1);
  }); 