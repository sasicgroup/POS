import { supabase } from './supabase';

export type AdminAction = 
  | 'LOGIN' 
  | 'VIEW_AS' 
  | 'UPDATE_BUSINESS' 
  | 'TOGGLE_BUSINESS' 
  | 'RENEW_SUBSCRIPTION' 
  | 'SMS_CREDIT_ADD' 
  | 'CREATE_BROADCAST' 
  | 'UPDATE_PLATFORM_SETTINGS';

/**
 * Logs a Super Admin action for audit and compliance.
 */
export async function logAdminAction(
  adminId: string,
  action: AdminAction,
  details: any = {},
  targetBusinessId?: string
) {
  try {
    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      details,
      target_business_id: targetBusinessId,
      created_at: new Date().toISOString()
    });

    if (error) {
       // Silently fail to not block the main action, but log for dev
       console.error('[Admin Logger] Failed to log action:', error.message);
    }
  } catch (e) {
    console.error('[Admin Logger] Error:', e);
  }
}
