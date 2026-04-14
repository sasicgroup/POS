const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function checkSchema() {
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*').eq('business_id', 'some-uuid');
    console.log('Tasks result with business_id:', { data: tasks, error: tasksError });
}

checkSchema();
