import { updateTaxRates } from '../src/lib/tax-rates-updater';

console.log('Starting tax rates update...');

try {
  await updateTaxRates();
  console.log('Tax rates update completed successfully!');
} catch (error) {
  console.error('Error updating tax rates:', error);
  process.exit(1);
} 