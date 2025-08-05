import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, RefreshCw, Info, Globe, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { taxDataManager } from '@/lib/tax-data-manager';
import InfoTooltip from '@/components/ui/info-tooltip';

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

const TaxRatesDisplay: React.FC<TaxRatesDisplayProps> = ({ 
  jurisdiction, 
  year, 
  taxEventsCount,
  onRefresh 
}) => {
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTaxData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await taxDataManager.getCountryTaxData(jurisdiction, year);
      setTaxData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load tax data');
      console.error('Error fetching tax data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxData();
  }, [jurisdiction, year]);

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
    );
  }

  if (error || !taxData) {
    return (
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
              {error || 'Tax data not available. Using fallback rates.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Tax Rates ({jurisdiction})</CardTitle>
            <InfoTooltip content={`Current tax rates for ${jurisdiction} from official government sources. Data is automatically updated every 24 hours.`} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {taxData.source}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchTaxData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Capital gains tax rates and allowances for {year}
          {lastUpdated && (
            <span className="block text-xs text-muted-foreground mt-1">
              Last updated: {formatDate(lastUpdated)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax Rates */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tax Rates
            </h4>
            <div className="space-y-2">
              {capitalGainsRates.map((rate: TaxRateInfo, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">
                    {rate.threshold === 0 ? 'Basic Rate' : 
                     rate.threshold ? `Above ${formatCurrency(rate.threshold, rate.currency || 'GBP')}` : 
                     'Standard Rate'}
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {rate.rate}%
                  </Badge>
                </div>
              ))}
              {capitalGainsRates.length === 0 && (
                <p className="text-sm text-muted-foreground">No rate information available</p>
              )}
            </div>
          </div>

          {/* Allowances and Info */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Allowances & Info
            </h4>
            <div className="space-y-3">
              {capitalGainsAllowance && (
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">Annual Allowance</span>
                  <span className="font-semibold">
                    {formatCurrency(capitalGainsAllowance.amount, capitalGainsAllowance.currency)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">Currency</span>
                <span className="font-semibold">{taxData.currency || 'GBP'}</span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">Tax Events</span>
                <span className="font-semibold">{taxEventsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Government Source Link */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Source: {sourceName}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href={sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <span>View Official Rates</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            ⚠️ This information is for educational purposes only. Always verify with qualified tax professionals before filing returns. 
            Rates are automatically updated from government sources but may not reflect the most recent changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxRatesDisplay; 