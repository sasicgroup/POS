const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: employees, error } = await supabase.from('employees').select('id, name, username, phone, business_id');
    console.log("Employees in DB:");
    console.table(employees);
}

test();
