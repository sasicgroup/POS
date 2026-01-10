'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Fetch sales for a store
const fetchSales = async (storeId: string) => {
    console.log('[React Query] Fetching sales for store:', storeId);

    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            customers (name),
            employees (name)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[React Query] Error fetching sales:', error);
        throw error;
    }

    console.log('[React Query] Fetched sales:', data.length);
    return data;
};

// Hook to use sales with React Query
export function useSales() {
    const { activeStore } = useAuth();
    const queryClient = useQueryClient();

    const {
        data: sales = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['sales', activeStore?.id],
        queryFn: () => fetchSales(activeStore!.id),
        enabled: !!activeStore?.id,
        staleTime: 2 * 60 * 1000, // 2 minutes - sales change frequently
        gcTime: 5 * 60 * 1000,
    });

    // Mutation for deleting a sale
    const deleteSaleMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('sales').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales', activeStore?.id] });
        },
    });

    return {
        sales,
        isLoading,
        error,
        refetch,
        deleteSale: deleteSaleMutation.mutateAsync,
        isDeletingSale: deleteSaleMutation.isPending,
    };
}
