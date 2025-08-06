import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, RefreshCw, Info, Globe, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import InfoTooltip from '@/components/ui/info-tooltip';
import { updateTaxRatesFromClient } from '@/lib/hmrc-api-client';

interface TaxRatesDisplayProps {
  jurisdiction: string;
  year: number;
  taxEventsCount: number;
  onRefresh?: () => void;
}

interface TaxRateInfo {
  rate: number;
  threshold?: number;
  maxThreshold?: number;
  type: string;
}

interface TaxAllowanceInfo {
  amount: number;
  currency: string;
  type: string;
}

interface TaxData {
  country: string;
  year: number;
  rates: TaxRateInfo[];
  allowances: TaxAllowanceInfo[];
  rules: Record<string, unknown>;
  lastUpdated: Date;
  source: string;
}

const TaxRatesDisplay: React.FC<TaxRatesDisplayProps> = ({ 
  jurisdiction, 
  year, 
  taxEventsCount,
  onRefresh 
}) => {
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const fetchTaxData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, try to get data from the database
      const { data, error: dbError } = await supabase
        .from('tax_data' as never)
        .select('country, year, rates, allowances, rules, source, last_updated')
        .eq('country', jurisdiction)
        .eq('year', year)
        .maybeSingle();

      if (dbError || !data) {
        // No data in database, try to fetch from API and insert
        console.log(`No tax data for ${jurisdiction} ${year} in database, fetching from API...`);
        
        try {
          // Import the API client dynamically to avoid circular dependencies
          const { HMRCAPIClient } = await import('@/lib/hmrc-api-client');
          const client = new HMRCAPIClient('');
          
          // Fetch data from our API (which uses fallback data)
          const rates = await client.fetchCapitalGainsRates(year.toString());
          const allowances = await client.fetchAllowances(year.toString());
          
          // Insert the fetched data into the database
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await supabase
            .from('tax_data' as never)
            .upsert({
              country: jurisdiction,
              year: year,
              rates: rates,
              allowances: allowances,
              rules: {
                sameDayRule: true,
                bedAndBreakfastRule: true,
                washSaleRule: false,
                holdingPeriodDays: 30,
                source: 'HMRC',
                lastUpdated: new Date().toISOString()
              },
              source: 'HMRC',
              last_updated: new Date().toISOString()
            } as any);

          if (insertError) {
            console.error('Error inserting tax data:', insertError);
            setError(`Failed to save tax data for ${jurisdiction} ${year}`);
            setTaxData(null);
            return;
          }

          // Now fetch the data again from the database
          const { data: newData, error: newDbError } = await supabase
            .from('tax_data' as never)
            .select('country, year, rates, allowances, rules, source, last_updated')
            .eq('country', jurisdiction)
            .eq('year', year)
            .maybeSingle();

          if (newDbError || !newData) {
            setError(`Failed to retrieve saved tax data for ${jurisdiction} ${year}`);
            setTaxData(null);
            return;
          }

          // Parse and set the data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const taxData = newData as any;
          const parsedData: TaxData = {
            country: taxData.country,
            year: taxData.year,
            rates: taxData.rates || [],
            allowances: taxData.allowances || [],
            rules: taxData.rules || {},
            lastUpdated: new Date(taxData.last_updated),
            source: taxData.source
          };
          setTaxData(parsedData);
          
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
          setError(`No tax data available for ${jurisdiction} ${year}`);
          setTaxData(null);
        }
      } else {
        // Data exists in database, parse and display it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taxData = data as any;
        const parsedData: TaxData = {
          country: taxData.country,
          year: taxData.year,
          rates: taxData.rates || [],
          allowances: taxData.allowances || [],
          rules: taxData.rules || {},
          lastUpdated: new Date(taxData.last_updated),
          source: taxData.source
        };
        setTaxData(parsedData);
      }
    } catch (error) {
      console.error('Error fetching tax data:', error);
      setError('Failed to fetch tax data');
      setTaxData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, [jurisdiction, year]);

  const handleManualUpdate = async () => {
    setShowUpdateDialog(true);
    setUpdateProgress(0);
    setUpdating(true);
    
    // Simulate progress over 2 seconds
    const progressInterval = setInterval(() => {
      setUpdateProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200); // 200ms intervals for 2 seconds total
    
    try {
      await updateTaxRatesFromClient();
      await fetchTaxData(); // Refresh the display
    } catch (error) {
      console.error('Error updating tax rates:', error);
      setError('Failed to update tax rates from HMRC');
    } finally {
      setUpdating(false);
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowUpdateDialog(false);
        setUpdateProgress(0);
      }, 2000);
    }
  };

  const getGovernmentSourceUrl = (country: string) => {
    const sources: { [key: string]: string } = {
      'UK': 'https://www.gov.uk/capital-gains-tax/rates',
      'US': 'https://www.irs.gov/taxtopics/tc409',
      'CA': 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains.html',
      'AU': 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/',
      'DE': 'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Einkommensteuer/einkommensteuer_node.html',
      'FR': 'https://www.impots.gouv.fr/portail/particulier/plus-values',
      'NL': 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/verkoop_van_beleggingen_en_effecten/overige_beleggingen_en_effecten/box_3_sparen_en_beleggen/',
      'SE': 'https://www.skatteverket.se/privat/skatter/avdragochrattelser/avdragforinvesteringar.4.2d1ff6c4138005aac8800020844.html',
      'NO': 'https://www.skatteetaten.no/en/person/taxes/wealth-and-capital-gains/',
      'DK': 'https://skat.dk/skat.aspx?oid=2244165',
      'FI': 'https://www.vero.fi/en/individuals/property-and-investments/capital-gains/',
      'CH': 'https://www.estv.admin.ch/estv/de/home/steuern/steuerarten/einkommensteuer.html'
    };
    
    return sources[country] || '#';
  };

  const getSourceName = (country: string) => {
    const sources: { [key: string]: string } = {
      'UK': 'HMRC',
      'US': 'IRS',
      'CA': 'CRA',
      'AU': 'ATO',
      'DE': 'Bundesfinanzministerium',
      'FR': 'Direction Générale des Finances Publiques',
      'NL': 'Belastingdienst',
      'SE': 'Skatteverket',
      'NO': 'Skatteetaten',
      'DK': 'Skat',
      'FI': 'Verohallinto',
      'CH': 'Eidgenössische Steuerverwaltung'
    };
    
    return sources[country] || 'Government Source';
  };

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'GBP' ? 'en-GB' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Tax Rates ({jurisdiction})
              <InfoTooltip content={`Current tax rates for ${jurisdiction} from official government sources. Data is automatically updated every 24 hours.`} />
            </CardTitle>
            <CardDescription>
              Loading latest tax information...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Update Progress Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Fetching Latest Tax Data
              </DialogTitle>
              <DialogDescription>
                Updating tax rates and allowances from HMRC...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Progress value={updateProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {updateProgress}% complete
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (error || !taxData) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Tax Rates ({jurisdiction})
            </CardTitle>
            <CardDescription>
              Unable to load current tax rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {error || 'Tax data not available for this jurisdiction and year.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Update Progress Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Fetching Latest Tax Data
              </DialogTitle>
              <DialogDescription>
                Updating tax rates and allowances from HMRC...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Progress value={updateProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {updateProgress}% complete
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const capitalGainsRates = taxData.rates.filter((rate: TaxRateInfo) => 
    rate.type === 'capital_gains'
  );

  const capitalGainsAllowance = taxData.allowances.find((allowance: TaxAllowanceInfo) => 
    allowance.type === 'capital_gains_allowance'
  );

  const sourceUrl = getGovernmentSourceUrl(jurisdiction);
  const sourceName = getSourceName(jurisdiction);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Tax Rates ({jurisdiction})</CardTitle>
              <InfoTooltip content={`Current tax rates for ${jurisdiction} from official government sources. Data is automatically updated every 24 hours.`} />
            </div>
            {jurisdiction === 'UK' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualUpdate}
                disabled={updating}
                title="Update from HMRC API"
              >
                <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                <span className="ml-1 text-xs">HMRC</span>
              </Button>
            )}
          </div>
          <CardDescription>
            Official tax rates for UK.{' '}
            <a 
              href="https://www.gov.uk/capital-gains-tax/rates" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View official rates →
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tax Rates */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Capital Gains Tax Rates
              </h4>
              {capitalGainsRates.length > 0 ? (
                <div className="space-y-2">
                  {capitalGainsRates.map((rate, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">
                        {rate.threshold ? `${formatCurrency(rate.threshold, 'GBP')}+` : 'All gains'}
                      </span>
                      <Badge variant="secondary">{rate.rate}%</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No rate information available</p>
              )}
            </div>

            {/* Allowances */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Annual Allowances
              </h4>
              {capitalGainsAllowance ? (
                <div className="p-3 bg-muted rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Capital Gains Allowance</span>
                    <span className="font-semibold">
                      {formatCurrency(capitalGainsAllowance.amount, capitalGainsAllowance.currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No allowance information available</p>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Total tax events: {taxEventsCount}</span>
                <span>Last updated: {formatDate(taxData.lastUpdated)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {sourceName}
                </a>
              </Button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> This information is for reference only. Please consult with a qualified tax professional for your specific situation. Tax rates and rules may change.
          </div>
        </CardContent>
      </Card>

      {/* Update Progress Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Fetching Latest Tax Data
            </DialogTitle>
            <DialogDescription>
              Updating tax rates and allowances from HMRC...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={updateProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {updateProgress}% complete
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaxRatesDisplay; 