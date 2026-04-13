import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET(request: Request) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const now = new Date();
    const start = new Date();
    if (period === '7d') start.setDate(now.getDate() - 7);
    else if (period === '30d') start.setMonth(now.getMonth() - 1);
    else if (period === '3m') start.setMonth(now.getMonth() - 3);
    else start.setFullYear(now.getFullYear() - 1);

    const supabase = createServiceClient();
    const { data: sales, error } = await supabase
        .from('sales')
        .select('total_amount, created_at, store_id')
        .gte('created_at', start.toISOString())
        .neq('status', 'Refunded');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sales: sales || [] });
}
