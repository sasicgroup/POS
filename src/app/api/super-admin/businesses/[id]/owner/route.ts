import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../../../_auth';

/** Owner row for “view as” — only callable with super-admin session. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();
    const { data: owner, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', id)
        .eq('role', 'owner')
        .is('deleted_at', null)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!owner) {
        return NextResponse.json({ error: 'No owner' }, { status: 404 });
    }

    return NextResponse.json({ owner });
}
