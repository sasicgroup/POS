import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase.from('global_settings').select('*').maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data || null });
}

export async function PUT(request: Request) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const patch = body.patch ?? body;
    if (!patch || typeof patch !== 'object') {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: rows } = await supabase.from('global_settings').select('id').limit(1);
    const rowId = rows?.[0]?.id;

    if (rowId) {
        const { error } = await supabase.from('global_settings').update(patch).eq('id', rowId);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    } else {
        const { error } = await supabase.from('global_settings').insert(patch);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    }

    return NextResponse.json({ ok: true });
}
