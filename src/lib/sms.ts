export interface SMSConfig {
    provider: 'mnotify' | 'hubtel';
    whatsappProvider?: 'meta' | 'none';
    mnotify?: {
        apiKey: string;
        senderId: string;
    };
    hubtel?: {
        clientId: string;
        clientSecret: string;
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
    automations: {
        lowStockAlert: {
            enabled: boolean;
            threshold: number;
            sms: boolean;
            whatsapp: boolean;
        };
    };
    templates: {
        welcome: string;
        receipt: string;
        ownerSale?: string;
        lowStockAlert?: string;
        installment: string;
    };
}

import { supabase } from '@/lib/supabase';
import { deductSMSCredit } from './sms-wallet';

// Local cache
let smsConfig: SMSConfig = {
    provider: 'mnotify',
    whatsappProvider: 'meta',
    mnotify: { apiKey: '', senderId: '' },
    hubtel: { clientId: '', clientSecret: '', senderId: '' },
    meta: { accessToken: '', phoneNumberId: '', businessAccountId: '' },
    notifications: {
        owner: { sms: true, whatsapp: false },
        customer: { sms: true, whatsapp: false }
    },
    automations: {
        lowStockAlert: {
            enabled: false,
            threshold: 10,
            sms: true,
            whatsapp: false
        }
    },
    templates: {
        welcome: "Welcome {Name}! You have been registered. Shop with us to earn points.",
        receipt: "Thanks for buying! Total: GHS {Amount}. See you soon!",
        ownerSale: "New Sale Alert: GHS {Amount} by {Name}. Total Today: {TotalOrders} orders.",
        lowStockAlert: "Low Stock Alert: {Product} has only {Stock} left! Please restock.",
        installment: "Hi {Name}, your installment payment of GHS {AmountPaid} for {Id} has been received. Balance left: GHS {AmountLeft}. Thank you!"
    }
};

// --- Helper for Phone Number Normalization ---
const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    let p = phone.replace(/\D/g, ''); // Remove non-digits

    // Convert local Ghana format (0XXXXXXXXX) to international (233XXXXXXXXX)
    if (p.startsWith('0') && p.length === 10) {
        return '233' + p.substring(1);
    }
    return p;
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
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                store_id: storeId,
                sms_config: config
            });

        if (error) console.error("Failed to save SMS config to DB", error);
    }
};

const sendMNotifySMS = async (config: SMSConfig, phone: string, message: string) => {
    if (!config.mnotify?.apiKey) {
        console.warn('[SMS] mNotify API key missing');
        return false;
    }

    const formattedPhone = normalizePhone(phone);
    let sender = config.mnotify.senderId || 'SASIC';
    if (sender.length > 11) sender = sender.substring(0, 11);

    const url = `https://api.mnotify.com/api/sms/quick?key=${config.mnotify.apiKey}`;

    const body = {
        recipient: [formattedPhone],
        sender: sender,
        message: message,
        is_schedule: false,
        schedule_date: null
    };

    console.log('[SMS] Sending via mNotify:', { to: formattedPhone, sender });

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

        if ((data.code === '2000' || data.code === 2000)) {
            return true;
        }
        return false;
    } catch (e) {
        console.error('[mNotify Error]', e);
        throw e; // Re-throw for offline queue handling
    }
};

const sendMetaWhatsApp = async (config: SMSConfig, phone: string, message: string) => {
    if (!config.meta?.accessToken || !config.meta?.phoneNumberId) {
        console.warn('[WhatsApp] Meta credentials missing');
        return false;
    }

    const simplePhone = normalizePhone(phone);
    const url = `https://graph.facebook.com/v17.0/${config.meta.phoneNumberId}/messages`;

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
            console.error('[Meta WhatsApp Error]', data.error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[Meta WhatsApp Error]', e);
        throw e; // Re-throw for offline queue handling
    }
};

// --- Logging & History ---

