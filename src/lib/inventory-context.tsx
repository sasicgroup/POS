'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { syncManager } from './sync-manager';
import { useAuth } from './auth-context';
import { sendLowStockAlert, sendNotification } from './sms';

import { useToast } from '@/lib/toast-context';
import { useDebouncedValue } from '@/lib/hooks/use-debounce';

interface Product {
    id: any;
    name: string;
    category: string;
    price: number;
    stock: number;
    sku: string;
    barcode?: string;
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
    addProducts: (products: any[]) => Promise<void>;
    deleteProduct: (id: any) => Promise<void>;
    deleteProducts: (ids: any[]) => Promise<void>;
    updateProduct: (product: any) => Promise<void>;
    cart: any[];
    setCart: (cart: any[] | ((current: any[]) => any[])) => void;
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
    getAllProducts: (populateGlobalState?: boolean) => Promise<Product[]>;
    loyaltyConfig: any;
    refreshLoyaltyConfig: () => Promise<void>;
    syncAllProductsToLoyalty: () => Promise<void>;
    installmentSettings: any;
    refreshInstallmentSettings: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const { activeStore, user } = useAuth();
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['All']);
    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20); // Reverted to 20 for scan-only mode
    const [totalCount, setTotalCount] = useState(0);

    // Initial Count Check
    useEffect(() => {
        if (activeStore?.id) {
            fetchTotalCount();
        }
    }, [activeStore?.id]);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);

    // Recently accessed products for quick access (no persistent cache)
    const [recentlyAccessedProducts, setRecentlyAccessedProducts] = useState<Product[]>([]);
    const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);
    const [installmentSettings, setInstallmentSettings] = useState<any>(null);
    const [loadAllActive, setLoadAllActive] = useState(false);

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

    const syncAllProductsToLoyalty = React.useCallback(async () => {
        if (!activeStore?.id) return;
        try {
            const { data: config } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();

            if (!config || !config.enabled) return;

            // Update all products for this store
            // earnable_points = floor(price * rate)
            // points_value = points * redemption_rate
            // estimated_profit = price - cost_price - points_value
            const { error } = await supabase.rpc('sync_products_loyalty', {
                p_store_id: activeStore.id,
                p_points_rate: config.points_per_currency || 1,
                p_redemption_rate: config.redemption_rate || 0.05
            });

            if (error) {
                // Fallback for manual updates if RPC doesn't exist
                console.warn("RPC sync failed, performing manual batch update:", error);
                const { data: products } = await supabase
                    .from('products')
                    .select('id, price, cost_price')
                    .eq('store_id', activeStore.id);

                if (products) {
                    const updates = products.map(p => {
                        const price = parseFloat(p.price as any) || 0;
                        const cost = parseFloat(p.cost_price as any) || 0;
                        const points = Math.floor(price * (config.points_per_currency || 1));
                        const val = points * (config.redemption_rate || 0.05);
                        return {
                            id: p.id,
                            earnable_points: points,
                            points_value: val,
                            estimated_profit: price - cost - val
                        };
                    });

                    for (const u of updates) {
                        await supabase.from('products').update(u).eq('id', u.id);
                    }
                }
            }
            showToast('success', 'All products synchronized with current loyalty settings');
        } catch (e) {
            console.error("Sync error:", e);
            showToast('error', 'Failed to synchronize products');
        }
    }, [activeStore?.id, showToast]);

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

        // Prevent duplicate fetches
        if (isFetching.current) return;

        isFetching.current = true;
        setIsLoading(true);

        console.log(`[Inventory] Fetching fresh data from DB - Query: "${query}"`);

        const TIMEOUT_MS = 60000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const from = (pageNum - 1) * pageSizeNum;
            const to = from + pageSizeNum - 1;

            let queryBuilder = supabase
                .from('products')
                .select('id, name, category, price, stock, sku, barcode, image, cost_price, earnable_points, points_value, estimated_profit, status, video, store_id', { count: 'estimated' })
                .eq('store_id', activeStore.id);

            if (query && query.trim()) {
                queryBuilder = queryBuilder.or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`);
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

                // Add to recently accessed (no persistent cache)
                if (mappedProducts.length > 0) {
                    setRecentlyAccessedProducts(prev => {
                        const newRecent = [...mappedProducts, ...prev];
                        // Keep unique by ID, limit to 50 items
                        const unique = Array.from(new Map(newRecent.map(p => [p.id, p])).values());
                        return unique.slice(0, 50);
                    });
                }

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

            showToast('error', 'Failed to fetch products. Please check your connection.');
            setIsLoading(false);
        } finally {
            isFetching.current = false;
        }
    }, [activeStore?.id, showToast]);

    // Debounce search query to prevent excessive database calls
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

    useEffect(() => {
        if (activeStore?.id) {
            // Real-time Search/Scan-Only Logic: Only fetch if searching
            // Use debounced query to trigger fetch
            const hasSearch = debouncedSearchQuery && debouncedSearchQuery.trim().length > 0;

            if (hasSearch) {
                // When searching, reset the "Load All" bypass if it was active
                if (loadAllActive) setLoadAllActive(false);
                fetchProducts(page, pageSize, debouncedSearchQuery);
            } else if (!loadAllActive) {
                // Only clear if we are NOT in "Load All" mode and NOT searching
                setProducts([]);
                setIsLoading(false);
            }
            // If loadAllActive is true and no search, we do nothing and keep the current product list
        } else {
            setProducts([]);
            setIsLoading(false);
            setLoadAllActive(false);
        }
    }, [activeStore?.id, page, pageSize, fetchProducts, debouncedSearchQuery, loadAllActive]);


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
            barcode: product.barcode || product.sku, // Sync barcode with SKU if not provided
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
        }
    }, [activeStore?.id]);






    const getProductByBarcode = React.useCallback(async (barcode: string) => {
        if (!activeStore?.id) return null;
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id)
                .or(`sku.eq.${barcode},barcode.eq.${barcode}`)
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
            barcode: product.barcode || product.sku,
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
        }
    }, [activeStore?.id, fetchProducts]);

    const deleteProduct = React.useCallback(async (id: any) => {
        // Optimistic delete
        setProducts(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
            console.error("Error deleting product:", error);
            fetchProducts();
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
        let currentPoints = 0;
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
                    // Use subtotalAmount if provided, else fall back to totalAmount
                    const baseAmount = saleData.subtotalAmount || saleData.totalAmount;
                    pointsEarned = Math.floor(baseAmount * rate);
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
                const timestamp = Date.now();
                await syncManager.enqueueRequest({
                    action: 'SALE_TRANSACTION',
                    payload: {
                        activeStoreId: activeStore.id,
                        saleData: { ...saleData, customerId }, // Pass the resolved/new customer ID
                        userId: safeEmployeeId,
                        timestamp: timestamp
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
                return {
                    saleId: `OFFLINE-${timestamp}`,
                    pointsEarned,
                    finalPoints: 0 // Cannot determine offline
                };
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
                const { data: instData, error: instError } = await supabase.from('installments').insert({
                    store_id: activeStore.id,
                    customer_id: customerId,
                    sale_id: sale.id,
                    total_amount: saleData.totalAmount,
                    amount_paid: deposit,
                    balance: balance,
                    status: balance <= 0 ? 'completed' : 'active',
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 30 days
                }).select().single();

                if (instError) {
                    console.error("Installment creation failed", instError.message || JSON.stringify(instError));
                } else {
                    // Record deposit in installment_payments for history
                    if (deposit > 0 && instData) {
                        await supabase.from('installment_payments').insert({
                            installment_id: instData.id,
                            amount: deposit,
                            payment_method: 'initial_deposit',
                            recorded_by: safeEmployeeId
                        });
                    }

                    // Send SMS notification for initial installment
                    const orderShortId = sale.id.slice(0, 8).toUpperCase();
                    sendNotification('installment', {
                        customerPhone: saleData.customer.phone,
                        customerName: saleData.customer.name,
                        storeId: activeStore.id,
                        id: `Order #${orderShortId}`,
                        amountPaid: deposit,
                        amountLeft: balance
                    }).catch(err => console.error('Failed to send installment SMS:', err));
                }
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

            // 4. Update Stock (Batch Update)
            const stockUpdates: { id: any; stock: number }[] = [];
            const lowStockNotifications: any[] = [];
            const itemsToAlert: { name: string; stock: number }[] = [];

            saleData.items.forEach((item: any) => {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    const newStock = product.stock - item.quantity;
                    stockUpdates.push({ id: item.id, stock: newStock });

                    // Prepare low stock alerts
                    if (newStock <= 10) {
                        lowStockNotifications.push({
                            store_id: activeStore.id,
                            type: 'low_stock',
                            title: 'Low Stock Alert',
                            message: `${product.name} is running low (${newStock} items left).`,
                            metadata: { product_id: product.id, stock: newStock }
                        });
                        itemsToAlert.push({ name: product.name, stock: newStock });
                    }
                }
            });

            // Perform Stock Updates
            if (stockUpdates.length > 0) {
                const results = await Promise.all(stockUpdates.map(u =>
                    supabase.from('products').update({ stock: u.stock }).eq('id', u.id)
                ));

                const firstError = results.find(r => r.error)?.error;
                if (firstError) {
                    console.error("Batch stock update failed", firstError.message || JSON.stringify(firstError));
                }
            }

            // Perform Batch Notification Insert
            if (lowStockNotifications.length > 0) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert(lowStockNotifications);
                if (notifError) console.error("Batch notification insert failed", notifError);

                // Send SMS alerts (still individual calls but categorized)
                itemsToAlert.forEach(item => {
                    sendLowStockAlert(
                        item,
                        activeStore.id,
                        activeStore.phone || ''
                    ).catch(err => console.error('Failed to send low stock SMS:', err));
                });
            }

            // Optimistic UI update
            setProducts(prev => prev.map(p => {
                const update = stockUpdates.find(u => u.id === p.id);
                return update ? { ...p, stock: update.stock } : p;
            }));
        }


        // 5. Update Customer Loyalty & Total Spent
        let finalPoints = 0;
        if (customerId) {
            // We need to fetch current customer stats first to be safe, or use RPC decrement (safer)
            const { data: currentCust } = await supabase.from('customers').select('points, total_spent, total_visits').eq('id', customerId).single();
            if (currentCust) {
                const redeemed = saleData.pointsRedeemed || 0;
                finalPoints = Math.max(0, (currentCust.points || 0) + pointsEarned - redeemed);
                const newTotalSpent = (currentCust.total_spent || 0) + saleData.totalAmount;
                const newTotalVisits = (currentCust.total_visits || 0) + 1;

                await supabase.from('customers').update({
                    points: finalPoints,
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

        return {
            saleId: sale.id,
            pointsEarned,
            finalPoints
        };
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

    const getAllProducts = React.useCallback(async (populateGlobalState = false) => {
        if (!activeStore?.id) return [];
        if (populateGlobalState) setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, category, price, stock, sku, barcode, image, cost_price, earnable_points, points_value, estimated_profit, status, video, store_id')
                .eq('store_id', activeStore.id);

            if (error) throw error;
            if (data) {
                const mapped = data.map((p: any) => ({
                    ...p,
                    costPrice: p.cost_price || 0,
                    earnablePoints: p.earnable_points || 0,
                    pointsValue: p.points_value || 0,
                    estimatedProfit: p.estimated_profit || 0,
                    status: p.status || 'In Stock',
                    video: p.video || '',
                    image: p.image || ''
                }));

                if (populateGlobalState) {
                    setProducts(mapped);
                    setTotalCount(mapped.length);
                    setLoadAllActive(true);
                    setIsLoading(false);
                }
                return mapped;
            }
        } catch (e) {
            console.error("Error fetching all products:", e);
            showToast('error', 'Failed to fetch all products');
            if (populateGlobalState) setIsLoading(false);
        }
        return [];
    }, [activeStore?.id, showToast]);

    const addProducts = React.useCallback(async (productsData: any[]) => {
        if (!activeStore?.id || productsData.length === 0) return;

        const formatted = productsData.map(p => ({
            store_id: activeStore.id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            sku: p.sku,
            barcode: p.barcode || p.sku,
            image: p.image || 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
            video: p.video || '',
            status: p.status || 'In Stock',
            cost_price: p.costPrice || 0,
            earnable_points: p.earnablePoints || 0,
            points_value: p.pointsValue || 0,
            estimated_profit: p.estimatedProfit || 0
        }));

        const { error } = await supabase.from('products').insert(formatted);

        if (error) {
            console.error("Error batch adding products:", error);
            // Refetch to restore state
            if (activeStore?.id) fetchProducts(page, pageSize, searchQuery);
        } else {
            // Refresh count and list if needed
            setTotalCount(prev => prev + formatted.length);
            fetchTotalCount();
            if (searchQuery) fetchProducts(page, pageSize, searchQuery);
        }
    }, [activeStore?.id, page, pageSize, searchQuery, fetchProducts, fetchTotalCount]);

    const deleteProducts = React.useCallback(async (ids: any[]) => {
        if (!activeStore?.id || !ids || ids.length === 0) return;

        // Optimistic update
        setProducts(prev => prev.filter(p => !ids.includes(p.id)));

        const { error } = await supabase
            .from('products')
            .delete()
            .in('id', ids);

        if (error) {
            console.error("Error batch deleting products:", error);
            // Refetch to restore state
            if (activeStore?.id) fetchProducts(page, pageSize, searchQuery);
        } else {
            setTotalCount(prev => Math.max(0, prev - ids.length));
        }
    }, [activeStore?.id, page, pageSize, searchQuery, fetchProducts]);




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
            addProducts,
            deleteProduct,
            deleteProducts,
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
            getAllProducts,
            getProductByBarcode,
            loyaltyConfig,
            refreshLoyaltyConfig,
            syncAllProductsToLoyalty,
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
