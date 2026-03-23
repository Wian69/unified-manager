
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('--- Environment Check ---');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'PRESENT' : 'MISSING');
console.log('------------------------');

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('Attempting to connect to Supabase...');
    // We would need to import @supabase/supabase-js here to test the actual connection
}
