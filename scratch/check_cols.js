const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function check() {
    console.log('--- activity_logs columns ---');
    const { data: cols } = await supabase.from('activity_logs').select('*').limit(1);
    if (cols && cols.length > 0) console.log(Object.keys(cols[0]));
    
    console.log('\n--- notifications columns ---');
    const { data: nCols } = await supabase.from('notifications').select('*').limit(1);
    if (nCols && nCols.length > 0) console.log(Object.keys(nCols[0]));
}
check();
