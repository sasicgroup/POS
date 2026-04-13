
import { supabase } from './supabase';

export const logActivity = async (
    action: string,
    details: any,
    userId?: string,
    storeId?: string
) => {
    try {
        // If no userId provided, try to get from localStorage (client-side only)
        let effectiveUserId = userId;
        if (!effectiveUserId && typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('sms_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                effectiveUserId = user.id;
            }
        }

        // If no storeId provided, try to get from localStorage
        let effectiveStoreId = storeId;
        if (!effectiveStoreId && typeof window !== 'undefined') {
            const storedStoreId = localStorage.getItem('sms_active_store_id');
            if (storedStoreId) {
                effectiveStoreId = storedStoreId;
            }
        }

        // Skip logging if we still don't have a user (unless it's a specialized system event)
        if (!effectiveUserId && action !== 'LOGIN_ATTEMPT') {
            // console.warn('Activity log skipped: No user ID');
            // return; 
            // actually, we might want to log even anonymous actions if needed, but for now strict.
        }

        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const safeUserId = effectiveUserId && isUUID(effectiveUserId) ? effectiveUserId : null;
        const safeStoreId = effectiveStoreId && isUUID(effectiveStoreId) ? effectiveStoreId : null;

        // Get Business ID
        let businessId = null;
        if (typeof window !== 'undefined') {
            businessId = localStorage.getItem('sms_business_id');
        }

        const logData: any = {
            action,
            details,
            user_id: safeUserId,
            store_id: safeStoreId
        };
        
        if (businessId && isUUID(businessId)) {
            logData.business_id = businessId;
        }

        const { error } = await supabase.from('activity_logs').insert(logData);

        if (error) {
            // Fallback: If business_id column is missing, retry without it
            if (error.code === '42703' && logData.business_id) {
                delete logData.business_id;
                const { error: retryError } = await supabase.from('activity_logs').insert(logData);
                if (retryError) {
                    console.error('Failed to log activity (fallback):', retryError.message, retryError.details);
                }
            } else {
                console.error('Failed to log activity:', error.message, error.code, error.details);
            }
        }
    } catch (e: any) {
        console.error('Logging error:', e?.message || e);
    }
};
