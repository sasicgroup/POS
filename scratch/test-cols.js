const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'employees' });
    console.log(cols, error);
    
    // Simple way: just select limit 1 and print keys
    const { data } = await supabase.from('employees').select('*').limit(1);
    console.log("Columns:", data ? Object.keys(data[0]) : []);
}

test();