export const logSMS = async (phone: string, message: string, channel: 'sms' | 'whatsapp', status: 'sent' | 'failed', storeId?: string) => {
    try {
        await supabase.from('sms_logs').insert({
            phone,
            message,
            channel,
            status,
            store_id: storeId,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error("Failed to log SMS", e);
    }
};

export const getSMSHistory = async (storeId: string, page: number = 1, limit: number = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching SMS history", error);
        return { data: [], count: 0 };
    }

    return { data, count };
};

// --- Notification Functions ---

export async function sendDirectMessage(phone: string, message: string, channels: ('sms' | 'whatsapp')[] = ['sms', 'whatsapp'], storeId?: string, businessId?: string) {
    const config = getSMSConfig();

    console.log(`[SMS] Direct Message to ${phone} via ${channels.join(', ')}`);

    // Check if online
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
        console.log('[SMS] Offline - queuing message for later');
        const { syncManager } = await import('./sync-manager');
        await syncManager.enqueueRequest({
            action: 'INSERT',
            table: 'sms_queue',
            payload: {
                phone,
                message,
                channels,
                storeId,
                status: 'pending',
                created_at: new Date().toISOString()
            }
        });
        return;
    }

    // Send SMS
    if (channels.includes('sms')) {
        let success = false;
        try {
            // Check & Deduct credit if platform-managed (Skip if user provides their own API keys)
            const hasOwnCredentials = (config.provider === 'mnotify' && config.mnotify?.apiKey) || 
                                     (config.provider === 'hubtel' && config.hubtel?.clientId);

            if (businessId && !hasOwnCredentials) {
                const segments = Math.ceil(message.length / 160); // Standard SMS segmenting
                const wallet = await deductSMSCredit(businessId, segments);
                if (!wallet.success) {
                    console.error('[SMS] Delivery cancelled:', wallet.error);
                    await logSMS(phone, `[FAIL: ${wallet.error}] ` + message, 'sms', 'failed', storeId);
                    return;
                }
            }

            success = await sendMNotifySMS(config, phone, message);
            await logSMS(phone, message, 'sms', success ? 'sent' : 'failed', storeId);
        } catch (error: any) {
            // If network error, queue it
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                console.log('[SMS] Network error - queuing message');
                const { syncManager } = await import('./sync-manager');
                await syncManager.enqueueRequest({
                    action: 'INSERT',
                    table: 'sms_queue',
                    payload: {
                        phone,
                        message,
                        channels: ['sms'],
                        storeId,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                });
            } else {
                await logSMS(phone, message, 'sms', 'failed', storeId);
            }
        }
    }

    // Send WhatsApp
    if (channels.includes('whatsapp') && config.meta?.accessToken) {
        try {
            const success = await sendMetaWhatsApp(config, phone, message);
            await logSMS(phone, message, 'whatsapp', success ? 'sent' : 'failed', storeId);
        } catch (error: any) {
            // If network error, queue it
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                console.log('[SMS] Network error - queuing WhatsApp message');
                const { syncManager } = await import('./sync-manager');
                await syncManager.enqueueRequest({
                    action: 'INSERT',
                    table: 'sms_queue',
                    payload: {
                        phone,
                        message,
                        channels: ['whatsapp'],
                        storeId,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }
                });
            } else {
                await logSMS(phone, message, 'whatsapp', 'failed', storeId);
            }
        }
    }
}

