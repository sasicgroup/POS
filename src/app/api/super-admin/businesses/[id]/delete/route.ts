import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../../../_auth';

/**
 * DELETE /api/super-admin/businesses/[id]/delete
 * Fully removes a business and all associated data (cascading).
 * This is a destructive operation — only super admins can execute it.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    try {
        // 1. Verify business exists
        const { data: business, error: fetchError } = await supabase
            .from('businesses')
            .select('id, name, slug')
            .eq('id', id)
            .single();

        if (fetchError || !business) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 });
        }

        // 2. Get all stores for this business
        const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .eq('business_id', id);

        const storeIds = (stores || []).map(s => s.id);

        // 3. Clean up store-level data (in dependency order)
        if (storeIds.length > 0) {
            // Sale items depend on sales
            await supabase.from('sale_items').delete().in('sale_id',
                (await supabase.from('sales').select('id').in('store_id', storeIds)).data?.map(s => s.id) || []
            );
            await supabase.from('sales').delete().in('store_id', storeIds);
            await supabase.from('products').delete().in('store_id', storeIds);
            await supabase.from('customers').delete().in('store_id', storeIds);
            await supabase.from('payroll_runs').delete().in('store_id', storeIds);
            await supabase.from('other_income').delete().in('store_id', storeIds);
            await supabase.from('app_settings').delete().in('store_id', storeIds);
            await supabase.from('employee_access').delete().in('store_id', storeIds);

            // Try optional tables (may not exist)
            try { await supabase.from('parked_orders').delete().in('store_id', storeIds); } catch {}
            try { await supabase.from('stocktakes').delete().in('store_id', storeIds); } catch {}
            try { await supabase.from('expenses').delete().in('store_id', storeIds); } catch {}
            try { await supabase.from('activity_logs').delete().in('store_id', storeIds); } catch {}
        }

        // 4. Clean up business-level data
        await supabase.from('employees').delete().eq('business_id', id);
        await supabase.from('stores').delete().eq('business_id', id);

        // Try optional business-level tables
        try { await supabase.from('sms_transactions').delete().eq('business_id', id); } catch {}
        try { await supabase.from('invoices').delete().eq('business_id', id); } catch {}
        try { await supabase.from('support_tickets').delete().eq('business_id', id); } catch {}
        try { await supabase.from('admin_audit_logs').delete().eq('target_business_id', id); } catch {}

        // 5. Finally delete the business itself
        const { error: deleteError } = await supabase
            .from('businesses')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Delete Business] Final delete failed:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log(`[Delete Business] Successfully deleted: ${business.name} (${business.slug})`);
        return NextResponse.json({ ok: true, deleted: business.name });

    } catch (error: any) {
        console.error('[Delete Business] Error:', error.message || error);
        return NextResponse.json({ error: error.message || 'Failed to delete business' }, { status: 500 });
    }
}
