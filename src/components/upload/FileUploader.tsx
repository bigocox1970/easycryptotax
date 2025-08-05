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

  const processTransactions = (csvData: any[], filename: string, fileId: string) => {
    // Detect exchange format based on headers
    const headers = Object.keys(csvData[0] || {});
    let exchangeName = 'unknown';
    
    // Binance format detection
    if (headers.includes('Date(UTC)') || headers.includes('Date')) {
      exchangeName = 'binance';
    }
    // Coinbase format detection
    else if (headers.includes('Time') && headers.includes('Trade ID')) {
      exchangeName = 'coinbase';
    }
    // Bybit format detection
    else if (headers.includes('Symbol') && headers.includes('Side')) {
      exchangeName = 'bybit';
    }

    // Parse transactions based on detected format
    const transactions = csvData.map((row: any) => {
      let transaction: any = {
        user_id: user?.id,
        file_id: fileId,
        raw_data: row,
        exchange_name: exchangeName,
      };

      // Parse based on exchange format
      if (exchangeName === 'binance') {
        transaction = {
          ...transaction,
          transaction_date: row['Date(UTC)'] || row['Date'],
          transaction_type: row['Operation']?.toLowerCase() === 'buy' ? 'buy' : 'sell',
          base_asset: row['Coin'],
          quantity: parseFloat(row['Change']) || 0,
          price: parseFloat(row['Price']) || null,
          fee: parseFloat(row['Fee']) || null,
        };
      } else if (exchangeName === 'coinbase') {
        transaction = {
          ...transaction,
          transaction_date: row['Time'],
          transaction_type: row['Side']?.toLowerCase(),
          base_asset: row['Product']?.split('-')[0],
          quote_asset: row['Product']?.split('-')[1],
          quantity: parseFloat(row['Size']) || 0,
          price: parseFloat(row['Price']) || null,
          fee: parseFloat(row['Fee']) || null,
        };
      } else if (exchangeName === 'bybit') {
        transaction = {
          ...transaction,
          transaction_date: row['Time'],
          transaction_type: row['Side']?.toLowerCase(),
          base_asset: row['Symbol']?.replace('USDT', '').replace('BTC', '').replace('ETH', ''),
          quantity: parseFloat(row['Size']) || 0,
          price: parseFloat(row['Price']) || null,
          fee: parseFloat(row['Exec Fee']) || null,
        };
      }

      return transaction;
    });

    return transactions.filter(t => t.base_asset && t.quantity && t.transaction_date);
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

        // Parse CSV
        Papa.parse(fileItem.file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              if (results.errors.length > 0) {
                throw new Error('CSV parsing failed: ' + results.errors[0].message);
              }

              const transactions = processTransactions(results.data, fileItem.file.name, fileRecord.id);

              setProcessingFiles(prev => 
                prev.map(f => f.id === fileItem.id ? { ...f, progress: 75 } : f)
              );

              // Insert transactions
              if (transactions.length > 0) {
                const { error: transactionError } = await supabase
                  .from('transactions')
                  .insert(transactions);

                if (transactionError) throw transactionError;
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
          error: (error) => {
            setProcessingFiles(prev => 
              prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f)
            );
            toast.error(`Error parsing ${fileItem.file.name}: ${error.message}`);
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
          <CardDescription>
            Upload CSV, XLS, or XLSX files from your cryptocurrency exchanges. 
            Supported exchanges: Binance, Coinbase Pro, Bybit, and more.
          </CardDescription>
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
                <p className="text-sm text-muted-foreground">CSV, XLS, and XLSX files supported</p>
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