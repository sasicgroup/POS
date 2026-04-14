const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: cols, error } = await supabase.rpc('get_table_info', { table_name: 'employees' });
    console.log(error);
}

test();
