'use server';

import { HubtelConfig, HubtelPaymentRequest, HubtelPaymentResponse } from '@/lib/hubtel';

export async function initiateHubtelPaymentAction(
    config: HubtelConfig,
    paymentRequest: HubtelPaymentRequest
): Promise<HubtelPaymentResponse> {
    try {
        if (!config.enabled) {
            return { success: false, error: 'Hubtel payment is not enabled.' };
        }
        if (!config.api_id || !config.api_key) {
            return { success: false, error: 'Hubtel API credentials are missing.' };
        }

        const authHeader = 'Basic ' + Buffer.from(`${config.api_id}:${config.api_key}`).toString('base64');
        const apiUrl = 'https://api-v2.hubtel.com/merchantaccount/onlinecheckout/items/initiate';

        const payload = {
            totalAmount: paymentRequest.amount,
            description: paymentRequest.description,
            callbackUrl: paymentRequest.callbackUrl,
            returnUrl: paymentRequest.callbackUrl, // Or a dedicated return page
            cancellationUrl: paymentRequest.callbackUrl,
            clientReference: paymentRequest.clientReference,
            customerName: paymentRequest.customerName,
            customerMsisdn: paymentRequest.customerPhone,
            customerEmail: '',
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Hubtel Server] Payment initialization failed:', data);
            return { success: false, error: data.message || 'Failed to initialize payment' };
        }

        return {
            success: true,
            transactionId: data.transactionId,
            checkoutUrl: data.checkoutUrl,
            message: 'Payment initialized successfully'
        };
    } catch (error: any) {
        console.error('[Hubtel Server] Error:', error);
        return { success: false, error: error.message || 'Server error initializing payment' };
    }
}
