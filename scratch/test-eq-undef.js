const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    try {
        const { error: updateError } = await supabase.from('employees').update({ name: 'test' }).eq('id', undefined);
        console.log("Error:", updateError);
    } catch (e) {
        console.log("Caught Exception:", e.message);
    }
}

test();
