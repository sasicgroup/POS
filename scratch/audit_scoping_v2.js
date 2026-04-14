const { createClient } = require('@supabase/supabase-js');
const URL = 'https://cwieywlveahchulsswnq.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWV5d2x2ZWFoY2h1bHNzd25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc0NjUwNCwiZXhwIjoyMDgzMzIyNTA0fQ.jJXbHrlGdf75U-fJvsj4_m0AXWelkzKP7QWhFCnnTLk';
const supabase = createClient(URL, KEY);

async function checkBusinessId() {
    const tables = [
        'tasks', 'notes', 'employees', 'stores', 'products', 
        'customers', 'sales', 'sale_items', 'sale_payments',
        'expenses', 'installments', 'installment_payments', 'installment_settings',
        'notifications', 'loyalty_programs', 'loyalty_logs', 'activity_logs',
        'sms_logs', 'invoices', 'sms_transactions'
    ];

    console.log('--- SYSTEMATIC SCOPING AUDIT ---');
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('business_id').limit(1);
            if (error) {
                if (error.code === '42703') {
                    console.error(`[MISSING] ${table}: business_id column NOT found.`);
                } else if (error.code === 'PGRST205') {
                    console.warn(`[SKIP] ${table}: Table does not exist.`);
                } else {
                    console.error(`[ERROR] ${table}: ${error.message} (${error.code})`);
                }
            } else {
                console.log(`[OK] ${table}: Scoped.`);
            }
        } catch (e) {
            console.error(`[FAILED] ${table}: ${e.message}`);
        }
    }
}

checkBusinessId();
