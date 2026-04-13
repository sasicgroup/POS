
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAdmins() {
    const emailsToDelete = ['admin@example.com', 'admin@sasicgroup.com'];
    console.log(`Attempting to permanently delete: ${emailsToDelete.join(', ')}`);

    for (const email of emailsToDelete) {
        const { error } = await supabase
            .from('super_admins')
            .delete()
            .eq('email', email);

        if (error) {
            console.error(`Error deleting ${email}:`, error);
        } else {
            console.log(`Successfully deleted ${email}`);
        }
    }

    console.log('\nFinal check of remaining super admins:');
    const { data } = await supabase.from('super_admins').select('id, name, email');
    console.table(data);
}

deleteAdmins();
