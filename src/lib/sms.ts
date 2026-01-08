
export interface SMSConfig {
    provider: 'hubtel' | 'mnotify';
    whatsappProvider?: 'meta' | 'none';
    hubtel?: {
        clientId: string;
        clientSecret: string;
        senderId: string;
    };
    mnotify?: {
        apiKey: string;
        senderId: string;
    };
    meta?: {
        accessToken: string;
        phoneNumberId: string;
        businessAccountId: string;
    };
    notifications: {
        owner: {
            sms: boolean;
            whatsapp: boolean;
        };
        customer: {
            sms: boolean;
            whatsapp: boolean;
        };
    };
    templates: {
        welcome: string;
        receipt: string;
        ownerSale?: string;
    };
}

import { supabase } from '@/lib/supabase';

// ... interface ...

// Local cache
let smsConfig: SMSConfig = {
    provider: 'hubtel',
    whatsappProvider: 'meta',
    hubtel: { clientId: '', clientSecret: '', senderId: '' },
    mnotify: { apiKey: '', senderId: '' },
    meta: { accessToken: '', phoneNumberId: '', businessAccountId: '' },
    notifications: {
        owner: { sms: true, whatsapp: false },
        customer: { sms: true, whatsapp: false }
    },
    templates: {
        welcome: "Welcome {Name}! You have been registered. Shop with us to earn points.",
        receipt: "Thanks for buying! Total: GHS {Amount}. See you soon!",
        ownerSale: "New Sale Alert: GHS {Amount} by {Name}. Total Today: {TotalOrders} orders."
    }
};

export const loadSMSConfigFromDB = async (storeId: string) => {
    const { data, error } = await supabase
        .from('app_settings')
        .select('sms_config')
        .eq('store_id', storeId)
        .maybeSingle();

    if (data && data.sms_config) {
        smsConfig = { ...smsConfig, ...data.sms_config };
        if (typeof window !== 'undefined') {
            localStorage.setItem('sms_config', JSON.stringify(smsConfig));
        }
        return smsConfig;
    }
    return null;
}

export const getSMSConfig = (): SMSConfig => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sms_config');
        if (stored) {
            try {
                return { ...smsConfig, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Failed to parse SMS config", e);
            }
        }
    }
    return smsConfig;
};

export const updateSMSConfig = async (config: SMSConfig, storeId?: string) => {
    smsConfig = config;
    if (typeof window !== 'undefined') {
        localStorage.setItem('sms_config', JSON.stringify(config));
    }

    if (storeId) {
        // Upsert to DB
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                store_id: storeId,
                sms_config: config
            });

        if (error) console.error("Failed to save SMS config to DB", error);
    }
};

const sendHubtelSMS = async (config: SMSConfig, phone: string, message: string) => {
    if (!config.hubtel?.clientId || !config.hubtel?.clientSecret || !config.hubtel?.senderId) {
        console.warn('Hubtel credentials missing');
        return;
    }

    const simplePhone = phone.replace(/\D/g, ''); // Remove non-digits

    // Hubtel V1 Endpoint
    const url = `https://smsc.hubtel.com/v1/messages/send?clientsecret=${config.hubtel.clientSecret}&clientid=${config.hubtel.clientId}&from=${encodeURIComponent(config.hubtel.senderId)}&to=${simplePhone}&content=${encodeURIComponent(message)}`;

    try {
        const response = await fetch(url, { method: 'GET' });
        const data = await response.json();
        console.log('[Hubtel Response]', data);
    } catch (e) {
        console.error('[Hubtel Error]', e);
    }
};

const sendMNotifySMS = async (config: SMSConfig, phone: string, message: string) => {
    if (!config.mnotify?.apiKey || !config.mnotify?.senderId) {
        console.warn('mNotify credentials missing');
        return;
    }

    const url = `https://api.mnotify.com/api/sms/quick?key=${config.mnotify.apiKey}`;
    const body = {
        recipient: [phone],
        sender: config.mnotify.senderId,
        message: message,
        is_schedule: false,
        schedule_date: null
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('[mNotify Response]', data);
    } catch (e) {
        console.error('[mNotify Error]', e);
    }
};

