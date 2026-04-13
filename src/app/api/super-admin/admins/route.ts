import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password-server';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('super_admins')
        .select('id, name, email, is_active, created_at, last_login_at')
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admins: data || [] });
}

export async function POST(request: Request) {
    const session = await requireSuperAdminSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email, and password required' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const supabase = createServiceClient();
    const { error } = await supabase.from('super_admins').insert({
        name,
        email,
        password_hash,
        is_active: true,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
