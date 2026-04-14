const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: employees } = await supabase.from('employees').select('phone').limit(1).not('phone', 'is', null);
    if (!employees || employees.length === 0) return;

    const testData = {
        name: 'test',
        phone: employees[0].phone,
        username: 'unique_user_' + Date.now(),
        role: 'staff',
        pin: '1234'
    };

    const { error } = await supabase.from('employees').insert(testData);
    if (error) console.log("Error:", error);
    else console.log("Success! No global phone constraint.");
}

test();
