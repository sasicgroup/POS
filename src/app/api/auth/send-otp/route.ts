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
            console.log(`[API] Fetching SMS config for store: ${storeId}`);
            const { data, error } = await supabase
                .from('app_settings')
                .select('sms_config')
                .eq('store_id', storeId)
                .maybeSingle();

            if (data?.sms_config) {
                config = data.sms_config;
                console.log(`[API] ✅ SMS config found for store ${storeId}:`, { provider: config.provider });
            } else if (error) {
                console.warn('[API] ⚠️ Failed to fetch SMS config:', error.message);
            } else {
                console.warn('[API] ⚠️ No SMS config found for store:', storeId);
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
                console.log('[API] ✅ Using fallback SMS config:', { provider: config.provider });
            } else {
                console.error('[API] ❌ No SMS configuration found in database');
                return NextResponse.json({ success: false, error: 'SMS Configuration not found for this store or globally.' }, { status: 500 });
            }
        }

        // 2. Send SMS
        let success = false;
        let providerResponse = null;

        if (config.provider === 'hubtel' && config.hubtel?.clientId && config.hubtel?.clientSecret) {
            // Format phone number (remove non-digits)
            let simplePhone = phone.replace(/\D/g, '');

            // Convert local Ghana format (0XXXXXXXXX) to international (233XXXXXXXXX)
            if (simplePhone.startsWith('0') && simplePhone.length === 10) {
                simplePhone = '233' + simplePhone.substring(1);
                console.log(`[API] Converted phone from ${phone} to ${simplePhone}`);
            }

            const senderId = config.hubtel.senderId || 'SASIC';
            const url = `https://smsc.hubtel.com/v1/messages/send?clientsecret=${config.hubtel.clientSecret}&clientid=${config.hubtel.clientId}&from=${encodeURIComponent(senderId)}&to=${simplePhone}&content=${encodeURIComponent(message)}`;

            console.log('[API] Hubtel request:', { to: simplePhone, from: senderId, messageLength: message.length });

            try {
                const res = await fetch(url);
                providerResponse = await res.json();
                console.log('[API] Hubtel response:', providerResponse);

                // Hubtel returns status code 200 and ResponseCode "0000" on success
                if (res.ok && (providerResponse.ResponseCode === '0000' || providerResponse.Status === 0)) {
                    success = true;
                    console.log('[API] ✅ Hubtel SMS sent successfully');
                } else {
                    success = false;
                    console.error('[API] ❌ Hubtel returned error:', providerResponse);
                    return NextResponse.json({
                        success: false,
                        error: `Hubtel error: ${providerResponse.Message || 'Unknown error'}`
                    }, { status: 500 });
                }
            } catch (e: any) {
                console.error('[API] ❌ Hubtel failed:', e);
                return NextResponse.json({ success: false, error: e.message }, { status: 500 });
            }
        }
        else if (config.provider === 'mnotify' && config.mnotify?.apiKey) {
            const url = `https://api.mnotify.com/api/sms/quick?key=${config.mnotify.apiKey}`;
            const sender = config.mnotify.senderId || 'SASIC';

            // Format phone number for mNotify (requires international format)
            let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits

            // Convert local Ghana format (0XXXXXXXXX) to international (233XXXXXXXXX)
            if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
                formattedPhone = '233' + formattedPhone.substring(1);
                console.log(`[API] Converted phone from ${phone} to ${formattedPhone}`);
            }

            const payload = {
                recipient: [formattedPhone],
                sender: sender,
                message: message,
                is_schedule: false,
                schedule_date: null
            };

            console.log('[API] mNotify payload:', { recipient: formattedPhone, sender, messageLength: message.length });

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                providerResponse = await res.json();
                console.log('[API] mNotify response:', providerResponse);

                // mNotify returns { code: "2000", message: "SMS sent successfully" } on success
                // or { code: "4000", message: "Error message" } on failure
                if (providerResponse.code === '2000' || providerResponse.code === 2000) {
                    success = true;
                    console.log('[API] ✅ mNotify SMS sent successfully');
                } else {
                    success = false;
                    console.error('[API] ❌ mNotify returned error:', providerResponse);
                    return NextResponse.json({
                        success: false,
                        error: `mNotify error: ${providerResponse.message || 'Unknown error'}`
                    }, { status: 500 });
                }
            } catch (e: any) {
                console.error('[API] ❌ mNotify failed:', e);
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
