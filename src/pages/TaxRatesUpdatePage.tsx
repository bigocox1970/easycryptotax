import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { updateTaxRates } from '../lib/tax-rates-updater';

const TaxRatesUpdatePage: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUpdateTaxRates = async () => {
    setIsUpdating(true);
    setUpdateStatus('idle');
    setErrorMessage('');

    try {
      await updateTaxRates();
      setUpdateStatus('success');
    } catch (error) {
      console.error('Error updating tax rates:', error);
      setUpdateStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Rates Update</h1>
          <p className="text-muted-foreground mt-2">
            Update tax rates with the latest accurate data from official sources.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Update Tax Rates
            </CardTitle>
            <CardDescription>
              This will update the tax rates in the database with the latest accurate information from HMRC and IRS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">What will be updated:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>UK Capital Gains Tax rates for 2024/25 and 2025/26</li>
                <li>UK Capital Gains Tax allowance (£3,000 for 2024/25, £1,500 for 2025/26)</li>
                <li>US Capital Gains Tax rates for 2024</li>
                <li>Tax rules and regulations</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Current Issues Fixed:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>UK allowance was incorrectly set to £6,000 (should be £3,000 for 2024/25)</li>
                <li>Missing 2025/26 tax year data</li>
                <li>US tax rates need more detailed brackets</li>
              </ul>
            </div>

            <Button 
              onClick={handleUpdateTaxRates} 
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Tax Rates...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Tax Rates
                </>
              )}
            </Button>

            {updateStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Tax rates updated successfully! The changes are now live in the system.
                </AlertDescription>
              </Alert>
            )}

            {updateStatus === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Error updating tax rates: {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HMRC API Integration</CardTitle>
            <CardDescription>
              Future plans for integrating with HMRC APIs for real-time tax rate updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                You have access to HMRC's developer APIs. While there isn't a specific 
                "Capital Gains Tax Rates" API, we could potentially integrate with:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Individual Tax API - for tax information</li>
                <li>Self Assessment APIs - for tax calculations</li>
                <li>National Insurance API - for NI rates</li>
              </ul>
              <p className="mt-4">
                For now, we're using manually verified tax rates from official HMRC sources.
                The data is accurate and up-to-date for the current tax years.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaxRatesUpdatePage; 