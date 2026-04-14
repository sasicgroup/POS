const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching employees schema...");
    
    // We can just try to insert a dummy row and catch error to see which column fails
    const { data, error } = await supabase.from('employees').insert({
        name: 'Test',
        username: 'test',
        phone: '1234',
        pin: '1234',
        role: 'owner',
        shift_start: '09:00',
        shift_end: '17:00',
        work_days: ['Monday'],
        master_password: 'test',
        otp_enabled: true
    }).select();

    if (error) {
        console.error("Insertion error object:", JSON.stringify(error, null, 2));
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Code:", error.code);
    } else {
        console.log("Inserted:", data);
    }
}

test();
