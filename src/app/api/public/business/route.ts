import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';

/** Public read for tenant branding/login — one row per request (same egress as client .single()). */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (!slug && !id) {
        return NextResponse.json({ error: 'Missing slug or id' }, { status: 400 });
    }

    try {
        const supabase = createServiceClient();
        let q = supabase
            .from('businesses')
            .select('id, slug, app_name, logo_url, primary_color, owner_email, is_active, subscription_end, plan, grace_period_days');

        if (slug) {
            q = q.eq('slug', slug);
        } else {
            q = q.eq('id', id!);
        }

        const { data, error } = await q.single();

        if (error || !data) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Server error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
