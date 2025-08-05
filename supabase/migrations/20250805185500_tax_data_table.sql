-- Create tax_data table for storing country-specific tax information
CREATE TABLE IF NOT EXISTS tax_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country VARCHAR(2) NOT NULL,
    year INTEGER NOT NULL,
    rates JSONB NOT NULL DEFAULT '[]',
    allowances JSONB NOT NULL DEFAULT '[]',
    rules JSONB NOT NULL DEFAULT '{}',
    source VARCHAR(255) NOT NULL DEFAULT 'manual',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, year)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tax_data_country_year ON tax_data(country, year);

-- Insert initial UK tax data (2024)
INSERT INTO tax_data (country, year, rates, allowances, rules, source) VALUES (
    'UK',
    2024,
    '[
        {
            "country": "UK",
            "year": 2024,
            "type": "capital_gains",
            "rate": 10,
            "threshold": 0,
            "maxThreshold": 37700,
            "source": "HMRC",
            "lastUpdated": "2024-01-01T00:00:00Z"
        },
        {
            "country": "UK",
            "year": 2024,
            "type": "capital_gains",
            "rate": 20,
            "threshold": 37700,
            "source": "HMRC",
            "lastUpdated": "2024-01-01T00:00:00Z"
        }
    ]',
    '[
        {
            "country": "UK",
            "year": 2024,
            "type": "capital_gains_allowance",
            "amount": 6000,
            "currency": "GBP",
            "source": "HMRC",
            "lastUpdated": "2024-01-01T00:00:00Z"
        }
    ]',
    '{
        "country": "UK",
        "year": 2024,
        "sameDayRule": true,
        "bedAndBreakfastRule": true,
        "washSaleRule": false,
        "holdingPeriodDays": 30,
        "source": "HMRC",
        "lastUpdated": "2024-01-01T00:00:00Z"
    }',
    'HMRC'
) ON CONFLICT (country, year) DO NOTHING;

-- Insert initial US tax data (2024)
INSERT INTO tax_data (country, year, rates, allowances, rules, source) VALUES (
    'US',
    2024,
    '[
        {
            "country": "US",
            "year": 2024,
            "type": "capital_gains",
            "rate": 15,
            "threshold": 0,
            "maxThreshold": 445850,
            "source": "IRS",
            "lastUpdated": "2024-01-01T00:00:00Z"
        }
    ]',
    '[]',
    '{
        "country": "US",
        "year": 2024,
        "sameDayRule": false,
        "bedAndBreakfastRule": false,
        "washSaleRule": true,
        "holdingPeriodDays": 30,
        "source": "IRS",
        "lastUpdated": "2024-01-01T00:00:00Z"
    }',
    'IRS'
) ON CONFLICT (country, year) DO NOTHING;

-- Enable RLS
ALTER TABLE tax_data ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (all users can read tax data)
CREATE POLICY "Allow read access to tax data" ON tax_data
    FOR SELECT USING (true);

-- Create policy for admin write access (only admins can update tax data)
CREATE POLICY "Allow admin write access to tax data" ON tax_data
    FOR ALL USING (auth.role() = 'admin'); 