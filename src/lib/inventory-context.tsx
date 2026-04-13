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
    const { activeStore, user, businessId } = useAuth();
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

    const refreshLoyaltyConfig = async () => {
        if (!activeStore?.id) return;
        let query = supabase
            .from('loyalty_programs')
            .select('*')
            .eq('store_id', activeStore.id);

        if (businessId) {
            query = query.eq('business_id', businessId);
        }

        const { data } = await query.maybeSingle();
        if (data) setLoyaltyConfig(data);
    };

    const syncAllProductsToLoyalty = async () => {
        if (!activeStore?.id) return;
        setIsLoading(true);

        try {
            let configQuery = supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id);

            if (businessId) {
                configQuery = configQuery.eq('business_id', businessId);
            }

            const { data: config } = await configQuery.maybeSingle();

            if (!config) {
                showToast('error', 'Loyalty program not found');
                return;
            }

            const { error: rpcError } = await supabase.rpc('sync_products_loyalty', {
                p_store_id: activeStore.id
            });

            if (rpcError) {
                console.warn("RPC Sync failed, falling back to manual update", rpcError);
                let productsQuery = supabase
                    .from('products')
                    .select('id, price')
                    .eq('store_id', activeStore.id);

                if (businessId) {
                    productsQuery = productsQuery.eq('business_id', businessId);
                }

                const { data: allProducts } = await productsQuery;

                if (allProducts) {
                    const rate = config.points_per_currency || 0.01;
                    const redeemRate = config.redemption_rate || 0.05;

                    for (const p of allProducts) {
                        const points = Math.floor(p.price * rate);
                        const val = points * redeemRate;
                        await supabase.from('products')
                            .update({
                                earnable_points: points,
                                points_value: val
                            })
                            .eq('id', p.id)
                            .eq('store_id', activeStore.id);
                    }
                }
            }

            showToast('success', 'All products synced to loyalty program');
            fetchProducts();
        } catch (e) {
            console.error(e);
            showToast('error', 'Failed to sync products');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshLoyaltyConfig();
    }, [activeStore?.id, refreshLoyaltyConfig]);

    const refreshInstallmentSettings = async () => {
        if (!activeStore?.id) return;
        let query = supabase
            .from('installment_settings')
            .select('*')
            .eq('store_id', activeStore.id);

        if (businessId) {
            query = query.eq('business_id', businessId);
        }

        const { data } = await query.maybeSingle();
        if (data) setInstallmentSettings(data);
    };

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
                setAvailableBusinessTypes(activeStore.businessTypes);
            }
            if (activeStore.categories) {
                setCustomCategories(activeStore.categories);
                setActiveCategories(prev => {
                    const defaults = ['All'];
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

    const fetchProducts = async (pageNum = 1, pageSizeNum = 20, queryStr = '') => {
        if (!activeStore?.id) return;
        setIsLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('store_id', activeStore.id)
                .neq('status', 'deleted');

            if (businessId) {
                query = query.eq('business_id', businessId);
            }

            if (queryStr && queryStr.trim()) {
                query = query.or(`name.ilike.%${queryStr}%,sku.ilike.%${queryStr}%,barcode.ilike.%${queryStr}%`);
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum - 1);

            if (error) throw error;
            if (data) {
                const mappedData = data.map(item => ({
                    ...item,
                    costPrice: item.cost_price || 0,
                    earnablePoints: item.earnable_points || 0,
                    pointsValue: item.points_value || 0,
                    estimatedProfit: item.estimated_profit || 0,
                    status: item.status || 'In Stock',
                    video: item.video || '',
                    image: item.image || ''
                }));
                setProducts(mappedData);
                if (count !== null) setTotalCount(count);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search query to prevent excessive database calls
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

    useEffect(() => {
        if (activeStore?.id) {
            fetchProducts(page, pageSize, debouncedSearchQuery);
        } else {
            setProducts([]);
            setIsLoading(false);
        }
    }, [activeStore?.id, page, pageSize, debouncedSearchQuery]);


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



    const addProduct = async (product: any) => {
        if (!activeStore?.id) return;

        const optimizedImage = await uploadImage(product.image, activeStore.id);
        const { data, error } = await supabase.from('products').insert({
            store_id: activeStore.id,
            business_id: businessId,
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
        }).select().single();

        if (!error && data) {
            setProducts(prev => [data, ...prev]);
        }
    };

    const getProductByBarcode = async (barcode: string) => {
        if (!activeStore?.id) return null;
        let query = supabase
            .from('products')
            .select('*')
            .eq('store_id', activeStore.id)
            .or(`sku.eq.${barcode},barcode.eq.${barcode}`)
            .neq('status', 'deleted');

        if (businessId) {
            query = query.eq('business_id', businessId);
        }

        const { data } = await query.maybeSingle();

        if (data) {
            return {
                ...data,
                costPrice: data.cost_price || 0,
                earnablePoints: data.earnable_points || 0,
                pointsValue: data.points_value || 0
            };
        }
        return null;
    };

    const updateProduct = async (product: any) => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('products')
            .update({
                ...product,
                cost_price: product.costPrice,
                earnable_points: product.earnablePoints,
                points_value: product.pointsValue
            })
            .eq('id', product.id)
            .eq('store_id', activeStore.id)
            .eq('business_id', businessId);

        if (!error) {
            setProducts(products.map(p => p.id === product.id ? { ...p, ...product } : p));
        }
    };

    const deleteProduct = async (id: number) => {
        if (!activeStore?.id) return;
        const { error } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .eq('id', id)
            .eq('store_id', activeStore.id)
            .eq('business_id', businessId);

        if (!error) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const deleteProducts = async (ids: number[]) => {
        if (!activeStore?.id) return;
        const { error } = await supabase
            .from('products')
            .update({ status: 'deleted' })
            .in('id', ids)
            .eq('store_id', activeStore.id)
            .eq('business_id', businessId);

        if (!error) {
            setProducts(products.filter(p => !ids.includes(p.id)));
        }
    };

    const processSale = async (saleData: any) => {
        if (!activeStore?.id) return null;

        let customerId = null;
        if (saleData.customer && saleData.customer.phone) {
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('store_id', activeStore.id)
                .eq('phone', saleData.customer.phone)
                .maybeSingle();

            if (existing) {
                customerId = existing.id;
            } else {
                const { data: newCustomer } = await supabase.from('customers').insert({
                    store_id: activeStore.id,
                    business_id: businessId,
                    name: saleData.customer.name || 'Unknown',
                    phone: saleData.customer.phone,
                    total_spent: 0,
                    points: 0
                }).select().single();
                if (newCustomer) customerId = newCustomer.id;
            }
        }

        let pointsEarned = 0;
        if (customerId) {
            let totalProductPoints = saleData.items.reduce((acc: number, item: any) => acc + ((item.earnablePoints || 0) * item.quantity), 0);
            if (totalProductPoints > 0) {
                pointsEarned = totalProductPoints;
            } else {
                const { data: config } = await supabase
                    .from('loyalty_programs')
                    .select('*')
                    .eq('store_id', activeStore.id)
                    .maybeSingle();

                if (config && config.enabled) {
                    const rate = config.points_per_currency || 1;
                    pointsEarned = Math.floor((saleData.subtotalAmount || saleData.totalAmount) * rate);
                }
            }
        }

        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const safeEmployeeId = user?.id && isUUID(user.id) ? user.id : null;

        const { data: sale, error: saleError } = await supabase.from('sales').insert({
            store_id: activeStore.id,
            business_id: businessId,
            total_amount: saleData.totalAmount,
            payment_method: saleData.paymentMethod,
            employee_id: safeEmployeeId,
            customer_id: customerId,
            status: 'completed',
            points_earned: pointsEarned,
            points_redeemed: saleData.pointsRedeemed || 0,
            loyalty_discount_amount: saleData.loyaltyDiscount || 0,
            tax_amount: saleData.taxAmount || 0,
            total_discount: saleData.totalDiscount || 0
        }).select().single();

        if (saleError || !sale) return null;

        if (saleData.paymentMethod === 'installment') {
            const deposit = parseFloat(saleData.depositAmount) || 0;
            if (deposit > 0) {
                await supabase.from('sale_payments').insert({
                    sale_id: sale.id,
                    business_id: businessId,
                    amount: deposit,
                    payment_method: 'installment_deposit',
                    recorded_by: safeEmployeeId
                });
            }

            if (customerId) {
                const balance = saleData.totalAmount - deposit;
                const { data: instData } = await supabase.from('installments').insert({
                    store_id: activeStore.id,
                    business_id: businessId,
                    customer_id: customerId,
                    sale_id: sale.id,
                    total_amount: saleData.totalAmount,
                    amount_paid: deposit,
                    balance: balance,
                    status: balance <= 0 ? 'completed' : 'active',
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }).select().single();

                if (deposit > 0 && instData) {
                    await supabase.from('installment_payments').insert({
                        installment_id: instData.id,
                        business_id: businessId,
                        amount: deposit,
                        payment_method: 'initial_deposit',
                        recorded_by: safeEmployeeId
                    });
                }
            }
        } else if (saleData.totalAmount > 0) {
            await supabase.from('sale_payments').insert({
                sale_id: sale.id,
                business_id: businessId,
                amount: saleData.totalAmount,
                payment_method: saleData.paymentMethod,
                recorded_by: safeEmployeeId
            });
        }

        if (saleData.items && saleData.items.length > 0) {
            const saleItems = saleData.items.map((item: any) => ({
                sale_id: sale.id,
                business_id: businessId,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price_at_sale: item.price,
                subtotal: item.quantity * item.price
            }));
            await supabase.from('sale_items').insert(saleItems);

            for (const item of saleData.items) {
                const newStock = Math.max(0, item.stock - item.quantity);
                await supabase.from('products')
                    .update({ stock: newStock })
                    .eq('id', item.id)
                    .eq('business_id', businessId);

                // Low Stock Notifications
                if (newStock <= 10) {
                    await supabase.from('notifications').insert({
                        store_id: activeStore.id,
                        business_id: businessId,
                        type: 'low_stock',
                        title: 'Low Stock Alert',
                        message: `${item.name} is running low (${newStock} left).`,
                        metadata: { product_id: item.id, stock: newStock }
                    });

                    sendLowStockAlert({ name: item.name, stock: newStock }, activeStore.id, activeStore.phone || '').catch(console.error);
                }
            }
        }

        if (customerId) {
            const { data: currentCust } = await supabase.from('customers')
                .select('points, total_spent, total_visits')
                .eq('id', customerId)
                .eq('business_id', businessId)
                .single();

            if (currentCust) {
                const pointsRedeemed = saleData.pointsRedeemed || 0;
                await supabase.from('customers').update({
                    points: Math.max(0, (currentCust.points || 0) + pointsEarned - pointsRedeemed),
                    total_spent: (currentCust.total_spent || 0) + saleData.totalAmount,
                    total_visits: (currentCust.total_visits || 0) + 1,
                    last_visit: new Date().toISOString()
                }).eq('id', customerId).eq('business_id', businessId);

                if (pointsEarned > 0) {
                    await supabase.from('loyalty_logs').insert({
                        store_id: activeStore.id,
                        business_id: businessId,
                        customer_id: customerId,
                        points: pointsEarned,
                        type: 'earned',
                        description: `Earned from Sale #${sale.id.slice(0, 8)}`
                    });
                }
                if (pointsRedeemed > 0) {
                    await supabase.from('loyalty_logs').insert({
                        store_id: activeStore.id,
                        business_id: businessId,
                        customer_id: customerId,
                        points: pointsRedeemed,
                        type: 'redeemed',
                        description: `Redeemed on Sale #${sale.id.slice(0, 8)}`
                    });
                }
            }
        }

        return { saleId: sale.id, pointsEarned };
    };

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

    const addToCart = (product: any) => {
        if (product.stock <= 0) return;
        setCart(current => {
            const existing = current.find(item => item.id === product.id);
            if (existing) {
                const newQty = Math.min(existing.quantity + 1, product.stock);
                return current.map(item => item.id === product.id ? { ...item, quantity: newQty } : item);
            }
            return [...current, { ...product, quantity: 1, maxStock: product.stock }];
        });
    };

    const removeFromCart = (id: any) => setCart(current => current.filter(item => item.id !== id));

    const updateCartQuantity = (id: any, delta: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, Math.min(item.quantity + delta, item.maxStock));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const setCartQuantity = (id: any, quantity: number) => {
        setCart(current => current.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(1, Math.min(quantity, item.maxStock)) };
            }
            return item;
        }));
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem('sms_cart');
    };

    const addCustomCategory = (category: string) => {
        if (!customCategories.includes(category)) setCustomCategories([...customCategories, category]);
    };

    const removeCustomCategory = (category: string) => setCustomCategories(customCategories.filter(c => c !== category));

    const uploadImage = async (base64Data: string, storeId: string) => {
        try {
            if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
            const res = await fetch(base64Data);
            const blob = await res.blob();
            const fileName = `${storeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, blob, { contentType: 'image/webp', upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
            return publicUrl;
        } catch (error) {
            console.error('Image upload failed:', error);
            return base64Data;
        }
    };

    const migrateImages = async () => {
        if (!activeStore?.id) return;
        setIsLoading(true);
        try {
            const { data: allProducts } = await supabase.from('products').select('*').eq('store_id', activeStore.id);
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
            fetchTotalCount();
            return count;
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTotalCount = async () => {
        if (!activeStore?.id) return;
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', activeStore.id);
        if (count !== null) setTotalCount(count);
    };

    const getAllProducts = React.useCallback(async (populateGlobalState = false) => {
        if (!activeStore?.id) return [];
        if (populateGlobalState) setIsLoading(true);
        try {
            const { data, error } = await supabase.from('products').select('*').eq('store_id', activeStore.id);
            if (error) throw error;
            if (data) {
                const mapped = data.map((p: any) => ({ ...p, costPrice: p.cost_price || 0, earnablePoints: p.earnable_points || 0, pointsValue: p.points_value || 0 }));
                if (populateGlobalState) {
                    setProducts(mapped);
                    setTotalCount(mapped.length);
                    setIsLoading(false);
                }
                return mapped;
            }
        } catch (e) {
            console.error("Error fetching all products:", e);
            if (populateGlobalState) setIsLoading(false);
        }
        return [];
    }, [activeStore?.id]);

    const addProducts = async (productsData: any[]) => {
        if (!activeStore?.id || productsData.length === 0) return;
        const formatted = productsData.map(p => ({
            store_id: activeStore.id,
            business_id: businessId,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            sku: p.sku,
            barcode: p.barcode || p.sku,
            image: p.image || 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
            cost_price: p.costPrice || 0,
            earnable_points: p.earnablePoints || 0,
            points_value: p.pointsValue || 0,
            estimated_profit: p.estimatedProfit || 0,
            status: p.status || 'In Stock',
            video: p.video || ''
        }));

        const { error } = await supabase.from('products').insert(formatted);
        if (error) {
            console.error("Error adding products:", error);
            showToast('error', 'Failed to add products');
        } else {
            fetchProducts(page, pageSize, searchQuery);
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
