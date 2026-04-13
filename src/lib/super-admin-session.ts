import 'server-only';

import { SignJWT, jwtVerify } from 'jose';

const COOKIE = 'sa_session';

export function getSessionCookieName() {
    return COOKIE;
}

function getSecret(): Uint8Array {
    const raw = process.env.SUPER_ADMIN_SESSION_SECRET;
    if (!raw || raw.length < 32) {
        throw new Error('SUPER_ADMIN_SESSION_SECRET must be set (min 32 characters)');
    }
    return new TextEncoder().encode(raw);
}

export async function signSuperAdminSession(payload: { sub: string; email: string; name: string }) {
    return new SignJWT({ email: payload.email, name: payload.name })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getSecret());
}

export async function verifySuperAdminSession(token: string) {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (!sub) throw new Error('Invalid token');
    return {
        adminId: sub,
        email: String(payload.email || ''),
        name: String(payload.name || ''),
    };
}
