const { createClient } = require('@supabase/supabase-js');

const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';

const supabase = createClient(URL, KEY);

async function check() {
    console.log('--- Businesses ---');
    const { data: b } = await supabase.from('businesses').select('id, name, slug');
    console.log(b);

    console.log('\n--- Stores ---');
    const { data: s } = await supabase.from('stores').select('id, name, business_id');
    console.log(s);
}

check();
