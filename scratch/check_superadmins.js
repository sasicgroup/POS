
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdmins() {
    const { data, error } = await supabase
        .from('super_admins')
        .select('*');

    if (error) {
        console.error('Error fetching admins:', error);
        return;
    }

    console.log('Current Super Admins:');
    console.table(data);
}

checkAdmins();
