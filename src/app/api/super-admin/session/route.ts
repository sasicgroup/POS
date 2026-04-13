import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: row } = await supabase
        .from('super_admins')
        .select('id, name, email, is_active')
        .eq('id', session.adminId)
        .maybeSingle();

    if (!row || !row.is_active) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        admin: { id: row.id, name: row.name, email: row.email },
    });
}
