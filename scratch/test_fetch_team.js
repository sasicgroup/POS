const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function testFetchTeamMembers() {
    const storeId = 'bc9d48c8-174e-48ea-9b0d-28214ddc657e'; // Test with one store_id
    const { data: directEmployees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('store_id', storeId);
        //.neq('status', 'deleted');
        
    console.log('directEmployees:', directEmployees);
    console.log('Error:', error);
}

testFetchTeamMembers();
