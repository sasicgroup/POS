
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
            email: boolean;
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
    };
}

// Mock storage for config (in a real app, this would be in a DB)
let smsConfig: SMSConfig = {
    provider: 'hubtel',
    whatsappProvider: 'meta',
    hubtel: { clientId: '', clientSecret: '', senderId: 'STORE' },
    mnotify: { apiKey: '', senderId: 'STORE' },
    meta: { accessToken: '', phoneNumberId: '', businessAccountId: '' },
    notifications: {
        owner: { sms: true, email: true, whatsapp: false },
        customer: { sms: true, whatsapp: false }
    },
    templates: {
        welcome: "Welcome {Name}! You have been registered. Shop with us to earn points.",
        receipt: "Thanks for buying! Total: GHS {Amount}. See you soon!"
    }
};

export const getSMSConfig = (): SMSConfig => {
    // In client-side logic, we might need to read this from localStorage or context
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

export const updateSMSConfig = (config: SMSConfig) => {
    smsConfig = config;
    if (typeof window !== 'undefined') {
        localStorage.setItem('sms_config', JSON.stringify(config));
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
        schedule_date: ""
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

export const sendNotification = async (type: 'sale' | 'welcome', data: any) => {
    const config = getSMSConfig();

    console.log(`[SMS Module] Processing ${type} notification via ${config.provider}...`);

    let message = '';
    let phone = '';

    if (type === 'welcome') {
        if (data.customerPhone) {
            phone = data.customerPhone;
            message = config.templates.welcome || "Welcome {Name}! You have been registered.";
            message = message.replace('{Name}', data.customerName || 'Customer');
        }
    } else if (type === 'sale') {
        if (data.customerPhone) {
            phone = data.customerPhone;
            message = config.templates.receipt || "Thanks for buying! Total: GHS {Amount}.";
            message = message.replace('{Amount}', data.amount);
            message = message.replace('{Id}', data.id);
            message = message.replace('{PointsEarned}', data.pointsEarned || '0');
            message = message.replace('{TotalPoints}', data.totalPoints || '0');
        }
    }

    if (phone && message) {
        // Send SMS if enabled
        if (config.notifications.customer.sms) {
            console.log(`[SMS Module] Sending SMS to ${phone}: "${message}"`);
            if (config.provider === 'hubtel') {
                await sendHubtelSMS(config, phone, message);
            } else if (config.provider === 'mnotify') {
                await sendMNotifySMS(config, phone, message);
            }
        }

        // Send WhatsApp if enabled
        if (config.notifications.customer.whatsapp) {
            console.log(`[SMS Module] Sending WhatsApp to ${phone}: "${message}"`);
            if (config.meta?.accessToken) {
                await sendMetaWhatsApp(config, phone, message);
            } else {
                console.warn('[SMS Module] WhatsApp enabled but Meta credentials missing');
            }
        }
    }

    return true;
};
