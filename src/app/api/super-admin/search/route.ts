import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    const cookieStore = cookies();
    const adminSession = cookieStore.get('super_admin_session');

    if (!adminSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Search across Businesses
        const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, slug, owner_email, owner_phone')
            .or(`name.ilike.%${query}%,slug.ilike.%${query}%,owner_email.ilike.%${query}%`)
            .limit(10);

        // Search across Employees (Owners/Staff)
        const { data: employees } = await supabase
            .from('employees')
            .select('id, name, username, phone, business_id, role, stores(name)')
            .or(`name.ilike.%${query}%,username.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(10);

        // Search across Products
        const { data: products } = await supabase
            .from('products')
            .select('id, name, sku, price, business_id, stores(name)')
            .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
            .limit(10);

        // Search across Sales (Receipts)
        const { data: sales } = await supabase
            .from('sales')
            .select('id, receipt_number, total_amount, business_id, created_at, stores(name)')
            .or(`receipt_number.ilike.%${query}%`)
            .limit(10);

        return NextResponse.json({
            results: {
                businesses: businesses || [],
                employees: employees || [],
                products: products || [],
                sales: sales || []
            }
        });
    } catch (error: any) {
        console.error('[Search API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
