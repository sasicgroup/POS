
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditColumns() {
    const tables = [
        'stores', 'employees', 'products', 'customers', 'sales', 'sale_items', 
        'payroll_runs', 'app_settings', 'other_income', 'businesses', 
        'business_subscription_logs', 'employee_access', 'parked_orders', 
        'returns', 'return_items', 'stocktakes', 'stocktake_items', 
        'activity_logs', 'notifications'
    ];

    console.log('Auditing table columns for business_id and store_id...');

    for (const table of tables) {
        try {
            // We can check columns using a raw query or by attempting to select them
            const { data, error } = await supabase.from(table).select('id').limit(1);
            
            if (error) {
                console.log(`[${table}] Error or missing: ${error.message}`);
                continue;
            }

            // Check columns via RPC or by just trying to select them
            const { error: bizError } = await supabase.from(table).select('business_id').limit(0);
            const { error: storeError } = await supabase.from(table).select('store_id').limit(0);

            console.log(`[${table}] business_id: ${!bizError ? '✅' : '❌'}, store_id: ${!storeError ? '✅' : '❌'}`);
        } catch (e) {
            console.log(`[${table}] Failed to audit: ${e.message}`);
        }
    }
}

auditColumns();
