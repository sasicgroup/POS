'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Fetch dashboard stats for a store
const fetchDashboardStats = async (storeId: string) => {
    console.log('[React Query] Fetching dashboard stats for store:', storeId);

    // Fetch all data in parallel
    const [salesData, productsData, customersData] = await Promise.all([
        supabase
            .from('sales')
            .select('total_amount, created_at')
            .eq('store_id', storeId),
        supabase
            .from('products')
            .select('stock, price, cost_price')
            .eq('store_id', storeId),
        supabase
            .from('customers')
            .select('id')
            .eq('store_id', storeId),
    ]);

    if (salesData.error) throw salesData.error;
    if (productsData.error) throw productsData.error;
    if (customersData.error) throw customersData.error;

    // Calculate stats
    const sales = salesData.data || [];
    const products = productsData.data || [];
    const customers = customersData.data || [];

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalOrders = sales.length;
    const totalCustomers = customers.length;

    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = sales
        .filter(sale => new Date(sale.created_at) >= today)
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

    // Calculate inventory value
    const inventoryValue = products.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0);
    const lowStockCount = products.filter(p => p.stock <= 10).length;

    console.log('[React Query] Dashboard stats calculated');

    return {
        totalRevenue,
        totalOrders,
        totalCustomers,
        todayRevenue,
        inventoryValue,
        lowStockCount,
        recentSales: sales.slice(0, 10),
    };
};

// Hook to use dashboard stats with React Query
export function useDashboardStats() {
    const { activeStore } = useAuth();

    const {
        data: stats,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['dashboard-stats', activeStore?.id],
        queryFn: () => fetchDashboardStats(activeStore!.id),
        enabled: !!activeStore?.id,
        staleTime: 1 * 60 * 1000, // 1 minute - dashboard should be relatively fresh
        cacheTime: 5 * 60 * 1000,
        refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    });

    return {
        stats: stats || {
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            todayRevenue: 0,
            inventoryValue: 0,
            lowStockCount: 0,
            recentSales: [],
        },
        isLoading,
        error,
        refetch,
    };
}
