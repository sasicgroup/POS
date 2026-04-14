const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: employees } = await supabase.from('employees').select('id').limit(1);
    const id = employees[0].id;

    // Send empty string for time
    const updateData = {
        shift_start: ''
    };

    const { error: updateError } = await supabase.from('employees').update(updateData).eq('id', id);

    console.log("Error object:", updateError);
}

test();
