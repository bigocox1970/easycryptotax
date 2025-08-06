# Tax Reporting Validation Test

This test suite validates the tax reporting calculations in your EasyCryptoTax app against known UK tax scenarios and HMRC requirements.

## What It Tests

### 1. HMRC API Integration
- Verifies connection to HMRC tax rates and allowances data
- Tests data retrieval for years 2020-2025
- Validates UK Capital Gains Tax rates (10%/20%) and allowances

### 2. Tax Calculation Scenarios

#### Simple Buy-Sell Scenario
- **Scenario**: Buy 1 BTC for £10,000, sell for £15,000
- **Expected**: £5,000 gain, £2,000 taxable (after £3,000 allowance), £200 tax

#### FIFO Cost Basis Test
- **Scenario**: Multiple purchases at different prices, partial sale
- **Expected**: FIFO methodology correctly applied for cost basis calculation

#### Capital Loss Scenario  
- **Scenario**: Buy high, sell low
- **Expected**: Correctly calculates and records capital losses

#### Mixed Gains and Losses
- **Scenario**: Multiple assets with both gains and losses
- **Expected**: Losses correctly offset against gains before allowance applied

#### Above Allowance Gains
- **Scenario**: Large gains exceeding annual allowance
- **Expected**: Correct tax calculation on gains above £3,000 allowance

#### Fiat Withdrawal Exclusion
- **Scenario**: Mix of crypto sales and fiat withdrawals
- **Expected**: Fiat withdrawals (GBP/USD/EUR) excluded from taxable events

## Key Validation Points

### UK Tax Rules Compliance
- ✅ **FIFO Cost Basis**: First-in-first-out methodology for matching sales to purchases
- ✅ **Capital Gains Allowance**: £3,000 annual allowance for 2024 (£6,000 for 2023)
- ✅ **Tax Rates**: 10% basic rate, 20% higher rate based on total income
- ✅ **Loss Offsetting**: Capital losses offset against capital gains
- ✅ **Fiat Exclusion**: Fiat currency withdrawals not treated as taxable disposals

### Technical Accuracy
- ✅ **Date Calculations**: Correct holding period calculations
- ✅ **Precision**: Accurate financial calculations to 2 decimal places
- ✅ **Edge Cases**: Handles partial sales, multiple assets, cross-year transactions

## How to Run

### Run Full Test Suite
```bash
npm run test:tax-reporting
```

### Test Just HMRC API Integration
```bash
npm run test:hmrc-api
```

## Test Results

When all tests pass, you'll see:
```
🎉 All tests passed! Tax reporting calculations are working correctly.
```

Failed tests will show:
- Expected vs actual values
- Detailed breakdown of tax events
- Calculated totals for debugging

## Adding New Test Scenarios

To add additional test scenarios, edit `src/test/tax-reporting.test.ts` and add to the `TEST_SCENARIOS` array:

```typescript
{
  name: "Your Test Name",
  description: "Description of what this tests",
  year: 2024,
  transactions: [
    // Your transaction data
  ],
  expectedTaxEvents: [
    // Expected tax event outcomes
  ],
  expectedTotals: {
    totalGains: 0,
    totalLosses: 0,
    taxableGains: 0,
    estimatedTax: 0
  }
}
```

## Integration with Your App

This test suite mirrors the exact logic used in:
- `src/pages/TaxReportPage.tsx` (lines 65-232) - Main calculation logic
- `src/lib/hmrc-api-client.ts` - Tax rates and allowances data
- `src/lib/tax-rates.ts` - Tax calculation functions

Any changes to these files should be validated against this test suite to ensure continued accuracy.

## Compliance Notes

⚠️ **Important**: This is for educational/validation purposes only. Always consult with a qualified tax professional for actual tax reporting. The UK tax system has complex rules including:

- Same-day rule (not implemented)
- Bed and breakfast rule (30-day rule, not implemented)  
- Section 104 holding rules
- Different rates for residential property
- Entrepreneur's relief considerations

This test suite validates the core capital gains calculations but does not cover all edge cases of UK tax law.