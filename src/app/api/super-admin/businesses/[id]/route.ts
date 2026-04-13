import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../../_auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();

    if (error || !data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ business: data });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const patch = await request.json();
    if (!patch || typeof patch !== 'object') {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from('businesses').update(patch).eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
