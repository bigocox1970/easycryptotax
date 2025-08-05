import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';
import { TaxEvent, Transaction } from '@/types/transaction';

const TaxReportPage = () => {
  const { user } = useAuth();
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

        setTransactions(transactionData || []);
        setTaxEvents(taxEventData || []);
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
      // Simple FIFO calculation
      const buyTransactions = transactions
        .filter(t => t.transaction_type === 'buy' && t.price && t.quantity)
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
      
      const sellTransactions = transactions
        .filter(t => t.transaction_type === 'sell' && t.price && t.quantity)
        .filter(t => new Date(t.transaction_date).getFullYear() === parseInt(selectedYear))
        .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

      const newTaxEvents: any[] = [];
      const holdings: { [asset: string]: { quantity: number; costBasis: number; transactions: Transaction[] } } = {};

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

      // Process sell transactions
      for (const sellTx of sellTransactions) {
        if (!holdings[sellTx.base_asset] || holdings[sellTx.base_asset].quantity <= 0) continue;

        const holding = holdings[sellTx.base_asset];
        const sellQuantity = Math.min(sellTx.quantity, holding.quantity);
        const avgCostPerUnit = holding.costBasis / holding.quantity;
        const costBasis = avgCostPerUnit * sellQuantity;
        const salePrice = (sellTx.price || 0) * sellQuantity;
        const gainLoss = salePrice - costBasis;

        // Calculate holding period (simplified)
        const sellDate = new Date(sellTx.transaction_date);
        const oldestBuyDate = new Date(holding.transactions[0]?.transaction_date || sellTx.transaction_date);
        const holdingPeriodDays = Math.floor((sellDate.getTime() - oldestBuyDate.getTime()) / (1000 * 60 * 60 * 24));
        const isLongTerm = holdingPeriodDays > 365;

        newTaxEvents.push({
          user_id: user.id,
          sell_transaction_id: sellTx.id,
          buy_transaction_id: holding.transactions[0]?.id,
          asset: sellTx.base_asset,
          quantity_sold: sellQuantity,
          cost_basis: costBasis,
          sale_price: salePrice,
          gain_loss: gainLoss,
          holding_period_days: holdingPeriodDays,
          is_long_term: isLongTerm,
          tax_year: parseInt(selectedYear)
        });

        // Update holdings
        holding.quantity -= sellQuantity;
        holding.costBasis -= costBasis;
      }

      // Clear existing tax events for the year and insert new ones
      await supabase
        .from('tax_events')
        .delete()
        .eq('user_id', user.id)
        .eq('tax_year', parseInt(selectedYear));

      if (newTaxEvents.length > 0) {
        await supabase
          .from('tax_events')
          .insert(newTaxEvents);
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

  const summary = {
    totalGainLoss: taxEvents.reduce((sum, event) => sum + (event.gain_loss || 0), 0),
    shortTermGains: taxEvents.filter(e => !e.is_long_term).reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
    shortTermLosses: taxEvents.filter(e => !e.is_long_term).reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
    longTermGains: taxEvents.filter(e => e.is_long_term).reduce((sum, event) => sum + Math.max(0, event.gain_loss || 0), 0),
    longTermLosses: taxEvents.filter(e => e.is_long_term).reduce((sum, event) => sum + Math.min(0, event.gain_loss || 0), 0),
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taxEvents.length}</div>
              <p className="text-xs text-muted-foreground">
                Taxable transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Short-Term Capital Gains/Losses</CardTitle>
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
              <CardTitle>Long-Term Capital Gains/Losses</CardTitle>
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
                No tax events calculated. Click "Calculate Tax Events" to generate your report.
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
    </div>
  );
};

export default TaxReportPage;