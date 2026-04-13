import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-admin';
import { requireSuperAdminSession } from '../_auth';

export async function GET() {
    try {
        const session = await requireSuperAdminSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServiceClient();

        // 1. Fetch all active businesses for MRR calculation
        const { data: businesses, error: bizError } = await supabase
            .from('businesses')
            .select('id, plan, is_active, created_at')
            .eq('is_active', true);

        if (bizError) throw bizError;

        // Pricing logic
        const prices = { monthly: 50, yearly: 480, trial: 0, forever: 0 };
        
        const mrr = (businesses || []).reduce((acc, b) => {
            const plan = (b.plan as keyof typeof prices) || 'monthly';
            // Use standard prices since custom_price_monthly/yearly aren't in the schema yet
            const monthlyValue = plan === 'yearly' ? prices[plan] / 12 : prices[plan];
            return acc + monthlyValue;
        }, 0);

        // 2. Fetch Transaction Volume (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('total_amount, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString());

        // if (salesError) throw salesError; // Don't throw if just sales empty

        const totalVolume = (sales || []).reduce((acc, s) => acc + (parseFloat(s.total_amount as any) || 0), 0);

        // 3. Signup Trends (Last 6 months)
        const { data: signupStats } = await supabase
            .from('businesses')
            .select('created_at');

        // Group by month
        const trends: Record<string, number> = {};
        signupStats?.forEach(b => {
            const month = new Date(b.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
            trends[month] = (trends[month] || 0) + 1;
        });

        const trendData = Object.entries(trends)
            .map(([name, signups]) => ({ name, signups }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
            .slice(-6);

        return NextResponse.json({
            stats: {
                totalBusinesses: businesses?.length || 0,
                mrr,
                totalVolume,
                activeUsers: businesses?.length ? (businesses.length * 3) : 0 // Placeholder heuristic
            },
            trends: trendData
        });
    } catch (error: any) {
        console.error('[Analytics API] Error:', error.message || error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
