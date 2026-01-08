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
    isLoading: boolean;
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
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['All']);

    // Cache state
    const [productsCache, setProductsCache] = useState<{
        data: Product[];
        timestamp: number | null;
        storeId: string | null;
    }>({
        data: [],
        timestamp: null,
        storeId: null
    });
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
            // Check if we have valid cache for this store
            const isCacheValid =
                productsCache.storeId === activeStore.id &&
                productsCache.timestamp &&
                Date.now() - productsCache.timestamp < CACHE_TTL;

            if (isCacheValid) {
                console.log('[Inventory] Using cached products');
                setProducts(productsCache.data);
                setIsLoading(false);
            } else {
                console.log('[Inventory] Cache miss or stale, fetching fresh data');
                fetchProducts();
            }
        } else {
            setProducts([]);
            setIsLoading(false); // Ensure loading stops when no store
        }
    }, [activeStore?.id]);

    const fetchProducts = async (retry = true) => {
        if (!activeStore?.id) {
            console.log('[Inventory] No active store, stopping load');
            setIsLoading(false);
            return;
        }

        console.log('[Inventory] Fetching products for store:', activeStore.id);
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id);

            if (error) {
                console.error('[Inventory] Error fetching products:', error);
                throw error;
            } else if (data) {
                console.log('[Inventory] Fetched products:', data.length);
                const mappedProducts = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));
                setProducts(mappedProducts);

                // Update cache
                setProductsCache({
                    data: mappedProducts,
                    timestamp: Date.now(),
                    storeId: activeStore.id
                });

                setIsLoading(false);
            }
        } catch (err: any) {
            console.error('[Inventory] Unexpected error fetching products:', err);
            // Simple retry logic
            if (retry) {
                console.log('[Inventory] Retrying fetch in 2s...');
                setTimeout(() => fetchProducts(false), 2000);
                return; // Don't set loading false yet, retry will handle it
            } else {
                setProducts([]);
                setIsLoading(false);
            }
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

            // Invalidate cache to force fresh fetch next time
            setProductsCache(prev => ({ ...prev, timestamp: null }));
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
        } else {
            // Invalidate cache
            setProductsCache(prev => ({ ...prev, timestamp: null }));
        }
    };

    const deleteProduct = async (id: any) => {
        // Optimistic delete
        setProducts(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
            console.error("Error deleting product:", error);
            fetchProducts();
        } else {
            // Invalidate cache
            setProductsCache(prev => ({ ...prev, timestamp: null }));
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

        // --- Fetch Loyalty Config ---
        let pointsEarned = 0;
        let loyaltyConfig = null;
        if (customerId) {
            const { data: config } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();

            if (config && config.enabled) {
                loyaltyConfig = config;
                const rate = config.points_per_currency || 1;
                pointsEarned = Math.floor(saleData.totalAmount * rate);
            }
        }

        // 2. Insert Sale
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const safeEmployeeId = user?.id && isUUID(user.id) ? user.id : null;

        const { data: sale, error: saleError } = await supabase.from('sales').insert({
            store_id: activeStore.id,
            total_amount: saleData.totalAmount,
            payment_method: saleData.paymentMethod,
            employee_id: safeEmployeeId,
            customer_id: customerId,
            status: 'completed'
        }).select().single();

        if (saleError || !sale) {
            console.error("Sale insert failed", JSON.stringify(saleError, null, 2));
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
                    const newStock = product.stock - item.quantity;
                    await supabase.from('products')
                        .update({ stock: newStock })
                        .eq('id', item.id);

                    // Create low stock notification if stock is low
                    if (newStock <= 10 && newStock > 0) {
                        await supabase.from('notifications').insert({
                            store_id: activeStore.id,
                            type: 'low_stock',
                            title: 'Low Stock Alert',
                            message: `${product.name} is running low (${newStock} items left).`,
                            metadata: { product_id: product.id, stock: newStock }
                        });
                    }
                }
            }
        }


        // 5. Update Customer Loyalty & Total Spent
        if (customerId) {
            // We need to fetch current customer stats first to be safe, or use RPC increment (safer)
            // For now, simpler read-modify-write as we are in a flow
            const { data: currentCust } = await supabase.from('customers').select('points, total_spent').eq('id', customerId).single();
            if (currentCust) {
                const newPoints = (currentCust.points || 0) + pointsEarned;
                const newTotalSpent = (currentCust.total_spent || 0) + saleData.totalAmount;

                await supabase.from('customers').update({
                    points: newPoints,
                    total_spent: newTotalSpent,
                    last_visit: new Date().toISOString()
                }).eq('id', customerId);

                // Log Loyalty Earned
                if (pointsEarned > 0) {
                    await supabase.from('loyalty_logs').insert({
                        store_id: activeStore.id,
                        customer_id: customerId,
                        points: pointsEarned,
                        type: 'earned',
                        description: `Earned from Sale #${sale.id.slice(0, 8)}`
                    });
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
            isLoading,
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