export const sendNotification = async (type: 'welcome' | 'sale' | 'installment', data: any) => {
    let config = getSMSConfig();

    if (!config) {
        console.warn('[SMS] Config not loaded. Notification skipped.');
        return;
    }

    const { notifications } = config;
    const { owner, customer } = notifications;
    const storeId = data.storeId;

    // --- Customer Notifications ---
    if (data.customerPhone) {
        let msg = data.customMessage || '';
        if (!msg) {
            if (type === 'welcome') {
                msg = config.templates.welcome.replace('{Name}', data.customerName || 'Customer');
            } else if (type === 'sale') {
                msg = config.templates.receipt
                    .replace(/{Amount}/g, Number(data.amount).toFixed(2))
                    .replace(/{Id}/g, (data.id || '').toString())
                    .replace(/{receipt}/g, (data.id || '').toString())
                    .replace(/{Receipt}/g, (data.id || '').toString())
                    .replace(/{PointsEarned}/g, (data.pointsEarned || '0').toString())
                    .replace(/{PointsUsed}/g, (data.pointsUsed || '0').toString())
                    .replace(/{PointsBalance}/g, (data.pointsBalance || '0').toString())
                    .replace(/{TotalPoints}/g, (data.totalPoints || '0').toString())
                    .replace(/{Name}/g, data.customerName || 'Customer')
                    .replace(/{name}/g, data.customerName || 'Customer')
                    .replace(/{staff-name}/g, data.staffName || 'Staff');
            } else if (type === 'installment') {
                msg = (config.templates.installment || "Hi {Name}, your installment payment of GHS {AmountPaid} for {Id} has been received. Balance left: GHS {AmountLeft}. Thank you!")
                    .replace(/{Name}/g, data.customerName || 'Customer')
                    .replace(/{AmountPaid}/g, Number(data.amountPaid).toFixed(2))
                    .replace(/{AmountLeft}/g, Number(data.amountLeft).toFixed(2))
                    .replace(/{Id}/g, (data.id || '').toString());
            }
        }

        console.log(`[SMS] Sending ${type} to customer: ${data.customerPhone}`);

        if (msg) {
            if (customer.sms) await sendDirectMessage(data.customerPhone, msg, ['sms'], storeId, data.businessId);
            if (customer.whatsapp) await sendDirectMessage(data.customerPhone, msg, ['whatsapp'], storeId, data.businessId);
        }
    }

    // --- Owner Notifications ---
    let targetOwnerPhones: string[] = [];

    // Prioritize dynamically fetching all active owners for this business
    if (data.businessId || storeId) {
        let query = supabase.from('employees').select('phone').eq('role', 'owner').is('deleted_at', null).not('phone', 'is', null);
        if (data.businessId) query = query.eq('business_id', data.businessId);

        const { data: owners } = await query;
        if (owners && owners.length > 0) {
            // Extract unique phones
            targetOwnerPhones = Array.from(new Set(owners.map(o => o.phone).filter(p => !!p)));
        }
    }

    // Fallback if no owners found but legacy parameter passed
    if (targetOwnerPhones.length === 0 && data.ownerPhone) {
        targetOwnerPhones.push(data.ownerPhone);
    }

    if (targetOwnerPhones.length > 0) {
        let msg = '';
        if (type === 'sale') {
            const template = config.templates.ownerSale || "New sale: GHS {Amount} by {Name}.";
            msg = template
                .replace(/{Amount}/g, Number(data.amount).toFixed(2))
                .replace(/{Name}/g, data.customerName || 'Customer')
                .replace(/{TotalOrders}/g, (data.totalOrders || '0').toString())
                .replace(/{Receipt}/g, (data.id || '').toString())
                .replace(/{Staff}/g, data.staffName || 'Staff');
        }

        if (msg) {
            for (const phone of targetOwnerPhones) {
                if (owner.sms) await sendDirectMessage(phone, msg, ['sms'], storeId, data.businessId);
                if (owner.whatsapp) await sendDirectMessage(phone, msg, ['whatsapp'], storeId, data.businessId);
            }
        }
    }

    return true;
};




export const sendLowStockAlert = async (product: { name: string; stock: number }, storeId: string, ownerPhone: string, businessId?: string) => {
    const config = getSMSConfig();
    const { automations } = config;

    if (!automations?.lowStockAlert?.enabled) {
        return;
    }

    if (product.stock > automations.lowStockAlert.threshold) {
        return;
    }

    const template = config.templates.lowStockAlert || "Low Stock Alert: {Product} has only {Stock} left! Please restock.";
    let message = template
        .replace(/{Product}/g, product.name)
        .replace(/{product}/g, product.name)
        .replace(/{Stock}/g, product.stock.toString())
        .replace(/{stock}/g, product.stock.toString());

    console.log(`[LowStockAlert] Sending alert for ${product.name} (stock: ${product.stock})`);

    // Fetch all owner phones for this business
    let ownerPhones: string[] = [];
    if (businessId) {
        const { data: owners } = await supabase
            .from('employees')
            .select('phone')
            .eq('business_id', businessId)
            .eq('role', 'owner')
            .is('deleted_at', null)
            .not('phone', 'is', null);
        if (owners && owners.length > 0) {
            ownerPhones = Array.from(new Set(owners.map(o => o.phone).filter(p => !!p)));
        }
    }
    // Fallback to passed ownerPhone
    if (ownerPhones.length === 0 && ownerPhone) ownerPhones.push(ownerPhone);

    for (const phone of ownerPhones) {
        if (automations.lowStockAlert.sms) {
            await sendDirectMessage(phone, message, ['sms'], storeId);
        }
        if (automations.lowStockAlert.whatsapp) {
            await sendDirectMessage(phone, message, ['whatsapp'], storeId);
        }
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
                console.error(`[SMS] mNotify Balance Check Failed: ${res.status} ${res.statusText}`);
                if (res.status === 401) console.error("[SMS] Please verify your mNotify API Key.");
                return 0;
            }

            const data = await res.json();
            return parseFloat(data?.balance || '0');
        } catch (e) {
            console.error("[SMS] Failed to fetch mNotify balance", e);
            return 0;
        }
    }

    return 0;
};
