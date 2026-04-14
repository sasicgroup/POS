const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function checkColumns() {
    // Check stores table columns by querying one row and listing fields
    const { data: storeRow, error: storeErr } = await supabase.from('stores').select('*').limit(1);
    if (storeRow && storeRow[0]) console.log('stores columns:', Object.keys(storeRow[0]));
    else console.log('stores error:', storeErr);

    // Check inventory table (called 'products' or 'inventory')
    const { data: invRow, error: invErr } = await supabase.from('inventory').select('*').limit(1);
    if (invRow && invRow[0]) console.log('inventory columns:', Object.keys(invRow[0]));
    else console.log('inventory error:', invErr);
}

checkColumns();
