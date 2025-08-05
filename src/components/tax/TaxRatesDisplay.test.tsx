import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TaxRatesDisplay from './TaxRatesDisplay';

// Mock the tax data manager
jest.mock('@/lib/tax-data-manager', () => ({
  taxDataManager: {
    getCountryTaxData: jest.fn()
  }
}));

describe('TaxRatesDisplay', () => {
  const mockTaxData = {
    country: 'UK',
    year: 2024,
    rates: [
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains',
        rate: 10,
        threshold: 0,
        maxThreshold: 37700,
        source: 'HMRC',
        lastUpdated: new Date()
      },
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains',
        rate: 20,
        threshold: 37700,
        source: 'HMRC',
        lastUpdated: new Date()
      }
    ],
    allowances: [
      {
        country: 'UK',
        year: 2024,
        type: 'capital_gains_allowance',
        amount: 6000,
        currency: 'GBP',
        source: 'HMRC',
        lastUpdated: new Date()
      }
    ],
    rules: {
      country: 'UK',
      year: 2024,
      sameDayRule: true,
      bedAndBreakfastRule: true,
      washSaleRule: false,
      holdingPeriodDays: 30,
      source: 'HMRC',
      lastUpdated: new Date()
    },
    lastUpdated: new Date(),
    source: 'HMRC'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <TaxRatesDisplay 
        jurisdiction="UK"
        year={2024}
        taxEventsCount={5}
      />
    );

    expect(screen.getByText('Loading latest tax information...')).toBeInTheDocument();
  });

  it('displays tax rates when data is loaded', async () => {
    const { taxDataManager } = require('@/lib/tax-data-manager');
    taxDataManager.getCountryTaxData.mockResolvedValue(mockTaxData);

    render(
      <TaxRatesDisplay 
        jurisdiction="UK"
        year={2024}
        taxEventsCount={5}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tax Rates (UK)')).toBeInTheDocument();
      expect(screen.getByText('Basic Rate')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('Above £37,700')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('£6,000')).toBeInTheDocument();
    });
  });

  it('displays error state when data fails to load', async () => {
    const { taxDataManager } = require('@/lib/tax-data-manager');
    taxDataManager.getCountryTaxData.mockRejectedValue(new Error('Failed to load'));

    render(
      <TaxRatesDisplay 
        jurisdiction="UK"
        year={2024}
        taxEventsCount={5}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load current tax rates')).toBeInTheDocument();
      expect(screen.getByText('Failed to load tax data')).toBeInTheDocument();
    });
  });

  it('shows government source link', async () => {
    const { taxDataManager } = require('@/lib/tax-data-manager');
    taxDataManager.getCountryTaxData.mockResolvedValue(mockTaxData);

    render(
      <TaxRatesDisplay 
        jurisdiction="UK"
        year={2024}
        taxEventsCount={5}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('View Official Rates')).toBeInTheDocument();
      expect(screen.getByText('Source: HMRC')).toBeInTheDocument();
    });
  });
}); 