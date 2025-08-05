import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, DollarSign, Calendar, Upload, BarChart3 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

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
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
              <FileText className="h-4 w-4 text-muted-foreground" />
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
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle>Upload Transactions</CardTitle>
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
              <CardTitle>Generate Tax Report</CardTitle>
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
              <CardTitle>File Processing Status</CardTitle>
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
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Welcome to CryptoTax Pro! Here's how to get started:
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
    </div>
  );
};

export default Dashboard;