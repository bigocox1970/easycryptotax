import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhnmnlvejkckndtdpuyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm1ubHZlamtja25kdGRwdXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking tax_data table...');
  
  const { data, error } = await supabase
    .from('tax_data')
    .select('*');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Found', data.length, 'records:');
  data.forEach(record => {
    console.log(`- ${record.country} ${record.year}: ${record.source}`);
  });
}

checkDatabase(); 