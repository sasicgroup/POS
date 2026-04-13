
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetSuperAdmin() {
    console.log('Resetting Super Admin...');
    
    // Default details
    const email = 'admin@example.com';
    const password = 'admin'; // Plain text, the login API will auto-hash it on first login
    const name = 'System Admin';

    // 1. Delete existing (or just insert/update)
    // To be thorough, we'll delete and re-insert to ensure a clean state
    const { error: deleteError } = await supabase
        .from('super_admins')
        .delete()
        .eq('email', email);

    if (deleteError) {
        console.error('Error deleting existing admin:', deleteError);
    }

    // 2. Insert fresh admin
    const { data, error: insertError } = await supabase
        .from('super_admins')
        .insert([
            {
                email,
                name,
                password_hash: password, // Will be hashed on first login
                is_active: true
            }
        ])
        .select();

    if (insertError) {
        console.error('Error inserting super admin:', insertError);
        return;
    }

    console.log('Super Admin reset successfully!');
    console.table(data);
    console.log('\nLogin Details:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nNOTE: The password will be automatically hashed on your first login.');
}

resetSuperAdmin();
