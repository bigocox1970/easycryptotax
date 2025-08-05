export interface Transaction {
  id: string;
  user_id: string;
  file_id: string;
  transaction_type: string;
  base_asset: string;
  quote_asset?: string;
  quantity: number;
  price?: number;
  fee?: number;
  fee_asset?: string;
  exchange_name?: string;
  transaction_date: string;
  raw_data?: any;
  created_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  exchange_name?: string;
  file_size?: number;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  supabase_file_path?: string;
}

export interface TaxEvent {
  id: string;
  user_id: string;
  buy_transaction_id?: string;
  sell_transaction_id?: string;
  asset: string;
  quantity_sold?: number;
  cost_basis?: number;
  sale_price?: number;
  gain_loss?: number;
  holding_period_days?: number;
  is_long_term?: boolean;
  tax_year?: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  subscription_tier: 'free' | 'premium';
  tax_jurisdiction: string;
  accounting_method: 'FIFO' | 'LIFO' | 'Specific ID';
  primary_exchange?: string;
  currency_preference?: string;
  created_at: string;
}