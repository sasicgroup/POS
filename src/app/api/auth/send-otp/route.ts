import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// We prioritize the Service Role Key to bypass RLS for fetching settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, message, storeId } = body;

        console.log(`[API] Sending OTP to ${phone} (Store: ${storeId})`);

        if (!phone || !message) {
            return NextResponse.json({ success: false, error: 'Missing phone or message' }, { status: 400 });
        }

        // 1. Fetch SMS Config (Bypassing RLS)
        let config = null;
        if (storeId) {
            const { data, error } = await supabase
                .from('app_settings')
                .select('sms_config')
                .eq('store_id', storeId)
                .maybeSingle();

            if (data?.sms_config) {
                config = data.sms_config;
            } else if (error) {
                console.warn('[API] Failed to fetch SMS config:', error.message);
            }
        }

        // If no config found for store, try to use a local fallback if defined in env?
        // Or assume the config object might be passed in body? (No, that's insecure)

        if (!config) {
            console.log('[API] SMS Config not found for store. Attempting global fallback...');
            const { data: fallbackData } = await supabase
                .from('app_settings')
                .select('sms_config')
                .not('sms_config', 'is', null)
                .limit(1)
                .maybeSingle();

            if (fallbackData?.sms_config) {
                config = fallbackData.sms_config;
                console.log('[API] Using fallback SMS config.');
            } else {
                return NextResponse.json({ success: false, error: 'SMS Configuration not found for this store or globally.' }, { status: 500 });
            }
        }

        // 2. Send SMS
        let success = false;
        let providerResponse = null;

        if (config.provider === 'hubtel' && config.hubtel?.clientId && config.hubtel?.clientSecret) {
            const simplePhone = phone.replace(/\D/g, '');
            const senderId = config.hubtel.senderId || 'SASIC';
            const url = `https://smsc.hubtel.com/v1/messages/send?clientsecret=${config.hubtel.clientSecret}&clientid=${config.hubtel.clientId}&from=${encodeURIComponent(senderId)}&to=${simplePhone}&content=${encodeURIComponent(message)}`;

            try {
                const res = await fetch(url);
                providerResponse = await res.json();
                console.log('[API] Hubtel key response:', providerResponse);
                // Hubtel usually returns status
                success = true;
            } catch (e: any) {
                console.error('[API] Hubtel failed:', e);
                return NextResponse.json({ success: false, error: e.message }, { status: 500 });
            }
        }
        else if (config.provider === 'mnotify' && config.mnotify?.apiKey) {
            const url = `https://api.mnotify.com/api/sms/quick?key=${config.mnotify.apiKey}`;
            const sender = config.mnotify.senderId || 'SASIC';
            const payload = {
                recipient: [phone],
                sender: sender,
                message: message,
                is_schedule: false,
                schedule_date: null
            };

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                providerResponse = await res.json();
                console.log('[API] mNotify response:', providerResponse);
                success = true;
            } catch (e: any) {
                console.error('[API] mNotify failed:', e);
                return NextResponse.json({ success: false, error: e.message }, { status: 500 });
            }
        } else {
            return NextResponse.json({ success: false, error: 'Invalid SMS Provider Configuration' }, { status: 500 });
        }

        // 3. Log to DB
        // We use the same supabase client (admin/service role preferably) to write to logs
        await supabase.from('sms_logs').insert({
            phone,
            message,
            channel: 'sms',
            status: success ? 'sent' : 'failed',
            store_id: storeId,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true, providerResponse });

    } catch (e: any) {
        console.error('[API] Unexpected Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
