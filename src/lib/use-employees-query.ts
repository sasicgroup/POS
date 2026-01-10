'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

// Fetch employees for a store
const fetchEmployees = async (storeId: string) => {
    console.log('[React Query] Fetching employees for store:', storeId);

    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[React Query] Error fetching employees:', error);
        throw error;
    }

    console.log('[React Query] Fetched employees:', data.length);
    return data;
};

// Hook to use employees with React Query
export function useEmployees() {
    const { activeStore } = useAuth();
    const queryClient = useQueryClient();

    const {
        data: employees = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['employees', activeStore?.id],
        queryFn: () => fetchEmployees(activeStore!.id),
        enabled: !!activeStore?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes - employees don't change often
        gcTime: 15 * 60 * 1000,
    });

    // Mutation for adding an employee
    const addEmployeeMutation = useMutation({
        mutationFn: async (employee: any) => {
            const { data, error } = await supabase.from('employees').insert({
                store_id: activeStore!.id,
                name: employee.name,
                username: employee.username,
                phone: employee.phone,
                role: employee.role,
                pin: employee.pin,
                salary: employee.salary,
                avatar: employee.avatar,
                otp_enabled: employee.otp_enabled,
                shift_start: employee.shift_start,
                shift_end: employee.shift_end,
                work_days: employee.work_days,
            }).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees', activeStore?.id] });
        },
    });

    // Mutation for updating an employee
    const updateEmployeeMutation = useMutation({
        mutationFn: async (employee: any) => {
            const { error } = await supabase.from('employees').update({
                name: employee.name,
                username: employee.username,
                phone: employee.phone,
                role: employee.role,
                pin: employee.pin,
                salary: employee.salary,
                avatar: employee.avatar,
                otp_enabled: employee.otp_enabled,
                shift_start: employee.shift_start,
                shift_end: employee.shift_end,
                work_days: employee.work_days,
            }).eq('id', employee.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees', activeStore?.id] });
        },
    });

    // Mutation for deleting an employee
    const deleteEmployeeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees', activeStore?.id] });
        },
    });

    return {
        employees,
        isLoading,
        error,
        refetch,
        addEmployee: addEmployeeMutation.mutateAsync,
        updateEmployee: updateEmployeeMutation.mutateAsync,
        deleteEmployee: deleteEmployeeMutation.mutateAsync,
        isAddingEmployee: addEmployeeMutation.isPending,
        isUpdatingEmployee: updateEmployeeMutation.isPending,
        isDeletingEmployee: deleteEmployeeMutation.isPending,
    };
}
