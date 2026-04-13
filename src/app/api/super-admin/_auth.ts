import 'server-only';

import { cookies } from 'next/headers';

import { verifySuperAdminSession, getSessionCookieName } from '@/lib/super-admin-session';

export async function getSuperAdminSession() {
    const store = await cookies();
    const token = store.get(getSessionCookieName())?.value;
    if (!token) return null;
    try {
        return await verifySuperAdminSession(token);
    } catch {
        return null;
    }
}

export async function requireSuperAdminSession() {
    const s = await getSuperAdminSession();
    if (!s) return null;
    return s;
}
