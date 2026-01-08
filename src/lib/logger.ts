
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

        const { error } = await supabase.from('activity_logs').insert({
            action,
            details,
            user_id: safeUserId,
            store_id: safeStoreId
        });

        if (error) {
            console.error('Failed to log activity:', error);
        }
    } catch (e) {
        console.error('Logging error:', e);
    }
};
