# Exchange Export Formats Guide

## Overview

EasyCryptoTax automatically detects and processes transaction data from various cryptocurrency exchanges. Our system handles multiple international date formats and exchange-specific file structures.

## Supported Date Formats

We automatically detect and parse the following date formats:

### International Standards
- **ISO Format**: `2023-12-31` (YYYY-MM-DD)
- **UK/Australia**: `31/12/2023` (DD/MM/YYYY)
- **US Format**: `12/31/2023` (MM/DD/YYYY)
- **European**: `31.12.2023` (DD.MM.YYYY)

### With Time Stamps
- `2023-12-31 14:30:25`
- `31/12/2023 14:30:25`
- `12/31/2023 14:30:25`
- `31.12.2023 14:30:25`

## Supported Exchanges

### Fully Supported (Automatic Detection)

#### Binance
- **Export Location**: Wallet → Transaction History
- **Format**: CSV with headers like `Date(UTC)`, `Operation`, `Coin`, `Change`, `Price`, `Fee`
- **Date Format**: Usually ISO format (YYYY-MM-DD HH:MM:SS)
- **Status**: ✅ Fully Supported

#### Coinbase Pro
- **Export Location**: Portfolio → Statements → Transaction History
- **Format**: CSV with headers like `Time`, `Trade ID`, `Product`, `Side`, `Size`, `Price`, `Fee`
- **Date Format**: Various formats depending on region
- **Status**: ✅ Fully Supported

#### Bybit
- **Export Location**: Assets → Transaction History → Trade History
- **Format**: CSV with headers like `Time`, `Symbol`, `Side`, `Size`, `Price`, `Exec Fee`
- **Date Format**: Usually ISO format
- **Status**: ✅ Fully Supported

### Partially Supported

#### Kraken
- **Export Location**: Account → History → Export
- **Format**: CSV with various header formats
- **Date Format**: Usually ISO format
- **Status**: ⚠️ Partial Support (may require manual mapping)

#### KuCoin
- **Export Location**: Assets → Trading History → Export
- **Format**: CSV with exchange-specific headers
- **Date Format**: Usually ISO format
- **Status**: ⚠️ Partial Support (may require manual mapping)

### Manual Mapping Required

#### Other Exchanges
- **Status**: 🔧 Manual column mapping required
- **Process**: Upload file and manually map columns to our standard format

## File Requirements

### Supported Formats
- **CSV** (Comma Separated Values)
- **XLS** (Excel 97-2003)
- **XLSX** (Excel 2007+)

### Technical Requirements
- **File Size**: Maximum 10MB per file
- **Headers**: Must be in the first row
- **Date Formats**: Any standard international format (auto-detected)
- **Encoding**: UTF-8 recommended

### Required Columns
For automatic processing, files should contain at least:
- **Date/Time**: Transaction timestamp
- **Type/Side**: Buy/Sell/Transfer
- **Asset/Coin**: Cryptocurrency symbol
- **Quantity/Amount**: Transaction amount
- **Price** (optional): Price per unit
- **Fee** (optional): Transaction fee

## Export Instructions by Exchange

### Binance
1. Log into your Binance account
2. Go to **Wallet** → **Transaction History**
3. Select your desired date range
4. Click **Export** → **CSV**
5. Upload the downloaded file

### Coinbase Pro
1. Log into your Coinbase Pro account
2. Go to **Portfolio** → **Statements**
3. Select **Transaction History**
4. Choose date range and download CSV
5. Upload the downloaded file

### Bybit
1. Log into your Bybit account
2. Go to **Assets** → **Transaction History**
3. Select **Trade History**
4. Export as CSV
5. Upload the downloaded file

## Date Format Handling

### Automatic Detection
Our system automatically detects the date format used in your export file and converts it to our internal ISO format for consistent processing.

### Ambiguous Formats
For formats like `MM/DD/YYYY` vs `DD/MM/YYYY`:
- If day > 12, we assume UK format (DD/MM/YYYY)
- Otherwise, we try both formats and use the valid one
- For true ambiguity, we default to UK format

### Error Handling
If date parsing fails:
- The system will log a warning
- You can manually review and correct if needed
- Contact support if you encounter persistent issues

## Troubleshooting

### Common Issues

#### "No transactions found"
- Check that your file has headers in the first row
- Ensure the file contains transaction data (not just headers)
- Verify the file format is CSV, XLS, or XLSX

#### "Date parsing failed"
- Check that dates are in a recognizable format
- Try exporting from your exchange again
- Contact support with a sample of your date format

#### "File too large"
- Split your export into smaller date ranges
- Most exchanges allow custom date range selection
- Maximum file size is 10MB

### Getting Help

If you encounter issues:
1. Check this guide for your exchange's specific instructions
2. Ensure your file meets the technical requirements
3. Try exporting a smaller date range
4. Contact support with your exchange name and file format

## Best Practices

### Before Uploading
1. **Verify File Format**: Ensure it's CSV, XLS, or XLSX
2. **Check Headers**: Make sure the first row contains column names
3. **Review Sample Data**: Open the file to verify it contains transaction data
4. **Date Range**: Consider splitting large exports into smaller chunks

### After Uploading
1. **Review Processing**: Check the processing status
2. **Verify Transactions**: Review imported transactions for accuracy
3. **Report Issues**: Contact support if data looks incorrect

## Technical Notes

### Processing Pipeline
1. **File Upload**: Secure upload to our servers
2. **Format Detection**: Automatic exchange and date format detection
3. **Data Parsing**: Convert to our standardized format
4. **Validation**: Verify transaction data integrity
5. **Storage**: Secure storage in our database

### Security
- Files are encrypted during upload and storage
- Raw data is preserved for audit purposes
- Processing is done on secure servers
- No data is shared with third parties

---

*Last updated: December 2024*
*For support, contact our team with your exchange name and specific issue.*