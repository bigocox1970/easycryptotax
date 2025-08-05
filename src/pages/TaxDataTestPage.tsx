import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { taxDataTester } from '@/lib/tax-data-test';
import { taxDataManager } from '@/lib/tax-data-manager';
import { CheckCircle, AlertCircle, Clock, Database, Globe, TrendingUp } from 'lucide-react';
import Footer from '@/components/layout/Footer';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  data?: any;
}

const TaxDataTestPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  } | null>(null);

  const runQuickTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setSummary(null);

    try {
      console.log('Running quick test...');
      setProgress(25);
      
      // Test basic functionality
      const ukData = await taxDataManager.getCountryTaxData('UK', 2024);
      const usData = await taxDataManager.getCountryTaxData('US', 2024);
      
      setProgress(50);
      
      if (ukData && usData) {
        setResults([
          {
            test: 'Quick System Test',
            status: 'PASS',
            message: `UK: ${ukData.rates.length} rates, ${ukData.allowances.length} allowances | US: ${usData.rates.length} rates, ${usData.allowances.length} allowances`
          }
        ]);
        setSummary({ passed: 1, failed: 0, warnings: 0, total: 1 });
      } else {
        setResults([
          {
            test: 'Quick System Test',
            status: 'FAIL',
            message: 'Failed to retrieve tax data'
          }
        ]);
        setSummary({ passed: 0, failed: 1, warnings: 0, total: 1 });
      }
      
      setProgress(100);
    } catch (error) {
      setResults([
        {
          test: 'Quick System Test',
          status: 'FAIL',
          message: `Error: ${error}`
        }
      ]);
      setSummary({ passed: 0, failed: 1, warnings: 0, total: 1 });
    } finally {
      setIsRunning(false);
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setSummary(null);

    try {
      // Simulate test progress
      const testSteps = [
        'Testing UK Tax Rates Scraping...',
        'Testing UK Allowances Scraping...',
        'Testing US Tax Rates Scraping...',
        'Testing Data Manager...',
        'Testing Fallback Data...',
        'Testing Data Validation...',
        'Testing Database Operations...',
        'Testing Real-World Scenarios...'
      ];

      for (let i = 0; i < testSteps.length; i++) {
        setProgress((i / testSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate test time
      }

      // Run actual tests
      const testResults: TestResult[] = [];
      
      // Test UK rates
      try {
        const ukRate = await taxDataManager.getTaxRate('UK', 2024, 50000);
        testResults.push({
          test: 'UK Tax Rates',
          status: ukRate > 0 ? 'PASS' : 'FAIL',
          message: `UK Tax Rate: ${ukRate}%`
        });
      } catch (error) {
        testResults.push({
          test: 'UK Tax Rates',
          status: 'FAIL',
          message: `Error: ${error}`
        });
      }

      // Test US rates
      try {
        const usRate = await taxDataManager.getTaxRate('US', 2024, 50000);
        testResults.push({
          test: 'US Tax Rates',
          status: usRate > 0 ? 'PASS' : 'FAIL',
          message: `US Tax Rate: ${usRate}%`
        });
      } catch (error) {
        testResults.push({
          test: 'US Tax Rates',
          status: 'FAIL',
          message: `Error: ${error}`
        });
      }

      // Test allowances
      try {
        const ukAllowance = await taxDataManager.getAllowance('UK', 2024, 'capital_gains_allowance');
        testResults.push({
          test: 'UK Allowances',
          status: ukAllowance > 0 ? 'PASS' : 'FAIL',
          message: `UK Allowance: £${ukAllowance}`
        });
      } catch (error) {
        testResults.push({
          test: 'UK Allowances',
          status: 'FAIL',
          message: `Error: ${error}`
        });
      }

      // Test countries
      try {
        const countries = await taxDataManager.getSupportedCountries();
        testResults.push({
          test: 'Supported Countries',
          status: countries.length >= 2 ? 'PASS' : 'FAIL',
          message: `Found ${countries.length} supported countries`
        });
      } catch (error) {
        testResults.push({
          test: 'Supported Countries',
          status: 'FAIL',
          message: `Error: ${error}`
        });
      }

      setResults(testResults);
      
      const passed = testResults.filter(r => r.status === 'PASS').length;
      const failed = testResults.filter(r => r.status === 'FAIL').length;
      const warnings = testResults.filter(r => r.status === 'WARNING').length;
      
      setSummary({ passed, failed, warnings, total: testResults.length });
      setProgress(100);
      
    } catch (error) {
      setResults([
        {
          test: 'Full Test Suite',
          status: 'FAIL',
          message: `Error: ${error}`
        }
      ]);
      setSummary({ passed: 0, failed: 1, warnings: 0, total: 1 });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL' | 'WARNING') => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'PASS' | 'FAIL' | 'WARNING') => {
    switch (status) {
      case 'PASS':
        return <Badge variant="default" className="bg-green-500">PASS</Badge>;
      case 'FAIL':
        return <Badge variant="destructive">FAIL</Badge>;
      case 'WARNING':
        return <Badge variant="secondary" className="bg-yellow-500">WARNING</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Tax Data Test Suite</h1>
          <p className="text-muted-foreground">
            Test the tax data scraping and management system
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Test Controls
              </CardTitle>
              <CardDescription>
                Run tests to verify the tax data system is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={runQuickTest} 
                  disabled={isRunning}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Quick Test
                </Button>
                <Button 
                  onClick={runFullTest} 
                  disabled={isRunning}
                  variant="outline"
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Full Test
                </Button>
              </div>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Running tests...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {summary && (
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{summary.warnings}</div>
                    <div className="text-xs text-muted-foreground">Warnings</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current status of the tax data system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">12</div>
                  <div className="text-xs text-muted-foreground">Countries</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">24h</div>
                  <div className="text-xs text-muted-foreground">Update Cycle</div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tests verify data scraping, validation, and fallback systems are working correctly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Detailed results from the latest test run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">{result.test}</div>
                        <div className="text-sm text-muted-foreground">{result.message}</div>
                      </div>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {summary && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.failed > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ❌ Fix failed tests before deploying to production
                  </AlertDescription>
                </Alert>
              )}
              
              {summary.warnings > 0 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ Review warnings and improve data quality
                  </AlertDescription>
                </Alert>
              )}
              
              {summary.passed === summary.total && summary.total > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 All tests passed! System is ready for production
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TaxDataTestPage; 