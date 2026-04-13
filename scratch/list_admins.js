
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
async function listAll() {
    const { data } = await supabase.from('super_admins').select('*');
    console.table(data);
}
listAll();
