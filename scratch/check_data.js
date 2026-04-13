require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Businesses ---');
    const { data: businesses } = await supabase.from('businesses').select('*');
    console.log(JSON.stringify(businesses, null, 2));

    console.log('\n--- Stores Count by Business ID ---');
    const { data: stores } = await supabase.from('stores').select('id, name, business_id');
    console.log(JSON.stringify(stores, null, 2));
}

check();
