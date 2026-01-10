'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Fetch customers for a store
const fetchCustomers = async (storeId: string) => {
    console.log('[React Query] Fetching customers for store:', storeId);

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[React Query] Error fetching customers:', error);
        throw error;
    }

    console.log('[React Query] Fetched customers:', data.length);
    return data;
};

// Hook to use customers with React Query
export function useCustomers() {
    const { activeStore } = useAuth();
    const queryClient = useQueryClient();

    const {
        data: customers = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['customers', activeStore?.id],
        queryFn: () => fetchCustomers(activeStore!.id),
        enabled: !!activeStore?.id,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000,
    });

    // Mutation for adding a customer
    const addCustomerMutation = useMutation({
        mutationFn: async (customer: any) => {
            const { data, error } = await supabase.from('customers').insert({
                store_id: activeStore!.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                points: customer.points || 0,
                total_spent: customer.total_spent || 0,
                total_visits: customer.total_visits || 0,
            }).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] });
        },
    });

    // Mutation for updating a customer
    const updateCustomerMutation = useMutation({
        mutationFn: async (customer: any) => {
            const { error } = await supabase.from('customers').update({
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                points: customer.points,
                total_spent: customer.total_spent,
                total_visits: customer.total_visits,
            }).eq('id', customer.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] });
        },
    });

    // Mutation for deleting a customer
    const deleteCustomerMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] });
        },
    });

    return {
        customers,
        isLoading,
        error,
        refetch,
        addCustomer: addCustomerMutation.mutateAsync,
        updateCustomer: updateCustomerMutation.mutateAsync,
        deleteCustomer: deleteCustomerMutation.mutateAsync,
        isAddingCustomer: addCustomerMutation.isPending,
        isUpdatingCustomer: updateCustomerMutation.isPending,
        isDeletingCustomer: deleteCustomerMutation.isPending,
    };
}
