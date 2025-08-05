# Tax Data Scraping System

## Overview

EasyCryptoTax includes an automated system for scraping and maintaining up-to-date tax information from government sources worldwide. This ensures that tax calculations are based on the most current and accurate data available.

## 🌍 **Supported Countries & Sources**

| Country | Code | Government Source | Website |
|---------|------|-------------------|---------|
| United Kingdom | UK | HMRC | https://www.gov.uk/capital-gains-tax |
| United States | US | IRS | https://www.irs.gov/taxtopics/tc409 |
| Canada | CA | CRA | https://www.canada.ca/en/revenue-agency |
| Australia | AU | ATO | https://www.ato.gov.au |
| Germany | DE | Bundesfinanzministerium | https://www.bundesfinanzministerium.de |
| France | FR | Direction Générale des Finances Publiques | https://www.impots.gouv.fr |
| Netherlands | NL | Belastingdienst | https://www.belastingdienst.nl |
| Sweden | SE | Skatteverket | https://www.skatteverket.se |
| Norway | NO | Skatteetaten | https://www.skatteetaten.no |
| Denmark | DK | Skat | https://skat.dk |
| Finland | FI | Verohallinto | https://www.vero.fi |
| Switzerland | CH | Eidgenössische Steuerverwaltung | https://www.estv.admin.ch |

## 🔧 **System Architecture**

### **Components**

1. **TaxDataScraper** (`src/lib/tax-data-scraper.ts`)
   - Handles web scraping from government websites
   - Extracts tax rates, allowances, and rules
   - Includes fallback data for reliability

2. **TaxDataManager** (`src/lib/tax-data-manager.ts`)
   - Manages data storage and retrieval
   - Handles caching and updates
   - Provides API for tax calculations

3. **Database Storage** (`supabase/migrations/`)
   - Stores scraped data in Supabase
   - Enables fast queries and updates
   - Maintains data integrity

### **Data Structure**

```typescript
interface TaxRate {
  country: string;
  year: number;
  type: 'capital_gains' | 'income' | 'corporate';
  rate: number;
  threshold?: number;
  maxThreshold?: number;
  source: string;
  lastUpdated: Date;
}

interface TaxAllowance {
  country: string;
  year: number;
  type: 'personal_allowance' | 'capital_gains_allowance';
  amount: number;
  currency: string;
  source: string;
  lastUpdated: Date;
}

interface TaxRules {
  country: string;
  year: number;
  sameDayRule: boolean;
  bedAndBreakfastRule: boolean;
  washSaleRule: boolean;
  holdingPeriodDays?: number;
  source: string;
  lastUpdated: Date;
}
```

## 🔄 **Update Process**

### **Automatic Updates**
- **Frequency**: Every 24 hours
- **Trigger**: Background process checks for stale data
- **Fallback**: Uses cached data if scraping fails

### **Manual Updates**
```typescript
// Update specific country
await taxDataManager.updateCountryTaxData('UK');

// Update all countries
await taxDataManager.initializeTaxData();
```

### **Data Validation**
- Checks for data freshness (24-hour threshold)
- Validates rate ranges and allowances
- Ensures source attribution
- Fallback to known good data if scraping fails

## 📊 **Tax Rules by Country**

### **United Kingdom (UK)**
- **Capital Gains Tax**: 10% (basic rate), 20% (higher rate)
- **Annual Allowance**: £6,000 (2024/25)
- **Same Day Rule**: Yes (30-day rule)
- **Bed & Breakfast Rule**: Yes (30-day rule)
- **Wash Sale Rule**: No

### **United States (US)**
- **Capital Gains Tax**: 0%, 15%, 20% (based on income)
- **Annual Allowance**: None
- **Same Day Rule**: No
- **Bed & Breakfast Rule**: No
- **Wash Sale Rule**: Yes (30-day rule)

### **Canada (CA)**
- **Capital Gains Tax**: 50% inclusion rate
- **Annual Allowance**: None
- **Same Day Rule**: No
- **Bed & Breakfast Rule**: No
- **Wash Sale Rule**: No

## 🛡️ **Reliability & Fallbacks**

### **Error Handling**
1. **Network Failures**: Uses cached data
2. **Website Changes**: Fallback to known good data
3. **Parsing Errors**: Manual data entry option
4. **Rate Limiting**: Exponential backoff retry

### **Data Sources Priority**
1. **Government Websites** (Primary)
2. **Cached Data** (Secondary)
3. **Fallback Data** (Tertiary)
4. **Manual Entry** (Last resort)

### **Validation Checks**
- Rate ranges are reasonable (0-100%)
- Allowances are positive numbers
- Dates are within expected ranges
- Country codes are valid
- Required fields are present

## 🔧 **Configuration**

### **Environment Variables**
```env
# Scraping settings
TAX_UPDATE_INTERVAL=86400000  # 24 hours in milliseconds
TAX_CACHE_DURATION=86400000   # Cache duration
TAX_MAX_RETRIES=3            # Max retry attempts
TAX_RETRY_DELAY=5000         # Delay between retries
```

### **Database Schema**
```sql
CREATE TABLE tax_data (
    id UUID PRIMARY KEY,
    country VARCHAR(2) NOT NULL,
    year INTEGER NOT NULL,
    rates JSONB NOT NULL,
    allowances JSONB NOT NULL,
    rules JSONB NOT NULL,
    source VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE,
    UNIQUE(country, year)
);
```

## 📈 **Monitoring & Analytics**

### **Metrics Tracked**
- Scraping success rate by country
- Data freshness (time since last update)
- Error rates and types
- User queries by jurisdiction
- Update frequency and timing

### **Alerts**
- Failed scraping attempts
- Stale data warnings
- Rate limit exceeded
- Database connection issues
- Invalid data detected

## 🔒 **Legal & Compliance**

### **Terms of Service**
- Data is for informational purposes only
- Users should verify with tax professionals
- No guarantee of accuracy or completeness
- Government sources may change without notice

### **Data Attribution**
- All data includes source attribution
- Links to original government websites
- Timestamp of last update
- Clear indication of data source

### **Privacy**
- No personal data in tax rate storage
- Anonymized usage statistics
- Secure data transmission
- GDPR compliant

## 🚀 **Future Enhancements**

### **Planned Features**
1. **More Countries**: Expand to 50+ jurisdictions
2. **Real-time Updates**: Webhook-based updates
3. **API Integration**: Direct government APIs
4. **Machine Learning**: Predict rate changes
5. **Historical Data**: Multi-year tax rate history

### **Advanced Scraping**
1. **AI-Powered Parsing**: Handle website changes
2. **Multi-Source Validation**: Cross-reference data
3. **Automated Testing**: Validate scraped data
4. **Change Detection**: Alert on rate changes

## 📞 **Support & Maintenance**

### **Regular Maintenance**
- **Daily**: Check scraping success rates
- **Weekly**: Review error logs and patterns
- **Monthly**: Update fallback data
- **Quarterly**: Review and update sources

### **Troubleshooting**
1. **Check network connectivity**
2. **Verify website structure changes**
3. **Review rate limiting settings**
4. **Validate data format changes**
5. **Update scraping selectors**

---

**Note**: This system is designed for educational and informational purposes. Always verify tax calculations with qualified professionals before filing returns. 