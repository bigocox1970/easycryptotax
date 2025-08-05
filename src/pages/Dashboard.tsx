import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, DollarSign, Calendar, Upload, BarChart3 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import InfoTooltip from '@/components/ui/info-tooltip';

interface DashboardStats {
  totalTransactions: number;
  totalFiles: number;
  totalGainLoss: number;
  pendingFiles: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalFiles: 0,
    totalGainLoss: 0,
    pendingFiles: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get transaction count
        const { count: transactionCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get file count
        const { count: fileCount } = await supabase
          .from('uploaded_files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get pending files count
        const { count: pendingCount } = await supabase
          .from('uploaded_files')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('processing_status', 'completed');

        // Get total gain/loss
        const { data: taxEvents } = await supabase
          .from('tax_events')
          .select('gain_loss')
          .eq('user_id', user.id);

        const totalGainLoss = taxEvents?.reduce((sum, event) => sum + (event.gain_loss || 0), 0) || 0;

        setStats({
          totalTransactions: transactionCount || 0,
          totalFiles: fileCount || 0,
          totalGainLoss,
          pendingFiles: pendingCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your crypto tax calculations for {currentYear}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Total number of cryptocurrency transactions imported from your exchange files. This includes buys, sells, deposits, and withdrawals." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Processed from {stats.totalFiles} files
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uploaded Files</CardTitle>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Number of CSV/Excel files you've uploaded from your cryptocurrency exchanges. Files are processed to extract transaction data." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingFiles > 0 ? `${stats.pendingFiles} pending` : 'All processed'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Total capital gains and losses calculated from your crypto sales. Positive values indicate gains, negative values indicate losses." />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? '...' : `$${stats.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Year {currentYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Year</CardTitle>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <InfoTooltip content="Current tax year for calculations. Tax years typically run from April to April in the UK, or January to December in other jurisdictions." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentYear}</div>
              <p className="text-xs text-muted-foreground">
                Current tax year
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Transactions</CardTitle>
                <InfoTooltip content="Upload CSV files exported from your cryptocurrency exchanges. Supported formats include Binance, Coinbase Pro, Bybit, and others." />
              </div>
              <CardDescription>
                Upload CSV files from your cryptocurrency exchanges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generate Tax Report</CardTitle>
                <InfoTooltip content="Generate detailed tax reports with capital gains calculations, tax liability estimates, and downloadable forms for your tax return." />
              </div>
              <CardDescription>
                Create detailed tax reports and forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/tax-report">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Tax Report
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Processing Status */}
        {stats.pendingFiles > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>File Processing Status</CardTitle>
                <InfoTooltip content="Shows the progress of file processing. Large files or complex formats may take longer to process. You'll be notified when processing is complete." />
              </div>
              <CardDescription>
                {stats.pendingFiles} file(s) are still being processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={((stats.totalFiles - stats.pendingFiles) / stats.totalFiles) * 100} />
                <p className="text-sm text-muted-foreground">
                  {stats.totalFiles - stats.pendingFiles} of {stats.totalFiles} files completed
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        {stats.totalTransactions === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Getting Started</CardTitle>
                <InfoTooltip content="Follow these steps to calculate your crypto taxes. Start by uploading your transaction files, then review and generate your tax report." />
              </div>
              <CardDescription>
                Welcome to EasyCryptoTax! Here's how to get started:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Upload Transaction Files</h4>
                    <p className="text-sm text-muted-foreground">
                      Export CSV files from your exchanges (Binance, Coinbase, etc.) and upload them
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Review Transactions</h4>
                    <p className="text-sm text-muted-foreground">
                      Check that your transactions were imported correctly
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Generate Tax Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Create your tax report with calculated gains and losses
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;