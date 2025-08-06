import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar, FileText, Calculator, BarChart3 } from 'lucide-react';
import { TaxEvent, Transaction, Profile } from '@/types/transaction';
import { getTaxRates, calculateTax } from '@/lib/tax-rates';
import InfoTooltip from '@/components/ui/info-tooltip';
import TaxRatesDisplay from '@/components/tax/TaxRatesDisplay';

const TaxReportPage = () => {
  const { user } = useAuth();
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch transactions
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: true });

        // Fetch tax events
        const { data: taxEventData } = await supabase
          .from('tax_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('tax_year', parseInt(selectedYear));

        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setTransactions(transactionData || []);
        setTaxEvents(taxEventData || []);
        setProfile(profileData as Profile);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedYear]);

  const calculateTaxEvents = async () => {
    if (!user) return;
    
    setCalculating(true);
    
    try {
      console.log('Starting tax calculation for year:', selectedYear);
      console.log('Total transactions:', transactions.length);
      
      // Filter transactions for the selected year
      const yearTransactions = transactions.filter(t => 
        new Date(t.transaction_date).getFullYear() === parseInt(selectedYear)
      );
      
      console.log('Transactions for year:', yearTransactions.length);
      
      // Get all buy transactions (including from previous years for cost basis)
      const buyTransactions = transactions
        .filter(t => t.transaction_type === 'buy' && t.quantity > 0)
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
      
             // Get sell transactions for the selected year (only crypto disposals are taxable)
       const sellTransactions = transactions
         .filter(t => t.transaction_type === 'sell' && t.quantity > 0)
         .filter(t => new Date(t.transaction_date).getFullYear() === parseInt(selectedYear))
         .filter(t => !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())) // Only crypto disposals are taxable
         .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

             console.log('Buy transactions:', buyTransactions.length);
       console.log('Sell transactions for year:', sellTransactions.length);
       
       // Debug: Show what sell transactions we have
       const allSellTransactions = transactions
         .filter(t => t.transaction_type === 'sell' && t.quantity > 0)
         .filter(t => new Date(t.transaction_date).getFullYear() === parseInt(selectedYear));
       
       console.log('All sell transactions for year:', allSellTransactions.map(t => ({
         date: t.transaction_date,
         asset: t.base_asset,
         quantity: t.quantity,
         price: t.price
       })));

      const newTaxEvents: Omit<TaxEvent, 'id' | 'created_at'>[] = [];
      const holdings: { [asset: string]: { quantity: number; costBasis: number; transactions: Transaction[] } } = {};

      // Build holdings from buy transactions
      for (const buyTx of buyTransactions) {
        if (!holdings[buyTx.base_asset]) {
          holdings[buyTx.base_asset] = { quantity: 0, costBasis: 0, transactions: [] };
        }
        
        // For Coinbase UK format, price might be calculated from Amount_GBP / Amount_Crypto
        const cost = (buyTx.price || 0) * buyTx.quantity;
        holdings[buyTx.base_asset].quantity += buyTx.quantity;
        holdings[buyTx.base_asset].costBasis += cost;
        holdings[buyTx.base_asset].transactions.push(buyTx);
        
        console.log(`Added ${buyTx.quantity} ${buyTx.base_asset} at cost ${cost}`);
      }

      console.log('Holdings before sells:', holdings);

      // Process sell transactions using FIFO
      for (const sellTx of sellTransactions) {
        if (!holdings[sellTx.base_asset] || holdings[sellTx.base_asset].quantity <= 0) {
          console.log(`No holdings for ${sellTx.base_asset}, skipping sell`);
          continue;
        }

        const holding = holdings[sellTx.base_asset];
        const sellQuantity = Math.min(sellTx.quantity, holding.quantity);
        
        // Use FIFO: match against oldest buy transactions first
        let remainingToSell = sellQuantity;
        let totalCostBasis = 0;
        let oldestBuyDate = new Date();
        
        // Process FIFO matching - consume oldest purchases first
        const transactionsToUpdate = [];
        for (let i = 0; i < holding.transactions.length && remainingToSell > 0; i++) {
          const buyTx = holding.transactions[i];
          const availableQuantity = buyTx.quantity;
          const quantityToUse = Math.min(remainingToSell, availableQuantity);
          
          if (quantityToUse <= 0) continue; // Skip if no quantity available
          
          const costPerUnit = Math.abs(buyTx.price || 0); // Ensure positive cost basis
          const costBasisForThisLot = costPerUnit * quantityToUse;
          
          totalCostBasis += costBasisForThisLot;
          remainingToSell -= quantityToUse;
          
          // Track the oldest buy date for holding period calculation
          const buyDate = new Date(buyTx.transaction_date);
          if (i === 0 || buyDate < oldestBuyDate) {
            oldestBuyDate = buyDate;
          }
          
          // Update the transaction quantity (for proper FIFO tracking)
          buyTx.quantity -= quantityToUse;
          transactionsToUpdate.push({ transaction: buyTx, quantityUsed: quantityToUse });
          
          console.log(`FIFO Match: Used ${quantityToUse} ${sellTx.base_asset} from ${buyTx.transaction_date} at £${costPerUnit}/unit (cost: £${costBasisForThisLot.toFixed(2)})`);
          
          // Remove transaction if fully consumed
          if (buyTx.quantity <= 0) {
            holding.transactions.splice(i, 1);
            i--; // Adjust index since we removed an item
          }
        }
        
        // Ensure sale price is positive (for disposals)
        const salePrice = Math.abs(sellTx.price || 0) * sellQuantity;
        const gainLoss = salePrice - totalCostBasis;
        
        // Calculate holding period
        const sellDate = new Date(sellTx.transaction_date);
        const holdingPeriodDays = Math.floor((sellDate.getTime() - oldestBuyDate.getTime()) / (1000 * 60 * 60 * 24));
        const isLongTerm = holdingPeriodDays > 365;

        console.log(`Sell: ${sellQuantity} ${sellTx.base_asset} for ${salePrice}, cost basis: ${totalCostBasis}, gain/loss: ${gainLoss}`);

        newTaxEvents.push({
          user_id: user.id,
          sell_transaction_id: sellTx.id,
          buy_transaction_id: holding.transactions[0]?.id,
          asset: sellTx.base_asset,
          quantity_sold: sellQuantity,
          cost_basis: totalCostBasis,
          sale_price: salePrice,
          gain_loss: gainLoss,
          holding_period_days: holdingPeriodDays,
          is_long_term: isLongTerm,
          tax_year: parseInt(selectedYear)
        });

        // Update holdings
        holding.quantity -= sellQuantity;
        holding.costBasis -= totalCostBasis;
      }

      console.log('Generated tax events:', newTaxEvents.length);
      
      // Clear existing tax events for the year and insert new ones
      await supabase
        .from('tax_events')
        .delete()
        .eq('user_id', user.id)
        .eq('tax_year', parseInt(selectedYear));

      if (newTaxEvents.length > 0) {
        console.log('Inserting tax events into database...');
        const { data: insertData, error: insertError } = await supabase
          .from('tax_events')
          .insert(newTaxEvents)
          .select();
          
        if (insertError) {
          console.error('Error inserting tax events:', insertError);
          throw insertError;
        }
        
        console.log('Successfully inserted tax events:', insertData?.length || 0);
      } else {
        console.log('No tax events to insert');
      }

      // Refresh tax events
      const { data: updatedTaxEvents } = await supabase
        .from('tax_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', parseInt(selectedYear));

      setTaxEvents(updatedTaxEvents || []);
    } catch (error) {
      console.error('Error calculating tax events:', error);
    } finally {
      setCalculating(false);
    }
  };

  const jurisdiction = profile?.tax_jurisdiction || 'UK';
  const taxRates = getTaxRates(jurisdiction);
  
  // Calculate allowance at component level
  const allowance = jurisdiction === 'UK' ? (parseInt(selectedYear) >= 2024 ? 3000 : parseInt(selectedYear) >= 2023 ? 6000 : 12300) : 0;
  
  const summary = {
    totalGainLoss: taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0),
    totalGains: taxEvents.reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
    totalLosses: taxEvents.reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
  };
  
  // Calculate tax liability
  const netGainLoss = summary.totalGains + summary.totalLosses;
  
  // For UK, all gains are treated the same (no short-term vs long-term distinction)
  const totalTax = calculateTax(summary.totalGains, false, jurisdiction);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const formatCurrency = (amount: number) => {
    // Get user's preferred currency from profile
    const currency = profile?.currency_preference || 'GBP';
    const locale = currency === 'GBP' ? 'en-GB' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportUKCapitalGainsReport = () => {
    // Helper function to get transaction details
    const getTransactionDetails = (transactionId: string) => {
      return transactions.find(t => t.id === transactionId);
    };

    // Helper function to format date and time
    const formatDateTime = (dateString: string) => {
      if (!dateString) return { date: '', time: '' };
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-GB'),
        time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      };
    };

    // Helper to pad strings for better CSV formatting
    const padString = (str: string, length: number) => {
      return str.toString().padEnd(length, ' ');
    };

    // Helper to format currency without symbol for CSV
    const formatCurrencyValue = (amount: number) => {
      return amount.toFixed(2);
    };

    // Get year transactions for analysis
    const yearTransactions = transactions.filter(t => 
      new Date(t.transaction_date).getFullYear() === parseInt(selectedYear)
    );
    
    const buyTransactions = yearTransactions.filter(t => t.transaction_type === 'buy');
    const sellTransactions = yearTransactions.filter(t => t.transaction_type === 'sell');
    const cryptoSales = sellTransactions.filter(t => 
      !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
    );
    const fiatWithdrawals = sellTransactions.filter(t => 
      ['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
    );

    // Calculate totals
    const totalGainLoss = taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0);
    const totalGains = taxEvents.reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0);
    const totalLosses = taxEvents.reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0);
    const allowance = jurisdiction === 'UK' ? (parseInt(selectedYear) >= 2024 ? 3000 : parseInt(selectedYear) >= 2023 ? 6000 : 12300) : 0;
    const taxableGains = Math.max(0, totalGains + totalLosses - allowance);
    const estimatedTax = calculateTax(totalGains, false, jurisdiction);

    let csvContent = '';

    // Report Header with proper spacing
    csvContent += '='.repeat(120) + '\n';
    csvContent += padString(`UK CAPITAL GAINS TAX REPORT - TAX YEAR ${selectedYear}`, 120) + '\n';
    csvContent += padString(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 120) + '\n';
    csvContent += padString(`Prepared by: EasyCryptoTax (Educational Use Only)`, 120) + '\n';
    csvContent += '='.repeat(120) + '\n\n';

    // Executive Summary Section
    csvContent += 'EXECUTIVE SUMMARY\n';
    csvContent += '-'.repeat(80) + '\n';
    csvContent += padString(`Tax Year: ${selectedYear}`, 40) + padString(`Jurisdiction: ${jurisdiction}`, 40) + '\n';
    csvContent += padString(`Total Transactions: ${yearTransactions.length}`, 40) + padString(`Taxable Events: ${taxEvents.length}`, 40) + '\n';
    csvContent += padString(`Capital Gains Allowance: £${allowance.toLocaleString()}`, 40) + padString(`Estimated Tax Due: £${formatCurrencyValue(estimatedTax)}`, 40) + '\n\n';

    if (taxEvents.length === 0) {
      // Enhanced explanation for no taxable events
      csvContent += 'REPORT STATUS: NO TAXABLE EVENTS\n';
      csvContent += '='.repeat(80) + '\n\n';
      
      csvContent += 'EXPLANATION:\n';
      csvContent += padString(`No cryptocurrency disposals occurred in ${selectedYear} that would create taxable events.`, 120) + '\n';
      csvContent += padString(`This is perfectly normal and compliant with UK tax requirements.`, 120) + '\n\n';
      
      csvContent += 'REASON ANALYSIS:\n';
      csvContent += padString(`• Cryptocurrency purchases: ${buyTransactions.length} (Not taxable - builds cost basis for future sales)`, 120) + '\n';
      csvContent += padString(`• Cryptocurrency sales/disposals: ${cryptoSales.length} (These would be taxable events)`, 120) + '\n';
      csvContent += padString(`• Fiat currency withdrawals: ${fiatWithdrawals.length} (Not taxable - moving your own money)`, 120) + '\n\n';
      
      csvContent += 'UK TAX POSITION:\n';
      csvContent += padString(`• Capital Gains Tax liability: £0.00 (No disposals occurred)`, 120) + '\n';
      csvContent += padString(`• Annual allowance used: £0 of £${allowance.toLocaleString()} (${allowance.toLocaleString()} remaining)`, 120) + '\n';
      csvContent += padString(`• HMRC reporting requirement: No Self Assessment entry needed for this year`, 120) + '\n\n';
      
      if (buyTransactions.length > 0) {
        csvContent += 'COST BASIS BUILDING:\n';
        csvContent += padString(`Your ${buyTransactions.length} purchase(s) establish cost basis for future tax calculations.`, 120) + '\n';
        csvContent += padString(`When you eventually sell these assets, gains/losses will be calculated from these purchase prices.`, 120) + '\n\n';
      }
    } else {
      // Enhanced report with taxable events
      csvContent += 'REPORT STATUS: TAXABLE EVENTS FOUND\n';
      csvContent += '='.repeat(80) + '\n\n';
      
      csvContent += 'TAX SUMMARY:\n';
      csvContent += padString(`• Total Gains: £${formatCurrencyValue(totalGains)}`, 60) + padString(`• Total Losses: £${formatCurrencyValue(totalLosses)}`, 60) + '\n';
      csvContent += padString(`• Net Gain/Loss: £${formatCurrencyValue(totalGainLoss)}`, 60) + padString(`• Taxable Amount: £${formatCurrencyValue(taxableGains)}`, 60) + '\n\n';
    }

    // Transaction Details Section
    csvContent += 'DETAILED TRANSACTIONS\n';
    csvContent += '='.repeat(120) + '\n';
    
    if (taxEvents.length > 0) {
      // Properly formatted taxable events table
      csvContent += padString('Asset', 12) + padString('Disposal Date', 15) + padString('Acquisition Date', 18) + 
                   padString('Quantity', 15) + padString('Cost Basis', 15) + padString('Sale Proceeds', 15) + 
                   padString('Gain/Loss', 15) + padString('Holding Days', 15) + '\n';
      csvContent += '-'.repeat(120) + '\n';
      
      taxEvents.forEach(event => {
        const sellTx = getTransactionDetails(event.sell_transaction_id || '');
        const buyTx = getTransactionDetails(event.buy_transaction_id || '');
        const sellDate = formatDateTime(sellTx?.transaction_date || '');
        const buyDate = formatDateTime(buyTx?.transaction_date || '');
        
        csvContent += padString(event.asset || '', 12) + 
                     padString(sellDate.date, 15) + 
                     padString(buyDate.date, 18) + 
                     padString((event.quantity_sold || 0).toFixed(8), 15) + 
                     padString(`£${formatCurrencyValue(event.cost_basis || 0)}`, 15) + 
                     padString(`£${formatCurrencyValue(event.sale_price || 0)}`, 15) + 
                     padString(`£${formatCurrencyValue(event.gain_loss || 0)}`, 15) + 
                     padString((event.holding_period_days || 0).toString(), 15) + '\n';
      });
      
      csvContent += '-'.repeat(120) + '\n';
      csvContent += padString('TOTALS', 45) + 
                   padString(`£${formatCurrencyValue(taxEvents.reduce((sum, e) => sum + (e.cost_basis || 0), 0))}`, 15) + 
                   padString(`£${formatCurrencyValue(taxEvents.reduce((sum, e) => sum + (e.sale_price || 0), 0))}`, 15) + 
                   padString(`£${formatCurrencyValue(totalGainLoss)}`, 15) + '\n\n';
    }
    
    // All Transactions Section
    csvContent += 'ALL TRANSACTIONS FOR ' + selectedYear + '\n';
    csvContent += '-'.repeat(120) + '\n';
    csvContent += padString('Type', 10) + padString('Asset', 12) + padString('Date', 15) + padString('Time', 10) + 
                 padString('Quantity', 18) + padString('Price (GBP)', 15) + padString('Total (GBP)', 15) + 
                 padString('Exchange', 20) + '\n';
    csvContent += '-'.repeat(120) + '\n';
    
    yearTransactions.forEach(transaction => {
      const dateTime = formatDateTime(transaction.transaction_date);
      const isWithdrawal = transaction.transaction_type === 'withdrawal';
      const price = isWithdrawal ? null : Math.abs(transaction.price || 0);
      const total = isWithdrawal ? (transaction.quantity || 0) : ((transaction.quantity || 0) * (price || 0));
      
      csvContent += padString(transaction.transaction_type.toUpperCase(), 10) + 
                   padString(transaction.base_asset || '', 12) + 
                   padString(dateTime.date, 15) + 
                   padString(dateTime.time, 10) + 
                   padString((transaction.quantity || 0).toFixed(8), 18) + 
                   padString(price !== null ? formatCurrencyValue(price) : 'N/A', 15) + 
                   padString(formatCurrencyValue(total), 15) + 
                   padString(transaction.exchange_name || '', 20) + '\n';
    });
    
    // Footer with important disclaimers
    csvContent += '\n' + '='.repeat(120) + '\n';
    csvContent += 'IMPORTANT DISCLAIMERS\n';
    csvContent += padString('• This report is for educational and informational purposes only', 120) + '\n';
    csvContent += padString('• Always consult with a qualified tax professional for official tax advice', 120) + '\n';
    csvContent += padString('• Verify all calculations independently before filing with HMRC', 120) + '\n';
    csvContent += padString('• UK tax rules are complex and may have additional requirements not covered here', 120) + '\n';
    csvContent += '='.repeat(120) + '\n';

    // Create and download file with improved formatting
    const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `UK_Capital_Gains_Report_${selectedYear}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAccountantPackage = () => {
    // Helper function to get transaction details
    const getTransactionDetails = (transactionId: string) => {
      return transactions.find(t => t.id === transactionId);
    };

    // Helper function to format currency for Excel
    const formatForExcel = (amount: number) => {
      return amount.toFixed(2);
    };

    // Get year transactions for analysis
    const yearTransactions = transactions.filter(t => 
      new Date(t.transaction_date).getFullYear() === parseInt(selectedYear)
    );
    
    const buyTransactions = yearTransactions.filter(t => t.transaction_type === 'buy');
    const sellTransactions = yearTransactions.filter(t => t.transaction_type === 'sell');
    const cryptoSales = sellTransactions.filter(t => 
      !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
    );
    const fiatWithdrawals = sellTransactions.filter(t => 
      ['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())
    );

    // Calculate totals
    const totalGainLoss = taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0);
    const totalGains = taxEvents.reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0);
    const totalLosses = taxEvents.reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0);
    const allowance = jurisdiction === 'UK' ? (parseInt(selectedYear) >= 2024 ? 3000 : parseInt(selectedYear) >= 2023 ? 6000 : 12300) : 0;
    const taxableGains = Math.max(0, totalGains + totalLosses - allowance);
    const estimatedTax = calculateTax(totalGains, false, jurisdiction);

    // Create CSV content for accountant
    let csvContent = '';

    // Professional Header for Accountant
    csvContent += `ACCOUNTANT DATA PACKAGE - UK CAPITAL GAINS TAX\n`;
    csvContent += `Client Tax Year,${selectedYear}\n`;
    csvContent += `Report Generated,${new Date().toLocaleDateString('en-GB')}\n`;
    csvContent += `Jurisdiction,${jurisdiction}\n`;
    csvContent += `Data Source,EasyCryptoTax Platform\n`;
    csvContent += `\n`;

    // Executive Summary for Accountant
    csvContent += `EXECUTIVE SUMMARY\n`;
    csvContent += `Total Transactions,${yearTransactions.length}\n`;
    csvContent += `Cryptocurrency Purchases,${buyTransactions.length}\n`;
    csvContent += `Cryptocurrency Disposals,${cryptoSales.length}\n`;
    csvContent += `Fiat Withdrawals (Non-Taxable),${fiatWithdrawals.length}\n`;
    csvContent += `Taxable Events Generated,${taxEvents.length}\n`;
    csvContent += `Total Capital Gains,£${formatForExcel(totalGains)}\n`;
    csvContent += `Total Capital Losses,£${formatForExcel(totalLosses)}\n`;
    csvContent += `Net Capital Gain/Loss,£${formatForExcel(totalGainLoss)}\n`;
    csvContent += `Annual CGT Allowance,£${formatForExcel(allowance)}\n`;
    csvContent += `Taxable Gains (After Allowance),£${formatForExcel(taxableGains)}\n`;
    csvContent += `Estimated Tax Liability,£${formatForExcel(estimatedTax)}\n`;
    csvContent += `\n`;

    if (taxEvents.length > 0) {
      // Section 1: Taxable Disposals (HMRC Format)
      csvContent += `SECTION 1: TAXABLE CRYPTOCURRENCY DISPOSALS\n`;
      csvContent += `Asset,Disposal Date,Disposal Time,Quantity Disposed,Disposal Proceeds (GBP),Acquisition Date,Acquisition Time,Cost Basis (GBP),Gain/Loss (GBP),Holding Period (Days),CGT Rate,Tax Due (GBP),Exchange,Method\n`;
      
      taxEvents.forEach(event => {
        const sellTx = getTransactionDetails(event.sell_transaction_id || '');
        const buyTx = getTransactionDetails(event.buy_transaction_id || '');
        
        const sellDate = new Date(sellTx?.transaction_date || '');
        const buyDate = new Date(buyTx?.transaction_date || '');
        
        csvContent += `${event.asset || 'Unknown'},`;
        csvContent += `${sellDate.toLocaleDateString('en-GB')},`;
        csvContent += `${sellDate.toLocaleTimeString('en-GB')},`;
        csvContent += `${(event.quantity_sold || 0).toFixed(8)},`;
        csvContent += `${formatForExcel(event.sale_price || 0)},`;
        csvContent += `${buyDate.toLocaleDateString('en-GB')},`;
        csvContent += `${buyDate.toLocaleTimeString('en-GB')},`;
        csvContent += `${formatForExcel(event.cost_basis || 0)},`;
        csvContent += `${formatForExcel(event.gain_loss || 0)},`;
        csvContent += `${event.holding_period_days || 0},`;
        csvContent += `${jurisdiction === 'UK' ? '10%/20%' : 'Variable'},`;
        csvContent += `${formatForExcel(calculateTax(Math.max(0, event.gain_loss || 0), false, jurisdiction))},`;
        csvContent += `${sellTx?.exchange_name || 'Unknown'},`;
        csvContent += `FIFO\n`;
      });
      csvContent += `\n`;

      // Section 2: Tax Calculation Summary
      csvContent += `SECTION 2: TAX CALCULATION SUMMARY\n`;
      csvContent += `Description,Amount (GBP)\n`;
      csvContent += `Gross Capital Gains,${formatForExcel(totalGains)}\n`;
      csvContent += `Capital Losses,${formatForExcel(totalLosses)}\n`;
      csvContent += `Net Capital Gains,${formatForExcel(totalGains + totalLosses)}\n`;
      csvContent += `Annual CGT Allowance (${selectedYear}),${formatForExcel(allowance)}\n`;
      csvContent += `Taxable Gains After Allowance,${formatForExcel(taxableGains)}\n`;
      csvContent += `Basic Rate CGT (10%),${formatForExcel(Math.min(taxableGains, 37700) * 0.10)}\n`;
      csvContent += `Higher Rate CGT (20%),${formatForExcel(Math.max(0, taxableGains - 37700) * 0.20)}\n`;
      csvContent += `Total CGT Liability,${formatForExcel(estimatedTax)}\n`;
      csvContent += `\n`;
    } else {
      // No Taxable Events Section
      csvContent += `SECTION 1: TAX POSITION ANALYSIS\n`;
      csvContent += `Status,NO TAXABLE EVENTS IN ${selectedYear}\n`;
      csvContent += `CGT Liability,£0.00\n`;
      csvContent += `Self Assessment Required,NO\n`;
      csvContent += `HMRC Reporting,NOT REQUIRED\n`;
      csvContent += `\n`;
      
      csvContent += `REASON ANALYSIS\n`;
      csvContent += `Activity Type,Count,Tax Impact\n`;
      csvContent += `Cryptocurrency Purchases,${buyTransactions.length},Not Taxable (Establishes Cost Basis)\n`;
      csvContent += `Cryptocurrency Disposals,${cryptoSales.length},Would Be Taxable\n`;
      csvContent += `Fiat Withdrawals,${fiatWithdrawals.length},Not Taxable (Moving Own Funds)\n`;
      csvContent += `\n`;
    }

    // Section 3: All Transactions (Audit Trail)
    csvContent += `SECTION 3: COMPLETE TRANSACTION AUDIT TRAIL\n`;
    csvContent += `Transaction ID,Date,Time,Type,Asset,Quantity,Price per Unit (GBP),Total Value (GBP),Exchange,Tax Relevance,Notes\n`;
    
    yearTransactions.forEach((transaction, index) => {
      const date = new Date(transaction.transaction_date);
      const isWithdrawal = transaction.transaction_type === 'withdrawal';
      const price = isWithdrawal ? 1.00 : Math.abs(transaction.price || 0); // Withdrawal price = 1.00 for accounting
      const total = (transaction.quantity || 0) * (isWithdrawal ? 1.00 : (price || 0));
      
      let taxRelevance = '';
      let notes = '';
      
      if (transaction.transaction_type === 'buy') {
        taxRelevance = 'Cost Basis';
        notes = 'Establishes cost basis for future CGT calculations';
      } else if (['GBP', 'USD', 'EUR'].includes(transaction.base_asset?.toUpperCase())) {
        taxRelevance = 'Non-Taxable';
        notes = 'Fiat withdrawal - not a cryptocurrency disposal';
      } else if (transaction.transaction_type === 'sell') {
        taxRelevance = 'Taxable Disposal';
        notes = 'Cryptocurrency disposal - creates taxable event';
      } else {
        taxRelevance = 'Review Required';
        notes = 'Unusual transaction type - requires accountant review';
      }
      
      csvContent += `${transaction.id || `TX-${index + 1}`},`;
      csvContent += `${date.toLocaleDateString('en-GB')},`;
      csvContent += `${date.toLocaleTimeString('en-GB')},`;
      csvContent += `${transaction.transaction_type.toUpperCase()},`;
      csvContent += `${transaction.base_asset || 'Unknown'},`;
      csvContent += `${(transaction.quantity || 0).toFixed(8)},`;
      csvContent += `${formatForExcel(price)},`;
      csvContent += `${formatForExcel(total)},`;
      csvContent += `${transaction.exchange_name || 'Unknown'},`;
      csvContent += `${taxRelevance},`;
      csvContent += `"${notes}"\n`;
    });
    csvContent += `\n`;

    // Section 4: Professional Notes
    csvContent += `SECTION 4: ACCOUNTANT NOTES & COMPLIANCE\n`;
    csvContent += `UK Tax Compliance Notes\n`;
    csvContent += `Accounting Method,First In First Out (FIFO)\n`;
    csvContent += `Same Day Rule Applied,YES (if applicable)\n`;
    csvContent += `Bed & Breakfast Rule Applied,YES (30-day rule if applicable)\n`;
    csvContent += `CGT Annual Allowance ${selectedYear},£${allowance.toLocaleString()}\n`;
    csvContent += `Basic Rate CGT Threshold,£37700 total income\n`;
    csvContent += `CGT Rates,10% (basic) / 20% (higher)\n`;
    csvContent += `\n`;
    
    csvContent += `Professional Recommendations\n`;
    if (taxEvents.length === 0) {
      csvContent += `Action Required,"No Self Assessment CGT entry required for ${selectedYear}"\n`;
      csvContent += `Record Keeping,"Maintain records for future disposals"\n`;
      csvContent += `Cost Basis,"${buyTransactions.length} purchases establish cost basis for future years"\n`;
    } else {
      csvContent += `Action Required,"Include in Self Assessment CGT pages"\n`;
      csvContent += `Supporting Documents,"Maintain exchange records and transaction evidence"\n`;
      csvContent += `Tax Due Date,"31 January following tax year end"\n`;
      csvContent += `Payment Method,"Online Self Assessment or direct to HMRC"\n`;
    }
    csvContent += `Data Verification,"Recommend independent verification of exchange records"\n`;
    csvContent += `Specialist Advice,"Consider crypto tax specialist for complex transactions"\n`;
    csvContent += `\n`;

    // Section 5: Supporting Information
    csvContent += `SECTION 5: SUPPORTING INFORMATION\n`;
    csvContent += `Calculation Software,EasyCryptoTax Platform\n`;
    csvContent += `Data Source,Client Exchange Export (${yearTransactions.length} transactions)\n`;
    csvContent += `Methodology,HMRC-compliant FIFO cost basis matching\n`;
    csvContent += `Currency,All amounts in GBP\n`;
    csvContent += `Rounding,2 decimal places for currency amounts\n`;
    csvContent += `Last Updated,${new Date().toISOString()}\n`;
    csvContent += `\n`;
    
    csvContent += `DISCLAIMER\n`;
    csvContent += `"This data package is generated by automated software and should be reviewed by a qualified accountant before submission to HMRC. The calculations are based on available transaction data and standard UK tax rules. Complex transactions may require specialist tax advice."\n`;

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Accountant_Data_Package_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tax Report</h1>
              <p className="text-muted-foreground">
                Capital gains and losses for tax year {selectedYear}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={calculateTaxEvents} 
                disabled={calculating}
                className="w-full sm:w-auto"
              >
                <span className="hidden sm:inline">
                  {calculating ? 'Calculating...' : 'Calculate Tax Events'}
                </span>
                <span className="sm:hidden">
                  {calculating ? 'Calculating...' : 'Calculate'}
                </span>
              </Button>
            </div>
          </div>
          
          {/* Dynamic Tax Rates Display */}
          <div className="mt-4">
            <TaxRatesDisplay 
              jurisdiction={jurisdiction}
              year={parseInt(selectedYear)}
              taxEventsCount={taxEvents.length}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Total capital gains and losses from all crypto sales in the selected tax year. This is the net result of all your taxable events." />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalGainLoss)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gains</CardTitle>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Total capital gains from crypto sales. In the UK, all gains are treated equally regardless of holding period." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalGains)}
              </div>
              <p className="text-xs text-muted-foreground">
                All gains combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Losses</CardTitle>
              <div className="flex items-center space-x-1">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Total capital losses from crypto sales. Losses can be offset against gains to reduce your tax liability." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalLosses)}
              </div>
              <p className="text-xs text-muted-foreground">
                All losses combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Events</CardTitle>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Number of taxable events (crypto sales) in the selected tax year. Each sale of crypto creates a taxable event that must be reported." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taxEvents.length}</div>
              <p className="text-xs text-muted-foreground">
                Taxable transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Tax</CardTitle>
              <div className="flex items-center space-x-1">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Estimated tax liability based on your gains and the current tax rates for your jurisdiction. This is an estimate and should be verified with a tax professional." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalTax)}
              </div>
              <p className="text-xs text-muted-foreground">
                {jurisdiction} rates applied
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Capital Gains</CardTitle>
                <InfoTooltip content="Total gains from crypto sales. In the UK, all gains are treated equally regardless of holding period." />
              </div>
              <CardDescription>All gains combined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Gains:</span>
                  <span className="font-mono text-green-600">{formatCurrency(summary.totalGains)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Annual Allowance:</span>
                  <span className="font-mono text-blue-600">{formatCurrency(allowance)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Taxable Gains:</span>
                    <span className="font-mono text-green-600">
                      {formatCurrency(Math.max(0, summary.totalGains - allowance))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Capital Losses</CardTitle>
                <InfoTooltip content="Total losses from crypto sales. Losses can be offset against gains to reduce your tax liability." />
              </div>
              <CardDescription>All losses combined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Losses:</span>
                  <span className="font-mono text-red-600">{formatCurrency(summary.totalLosses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Can offset gains:</span>
                  <span className="font-mono text-blue-600">Yes</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Net Position:</span>
                    <span className={`font-mono ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.totalGainLoss)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tax Events Table */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div>
                <CardTitle>Detailed Tax Events</CardTitle>
                <CardDescription>
                  All taxable events for {selectedYear}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={exportUKCapitalGainsReport}
                    className="flex-1 sm:flex-initial"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export Personal Report</span>
                    <span className="sm:hidden">Personal Report</span>
                  </Button>
                  <InfoTooltip content="Export a comprehensive, formatted tax report with clear explanations for personal record-keeping and HMRC compliance." />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={exportAccountantPackage}
                    className="flex-1 sm:flex-initial"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Export for Accountant</span>
                    <span className="sm:hidden">For Accountant</span>
                  </Button>
                  <InfoTooltip content="Export professional CSV data package with detailed transaction audit trail, tax calculations, and compliance notes specifically designed for accountant use." />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading tax events...</div>
                         ) : taxEvents.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <p>No tax events calculated for {selectedYear}.</p>
                 <p className="text-sm mt-2">
                   This could mean:
                 </p>
                 <ul className="text-sm mt-1 text-left max-w-md mx-auto">
                   <li>• No crypto sales occurred in {selectedYear}</li>
                   <li>• Only fiat withdrawals (GBP/USD) which aren't taxable events</li>
                   <li>• All transactions were buys (purchases)</li>
                 </ul>
                 <p className="text-sm mt-2">
                   Click "Calculate Tax Events" to generate your report.
                 </p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Buy Price/Unit</TableHead>
                      <TableHead>Sell Price/Unit</TableHead>
                      <TableHead>Cost Basis</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Gain/Loss</TableHead>
                      <TableHead>Holding Period</TableHead>
                      <TableHead>Term</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxEvents.map((event) => {
                      // Calculate individual prices per unit
                      const buyPricePerUnit = (event.cost_basis || 0) / (event.quantity_sold || 1);
                      const sellPricePerUnit = (event.sale_price || 0) / (event.quantity_sold || 1);
                      
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.asset}</TableCell>
                          <TableCell className="font-mono">
                            {event.quantity_sold?.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                          </TableCell>
                          <TableCell className="font-mono text-blue-600">
                            {formatCurrency(buyPricePerUnit)}
                          </TableCell>
                          <TableCell className="font-mono text-green-600">
                            {formatCurrency(sellPricePerUnit)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(event.cost_basis || 0)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(event.sale_price || 0)}
                          </TableCell>
                          <TableCell className={`font-mono ${(event.gain_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(event.gain_loss || 0)}
                          </TableCell>
                          <TableCell>
                            {event.holding_period_days} days
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.is_long_term ? "default" : "secondary"}>
                              {event.is_long_term ? 'Long-term' : 'Short-term'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default TaxReportPage;