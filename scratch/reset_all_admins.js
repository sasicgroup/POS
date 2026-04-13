
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAll() {
    console.log('Resetting all Super Admin credentials...');
    
    const admins = [
        { email: 'admin@sasicgroup.com', name: 'Super Admin', password: 'admin' },
        { email: 'superadmin@sasicgroup.com', name: 'Super Admin', password: 'admin' },
        { email: 'admin@example.com', name: 'System Admin', password: 'admin' }
    ];

    for (const admin of admins) {
        const { error } = await supabase
            .from('super_admins')
            .upsert({
                email: admin.email,
                name: admin.name,
                password_hash: admin.password,
                is_active: true
            }, { onConflict: 'email' });

        if (error) {
            console.error(`Error resetting ${admin.email}:`, error);
        } else {
            console.log(`Successfully reset ${admin.email}`);
        }
    }

    console.log('\nAll resets complete.');
    console.log('Default password for all accounts: admin');
}

resetAll();
