import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../../../_auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string;

    const supabase = createServiceClient();

    if (action === 'renew') {
        const plan = body.plan as string;
        const subscription_end = body.subscription_end === undefined ? null : body.subscription_end;
        const note = body.note ? String(body.note) : 'Manual renewal';

        const { error } = await supabase
            .from('businesses')
            .update({
                plan,
                subscription_end,
                subscription_start: new Date().toISOString(),
                is_active: true,
            })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        await supabase.from('business_subscription_logs').insert({
            business_id: id,
            action: 'renewed',
            plan,
            subscription_end,
            note,
            actioned_by: session.adminId,
        });

        return NextResponse.json({ ok: true });
    }

    if (action === 'toggle') {
        const isActive = Boolean(body.is_active);
        await supabase.from('businesses').update({ is_active: isActive }).eq('id', id);
        await supabase.from('business_subscription_logs').insert({
            business_id: id,
            action: isActive ? 'reactivated' : 'suspended',
            note: `Manually ${isActive ? 'reactivated' : 'suspended'} by super admin`,
            actioned_by: session.adminId,
        });
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
