import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ businesses: data || [] });
}

export async function POST(request: Request) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const input = await request.json();
        const name = String(input.name || '').trim();
        const slugRaw = String(input.slug || '').trim().toLowerCase().replace(/\s+/g, '-');
        if (!name || !slugRaw) {
            return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });
        }

        const supabase = createServiceClient();

        const { data: biz, error: bizErr } = await supabase
            .from('businesses')
            .insert({
                name,
                slug: slugRaw,
                owner_email: input.owner_email || null,
                owner_phone: input.owner_phone || null,
                plan: input.plan || 'monthly',
                subscription_start: new Date().toISOString(),
                subscription_end: input.subscription_end ?? null,
                primary_color: input.primary_color || '#4f46e5',
                app_name: input.app_name || name,
                notes: input.notes || null,
                is_active: true,
                created_by: session.adminId,
            })
            .select()
            .single();

        if (bizErr || !biz) {
            return NextResponse.json({ error: bizErr?.message || 'Failed to create business' }, { status: 400 });
        }

        const { error: empErr } = await supabase.from('employees').insert({
            name: input.owner_name,
            username: input.owner_username,
            pin: input.owner_pin,
            role: 'owner',
            phone: input.owner_phone || null,
            business_id: biz.id,
            otp_enabled: false,
        });

        if (empErr) {
            await supabase.from('businesses').delete().eq('id', biz.id);
            return NextResponse.json({ error: empErr.message }, { status: 400 });
        }

        await supabase.from('business_subscription_logs').insert({
            business_id: biz.id,
            action: 'created',
            plan: input.plan,
            subscription_end: input.subscription_end,
            note: 'Initial setup',
            actioned_by: session.adminId,
        });

        return NextResponse.json({ business: biz });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
