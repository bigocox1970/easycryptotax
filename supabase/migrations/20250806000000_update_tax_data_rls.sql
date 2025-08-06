-- Update RLS policies for tax_data table to allow authenticated users to update tax data
-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Allow admin write access to tax_data" ON tax_data;

-- Create a new policy that allows authenticated users to update tax data
CREATE POLICY "Allow authenticated users to update tax data" ON tax_data
    FOR ALL USING (auth.role() = 'authenticated');

-- Also allow service role to update tax data (for server-side operations)
CREATE POLICY "Allow service role to update tax data" ON tax_data
    FOR ALL USING (auth.role() = 'service_role'); 