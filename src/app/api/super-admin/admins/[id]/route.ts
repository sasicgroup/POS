import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { hashPassword, verifyPassword } from '@/lib/password-server';
import { requireSuperAdminSession } from '../../_auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const supabase = createServiceClient();

    const needsPasswordVerify =
        (body.new_password !== undefined && body.new_password) ||
        body.name !== undefined ||
        body.email !== undefined;

    if (needsPasswordVerify) {
        const { data: row } = await supabase
            .from('super_admins')
            .select('password_hash')
            .eq('id', id)
            .single();

        if (!row) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (!body.current_password) {
            return NextResponse.json({ error: 'Current password required' }, { status: 400 });
        }

        const valid = await verifyPassword(String(body.current_password), row.password_hash);
        if (!valid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.email !== undefined) updates.email = String(body.email).trim().toLowerCase();
    if (body.new_password !== undefined && body.new_password) {
        updates.password_hash = await hashPassword(String(body.new_password));
    }
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from('super_admins').update(updates).eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (id === session.adminId) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from('super_admins').delete().eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
