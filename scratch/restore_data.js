const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function reverseMigrate() {
    const SASIC_BIZ = '50a6e5c5-f09c-49ee-8b7e-90808fe95e74'; // sasic-group
    const NYAME_BIZ = '241b3b2c-caa2-4230-8c91-738fc7f29c31'; // nyame-tease

    console.log(`Moving ALL data BACK to sasic-group (${SASIC_BIZ})...`);
    
    // Move Stores
    const { error: sError } = await supabase.from('stores').update({ business_id: SASIC_BIZ }).eq('business_id', NYAME_BIZ);
    if (sError) console.error('Stores migration error:', sError);

    // Move Employees
    const { error: eError } = await supabase.from('employees').update({ business_id: SASIC_BIZ }).eq('business_id', NYAME_BIZ);
    if (eError) console.error('Employees migration error:', eError);

    console.log('Restoration complete.');
}

reverseMigrate();
