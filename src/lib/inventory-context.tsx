'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface InventoryContextType {
    products: Product[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredProducts: Product[];
    activeCategories: string[];
    setActiveCategories: (categories: string[]) => void;
    businessTypes: string[];
    availableBusinessTypes: string[];
    addCustomBusinessType: (type: string) => void;
    updateBusinessType: (oldType: string, newType: string) => void;
    deleteBusinessType: (type: string) => void;
    toggleBusinessType: (type: string) => void;
    customCategories: string[];
    addCustomCategory: (category: string) => void;
    updateCustomCategory: (oldCategory: string, newCategory: string) => void;
    removeCustomCategory: (category: string) => void;
    refreshProducts: () => Promise<void>;
    processSale: (saleData: any) => Promise<any>;
    addProduct: (product: any) => Promise<void>;
    deleteProduct: (id: any) => Promise<void>;
    updateProduct: (product: any) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const { activeStore, user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['All']);

    // UI states
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [availableBusinessTypes, setAvailableBusinessTypes] = useState<string[]>([
        "Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"
    ]);

    const addCustomBusinessType = (type: string) => {
        if (!availableBusinessTypes.includes(type)) {
            setAvailableBusinessTypes([...availableBusinessTypes, type]);
        }
    };

    const updateBusinessType = (oldType: string, newType: string) => {
        setAvailableBusinessTypes(prev => prev.map(t => t === oldType ? newType : t));
        setBusinessTypes(prev => prev.map(t => t === oldType ? newType : t));
    };

    const deleteBusinessType = (type: string) => {
        setAvailableBusinessTypes(prev => prev.filter(t => t !== type));
        setBusinessTypes(prev => prev.filter(t => t !== type));
    };

    const updateCustomCategory = (oldCategory: string, newCategory: string) => {
        setCustomCategories(prev => prev.map(c => c === oldCategory ? newCategory : c));
        setActiveCategories(prev => prev.map(c => c === oldCategory ? newCategory : c));
    };

    useEffect(() => {
        if (activeStore?.id) {
            fetchProducts();
        } else {
            setProducts([]);
        }
    }, [activeStore?.id]);

    const fetchProducts = async () => {
        if (!activeStore?.id) return;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', activeStore.id);

        if (error) {
            console.error('Error fetching products:', error);
        } else if (data) {
            // Map database snake_case to frontend camelCase
            const mappedProducts = data.map((p: any) => ({
                ...p,
                costPrice: p.cost_price || 0,
                // Ensure other fields are present or default
                status: p.status || 'In Stock',
                video: p.video || '',
                image: p.image || ''
            }));
            setProducts(mappedProducts);
        }
    };

    const addProduct = async (product: any) => {
        if (!activeStore?.id) return;

        // Optimistic update (with temporary ID)
        const tempId = Date.now();
        const newProduct = { ...product, id: tempId, store_id: activeStore.id };
        setProducts(prev => [...prev, newProduct]);

        const { data, error } = await supabase.from('products').insert({
            store_id: activeStore.id,
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

        if (error) {
            console.error("Error adding product:", error);
            // Revert optimistic update on error
            setProducts(prev => prev.filter(p => p.id !== tempId));
        } else if (data) {
            // Replace temp product with real one and map back
            const mappedProduct = {
                ...data,
                costPrice: data.cost_price || 0,
                status: data.status || 'In Stock',
                video: data.video || '',
                image: data.image || ''
            };
            setProducts(prev => prev.map(p => p.id === tempId ? mappedProduct : p));
        }
    };

    const updateProduct = async (product: any) => {
        if (!activeStore?.id) return;

        // Optimistic update
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));

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

        if (error) {
            console.error("Error updating product:", error);
            fetchProducts();
        }
    };

    const deleteProduct = async (id: any) => {
        // Optimistic delete
        setProducts(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
            console.error("Error deleting product:", error);
            fetchProducts();
        }
    };

    const processSale = async (saleData: any) => {
        if (!activeStore?.id) return null;

        // 1. Handle Customer (Find or Create)
        let customerId = null;
        if (saleData.customer && saleData.customer.phone) {
            // Check if exists
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('store_id', activeStore.id)
                .eq('phone', saleData.customer.phone)
                .single();

            if (existing) {
                customerId = existing.id;
            } else {
                // Create new
                const { data: newCustomer } = await supabase.from('customers').insert({
                    store_id: activeStore.id,
                    name: saleData.customer.name || 'Unknown',
                    phone: saleData.customer.phone,
                    total_spent: 0,
                    points: 0
                }).select().single();
                if (newCustomer) customerId = newCustomer.id;
            }
        }

        // 2. Insert Sale
        const { data: sale, error: saleError } = await supabase.from('sales').insert({
            store_id: activeStore.id,
            total_amount: saleData.totalAmount,
            payment_method: saleData.paymentMethod,
            employee_id: user?.id,
            customer_id: customerId,
            status: 'completed'
        }).select().single();

        if (saleError || !sale) {
            console.error("Sale insert failed", saleError);
            return null;
        }

        // 3. Insert Sale Items
        if (saleData.items && saleData.items.length > 0) {
            const saleItems = saleData.items.map((item: any) => ({
                sale_id: sale.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_sale: item.price,
                subtotal: item.quantity * item.price
            }));
            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) console.error("Sale items insert failed", itemsError);

            // 4. Update Stock (Local & DB)
            // Optimistic update
            setProducts(prev => prev.map(p => {
                const item = saleData.items.find((i: any) => i.id === p.id);
                if (item) {
                    return { ...p, stock: p.stock - item.quantity };
                }
                return p;
            }));

            // DB Update loop (Sequential to be safe)
            for (const item of saleData.items) {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    await supabase.from('products')
                        .update({ stock: product.stock - item.quantity })
                        .eq('id', item.id);
                }
            }
        }

        return sale.id;
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategories.includes('All') || activeCategories.includes(product.category);
        return matchesSearch && matchesCategory;
    });

    const toggleBusinessType = (type: string) => {
        setBusinessTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const addCustomCategory = (category: string) => {
        if (!customCategories.includes(category)) {
            setCustomCategories([...customCategories, category]);
        }
    };

    const removeCustomCategory = (category: string) => {
        setCustomCategories(customCategories.filter(c => c !== category));
    };

    return (
        <InventoryContext.Provider value={{
            products,
            searchQuery,
            setSearchQuery,
            filteredProducts,
            activeCategories,
            setActiveCategories,
            businessTypes,
            availableBusinessTypes,
            addCustomBusinessType,
            updateBusinessType,
            deleteBusinessType,
            toggleBusinessType,
            customCategories,
            addCustomCategory,
            updateCustomCategory,
            removeCustomCategory,
            refreshProducts: fetchProducts,
            processSale,
            addProduct,
            deleteProduct,
            updateProduct
        }}>
            {children}
        </InventoryContext.Provider>
    );
}

export function useInventory() {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
}
