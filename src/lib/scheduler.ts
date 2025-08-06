import { updateTaxRatesDaily, shouldUpdateTaxRates } from './hmrc-api-client';

// Simple scheduler for daily updates
export class TaxRatesScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting tax rates scheduler...');
    this.isRunning = true;

    // Check every hour if we need to update
    this.intervalId = setInterval(async () => {
      try {
        const needsUpdate = await shouldUpdateTaxRates();
        
        if (needsUpdate) {
          console.log('Daily update needed, starting update...');
          await updateTaxRatesDaily();
        } else {
          console.log('Tax rates are up to date');
        }
      } catch (error) {
        console.error('Error in scheduled tax rates check:', error);
      }
    }, 60 * 60 * 1000); // Check every hour

    // Also run immediately on start
    this.runImmediate();
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Tax rates scheduler stopped');
  }

  // Run update immediately
  async runImmediate() {
    try {
      const needsUpdate = await shouldUpdateTaxRates();
      
      if (needsUpdate) {
        console.log('Running immediate tax rates update...');
        await updateTaxRatesDaily();
      } else {
        console.log('Tax rates are already up to date');
      }
    } catch (error) {
      console.error('Error in immediate tax rates update:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString()
    };
  }
}

// Global scheduler instance
export const taxRatesScheduler = new TaxRatesScheduler();

// Start scheduler when this module is imported
if (typeof window === 'undefined') {
  // Only run on server-side
  taxRatesScheduler.start();
} 