import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServiceClient } from '@/lib/supabase-admin';
import { hashPassword, verifyPassword } from '@/lib/password-server';
import { signSuperAdminSession, getSessionCookieName } from '@/lib/super-admin-session';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const supabase = createServiceClient();
        const { data: row, error: dbError } = await supabase
            .from('super_admins')
            .select('id, name, email, password_hash, is_active')
            .ilike('email', email)
            .maybeSingle();

        if (dbError) {
            console.error('[Login] Database error:', dbError);
            return NextResponse.json({ error: 'Database error. Please try again later.' }, { status: 500 });
        }

        if (!row) {
            console.log(`[Login] No admin found with email: ${email}`);
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        if (!row.is_active) {
            console.log(`[Login] Admin account is inactive: ${email}`);
            return NextResponse.json({ error: 'Account is inactive. Contact support.' }, { status: 403 });
        }

        const ok = await verifyPassword(password, row.password_hash);
        if (!ok) {
            console.log(`[Login] Password mismatch for: ${email}`);
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // Auto-upgrade plain text passwords to bcrypt
        if (!String(row.password_hash || '').startsWith('$2')) {
            const newHash = await hashPassword(password);
            await supabase.from('super_admins').update({ password_hash: newHash }).eq('id', row.id);
        }

        await supabase.from('super_admins').update({ last_login_at: new Date().toISOString() }).eq('id', row.id);

        const token = await signSuperAdminSession({
            sub: row.id,
            email: row.email,
            name: row.name,
        });

        const store = await cookies();
        store.set(getSessionCookieName(), token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.json({
            admin: { id: row.id, name: row.name, email: row.email },
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Login failed';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
