import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    try {
        const session = await requireSuperAdminSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServiceClient();
        
        // Fetch all businesses with their hierarchical data
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select(`
                id, name, slug, plan, created_at,
                stores (
                    id, name, location, 
                    sales (total_amount)
                )
            `)
            .order('name');

        if (error) {
            console.error('[Performance API] DB Error:', error);
            throw error;
        }

        // Process yields
        const processed = (businesses || []).map(biz => {
            const stores = biz.stores || [];
            const totalRevenue = stores.reduce((acc, s) => {
                const storeRev = (s as any).sales?.reduce((sum: number, sale: any) => sum + (parseFloat(sale.total_amount) || 0), 0) || 0;
                return acc + storeRev;
            }, 0);
            
            return { 
                ...biz, 
                stores_count: stores.length,
                total_revenue: totalRevenue,
                stores // keep for drilldown if needed
            };
        });

        return NextResponse.json({ performance: processed });
    } catch (e: any) {
        console.error('[Performance API] Global Error:', e.message || e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
