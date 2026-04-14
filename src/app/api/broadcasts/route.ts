import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    const supabase = createServiceClient();

    try {
        const now = new Date().toISOString();
        
        // Fetch active broadcasts
        const { data: broadcasts, error } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('is_active', true)
            .lte('starts_at', now)
            .or(`ends_at.is.null,ends_at.gte.${now}`);

        if (error) throw error;

        // Filter by target plan if needed (client side or here)
        // For now return all active ones and let client filter if specific plans are targeted.

        return NextResponse.json({ broadcasts: broadcasts || [] });
    } catch (error: any) {
        console.error('[Broadcast API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
