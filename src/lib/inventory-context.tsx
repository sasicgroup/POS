'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { sendLowStockAlert } from './sms';

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
    cart: any[];
    setCart: (cart: any[]) => void;
    addToCart: (product: any) => void;
    removeFromCart: (id: any) => void;
    updateCartQuantity: (id: any, delta: number) => void;
    setCartQuantity: (id: any, quantity: number) => void;
    clearCart: () => void;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    totalCount: number;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const { activeStore, user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['All']);
    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);

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

    const isFetching = useRef(false);

    const fetchProducts = React.useCallback(async (pageNum = 1, pageSizeNum = 20, retryCount = 0) => {
        if (!activeStore?.id) {
            setIsLoading(false);
            return;
        }

        // Prevent duplicate fetches
        if (isFetching.current) {
            console.log('[Inventory] Fetch already in progress, skipping duplicate call.');
            return;
        }

        console.log(`[Inventory] Fetching products for store: ${activeStore.id}, page: ${pageNum}, pageSize: ${pageSizeNum}, attempt: ${retryCount + 1}`);
        isFetching.current = true;
        setIsLoading(true);

        const startTime = Date.now();
        const TIMEOUT_MS = 30000; // 30 second timeout
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            // Use range for pagination
            const from = (pageNum - 1) * pageSizeNum;
            const to = from + pageSizeNum - 1;
            
            const { data, error, count } = await supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('store_id', activeStore.id)
                .range(from, to)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            if (error) {
                console.error(`[Inventory] Supabase error (duration: ${duration}ms):`, error.message || error);
                throw error;
            } else if (data) {
                console.log(`[Inventory] Fetched products: ${data.length}, Total: ${count}, Duration: ${duration}ms`);
                const mappedProducts = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));
                setProducts(mappedProducts);
                setTotalCount(count || 0);

                // Update cache
                setProductsCache({
                    data: mappedProducts,
                    timestamp: Date.now(),
                    storeId: activeStore.id
                });

                setIsLoading(false);
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            // Check for specific error types
            const isNetworkError = err.name === 'AbortError' || 
                                   err.message === 'Failed to fetch' || 
                                   err.message.includes('network') ||
                                   err.name === 'TypeError';
            
            console.error(`[Inventory] Error fetching products (duration: ${duration}ms, attempt: ${retryCount + 1}):`, err.message || err);
            
            // Retry with exponential backoff (max 3 attempts)
            const maxRetries = 3;
            if (retryCount < maxRetries && isNetworkError) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 1s, 2s, 4s max
                console.log(`[Inventory] Retrying fetch in ${delay}ms...`);
                isFetching.current = false; // Release lock for retry
                setTimeout(() => fetchProducts(pageNum, pageSizeNum, retryCount + 1), delay);
                return;
            } else {
                // Final failure - keep existing data if any, just stop loading
                console.log('[Inventory] Max retries reached or non-retryable error, keeping existing data');
                setIsLoading(false);
                
                // Invalidate cache so we try again on next mount
                setProductsCache(prev => ({ ...prev, timestamp: null }));
            }
        } finally {
            isFetching.current = false;
        }
    }, [activeStore?.id]);

    useEffect(() => {
        if (activeStore?.id) {
            // Check if we have valid cache for this store and page
            const isCacheValid =
                productsCache.storeId === activeStore.id &&
                productsCache.timestamp &&
                Date.now() - productsCache.timestamp < CACHE_TTL;

            if (isCacheValid) {
                console.log('[Inventory] Using cached products');
                setProducts(productsCache.data);
                setIsLoading(false);
            } else {
                fetchProducts(page, pageSize);
            }
        } else {
            setProducts([]);
            setIsLoading(false); // Ensure loading stops when no store
        }
    }, [activeStore?.id, page, pageSize, fetchProducts]);

    // Load Cart from LocalStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('sms_cart');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed)) {
                    setCart(parsed);
                }
            } catch (e) {
                console.error("Failed to parse cart from local storage", e);
            }
        }
    }, []);

    // Save Cart to LocalStorage whenever it changes
    useEffect(() => {
        try {
            // Minify cart to avoid quota issues
            const minimalCart = cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                sku: item.sku,
                image: (item.image && item.image.length > 500) ? undefined : item.image,
                category: item.category
            }));
            localStorage.setItem('sms_cart', JSON.stringify(minimalCart));
        } catch (error) {
            console.error("Failed to save cart to local storage:", error);
        }
    }, [cart]);



    const addProduct = React.useCallback(async (product: any) => {
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
    }, [activeStore?.id]);

    const updateProduct = React.useCallback(async (product: any) => {
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
    }, [activeStore?.id, fetchProducts]);

    const deleteProduct = React.useCallback(async (id: any) => {
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
    }, [fetchProducts]);

    const processSale = React.useCallback(async (saleData: any) => {
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

                    // Check for low stock and send SMS alert
                    if (newStock <= 10) {
                        // Create in-app notification
                        await supabase.from('notifications').insert({
                            store_id: activeStore.id,
                            type: 'low_stock',
                            title: 'Low Stock Alert',
                            message: `${product.name} is running low (${newStock} items left).`,
                            metadata: { product_id: product.id, stock: newStock }
                        });

                        // Send SMS alert to store owner (async, non-blocking)
                        sendLowStockAlert(
                            { name: product.name, stock: newStock },
                            activeStore.id,
                            activeStore.phone || ''
                        ).catch(err => console.error('Failed to send low stock SMS:', err));
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
    }, [activeStore?.id, user?.id, products]);

    const filteredProducts = products.filter(product => {
        const matchesSearch = (product.name && String(product.name).toLowerCase().includes(searchQuery.toLowerCase())) ||
            (product.sku && String(product.sku).toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = activeCategories.includes('All') || activeCategories.includes(product.category);
        return matchesSearch && matchesCategory;
    });

    const toggleBusinessType = (type: string) => {
        setBusinessTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // --- Cart Helpers ---
    const addToCart = React.useCallback((product: any) => {
        // Prevent adding items with 0 stock
        if (product.stock <= 0) {
            console.warn('Cannot add product with 0 stock to cart');
            return;
        }
        
        setCart(current => {
            const existing = current.find(item => item.id === product.id);
            if (existing) {
                // Check if adding would exceed available stock
                const newQty = existing.quantity + 1;
                const productInList = products.find(p => p.id === product.id);
                const maxStock = productInList?.stock || 0;
                
                if (newQty > maxStock) {
                    console.warn('Cannot add more than available stock');
                    return current;
                }
                
                return current.map(item =>
                    item.id === product.id ? { ...item, quantity: newQty } : item
                );
            }
            return [...current, {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                sku: product.sku,
                image: (product.image && product.image.length < 500) ? product.image : undefined,
                category: product.category,
                costPrice: product.costPrice,
                status: product.status
            }];
        });
    }, [products]);

    const removeFromCart = React.useCallback((id: any) => {
        setCart(current => current.filter(item => item.id !== id));
    }, []);

    const updateCartQuantity = React.useCallback((id: any, delta: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                const product = products.find(p => p.id === id);
                const maxStock = product?.stock || 0;
                const newQty = Math.max(1, Math.min(item.quantity + delta, maxStock));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    }, [products]);

    const setCartQuantity = React.useCallback((id: any, quantity: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                const product = products.find(p => p.id === id);
                const maxStock = product?.stock || 0;
                return { ...item, quantity: Math.max(1, Math.min(quantity, maxStock)) };
            }
            return item;
        }));
    }, [products]);

    const clearCart = React.useCallback(() => {
        setCart([]);
        localStorage.removeItem('sms_cart');
    }, []);

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
            updateProduct,
            cart,
            setCart,
            addToCart,
            removeFromCart,
            updateCartQuantity,
            setCartQuantity,
            clearCart,
            // Pagination controls
            page,
            setPage,
            pageSize,
            setPageSize,
            totalCount
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
