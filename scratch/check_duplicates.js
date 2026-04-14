const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function checkDuplicates() {
    const businessId = '50a6e5c5-f09c-49ee-8b7e-90808fe95e74';
    const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null);
    
    console.log('Employees found:', data.length);
    data.forEach(e => {
        console.log(`- ${e.name} (${e.role}) [ID: ${e.id}] [Store: ${e.store_id}]`);
    });
}

checkDuplicates();
