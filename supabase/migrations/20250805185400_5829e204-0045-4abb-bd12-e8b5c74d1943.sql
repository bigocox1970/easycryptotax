-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  subscription_tier TEXT DEFAULT 'free',
  tax_jurisdiction TEXT DEFAULT 'UK',
  accounting_method TEXT DEFAULT 'FIFO',
  primary_exchange TEXT DEFAULT 'coinbase',
  currency_preference TEXT DEFAULT 'GBP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create uploaded files tracking table
CREATE TABLE public.uploaded_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  exchange_name TEXT,
  file_size INTEGER,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT DEFAULT 'pending',
  supabase_file_path TEXT
);

-- Enable RLS on uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Uploaded files policies
CREATE POLICY "Users can view their own files" ON public.uploaded_files
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files" ON public.uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON public.uploaded_files
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT,
  quantity DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8),
  fee DECIMAL(20,8),
  fee_asset TEXT,
  exchange_name TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create tax events table
CREATE TABLE public.tax_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  buy_transaction_id UUID REFERENCES public.transactions(id),
  sell_transaction_id UUID REFERENCES public.transactions(id),
  asset TEXT NOT NULL,
  quantity_sold DECIMAL(20,8),
  cost_basis DECIMAL(20,2),
  sale_price DECIMAL(20,2),
  gain_loss DECIMAL(20,2),
  holding_period_days INTEGER,
  is_long_term BOOLEAN,
  tax_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tax_events
ALTER TABLE public.tax_events ENABLE ROW LEVEL SECURITY;

-- Tax events policies
CREATE POLICY "Users can view their own tax events" ON public.tax_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tax events" ON public.tax_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tax events" ON public.tax_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tax events" ON public.tax_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create price history cache table
CREATE TABLE public.price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  price_usd DECIMAL(20,8),
  source TEXT DEFAULT 'coingecko',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, date, source)
);

-- Enable RLS on price_history (public read)
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Price history policies (public read)
CREATE POLICY "Anyone can view price history" ON public.price_history
  FOR SELECT USING (true);

-- Create storage bucket for transaction files
INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-files', 'transaction-files', false);

-- Storage policies for transaction files
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transaction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'transaction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'transaction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'transaction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();