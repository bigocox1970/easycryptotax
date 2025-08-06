-- Fix RLS policies for tax_data table to allow authenticated users to insert/update
-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access to tax data" ON tax_data;
DROP POLICY IF EXISTS "Allow admin write access to tax data" ON tax_data;

-- Create new policies
-- Allow all users to read tax data
CREATE POLICY "Allow read access to tax data" ON tax_data
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update tax data
CREATE POLICY "Allow authenticated users to insert tax data" ON tax_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update tax data
CREATE POLICY "Allow authenticated users to update tax data" ON tax_data
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow service role to manage tax data (for background jobs)
CREATE POLICY "Allow service role to manage tax data" ON tax_data
    FOR ALL USING (auth.role() = 'service_role'); 