import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import FileUploader from '@/components/upload/FileUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, AlertCircle } from 'lucide-react';

const UploadPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFilesProcessed = () => {
    setRefreshKey(prev => prev + 1);
  };

  const exchangeFormats = [
    {
      name: 'Binance',
      status: 'supported',
      description: 'Date, Market, Type, Price, Amount, Total, Fee, Fee Coin'
    },
    {
      name: 'Coinbase Pro',
      status: 'supported',
      description: 'Time, Trade ID, Product, Side, Size, Price, Fee, Total'
    },
    {
      name: 'Bybit',
      status: 'supported',
      description: 'Time, Symbol, Side, Size, Price, Exec Fee'
    },
    {
      name: 'Kraken',
      status: 'partial',
      description: 'Basic support, may require manual mapping'
    },
    {
      name: 'KuCoin',
      status: 'partial',
      description: 'Basic support, may require manual mapping'
    },
    {
      name: 'Other',
      status: 'manual',
      description: 'Manual column mapping required'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'supported':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'supported':
        return <Badge variant="default" className="bg-green-100 text-green-800">Fully Supported</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial Support</Badge>;
      default:
        return <Badge variant="outline">Manual Mapping</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Transaction Files</h1>
          <p className="text-muted-foreground">
            Import your cryptocurrency transaction history from various exchanges
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FileUploader onFilesProcessed={handleFilesProcessed} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supported Exchanges</CardTitle>
                <CardDescription>
                  File format compatibility for major exchanges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exchangeFormats.map((exchange) => (
                    <div key={exchange.name} className="flex items-start space-x-3">
                      {getStatusIcon(exchange.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{exchange.name}</span>
                          {getStatusBadge(exchange.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {exchange.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Instructions</CardTitle>
                <CardDescription>
                  How to export transaction data from your exchange
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Binance</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Go to Wallet → Transaction History</li>
                      <li>Select date range</li>
                      <li>Click "Export" → CSV</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Coinbase Pro</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Go to Portfolio → Statements</li>
                      <li>Select "Transaction History"</li>
                      <li>Choose date range and download CSV</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Bybit</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Go to Assets → Transaction History</li>
                      <li>Select "Trade History"</li>
                      <li>Export as CSV</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>CSV, XLS, or XLSX format</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Maximum 10MB file size</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Headers in first row</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Dates in YYYY-MM-DD format</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;