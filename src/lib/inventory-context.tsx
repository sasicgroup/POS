'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { syncManager } from './sync-manager';
import { useAuth } from './auth-context';
import { sendLowStockAlert } from './sms';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

interface Product {
    id: any;
    name: string;
    category: string;
    price: number;
    stock: number;
    sku: string;
    image: string;
    costPrice?: number;
    earnablePoints?: number;
    pointsValue?: number;
    estimatedProfit?: number;
    status?: string;
    video?: string;
}

interface InventoryContextType {
    products: Product[];
    isLoading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredProducts: Product[];
    getProductByBarcode: (barcode: string) => Promise<Product | null>;
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
    migrateImages: () => Promise<number | undefined>;
    preloadCacheForOffline: () => Promise<void>;
    cacheStatus: { isLoaded: boolean; productCount: number; lastUpdated: number | null };
    purgeCache: () => Promise<void>;
    loyaltyConfig: any;
    refreshLoyaltyConfig: () => Promise<void>;
    installmentSettings: any;
    refreshInstallmentSettings: () => Promise<void>;
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

    // Initial Count Check
    useEffect(() => {
        if (activeStore?.id) {
            fetchTotalCount();
        }
    }, [activeStore?.id]);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);

    // Cache state - Page based + IDB
    const [pageCache, setPageCache] = useState<Record<number, { data: Product[], timestamp: number }>>({});
    const [isCacheLoaded, setIsCacheLoaded] = useState(false);
    const [cacheStatus, setCacheStatus] = useState({ isLoaded: false, productCount: 0, lastUpdated: null as number | null });
    const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);
    const [installmentSettings, setInstallmentSettings] = useState<any>(null);
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for offline support

    // Load Cache from IDB
    useEffect(() => {
        if (activeStore?.id) {
            setIsCacheLoaded(false);
            const key = `sms_inventory_cache_${activeStore.id}`;
            idbGet(key).then((val) => {
                if (val && typeof val === 'object') {
                    setPageCache(val);
                    // Update cache status
                    const allProducts = Object.values(val).flatMap((page: any) => page.data || []);
                    const timestamps = Object.values(val).map((page: any) => page.timestamp).filter(Boolean);
                    const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : null;
                    setCacheStatus({
                        isLoaded: allProducts.length > 0,
                        productCount: allProducts.length,
                        lastUpdated
                    });
                } else {
                    setPageCache({});
                    setCacheStatus({ isLoaded: false, productCount: 0, lastUpdated: null });
                }
                setIsCacheLoaded(true);
            }).catch(err => {
                console.error("IDB Cache Load Error", err);
                setPageCache({});
                setCacheStatus({ isLoaded: false, productCount: 0, lastUpdated: null });
                setIsCacheLoaded(true);
            });
        } else {
            setPageCache({});
            setCacheStatus({ isLoaded: false, productCount: 0, lastUpdated: null });
            setIsCacheLoaded(true);
        }
    }, [activeStore?.id]);

    // Auto-preload cache on login (if cache is empty or stale)
    useEffect(() => {
        if (activeStore?.id && isCacheLoaded && user?.id) {
            // Check if cache needs refresh
            const needsPreload = !cacheStatus.isLoaded ||
                (cacheStatus.lastUpdated && Date.now() - cacheStatus.lastUpdated > CACHE_TTL);

            if (false) { // Disabled per user request (Egress optimization - Scan/Search only)
                console.log('[Inventory] Auto-preloading cache for offline support...');
                preloadCacheForOffline().catch(err => console.error('[Inventory] Auto-preload failed:', err));
            }
        }
    }, [activeStore?.id, isCacheLoaded, user?.id]); // Only run when these change

    const refreshLoyaltyConfig = React.useCallback(async () => {
        if (!activeStore?.id) return;
        try {
            const { data } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();
            if (data) setLoyaltyConfig(data);
        } catch (e) {
            console.error("Error fetching loyalty config:", e);
        }
    }, [activeStore?.id]);

    useEffect(() => {
        refreshLoyaltyConfig();
    }, [activeStore?.id, refreshLoyaltyConfig]);

    const refreshInstallmentSettings = React.useCallback(async () => {
        if (!activeStore?.id) return;
        try {
            const { data } = await supabase
                .from('installment_settings')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();
            if (data) setInstallmentSettings(data);
        } catch (e) {
            console.error("Error fetching installment settings:", e);
        }
    }, [activeStore?.id]);

    useEffect(() => {
        refreshInstallmentSettings();
    }, [activeStore?.id, refreshInstallmentSettings]);

    // UI states
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [availableBusinessTypes, setAvailableBusinessTypes] = useState<string[]>([
        "Retail Store", "Pharmacy", "Restaurant", "Electronics", "Grocery", "Fashion", "Other"
    ]);

    // Sync with Active Store
    useEffect(() => {
        if (activeStore) {
            if (activeStore.businessTypes && activeStore.businessTypes.length > 0) {
                // Ensure defaults are always present + custom ones from DB
                // Actually, if we save the FULL list to DB, just use that
                setAvailableBusinessTypes(activeStore.businessTypes);
                // Also set businessTypes (selected) if we had a way to know which are selected.
                // Assuming 'businessTypes' in context meant "Selected types relevant to this store".
                // Since our DB schema just added 'business_types', let's assume specific "selected" logic is client-side or we save "selected_business_types"?
                // For now, let's assume 'businessTypes' state tracks SELECTION from the available list.
                // If we want to persist SELECTION, we need another field.
                // BUT, looking at SettingsPage, it seems 'businessTypes' state is just a local selection for UI?
                // Wait, SettingsPage maps availableBusinessTypes and shows checks if businessTypes.includes(type).
                // If 'businessTypes' (selected) are not saved, then they reset on reload.
                // The prompt says "Save here doesn't work".
                // If user toggles a type, it updates 'businessTypes'.
                // If we want to save this selection, we need a field for it.
                // The field I added 'business_types' (array) likely stores the AVAILABLE types (custom added ones)?
                // OR does it store the SELECTED types?
                // given `availableBusinessTypes` has defaults.
            }
            if (activeStore.categories) {
                setCustomCategories(activeStore.categories);
                // Update active categories with "All" + custom
                setActiveCategories(prev => {
                    const defaults = ['All'];
                    // Merge unique
                    return Array.from(new Set([...defaults, ...(activeStore.categories || [])]));
                });
            }
        }
    }, [activeStore]);

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

    const fetchProducts = React.useCallback(async (pageNum = 1, pageSizeNum = 20, query = '', retryCount = 0) => {
        if (!activeStore?.id || activeStore.id.toString().startsWith('temp-')) {
            setIsLoading(false);
            return;
        }

        // Cache Hit Check (Page Based)
        if (pageCache[pageNum] && pageCache[pageNum].timestamp && (Date.now() - pageCache[pageNum].timestamp < CACHE_TTL)) {
            // console.log(`[Inventory] Cache Hit Page ${pageNum}`);
            setProducts(pageCache[pageNum].data);
            setIsLoading(false);
            return;
        }

        // Prevent duplicate fetches
        if (isFetching.current) return;

        isFetching.current = true;
        setIsLoading(true);

        const startTime = Date.now();
        const TIMEOUT_MS = 60000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const from = (pageNum - 1) * pageSizeNum;
            const to = from + pageSizeNum - 1;

            let queryBuilder = supabase
                .from('products')
                .select('id, name, category, price, stock, sku, image, cost_price, earnable_points, points_value, estimated_profit, status, video, store_id', { count: 'estimated' })
                .eq('store_id', activeStore.id);

            if (query && query.trim()) {
                queryBuilder = queryBuilder.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
            }

            const { data, error, count } = await queryBuilder
                .range(from, to)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (error) {
                console.error(`[Inventory] Supabase error:`, error.message);
                throw error;
            } else if (data) {
                const mappedProducts = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    earnablePoints: p.earnable_points || 0,
                    pointsValue: p.points_value || 0,
                    estimatedProfit: p.estimated_profit || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));
                setProducts(mappedProducts);
                setTotalCount(count || 0);

                // Update Cache & Persist
                setPageCache(prev => {
                    const next = {
                        ...prev,
                        [pageNum]: {
                            data: mappedProducts,
                            timestamp: Date.now()
                        }
                    };
                    idbSet(`sms_inventory_cache_${activeStore.id}`, next);
                    return next;
                });

                setIsLoading(false);
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error(`[Inventory] Fetch error:`, err);

            // Retry logic
            const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('network');
            if (retryCount < 3 && isNetworkError) {
                setTimeout(() => fetchProducts(pageNum, pageSizeNum, query, retryCount + 1), 1000 * Math.pow(2, retryCount));
                return;
            }
            setIsLoading(false);
        } finally {
            isFetching.current = false;
        }
    }, [activeStore?.id, pageCache]);

    useEffect(() => {
        // Wait for cache to load from IDB before proceeding
        if (!isCacheLoaded) return;

        if (activeStore?.id) {
            // Lazy Load Logic: Only fetch if searching
            // We strip leading/trailing whitespace
            const hasSearch = searchQuery && searchQuery.trim().length > 0;

            if (hasSearch) {
                // If searching, fetch with query
                fetchProducts(page, pageSize, searchQuery);
            } else {
                setProducts([]);
                setIsLoading(false);
            }
        } else {
            setProducts([]);
            setIsLoading(false);
        }
    }, [activeStore?.id, page, pageSize, fetchProducts, searchQuery, pageCache, isCacheLoaded]);


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
                category: item.category,
                maxStock: item.maxStock
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
        const optimizedImage = await uploadImage(product.image, activeStore.id);
        const newProduct = { ...product, id: tempId, store_id: activeStore.id, image: optimizedImage };
        // Don't add to list if we are in lazy mode? 
        // Actually, if user just added it, they probably want to see it.
        // We can append it to the current "view" even if it's search results or empty.
        setProducts(prev => [newProduct, ...prev]);

        const { data, error } = await supabase.from('products').insert({
            store_id: activeStore.id,
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
            sku: product.sku,
            image: optimizedImage, // Use URL
            video: product.video,
            status: product.status,
            cost_price: product.costPrice,
            earnable_points: product.earnablePoints,
            points_value: product.pointsValue,
            estimated_profit: product.estimatedProfit
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
                earnablePoints: data.earnable_points || 0,
                pointsValue: data.points_value || 0,
                estimatedProfit: data.estimated_profit || 0,
                status: data.status || 'In Stock',
                video: data.video || '',
                image: data.image || ''
            };
            setProducts(prev => prev.map(p => p.id === tempId ? mappedProduct : p));

            // Refresh cache in background to keep offline data current
            refreshCacheInBackground();
        }
    }, [activeStore?.id]);

    // Helper: Refresh cache in background when inventory changes
    const refreshCacheInBackground = React.useCallback(async () => {
        if (!activeStore?.id) return;

        console.log('[Inventory] Refreshing cache after inventory change...');

        try {
            // Fetch first 100 products (same as preload)
            const { data, error } = await supabase
                .from('products')
                .select('id, name, category, price, stock, sku, image, cost_price, earnable_points, points_value, estimated_profit, status, video, store_id')
                .eq('store_id', activeStore.id)
                .limit(100);

            if (error) {
                console.error('[Inventory] Cache refresh error:', error);
                return;
            }

            if (data && data.length > 0) {
                const mappedProducts = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    earnablePoints: p.earnable_points || 0,
                    pointsValue: p.points_value || 0,
                    estimatedProfit: p.estimated_profit || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));

                // Update cache
                const newCache = {
                    1: {
                        data: mappedProducts,
                        timestamp: Date.now()
                    }
                };

                setPageCache(newCache);
                await idbSet(`sms_inventory_cache_${activeStore.id}`, newCache);

                // Update cache status
                setCacheStatus({
                    isLoaded: true,
                    productCount: mappedProducts.length,
                    lastUpdated: Date.now()
                });

                console.log(`[Inventory] Cache refreshed with ${mappedProducts.length} products`);
            }
        } catch (err) {
            console.error('[Inventory] Cache refresh failed:', err);
        }
    }, [activeStore?.id]);


    const getProductByBarcode = React.useCallback(async (barcode: string) => {
        if (!activeStore?.id) return null;
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id)
                .eq('sku', barcode)
                .single();

            if (data) {
                return {
                    ...data,
                    costPrice: data.cost_price || 0,
                    earnablePoints: data.earnable_points || 0,
                    pointsValue: data.points_value || 0,
                    estimatedProfit: data.estimated_profit || 0,
                    status: data.status || 'In Stock',
                    video: data.video || '',
                    image: data.image || ''
                };
            }
        } catch (e) {
            console.error("Error fetching by barcode:", e);
        }
        return null;
    }, [activeStore?.id]);

    const updateProduct = React.useCallback(async (product: any) => {
        if (!activeStore?.id) return;

        const optimizedImage = await uploadImage(product.image, activeStore.id);

        // Optimistic update
        const updatedProduct = { ...product, image: optimizedImage };
        setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));

        const { error } = await supabase.from('products').update({
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
            sku: product.sku,
            image: optimizedImage,
            video: product.video,
            status: product.status,
            cost_price: product.costPrice,
            earnable_points: product.earnablePoints,
            points_value: product.pointsValue,
            estimated_profit: product.estimatedProfit
        }).eq('id', product.id);

        if (error) {
            console.error("Error updating product:", error);
            fetchProducts();
        } else {
            // Refresh cache in background
            refreshCacheInBackground();
        }
    }, [activeStore?.id, fetchProducts, refreshCacheInBackground]);

    const deleteProduct = React.useCallback(async (id: any) => {
        // Optimistic delete
        setProducts(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
            console.error("Error deleting product:", error);
            fetchProducts();
        } else {
            // Refresh cache in background
            refreshCacheInBackground();
        }
    }, [fetchProducts, refreshCacheInBackground]);

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
            // Priority 1: Product specific points from the cart
            let totalProductPoints = 0;
            if (saleData.items && saleData.items.length > 0) {
                totalProductPoints = saleData.items.reduce((acc: number, item: any) => acc + ((item.earnablePoints || 0) * item.quantity), 0);
            }

            if (totalProductPoints > 0) {
                pointsEarned = totalProductPoints;
            } else {
                // Priority 2: Global rate
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
            status: 'completed',
            points_earned: pointsEarned,
            points_redeemed: saleData.pointsRedeemed || 0,
            loyalty_discount_amount: saleData.loyaltyDiscount || 0,
            tax_amount: saleData.taxAmount || 0, // Optional if passed
            total_discount: saleData.totalDiscount || 0 // Optional if passed
        }).select().single();

        if (saleError || !sale) {
            console.error("Sale insert failed", JSON.stringify(saleError, null, 2));

            // OFFLINE HANDLING
            // Check if it's a network error (no connection)
            if (!navigator.onLine || (saleError && (saleError.message?.includes('fetch') || saleError.message?.includes('network')))) {
                console.log('App appears offline, queuing sale for sync...');

                // Optimistic Success
                await syncManager.enqueueRequest({
                    action: 'SALE_TRANSACTION',
                    payload: {
                        activeStoreId: activeStore.id,
                        saleData: { ...saleData, customerId }, // Pass the resolved/new customer ID
                        userId: safeEmployeeId,
                        timestamp: Date.now()
                    }
                });

                // Optimistic UI Update (Stock)
                setProducts(prev => prev.map(p => {
                    const item = saleData.items.find((i: any) => i.id === p.id);
                    if (item) {
                        return { ...p, stock: p.stock - item.quantity };
                    }
                    return p;
                }));

                // Return a fake ID so UI proceeds
                return `OFFLINE-${Date.now()}`;
            }

            return null;
        }

        // Record Payment
        if (saleData.paymentMethod === 'installment') {
            const deposit = parseFloat(saleData.depositAmount) || 0;
            // Record initial deposit
            if (deposit > 0) {
                await supabase.from('sale_payments').insert({
                    sale_id: sale.id,
                    amount: deposit,
                    payment_method: 'installment_deposit',
                    recorded_by: safeEmployeeId
                });
            }

            // Create Installment Record
            if (customerId) {
                const balance = saleData.totalAmount - deposit;
                const { error: instError } = await supabase.from('installments').insert({
                    store_id: activeStore.id,
                    customer_id: customerId,
                    sale_id: sale.id,
                    total_amount: saleData.totalAmount,
                    amount_paid: deposit,
                    balance: balance,
                    status: balance <= 0 ? 'completed' : 'active',
                    plan_type: 'installment',
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 30 days
                });
                if (instError) console.error("Installment creation failed", instError);
            }
        } else if (saleData.totalAmount > 0) {
            await supabase.from('sale_payments').insert({
                sale_id: sale.id,
                amount: saleData.totalAmount,
                payment_method: saleData.paymentMethod,
                recorded_by: safeEmployeeId
            });
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
            // We need to fetch current customer stats first to be safe, or use RPC decrement (safer)
            const { data: currentCust } = await supabase.from('customers').select('points, total_spent, total_visits').eq('id', customerId).single();
            if (currentCust) {
                const redeemed = saleData.pointsRedeemed || 0;
                const newPoints = Math.max(0, (currentCust.points || 0) + pointsEarned - redeemed);
                const newTotalSpent = (currentCust.total_spent || 0) + saleData.totalAmount;
                const newTotalVisits = (currentCust.total_visits || 0) + 1;

                await supabase.from('customers').update({
                    points: newPoints,
                    total_spent: newTotalSpent,
                    total_visits: newTotalVisits,
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

                // Log Loyalty Redeemed
                if (redeemed > 0) {
                    await supabase.from('loyalty_logs').insert({
                        store_id: activeStore.id,
                        customer_id: customerId,
                        points: redeemed, // Positive number as points used
                        type: 'redeemed',
                        description: `Redeemed on Sale #${sale.id.slice(0, 8)}`
                    });
                }
            }
        }

        // Refresh cache in background (stock changed)
        refreshCacheInBackground();

        return sale.id;
    }, [activeStore?.id, user?.id, products, refreshCacheInBackground]);

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
                earnablePoints: product.earnablePoints || 0,
                pointsValue: product.pointsValue || 0,
                status: product.status,
                maxStock: product.stock
            }];
        });
    }, [products]);

    const removeFromCart = React.useCallback((id: any) => {
        setCart(current => current.filter(item => item.id !== id));
    }, []);

    const updateCartQuantity = React.useCallback((id: any, delta: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                const maxStock = item.maxStock !== undefined ? item.maxStock : (products.find(p => p.id === id)?.stock || 1000);
                const newQty = Math.max(1, Math.min(item.quantity + delta, maxStock));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    }, [products]);

    const setCartQuantity = React.useCallback((id: any, quantity: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                const maxStock = item.maxStock !== undefined ? item.maxStock : (products.find(p => p.id === id)?.stock || 1000);
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

    // --- Image Storage Helper ---
    const uploadImage = async (base64Data: string, storeId: string) => {
        try {
            if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;

            // Convert Base64 to Blob
            const res = await fetch(base64Data);
            const blob = await res.blob();

            // Generate filename: store_id/timestamp-random.webp
            const fileName = `${storeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, blob, {
                    contentType: 'image/webp',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Image upload failed:', error);
            return base64Data; // Fallback to base64 if upload fails
        }
    };

    const migrateImages = async () => {
        if (!activeStore?.id) return;
        setIsLoading(true);
        try {
            // Fetch ALL products for this store (dangerous if many, but user said < 15)
            const { data: allProducts } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id);

            if (!allProducts) return;

            let count = 0;
            for (const p of allProducts) {
                if (p.image && p.image.startsWith('data:image')) {
                    const newUrl = await uploadImage(p.image, activeStore.id);
                    if (newUrl !== p.image) {
                        await supabase.from('products').update({ image: newUrl }).eq('id', p.id);
                        count++;
                    }
                }
            }
            // Refresh
            fetchTotalCount();
            return count;
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTotalCount = async () => {
        if (!activeStore?.id) return;
        // Cheap count query
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', activeStore.id);

        if (count !== null) setTotalCount(count);
    };

    const preloadCacheForOffline = async () => {
        if (!activeStore?.id) return;

        console.log('[Inventory] Preloading cache for offline use...');

        try {
            // Fetch first 100 products (should cover most small businesses)
            const { data, error } = await supabase
                .from('products')
                .select('id, name, category, price, stock, sku, image, cost_price, status, video, store_id')
                .eq('store_id', activeStore.id)
                .limit(100);

            if (error) {
                console.error('[Inventory] Preload error:', error);
                return;
            }

            if (data && data.length > 0) {
                const mappedProducts = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));

                // Store in cache (page 1)
                const newCache = {
                    1: {
                        data: mappedProducts,
                        timestamp: Date.now()
                    }
                };

                setPageCache(newCache);
                await idbSet(`sms_inventory_cache_${activeStore.id}`, newCache);

                // Update cache status
                setCacheStatus({
                    isLoaded: true,
                    productCount: mappedProducts.length,
                    lastUpdated: Date.now()
                });

                console.log(`[Inventory] Cached ${mappedProducts.length} products for offline use`);
            }
        } catch (err) {
            console.error('[Inventory] Preload failed:', err);
        }
    };

    const purgeCache = async () => {
        if (!activeStore?.id) return;

        console.log('[Inventory] Purging cache...');
        setIsLoading(true);

        try {
            // 1. Clear IDB
            const key = `sms_inventory_cache_${activeStore.id}`;
            await idbDel(key);

            // 2. Clear local state
            setPageCache({});
            setCacheStatus({ isLoaded: false, productCount: 0, lastUpdated: null });

            // 3. Clear Cart (optional, but requested as "purge cached items")
            clearCart();

            // 4. Fresh fetch of current page / settings
            await Promise.all([
                refreshLoyaltyConfig(),
                refreshInstallmentSettings(),
                fetchTotalCount(),
                // If there's a search query, fetch with it, otherwise just reset products
                searchQuery.trim() ? fetchProducts(page, pageSize, searchQuery) : Promise.resolve()
            ]);

            console.log('[Inventory] Cache purged and data re-fetched');
        } catch (err) {
            console.error('[Inventory] Purge failed:', err);
        } finally {
            setIsLoading(false);
        }
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
            totalCount,
            migrateImages,
            getProductByBarcode,
            preloadCacheForOffline,
            cacheStatus,
            purgeCache,
            loyaltyConfig,
            refreshLoyaltyConfig,
            installmentSettings,
            refreshInstallmentSettings
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
