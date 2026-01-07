
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cwieywlveahchulsswnq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Uwy8CIGirDu1JYVZ0gwmsw_VH5OMJ8z';

export const supabase = createClient(supabaseUrl, supabaseKey);
