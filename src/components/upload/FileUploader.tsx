import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFilesProcessed: () => void;
}

interface ProcessingFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

const FileUploader = ({ onFilesProcessed }: FileUploadProps) => {
  const { user } = useAuth();
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);

  const parseExcelFile = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log('Excel data:', jsonData.slice(0, 3));
          
                     // Convert to the same format as CSV data
           if (jsonData.length > 0) {
             const headers = jsonData[0];
             const rows = jsonData.slice(1);
             
             console.log('Excel headers:', headers);
             
             const csvData = rows.map(row => {
               const obj: any = {};
               headers.forEach((header, index) => {
                 obj[header] = row[index];
               });
               return obj;
             });
             
             console.log('Excel CSV data sample:', csvData.slice(0, 3));
             resolve(csvData);
           } else {
             reject(new Error('No data found in Excel file'));
           }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processTransactions = (csvData: any[], filename: string, fileId: string) => {
    console.log('Processing transactions for file:', filename);
    console.log('CSV data sample:', csvData.slice(0, 3));
    console.log('First row keys:', Object.keys(csvData[0] || {}));
    console.log('First row values:', Object.values(csvData[0] || {}));
    
    // Detect exchange format based on headers
    const headers = Object.keys(csvData[0] || {});
    console.log('Detected headers:', headers);
    let exchangeName = 'unknown';
    
    // Check if CSV parsing failed (only one column)
    if (headers.length <= 1) {
      console.warn('CSV parsing may have failed - only one column detected');
      console.log('Raw CSV data:', csvData);
      
      // Try to manually parse the CSV
      const rawData = csvData.map(row => {
        const values = Object.values(row)[0];
        if (typeof values === 'string') {
          // Split by comma and try to parse
          const parts = values.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
          return parts;
        }
        return [];
      });
      
      console.log('Manually parsed data:', rawData.slice(0, 3));
      
      // If we have manually parsed data, use it
      if (rawData.length > 0 && rawData[0].length > 1) {
        // Create new CSV data structure
        const newCsvData = rawData.map((row, index) => {
          const obj: any = {};
          // Use first row as headers
          if (index === 0) {
            row.forEach((header, i) => {
              obj[`column_${i}`] = header;
            });
          } else {
            row.forEach((value, i) => {
              obj[`column_${i}`] = value;
            });
          }
          return obj;
        });
        
        console.log('Reconstructed CSV data:', newCsvData.slice(0, 3));
        return processTransactions(newCsvData.slice(1), filename, fileId); // Skip header row
      }
    }
    
    // Coinbase UK format detection (your format) - check this FIRST
    // Match your actual CSV format: Date,Transaction_Type,Currency,Amount_GBP,Amount_Crypto,Description
    if (headers.includes('Date') && headers.includes('Transaction_Type') && headers.includes('Currency') && 
        headers.includes('Amount_GBP') && headers.includes('Amount_Crypto')) {
      exchangeName = 'coinbase_uk';
      console.log('Detected Coinbase UK format');
    }
    // Binance format detection - more specific
    else if (headers.includes('Date(UTC)') || (headers.includes('Date') && headers.includes('Pair') && headers.includes('Type'))) {
      exchangeName = 'binance';
    }
    // Coinbase format detection
    else if (headers.includes('Time') && headers.includes('Trade ID')) {
      exchangeName = 'coinbase';
    }
    // Coinbase Pro format detection (newer Coinbase)
    else if (headers.includes('Time') && headers.includes('Side')) {
      exchangeName = 'coinbase';
    }
     // Coinbase UK format detection with column names (Excel fallback) - make more specific
     else if (headers.some(h => h === 'Date' || h === 'column_0') && 
              headers.some(h => h === 'Transaction_Type' || h === 'column_1') && 
              headers.some(h => h === 'Currency' || h === 'column_2') &&
              headers.some(h => h === 'Amount' || h === 'column_3')) {
       exchangeName = 'coinbase_uk';
     }
    // Generic Coinbase detection
    else if (headers.some(h => h.toLowerCase().includes('time')) && 
             headers.some(h => h.toLowerCase().includes('side'))) {
      exchangeName = 'coinbase';
    }
    // Bybit format detection
    else if (headers.includes('Symbol') && headers.includes('Side')) {
      exchangeName = 'bybit';
    }
    // Generic format detection for other exchanges
    else if (headers.some(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'))) {
      // Try to detect exchange from filename
      const filenameLower = filename.toLowerCase();
      if (filenameLower.includes('binance')) {
        exchangeName = 'binance';
      } else if (filenameLower.includes('coinbase')) {
        exchangeName = 'coinbase';
      } else if (filenameLower.includes('kraken')) {
        exchangeName = 'kraken';
      } else if (filenameLower.includes('bybit')) {
        exchangeName = 'bybit';
      } else if (filenameLower.includes('kucoin')) {
        exchangeName = 'kucoin';
      } else {
        exchangeName = 'generic';
      }
    }
    
    console.log('Detected exchange:', exchangeName);
    console.log('File headers:', headers);
    console.log('Filename:', filename);

    // Parse transactions based on detected format
    const transactions = csvData.map((row: any, index: number) => {
      let transaction: any = {
        user_id: user?.id,
        file_id: fileId,
        raw_data: row,
        exchange_name: exchangeName,
      };

      // Helper function to parse date with multiple international formats
      const parseDate = (dateString: string) => {
        if (!dateString) return null;
        
        try {
          // Try parsing as ISO string first (YYYY-MM-DD)
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
          
          // Try parsing common international date formats
          const dateFormats = [
            // ISO format (YYYY-MM-DD)
            /^\d{4}-\d{2}-\d{2}/,
            // UK/Australia format (DD/MM/YYYY)
            /^\d{1,2}\/\d{1,2}\/\d{4}/,
            // US format (MM/DD/YYYY)
            /^\d{1,2}\/\d{1,2}\/\d{4}/,
            // European format (DD.MM.YYYY)
            /^\d{1,2}\.\d{1,2}\.\d{4}/,
            // With time (various formats)
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
            /^\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}:\d{2}/,
            /^\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}/,
          ];
          
          // Try each format
          for (const format of dateFormats) {
            if (format.test(dateString)) {
              let parsedDate: Date;
              
              if (format.source.includes('\\/')) {
                // Handle DD/MM/YYYY vs MM/DD/YYYY ambiguity
                const parts = dateString.split(/[\/\s]/);
                if (parts.length >= 3) {
                  const day = parseInt(parts[0]);
                  const month = parseInt(parts[1]);
                  const year = parseInt(parts[2]);
                  
                  // If day > 12, it's likely DD/MM/YYYY (UK format)
                  if (day > 12) {
                    parsedDate = new Date(year, month - 1, day);
                  } else {
                    // Try both formats and pick the valid one
                    const ukDate = new Date(year, month - 1, day);
                    const usDate = new Date(year, day - 1, month);
                    
                    if (!isNaN(ukDate.getTime()) && isNaN(usDate.getTime())) {
                      parsedDate = ukDate;
                    } else if (!isNaN(usDate.getTime()) && isNaN(ukDate.getTime())) {
                      parsedDate = usDate;
                    } else {
                      // Default to UK format for ambiguity
                      parsedDate = ukDate;
                    }
                  }
                } else {
                  parsedDate = new Date(dateString);
                }
              } else if (format.source.includes('\\.')) {
                // European format DD.MM.YYYY
                const parts = dateString.split('.');
                if (parts.length >= 3) {
                  const day = parseInt(parts[0]);
                  const month = parseInt(parts[1]);
                  const year = parseInt(parts[2]);
                  parsedDate = new Date(year, month - 1, day);
                } else {
                  parsedDate = new Date(dateString);
                }
              } else {
                // ISO or other formats
                parsedDate = new Date(dateString);
              }
              
              if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toISOString();
              }
            }
          }
          
          // Fallback to Date.parse
          const parsed = Date.parse(dateString);
          if (!isNaN(parsed)) {
            return new Date(parsed).toISOString();
          }
          
          console.warn('Failed to parse date:', dateString);
          return null;
        } catch (error) {
          console.warn('Failed to parse date:', dateString, error);
          return null;
        }
      };

      // Parse based on exchange format
      if (exchangeName === 'binance') {
        transaction = {
          ...transaction,
          transaction_date: parseDate(row['Date(UTC)'] || row['Date']),
          transaction_type: row['Operation']?.toLowerCase() === 'buy' ? 'buy' : 'sell',
          base_asset: row['Coin'],
          quantity: parseFloat(row['Change']) || 0,
          price: parseFloat(row['Price']) || null,
          fee: parseFloat(row['Fee']) || null,
        };
      } else if (exchangeName === 'coinbase') {
        // Try different possible field names for Coinbase
        const timeField = headers.find(h => h.toLowerCase().includes('time') || h.toLowerCase().includes('date'));
        const sideField = headers.find(h => h.toLowerCase().includes('side') || h.toLowerCase().includes('type'));
        const productField = headers.find(h => h.toLowerCase().includes('product') || h.toLowerCase().includes('pair') || h.toLowerCase().includes('symbol'));
        const sizeField = headers.find(h => h.toLowerCase().includes('size') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('quantity'));
        const priceField = headers.find(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('rate'));
        const feeField = headers.find(h => h.toLowerCase().includes('fee') || h.toLowerCase().includes('commission'));
        
        const product = row[productField] || row['Product'] || row['Pair'] || row['Symbol'];
        const baseAsset = product?.split('-')[0] || product?.split('/')[0];
        const quoteAsset = product?.split('-')[1] || product?.split('/')[1];
        
        transaction = {
          ...transaction,
          transaction_date: parseDate(row[timeField] || row['Time']),
          transaction_type: (row[sideField] || row['Side'])?.toLowerCase(),
          base_asset: baseAsset,
          quote_asset: quoteAsset,
          quantity: parseFloat(row[sizeField] || row['Size']) || 0,
          price: parseFloat(row[priceField] || row['Price']) || null,
          fee: parseFloat(row[feeField] || row['Fee']) || null,
        };
        
                 console.log('Coinbase parsing fields:', {
           timeField,
           sideField,
           productField,
           sizeField,
           priceField,
           feeField,
           product,
           baseAsset,
           quoteAsset
         });
                } else if (exchangeName === 'coinbase_uk') {
           // Parse Coinbase UK format
           const transactionType = row['Transaction_Type'] || row['column_1'];
           const currency = row['Currency'] || row['column_2'];
           const amountGBP = parseFloat(row['Amount_GBP'] || row['column_3']) || 0;
           const amountCrypto = parseFloat(row['Amount_Crypto'] || row['column_4']) || 0;
           
           console.log('Coinbase UK field mapping:', {
             transactionType,
             currency,
             amountGBP,
             amountCrypto,
             rowKeys: Object.keys(row),
             rowValues: Object.values(row)
           });
         
                    // Determine transaction type properly
           let transactionTypeNormalized = 'unknown';
           if (transactionType?.toLowerCase().includes('received') || transactionType?.toLowerCase().includes('buy')) {
             transactionTypeNormalized = 'buy';
           } else if (transactionType?.toLowerCase().includes('sold') || transactionType?.toLowerCase().includes('sell')) {
             transactionTypeNormalized = 'sell';
           } else if (transactionType?.toLowerCase().includes('withdrawal')) {
             transactionTypeNormalized = 'withdrawal'; // Separate category for fiat withdrawals
           } else if (transactionType?.toLowerCase().includes('sent')) {
             transactionTypeNormalized = 'sell'; // Sending crypto is a disposal
           }
         
                    // Calculate price based on transaction type
           let price = null;
           const isFiatCurrency = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'].includes(currency?.toUpperCase());
           
           if (transactionTypeNormalized === 'withdrawal' && isFiatCurrency) {
             // Fiat withdrawals don't have a meaningful "price"
             price = null;
           } else if (!isFiatCurrency && Math.abs(amountCrypto) > 0) {
             // Cryptocurrency transactions - calculate GBP price per crypto unit
             price = Math.abs(amountGBP) / Math.abs(amountCrypto);
           }
           
           transaction = {
             ...transaction,
             transaction_date: parseDate(row['Date'] || row['column_0']),
             transaction_type: transactionTypeNormalized,
             base_asset: currency,
             quantity: Math.abs(amountCrypto),
             price: price,
             fee: null, // Coinbase UK doesn't show fees in this format
           };
         
         console.log('Coinbase UK parsing:', {
           transactionType,
           currency,
           amountGBP,
           amountCrypto,
           transactionTypeNormalized,
           finalTransaction: {
             transaction_date: parseDate(row['Date'] || row['column_0']),
             transaction_type: transactionTypeNormalized,
             base_asset: currency,
             quantity: Math.abs(amountCrypto),
             price: price
           }
         });
       } else if (exchangeName === 'bybit') {
        transaction = {
          ...transaction,
          transaction_date: parseDate(row['Time']),
          transaction_type: row['Side']?.toLowerCase(),
          base_asset: row['Symbol']?.replace('USDT', '').replace('BTC', '').replace('ETH', ''),
          quantity: parseFloat(row['Size']) || 0,
          price: parseFloat(row['Price']) || null,
          fee: parseFloat(row['Exec Fee']) || null,
        };
      } else if (exchangeName === 'generic') {
        // Try to find common field names
        const dateField = headers.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
        const typeField = headers.find(h => h.toLowerCase().includes('type') || h.toLowerCase().includes('side') || h.toLowerCase().includes('operation'));
        const assetField = headers.find(h => h.toLowerCase().includes('asset') || h.toLowerCase().includes('coin') || h.toLowerCase().includes('symbol'));
        const quantityField = headers.find(h => h.toLowerCase().includes('quantity') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('size') || h.toLowerCase().includes('change'));
        const priceField = headers.find(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('rate'));
        const feeField = headers.find(h => h.toLowerCase().includes('fee') || h.toLowerCase().includes('commission'));
        
        transaction = {
          ...transaction,
          transaction_date: parseDate(row[dateField]),
          transaction_type: row[typeField]?.toLowerCase(),
          base_asset: row[assetField],
          quantity: parseFloat(row[quantityField]) || 0,
          price: parseFloat(row[priceField]) || null,
          fee: parseFloat(row[feeField]) || null,
        };
        
        console.log('Generic parsing fields:', {
          dateField,
          typeField,
          assetField,
          quantityField,
          priceField,
          feeField
        });
      }

             // Debug first few transactions
       if (index < 3) {
         console.log(`Transaction ${index}:`, transaction);
         console.log(`Transaction ${index} raw data:`, row);
       }

      return transaction;
    });

         const filteredTransactions = transactions.filter(t => {
       const isValid = t.base_asset && t.quantity && t.transaction_date && t.transaction_type !== 'unknown';
       if (!isValid) {
         console.warn('Filtered out transaction:', {
           base_asset: t.base_asset,
           quantity: t.quantity,
           transaction_date: t.transaction_date,
           transaction_type: t.transaction_type,
           raw_data: t.raw_data
         });
         // Temporarily log the raw data to see what we're working with
         console.log('Raw transaction data:', t.raw_data);
       }
       return isValid;
     });
    
    console.log('Total transactions parsed:', transactions.length);
    console.log('Filtered transactions:', filteredTransactions.length);
    console.log('Sample filtered transaction:', filteredTransactions[0]);
    
    return filteredTransactions;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'uploading' as const,
    }));

    setProcessingFiles(prev => [...prev, ...newFiles]);

    for (const fileItem of newFiles) {
      try {
        // Update progress
        setProcessingFiles(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, progress: 25 } : f)
        );

        // Upload file to Supabase Storage
        const filePath = `${user.id}/${Date.now()}-${fileItem.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('transaction-files')
          .upload(filePath, fileItem.file);

        if (uploadError) throw uploadError;

        // Create file record
        const { data: fileRecord, error: fileError } = await supabase
          .from('uploaded_files')
          .insert({
            user_id: user.id,
            filename: fileItem.file.name,
            file_size: fileItem.file.size,
            supabase_file_path: uploadData.path,
            processing_status: 'processing'
          })
          .select()
          .single();

        if (fileError) throw fileError;

        setProcessingFiles(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, progress: 50, status: 'processing' } : f)
        );

        // Check if it's an Excel file
        const isExcelFile = fileItem.file.name.toLowerCase().endsWith('.xlsx') || 
                           fileItem.file.name.toLowerCase().endsWith('.xls');

        if (isExcelFile) {
          try {
            console.log('Processing Excel file:', fileItem.file.name);
            const excelData = await parseExcelFile(fileItem.file);
            const transactions = processTransactions(excelData, fileItem.file.name, fileRecord.id);

            setProcessingFiles(prev => 
              prev.map(f => f.id === fileItem.id ? { ...f, progress: 75 } : f)
            );

            // Insert transactions
            if (transactions.length > 0) {
              console.log('Inserting transactions from Excel:', transactions.length);
              const { data: insertData, error: transactionError } = await supabase
                .from('transactions')
                .insert(transactions)
                .select();

              if (transactionError) {
                console.error('Database insertion error:', transactionError);
                throw transactionError;
              }
              
              console.log('Successfully inserted transactions from Excel:', insertData?.length || 0);
            } else {
              console.warn('No transactions to insert from Excel - all were filtered out');
            }

            // Update file status
            await supabase
              .from('uploaded_files')
              .update({ processing_status: 'completed' })
              .eq('id', fileRecord.id);

            setProcessingFiles(prev => 
              prev.map(f => f.id === fileItem.id ? { ...f, progress: 100, status: 'completed' } : f)
            );

            toast.success(`Successfully processed ${transactions.length} transactions from ${fileItem.file.name}`);
            onFilesProcessed();
            return;

          } catch (error: any) {
            console.error('Excel processing error:', error);
            setProcessingFiles(prev => 
              prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f)
            );
            toast.error(`Error processing Excel file ${fileItem.file.name}: ${error.message}`);
            return;
          }
        }

        // Helper function to clean CSV content
        const cleanCSVContent = (text: string) => {
          return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map(line => {
              // Remove trailing commas and fix malformed quotes
              let cleaned = line.replace(/,$/, '').replace(/""/g, '"');
              // Fix unclosed quotes by adding a closing quote if needed
              const quoteCount = (cleaned.match(/"/g) || []).length;
              if (quoteCount % 2 !== 0) {
                cleaned += '"';
              }
              return cleaned;
            })
            .filter(line => line.trim().length > 0)
            .join('\n');
        };

        // Parse CSV with more robust parsing options
        Papa.parse(fileItem.file, {
          header: true,
          skipEmptyLines: true,
          transform: (value) => value.trim(),
          transformHeader: (header) => header.trim(),
          dynamicTyping: false,
          quoteChar: '"',
          escapeChar: '"',
          delimiter: ',',
          newline: '\n',
          complete: async (results) => {
                          try {
                console.log('CSV parsing results:', {
                  dataLength: results.data.length,
                  errors: results.errors,
                  meta: results.meta
                });
                
                if (results.errors.length > 0) {
                  console.warn('CSV parsing warnings:', results.errors);
                  // Continue processing even with warnings, but log them
                }

              const transactions = processTransactions(results.data, fileItem.file.name, fileRecord.id);

              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, progress: 75 } : f)
              );

              // Insert transactions
              if (transactions.length > 0) {
                console.log('Inserting transactions into database:', transactions.length);
                const { data: insertData, error: transactionError } = await supabase
                  .from('transactions')
                  .insert(transactions)
                  .select();

                if (transactionError) {
                  console.error('Database insertion error:', transactionError);
                  throw transactionError;
                }
                
                console.log('Successfully inserted transactions:', insertData?.length || 0);
              } else {
                console.warn('No transactions to insert - all were filtered out');
              }

              // Update file status
              await supabase
                .from('uploaded_files')
                .update({ processing_status: 'completed' })
                .eq('id', fileRecord.id);

              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, progress: 100, status: 'completed' } : f)
              );

              toast.success(`Successfully processed ${transactions.length} transactions from ${fileItem.file.name}`);
              onFilesProcessed();

            } catch (error: any) {
              console.error('Transaction processing error:', error);
              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f)
              );
              toast.error(`Error processing ${fileItem.file.name}: ${error.message}`);
            }
          },
          error: async (error) => {
            console.error('Initial CSV parsing failed:', error);
            
            // Try to clean and re-parse the CSV
            try {
              const fileText = await fileItem.file.text();
              console.log('Raw file content (first 500 chars):', fileText.substring(0, 500));
              
              const cleanedText = cleanCSVContent(fileText);
              const cleanedBlob = new Blob([cleanedText], { type: 'text/csv' });
              const cleanedFile = new File([cleanedBlob], fileItem.file.name, { type: 'text/csv' });
              
                                           // Try different delimiters
              const delimiters = [',', ';', '\t', '|'];
              let parsedSuccessfully = false;
              
              const tryParseWithDelimiter = (delimiter: string) => {
                return new Promise((resolve, reject) => {
                  Papa.parse(cleanedFile, {
                    header: true,
                    skipEmptyLines: true,
                    transform: (value) => value.trim(),
                    transformHeader: (header) => header.trim(),
                    dynamicTyping: false,
                    quoteChar: '"',
                    escapeChar: '"',
                    delimiter: delimiter,
                    complete: (results) => {
                      console.log(`Trying delimiter "${delimiter}":`, {
                        dataLength: results.data.length,
                        headers: Object.keys(results.data[0] || {}),
                        errors: results.errors.length
                      });
                      
                      if (results.data.length > 0 && Object.keys(results.data[0]).length > 1) {
                        parsedSuccessfully = true;
                        resolve(results);
                      } else {
                        reject(new Error(`Delimiter "${delimiter}" failed`));
                      }
                    },
                    error: (error) => {
                      reject(error);
                    }
                  });
                });
              };
              
              // Try each delimiter
              for (const delimiter of delimiters) {
                try {
                  const results = await tryParseWithDelimiter(delimiter);
                  console.log(`Successfully parsed with delimiter "${delimiter}"`);
                  
                  try {
                    if (results.errors.length > 0) {
                      console.warn('Cleaned CSV parsing warnings:', results.errors);
                    }
                    
                    const transactions = processTransactions(results.data, fileItem.file.name, fileRecord.id);
                    
                    setProcessingFiles(prev => 
                      prev.map(f => f.id === fileItem.id ? { ...f, progress: 75 } : f)
                    );
                    
                    // Insert transactions
                    if (transactions.length > 0) {
                      console.log('Inserting transactions into database (fallback):', transactions.length);
                      const { data: insertData, error: transactionError } = await supabase
                        .from('transactions')
                        .insert(transactions)
                        .select();
                      
                      if (transactionError) {
                        console.error('Database insertion error (fallback):', transactionError);
                        throw transactionError;
                      }
                      
                      console.log('Successfully inserted transactions (fallback):', insertData?.length || 0);
                    } else {
                      console.warn('No transactions to insert (fallback) - all were filtered out');
                    }
                    
                    // Update file status
                    await supabase
                      .from('uploaded_files')
                      .update({ processing_status: 'completed' })
                      .eq('id', fileRecord.id);
                    
                    setProcessingFiles(prev => 
                      prev.map(f => f.id === fileItem.id ? { ...f, progress: 100, status: 'completed' } : f)
                    );
                    
                    toast.success(`Successfully processed ${transactions.length} transactions from ${fileItem.file.name} (cleaned)`);
                    onFilesProcessed();
                    
                    return; // Success, exit the loop
                    
                  } catch (retryError: any) {
                    console.error('Retry processing error:', retryError);
                    setProcessingFiles(prev => 
                      prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: retryError.message } : f)
                    );
                    toast.error(`Error processing ${fileItem.file.name} after cleanup: ${retryError.message}`);
                    return;
                  }
                  
                } catch (delimiterError) {
                  console.log(`Delimiter "${delimiter}" failed, trying next...`);
                  continue;
                }
              }
              
              // If we get here, all delimiters failed
              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: 'Failed to parse CSV with any delimiter' } : f)
              );
              toast.error(`Failed to parse ${fileItem.file.name} with any delimiter. Please check your CSV format.`);
              
            } catch (cleanupError) {
              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f)
              );
              toast.error(`Error parsing ${fileItem.file.name}: ${error.message}`);
            }
          }
        });

      } catch (error: any) {
        console.error('Upload error:', error);
        setProcessingFiles(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f)
        );
        toast.error(`Error uploading ${fileItem.file.name}: ${error.message}`);
      }
    }
  }, [user, onFilesProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-6">
      <Card>
                 <CardHeader>
           <CardTitle>Upload Transaction Files</CardTitle>
         </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                                 <p className="text-sm text-muted-foreground mb-4">CSV, XLS, and XLSX files supported</p>
                 <p className="text-xs text-muted-foreground mb-4">✨ Automatic date format detection for international formats</p>
                
                {/* File Requirements */}
                <div className="mt-6 pt-6 border-t border-muted-foreground/20">
                  <h4 className="text-sm font-medium mb-3">File Requirements:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>CSV, XLS, or XLSX format</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Maximum 10MB file size</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Headers in first row</span>
                    </div>
                                         <div className="flex items-center space-x-2">
                       <CheckCircle className="h-3 w-3 text-green-500" />
                       <span>Dates in any standard format (auto-detected)</span>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {processingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processingFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <File className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{file.file.name}</span>
                    <div className="flex items-center space-x-2">
                      {file.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {file.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={file.progress} className="mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {file.status === 'uploading' && 'Uploading...'}
                    {file.status === 'processing' && 'Processing transactions...'}
                    {file.status === 'completed' && 'Completed successfully'}
                    {file.status === 'error' && `Error: ${file.error}`}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;