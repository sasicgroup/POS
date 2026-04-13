import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    
    // Fetch tickets with joined business name
    const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
            *,
            businesses (name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tickets });
}
