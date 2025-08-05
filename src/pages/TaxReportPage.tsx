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
      
             // Get sell transactions for the selected year (exclude fiat withdrawals like GBP)
       const sellTransactions = transactions
         .filter(t => t.transaction_type === 'sell' && t.quantity > 0)
         .filter(t => new Date(t.transaction_date).getFullYear() === parseInt(selectedYear))
         .filter(t => !['GBP', 'USD', 'EUR'].includes(t.base_asset?.toUpperCase())) // Exclude fiat currencies
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
        
        // Process FIFO matching
        for (let i = 0; i < holding.transactions.length && remainingToSell > 0; i++) {
          const buyTx = holding.transactions[i];
          const availableQuantity = buyTx.quantity;
          const quantityToUse = Math.min(remainingToSell, availableQuantity);
          
          const costPerUnit = (buyTx.price || 0);
          const costBasisForThisLot = costPerUnit * quantityToUse;
          
          totalCostBasis += costBasisForThisLot;
          remainingToSell -= quantityToUse;
          
          // Track the oldest buy date for holding period calculation
          const buyDate = new Date(buyTx.transaction_date);
          if (buyDate < oldestBuyDate) {
            oldestBuyDate = buyDate;
          }
          
          console.log(`Matched ${quantityToUse} ${sellTx.base_asset} from buy on ${buyTx.transaction_date} at cost ${costBasisForThisLot}`);
        }
        
        const salePrice = (sellTx.price || 0) * sellQuantity;
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
  
  const summary = {
    totalGainLoss: taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0),
    shortTermGains: taxEvents.filter(e => !e.is_long_term).reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
    shortTermLosses: taxEvents.filter(e => !e.is_long_term).reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
    longTermGains: taxEvents.filter(e => e.is_long_term).reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
    longTermLosses: taxEvents.filter(e => e.is_long_term).reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
  };
  
  // Calculate tax liability
  const totalGains = summary.shortTermGains + summary.longTermGains;
  const totalLosses = summary.shortTermLosses + summary.longTermLosses;
  const netGainLoss = totalGains + totalLosses;
  
  const shortTermTax = calculateTax(summary.shortTermGains, false, jurisdiction);
  const longTermTax = calculateTax(summary.longTermGains, true, jurisdiction);
  const totalTax = shortTermTax + longTermTax;

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
            <div className="flex items-center space-x-4">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={calculateTaxEvents} disabled={calculating}>
                {calculating ? 'Calculating...' : 'Calculate Tax Events'}
              </Button>
            </div>
          </div>
          
          {/* Tax Rates Info */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Tax Rates ({jurisdiction}):</h3>
              <InfoTooltip content={`Current tax rates for ${jurisdiction}. Short-term gains are taxed at a higher rate than long-term gains. The annual allowance is the amount you can earn tax-free before capital gains tax applies.`} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Short-term rate:</strong> {(taxRates.shortTermRate * 100).toFixed(1)}%</p>
                <p><strong>Long-term rate:</strong> {(taxRates.longTermRate * 100).toFixed(1)}%</p>
                <p><strong>Annual allowance:</strong> {formatCurrency(taxRates.allowance)}</p>
              </div>
              <div>
                <p><strong>Currency:</strong> {taxRates.currency}</p>
                <p><strong>Jurisdiction:</strong> {taxRates.jurisdiction}</p>
                <p><strong>Total tax events:</strong> {taxEvents.length}</p>
              </div>
            </div>
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
              <CardTitle className="text-sm font-medium">Short-Term Net</CardTitle>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Net gains/losses from crypto held for 1 year or less. Short-term gains are typically taxed at a higher rate than long-term gains." />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary.shortTermGains + summary.shortTermLosses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.shortTermGains + summary.shortTermLosses)}
              </div>
              <p className="text-xs text-muted-foreground">
                ≤ 1 year holding period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Long-Term Net</CardTitle>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Net gains/losses from crypto held for more than 1 year. Long-term gains often qualify for lower tax rates in many jurisdictions." />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary.longTermGains + summary.longTermLosses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.longTermGains + summary.longTermLosses)}
              </div>
              <p className="text-xs text-muted-foreground">
                &gt; 1 year holding period
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
                <CardTitle>Short-Term Capital Gains/Losses</CardTitle>
                <InfoTooltip content="Gains and losses from crypto held for 1 year or less. These are typically taxed at higher rates and may have different reporting requirements." />
              </div>
              <CardDescription>Holdings ≤ 1 year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Gains:</span>
                  <span className="font-mono text-green-600">{formatCurrency(summary.shortTermGains)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Losses:</span>
                  <span className="font-mono text-red-600">{formatCurrency(summary.shortTermLosses)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Net Short-Term:</span>
                    <span className={`font-mono ${(summary.shortTermGains + summary.shortTermLosses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.shortTermGains + summary.shortTermLosses)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Long-Term Capital Gains/Losses</CardTitle>
                <InfoTooltip content="Gains and losses from crypto held for more than 1 year. These often qualify for lower tax rates and may have different treatment in tax calculations." />
              </div>
              <CardDescription>Holdings &gt; 1 year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Gains:</span>
                  <span className="font-mono text-green-600">{formatCurrency(summary.longTermGains)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Losses:</span>
                  <span className="font-mono text-red-600">{formatCurrency(summary.longTermLosses)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Net Long-Term:</span>
                    <span className={`font-mono ${(summary.longTermGains + summary.longTermLosses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.longTermGains + summary.longTermLosses)}
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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Detailed Tax Events</CardTitle>
                <CardDescription>
                  All taxable events for {selectedYear}
                </CardDescription>
              </div>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Form 8949
              </Button>
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
                      <TableHead>Cost Basis</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Gain/Loss</TableHead>
                      <TableHead>Holding Period</TableHead>
                      <TableHead>Term</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.asset}</TableCell>
                        <TableCell className="font-mono">
                          {event.quantity_sold?.toLocaleString(undefined, { maximumFractionDigits: 8 })}
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
                    ))}
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