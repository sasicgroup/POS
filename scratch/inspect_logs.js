const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function inspect() {
    const { data: logs } = await supabase.from('activity_logs').select('id, store_id').limit(10);
    console.log('--- Sample Logs ---', logs);
    
    const { data: stores } = await supabase.from('stores').select('id, name, business_id');
    const storeMap = {};
    stores?.forEach(s => storeMap[s.id] = s.business_id);
    
    console.log('--- Log Business Check ---');
    logs?.forEach(l => {
        console.log(`Log ${l.id} -> Store ${l.store_id} -> Business ${storeMap[l.store_id]}`);
    });
}
inspect();
