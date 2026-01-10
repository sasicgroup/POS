'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Fetch expenses for a store
const fetchExpenses = async (storeId: string) => {
    console.log('[React Query] Fetching expenses for store:', storeId);

    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('date', { ascending: false });

    if (error) {
        console.error('[React Query] Error fetching expenses:', error);
        throw error;
    }

    console.log('[React Query] Fetched expenses:', data.length);
    return data;
};

// Hook to use expenses with React Query
export function useExpenses() {
    const { activeStore } = useAuth();
    const queryClient = useQueryClient();

    const {
        data: expenses = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['expenses', activeStore?.id],
        queryFn: () => fetchExpenses(activeStore!.id),
        enabled: !!activeStore?.id,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000,
    });

    // Mutation for adding an expense
    const addExpenseMutation = useMutation({
        mutationFn: async (expense: any) => {
            const { data, error } = await supabase.from('expenses').insert({
                store_id: activeStore!.id,
                category: expense.category,
                amount: expense.amount,
                description: expense.description,
                date: expense.date || new Date().toISOString().split('T')[0],
            }).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses', activeStore?.id] });
        },
    });

    // Mutation for updating an expense
    const updateExpenseMutation = useMutation({
        mutationFn: async (expense: any) => {
            const { error } = await supabase.from('expenses').update({
                category: expense.category,
                amount: expense.amount,
                description: expense.description,
                date: expense.date,
            }).eq('id', expense.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses', activeStore?.id] });
        },
    });

    // Mutation for deleting an expense
    const deleteExpenseMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses', activeStore?.id] });
        },
    });

    return {
        expenses,
        isLoading,
        error,
        refetch,
        addExpense: addExpenseMutation.mutateAsync,
        updateExpense: updateExpenseMutation.mutateAsync,
        deleteExpense: deleteExpenseMutation.mutateAsync,
        isAddingExpense: addExpenseMutation.isPending,
        isUpdatingExpense: updateExpenseMutation.isPending,
        isDeletingExpense: deleteExpenseMutation.isPending,
    };
}
