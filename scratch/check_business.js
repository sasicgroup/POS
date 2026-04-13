require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', 'nyame-tease')
        .single();
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Business:', JSON.stringify(data, null, 2));
    }
}

check();
