import 'server-only';

import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
        throw new Error('Server configuration error: Missing Supabase URL');
    }
    if (!key) {
        console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
        throw new Error('Server configuration error: Missing Supabase Service Role Key');
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
