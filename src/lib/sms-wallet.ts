import { supabase } from './supabase';

/**
 * Deducts a set amount of credits from a business wallet.
 * This is used for "Platform Managed" SMS billing.
 */
export async function deductSMSCredit(businessId: string, messageCount: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get wholesale price from platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'sms_pricing')
      .single();
    
    const pricePerSms = settings?.value?.price_per_sms || 0.05;
    const totalCost = messageCount * pricePerSms;

    // 2. Fetch current balance
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('sms_balance')
      .eq('id', businessId)
      .single();

    if (bizError || !business) return { success: false, error: 'Business not found' };
    
    const currentBalance = parseFloat(business.sms_balance as any) || 0;

    if (currentBalance < totalCost) {
      return { success: false, error: 'Insufficient SMS balance' };
    }

    // 3. Deduct balance
    const newBalance = currentBalance - totalCost;
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ sms_balance: newBalance })
      .eq('id', businessId);

    if (updateError) return { success: false, error: 'Update failed' };

    // 4. Log transaction
    await supabase.from('sms_transactions').insert({
      business_id: businessId,
      amount: -totalCost,
      type: 'usage',
      description: `SMS Multi-delivery (${messageCount} segments)`,
      metadata: { price_per_sms: pricePerSms, segments: messageCount }
    });

    return { success: true };
  } catch (e: any) {
    console.error('[SMS Wallet] Error deducting credit:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Adds credits to a business wallet (Super Admin action).
 */
export async function depositSMSCredit(businessId: string, amount: number, adminId: string, note?: string): Promise<boolean> {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('sms_balance')
      .eq('id', businessId)
      .single();

    const currentBalance = parseFloat(business?.sms_balance as any) || 0;
    
    await supabase.from('businesses').update({
      sms_balance: currentBalance + amount
    }).eq('id', businessId);

    await supabase.from('sms_transactions').insert({
      business_id: businessId,
      amount: amount,
      type: 'deposit',
      description: note || 'Credit top-up by Super Admin',
      metadata: { admin_id: adminId }
    });

    return true;
  } catch (err) {
    console.error('[SMS Wallet] Deposit failed:', err);
    return false;
  }
}
