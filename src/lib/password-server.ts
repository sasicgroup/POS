import 'server-only';

import { compare, hash } from 'bcryptjs';

const ROUNDS = 10;

export function isBcryptHash(value: string): boolean {
    return typeof value === 'string' && value.startsWith('$2');
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    if (isBcryptHash(stored)) {
        return compare(plain, stored);
    }
    return plain === stored;
}

export async function hashPassword(plain: string): Promise<string> {
    return hash(plain, ROUNDS);
}
