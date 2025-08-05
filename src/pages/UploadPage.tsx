import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import FileUploader from '@/components/upload/FileUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, AlertCircle } from 'lucide-react';
import InfoTooltip from '@/components/ui/info-tooltip';

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
             Import your cryptocurrency transaction history from various exchanges. 
             Supported exchanges: Binance, Coinbase Pro, Bybit, and more.
           </p>
         </div>

                 <div className="space-y-8">
          {/* Main Upload Area */}
          <FileUploader onFilesProcessed={handleFilesProcessed} />

          {/* Export Instructions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Export Instructions</CardTitle>
                <InfoTooltip content="Step-by-step instructions for exporting transaction data from popular cryptocurrency exchanges. Follow these steps to get the correct file format for upload." />
              </div>
                        <CardDescription>
            How to export transaction data from your exchange. Don't worry about date formats - we automatically detect them! 
            <a href="/exchange-export-formats.md" target="_blank" className="text-primary hover:underline ml-1">
              View detailed guide →
            </a>
          </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Binance</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Go to Wallet → Transaction History</li>
                    <li>Select date range</li>
                    <li>Click "Export" → CSV</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Coinbase Pro</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Go to Portfolio → Statements</li>
                    <li>Select "Transaction History"</li>
                    <li>Choose date range and download CSV</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Bybit</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Go to Assets → Transaction History</li>
                    <li>Select "Trade History"</li>
                    <li>Export as CSV</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Exchanges */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Supported Exchanges</CardTitle>
                <InfoTooltip content="List of cryptocurrency exchanges with automatic file format support. Fully supported exchanges have automatic column mapping, while others may require manual configuration." />
              </div>
                             <CardDescription>
                 Automatic format detection and column mapping
               </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exchangeFormats.map((exchange) => (
                  <div key={exchange.name} className="flex items-start space-x-3 p-3 border rounded-lg">
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UploadPage;