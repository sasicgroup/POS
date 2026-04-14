const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching employees...");
    
    const { data: employees, error: fetchError } = await supabase.from('employees').select('id, name, username').limit(1);
    if (fetchError || !employees || employees.length === 0) {
        console.error("Fetch error or no employees", fetchError);
        return;
    }
    const id = employees[0].id;
    console.log("Updating employee:", id, employees[0]);

    // Let's try to update using the exact shape 
    const updateData = {
        name: 'Updated Name',
        phone: '123456789',
        username: employees[0].username, // might trigger unique or no?
        otp_enabled: true
    };

    const { error: updateError } = await supabase.from('employees').update(updateData).eq('id', id);

    if (updateError) {
        console.error("Failed to update employee basic info:", updateError);
        console.log("Error type:", Object.prototype.toString.call(updateError));
        console.log("Error keys:", Object.keys(updateError));
    } else {
        console.log("Update success!");
    }
}

test();
