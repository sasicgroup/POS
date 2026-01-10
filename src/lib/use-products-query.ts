'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

interface Product {
    id: any;
    name: string;
    category: string;
    price: number;
    stock: number;
    sku: string;
    image: string;
    costPrice?: number;
    status?: string;
    video?: string;
}

// Fetch products for a store
const fetchProducts = async (storeId: string): Promise<Product[]> => {
    console.log('[React Query] Fetching products for store:', storeId);

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId);

    if (error) {
        console.error('[React Query] Error fetching products:', error);
        throw error;
    }

    const mappedProducts = data.map((p: any) => ({
        ...p,
        costPrice: p.cost_price || 0,
        status: p.status || 'In Stock',
        video: p.video || '',
        image: p.image || ''
    }));

    console.log('[React Query] Fetched products:', mappedProducts.length);
    return mappedProducts;
};

// Hook to use products with React Query
export function useProducts() {
    const { activeStore } = useAuth();
    const queryClient = useQueryClient();

    // Query for fetching products
    const {
        data: products = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['products', activeStore?.id],
        queryFn: () => fetchProducts(activeStore!.id),
        enabled: !!activeStore?.id, // Only run if we have a store
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    // Mutation for adding a product
    const addProductMutation = useMutation({
        mutationFn: async (product: any) => {
            const { data, error } = await supabase.from('products').insert({
                store_id: activeStore!.id,
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                sku: product.sku,
                image: product.image,
                video: product.video,
                status: product.status,
                cost_price: product.costPrice
            }).select().single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch products
            queryClient.invalidateQueries({ queryKey: ['products', activeStore?.id] });
        },
    });

    // Mutation for updating a product
    const updateProductMutation = useMutation({
        mutationFn: async (product: any) => {
            const { error } = await supabase.from('products').update({
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                sku: product.sku,
                image: product.image,
                video: product.video,
                status: product.status,
                cost_price: product.costPrice
            }).eq('id', product.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products', activeStore?.id] });
        },
    });

    // Mutation for deleting a product
    const deleteProductMutation = useMutation({
        mutationFn: async (id: any) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products', activeStore?.id] });
        },
    });

    return {
        products,
        isLoading,
        error,
        refetch,
        addProduct: addProductMutation.mutateAsync,
        updateProduct: updateProductMutation.mutateAsync,
        deleteProduct: deleteProductMutation.mutateAsync,
        isAddingProduct: addProductMutation.isPending,
        isUpdatingProduct: updateProductMutation.isPending,
        isDeletingProduct: deleteProductMutation.isPending,
    };
}