const sendMetaWhatsApp = async (config: SMSConfig, phone: string, message: string) => {
    if (!config.meta?.accessToken || !config.meta?.phoneNumberId) {
        console.warn('Meta WhatsApp credentials missing');
        return;
    }

    const simplePhone = phone.replace(/\D/g, '');
    const url = `https://graph.facebook.com/v17.0/${config.meta.phoneNumberId}/messages`;

    // Note: Meta Cloud API usually requires a Template Message for initiation or 24h window.
    // We will assume "text" payload for simplicity, but template is recommended for business initiated convo.
    const body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: simplePhone,
        type: "text",
        text: {
            preview_url: false,
            body: message
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.meta.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('[Meta WhatsApp Response]', data);
        if (data.error) {
            console.error('[Meta WhatsApp Error Detail]', data.error);
        }
    } catch (e) {
        console.error('[Meta WhatsApp Error]', e);
    }
};

export const sendNotification = async (type: 'welcome' | 'sale', data: any) => {
    // 1. Ensure config is loaded (Try memory, then DB)
    let config = getSMSConfig(); // This already tries localStorage and then global smsConfig

    if (!config) {
        console.warn('SMS Config not loaded. Notification skipped.');
        return;
    }

    const { notifications } = config;
    const { owner, customer } = notifications;

    // --- Customer Notifications ---
    if (data.customerPhone) {
        let msg = '';
        if (type === 'welcome') {
            msg = config.templates.welcome.replace('{Name}', data.customerName || 'Customer');
        } else if (type === 'sale') {
            msg = config.templates.receipt
                .replace('{Amount}', data.amount.toFixed(2))
                .replace('{Id}', (data.id || '').toString())
                .replace('{PointsEarned}', (data.pointsEarned || '0').toString())
                .replace('{TotalPoints}', (data.totalPoints || '0').toString());
        }

        console.log(`[SMS] Sending ${type} to customer: ${data.customerPhone}`);

        if (msg) {
            if (customer.sms) await sendDirectMessage(data.customerPhone, msg, ['sms']);
            if (customer.whatsapp) await sendDirectMessage(data.customerPhone, msg, ['whatsapp']);
        }
    }

    // --- Owner Notifications ---
    // Assuming ownerPhone is available in data for owner notifications. 
    // If not, we might need to fetch store settings.
    // For now, we only support if data explicitly has 'ownerPhone' or checks 'sms.ts' notification settings.
    // NOTE: Owner phone logic is currently dependent on 'data.ownerPhone' being passed by caller
    // OR we could load it from active store settings if we had access here.
    if (data.ownerPhone) {
        let msg = '';
        if (type === 'sale') {
            const template = config.templates.ownerSale || "New sale: GHS {Amount} by {Name}.";
            msg = template
                .replace('{Amount}', data.amount.toFixed(2))
                .replace('{Name}', data.customerName || 'Customer')
                .replace('{TotalOrders}', (data.totalOrders || '0').toString());
        }

        if (msg) {
            if (owner.sms) await sendDirectMessage(data.ownerPhone, msg, ['sms']);
            if (owner.whatsapp) await sendDirectMessage(data.ownerPhone, msg, ['whatsapp']);
        }
    }

    return true;
};

export const sendDirectMessage = async (phone: string, message: string, channels: ('sms' | 'whatsapp')[] = ['sms', 'whatsapp']) => {
    const config = getSMSConfig();

    console.log(`[SMS] Direct Message to ${phone} via ${channels.join(', ')}`);

    // Send SMS
    if (channels.includes('sms')) {
        if (config.provider === 'hubtel') {
            await sendHubtelSMS(config, phone, message);
        } else if (config.provider === 'mnotify') {
            await sendMNotifySMS(config, phone, message);
        }
    }

    // Send WhatsApp
    if (channels.includes('whatsapp') && config.meta?.accessToken) {
        await sendMetaWhatsApp(config, phone, message);
    }
};

export const getSMSBalance = async (): Promise<number> => {
    const config = getSMSConfig();

    if (config.provider === 'mnotify' && config.mnotify?.apiKey) {
        const apiKey = config.mnotify.apiKey.trim();
        try {
            const res = await fetch(`https://api.mnotify.com/api/balance/sms?key=${apiKey}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                console.error(`mNotify Balance Check Failed: ${res.status} ${res.statusText}`);
                if (res.status === 401) console.error("Please verify your mNotify API Key.");
                return 0;
            }

            const data = await res.json();
            // mNotify returns { balance: "10.50", ... } or similar
            return parseFloat(data?.balance || '0');
        } catch (e) {
            console.error("Failed to fetch mNotify balance", e);
            return 0;
        }
    }

    if (config.provider === 'hubtel') {
        // Hubtel balance check implementation deferred
        return 0;
    }

    return 0;
};
