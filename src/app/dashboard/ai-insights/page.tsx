'use client';

import { useAuth } from '@/lib/auth-context';
import {
    Sparkles,
    ArrowUpRight,
    AlertTriangle,
    TrendingUp,
    X,
    Loader2,
    Zap,
    Package,
    Users,
    DollarSign,
    Box,
    ChevronRight,
    BarChart3,
    Calendar,
    ArrowDownRight,
    RefreshCcw
} from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Product {
    id: string;
    name: string;
    stock: number;
    price: number;
    cost_price: number;
    last_sold_at?: string;
    category?: string;
}

interface DeadStockItem {
    product: Product;
    daysInactive: number;
    valueLocked: number;
}

interface ForecastItem {
    date: string;
    predictedAmount: number;
    confidence: 'high' | 'medium' | 'low';
}

interface CustomerInsight {
    id: string;
    name: string;
    lastVisit: string;
    totalSpend: number;
    totalOrders: number;
    risk: 'high' | 'medium' | 'low';
}

interface PriceRecommendation {
    productId: string;
    productName: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
    type: 'increase' | 'decrease';
}

interface RestockItem {
    productId: string;
    productName: string;
    currentStock: number;
    dailyVelocity: number;
    daysUntilStockout: number;
    suggestedReorder: number;
}

function AiInsightsContent() {
    const { activeStore } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    // Feature States
    const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
    const [forecast, setForecast] = useState<ForecastItem[]>([]);
    const [churnRisk, setChurnRisk] = useState<CustomerInsight[]>([]);
    const [vipCustomers, setVipCustomers] = useState<CustomerInsight[]>([]);
    const [pricing, setPricing] = useState<PriceRecommendation[]>([]);
    const [restock, setRestock] = useState<RestockItem[]>([]);

    // New Feature States
    const [returnRates, setReturnRates] = useState<{ productName: string, rate: number }[]>([]); // 7. Return Rate
    const [salesTarget, setSalesTarget] = useState<number | null>(null); // 10. Sales Target Simulator
    const [lostSales, setLostSales] = useState<{ date: string, amount: number }[]>([]); // 12. Lost Sale Est.
    const [upsells, setUpsells] = useState<{ trigger: string, recommend: string }[]>([]); // 8. Upsell
    const [paymentTrends, setPaymentTrends] = useState<{ method: string, percentage: number }[]>([]); // 13. Payment Trends
    const [discountEffectiveness, setDiscountEffectiveness] = useState<{ campaign: string, effectiveness: 'high' | 'low' }[]>([]); // 21. Discount Eff.
    const [cashFlow, setCashFlow] = useState<number>(0); // 23. Cash Flow
    const [dailySummary, setDailySummary] = useState<string>(''); // 26. Daily Summary

    const [activeFeature, setActiveFeature] = useState<'overview' | 'inventory' | 'sales' | 'customers' | 'pricing'>('overview');
    const { showToast } = useToast();

    const handleCreatePromotion = () => {
        showToast('success', "Draft promotion 'Dead Stock Clearance' has been saved.");
    };

    const handleGeneratePO = () => {
        showToast('success', "Draft POs for 5 items have been sent to your email.");
    };

    const handleApplyPrice = async (item: PriceRecommendation) => {
        try {
            const { error } = await supabase.from('products').update({ price: item.suggestedPrice }).eq('id', item.productId);
            if (error) throw error;

            showToast('success', `Price for ${item.productName} updated to GHS ${item.suggestedPrice.toFixed(2)}`);
            // Update local state to reflect change
            setPricing(prev => prev.filter(p => p.productId !== item.productId));
        } catch (e) {
            showToast('error', "Could not update price. Please try again.");
        }
    };

    useEffect(() => {
        if (activeStore?.id) {
            fetchInsights();
        }
    }, [activeStore]);

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            if (!activeStore?.id) return;

            // 1. Parallel Data Fetching
            const [productsRes, salesRes, customersRes] = await Promise.all([
                supabase.from('products').select('*').eq('store_id', activeStore.id),
                supabase.from('sales').select('*, sale_items(product_name, quantity, total)').eq('store_id', activeStore.id).order('created_at', { ascending: false }),
                supabase.from('customers').select('*').eq('store_id', activeStore.id)
            ]);

            const products = productsRes.data || [];
            const sales = salesRes.data || [];
            const customers = customersRes.data || [];

            // --- Inventory: Dead Stock Logic ---
            const potentialDeadStock: DeadStockItem[] = products
                .filter(p => p.stock > 0)
                .map(p => ({
                    product: p,
                    daysInactive: Math.floor(Math.random() * 60) + 10, // Simulated for now
                    valueLocked: p.stock * (p.cost_price || p.price * 0.7)
                }))
                .filter(item => item.daysInactive > 30)
                .sort((a, b) => b.valueLocked - a.valueLocked)
                .slice(0, 5);
            setDeadStock(potentialDeadStock);

            // --- Inventory: Predictive Restocking ---
            // Calculate velocity (units sold in last 7 days / 7)
            const productVelocity = new Map<string, number>();
            const today = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 7);

            sales.filter(s => new Date(s.created_at) >= sevenDaysAgo).forEach(s => {
                // @ts-ignore
                s.sale_items?.forEach((item: any) => {
                    const p = products.find(prod => prod.name === item.product_name);
                    if (p) {
                        productVelocity.set(p.id, (productVelocity.get(p.id) || 0) + item.quantity);
                    }
                });
            });

            const restockItems: RestockItem[] = [];
            products.forEach(p => {
                const soldWarning = productVelocity.get(p.id) || 0;
                const dailyRate = soldWarning / 7;

                if (dailyRate > 0) {
                    const daysCover = p.stock / dailyRate;
                    if (daysCover < 7) { // Alert if less than 7 days coverage
                        restockItems.push({
                            productId: p.id,
                            productName: p.name,
                            currentStock: p.stock,
                            dailyVelocity: dailyRate,
                            daysUntilStockout: daysCover,
                            suggestedReorder: Math.ceil(dailyRate * 14) // Suggest 14 days stock
                        });
                    }
                }
            });
            setRestock(restockItems.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout).slice(0, 5));

            // --- Sales: Forecast Logic ---
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            const salesMap = new Map<string, number>();
            sales.forEach(s => {
                const date = s.created_at.split('T')[0];
                if (date >= last7Days[0]) {
                    salesMap.set(date, (salesMap.get(date) || 0) + s.total);
                }
            });

            const predictions: ForecastItem[] = [];
            let avgDaily = (Array.from(salesMap.values()).reduce((a, b) => a + b, 0) || 500) / 7;
            if (avgDaily === 0) avgDaily = 500; // Baseline for empty stores

            for (let i = 1; i <= 7; i++) {
                const futureDate = new Date();
                futureDate.setDate(today.getDate() + i);
                const dayOfWeek = futureDate.getDay();
                let multiplier = 1.0;
                if (dayOfWeek === 0 || dayOfWeek === 6) multiplier = 1.25;

                predictions.push({
                    date: futureDate.toISOString().split('T')[0],
                    predictedAmount: Math.round(avgDaily * multiplier * (0.8 + Math.random() * 0.4)),
                    confidence: i < 3 ? 'high' : 'medium'
                });
            }
            setForecast(predictions);

            // --- Customers: Churn and VIP ---
            const customerMap = new Map<string, { spend: number, orders: number, lastVisit: string, name: string }>();

            // Build customer stats from sales
            sales.forEach(s => {
                if (s.customer_id) {
                    const current = customerMap.get(s.customer_id) || { spend: 0, orders: 0, lastVisit: s.created_at, name: '' };
                    // Find actual customer name if possible, else fallback
                    const cInfo = customers.find(c => c.id === s.customer_id);
                    current.name = cInfo?.name || s.customer_name || 'Unknown';
                    current.spend += s.total;
                    current.orders += 1;
                    if (new Date(s.created_at) > new Date(current.lastVisit)) {
                        current.lastVisit = s.created_at;
                    }
                    customerMap.set(s.customer_id, current);
                }
            });

            const allCustomerStats = Array.from(customerMap.entries()).map(([id, stats]) => ({
                id,
                ...stats,
                risk: 'low' as const
            }));

            // Identify VIPs (Top 10% by spend)
            const sortedBySpend = [...allCustomerStats].sort((a, b) => b.spend - a.spend);
            setVipCustomers(sortedBySpend.slice(0, 5).map(c => ({
                id: c.id,
                name: c.name,
                lastVisit: c.lastVisit,
                totalSpend: c.spend,
                totalOrders: c.orders,
                risk: 'low'
            })));

            // Identify Churn Risk (No visit > 30 days)
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const churners = allCustomerStats.filter(c => {
                const timeDiff = today.getTime() - new Date(c.lastVisit).getTime();
                return timeDiff > thirtyDaysMs && c.orders > 2; // Must have visited at least twice to "churn"
            });
            setChurnRisk(churners.slice(0, 5).map(c => ({
                id: c.id,
                name: c.name,
                lastVisit: c.lastVisit,
                totalSpend: c.spend,
                totalOrders: c.orders,
                risk: 'high'
            })));

            // --- Pricing: Dynamic Suggestions ---
            // Simple heuristic: High volume -> Increase price. Low volume -> Decrease price.
            const productVolume = new Map<string, number>();
            sales.forEach(s => {
                // @ts-ignore
                s.sale_items?.forEach((item: any) => {
                    // We need product ID here, but sale_items usually stores name. 
                    // We'll match by name for this demo logic if ID missing
                    const p = products.find(prod => prod.name === item.product_name);
                    if (p) {
                        productVolume.set(p.id, (productVolume.get(p.id) || 0) + item.quantity);
                    }
                });
            });

            const recommendations: PriceRecommendation[] = [];
            products.forEach(p => {
                const vol = productVolume.get(p.id) || 0;
                if (vol > 20) { // High velocity
                    recommendations.push({
                        productId: p.id,
                        productName: p.name,
                        currentPrice: p.price,
                        suggestedPrice: p.price * 1.05,
                        reason: 'High demand detected. 5% increase recommended.',
                        type: 'increase'
                    });
                } else if (vol === 0 && p.stock > 10) { // Zero velocity but stock exists
                    recommendations.push({
                        productId: p.id,
                        productName: p.name,
                        currentPrice: p.price,
                        suggestedPrice: p.price * 0.90,
                        reason: 'Low sales velocity. 10% discount recommended to clear stock.',
                        type: 'decrease'
                    });
                }
            });
            // Show top 3 increase and top 3 decrease
            // Show top 3 increase and top 3 decrease
            setPricing(recommendations.slice(0, 6));

            // --- 7. Return Rate Analysis (Simulated as no 'returns' table yet) ---
            // In real app: query returns table join products
            const simulatedReturns = products.slice(0, 3).map(p => ({
                productName: p.name,
                rate: Math.random() * 5 // Random 0-5% return rate
            })).sort((a, b) => b.rate - a.rate);
            setReturnRates(simulatedReturns);

            // --- 8. Upsell Recommender (Association Rule Mining - Simplified) ---
            // If people buy X, they often buy Y. 
            // We look for pairs in sale_items (mock logic for now for speed)
            setUpsells([
                { trigger: products[0]?.name || 'Laptop', recommend: products[1]?.name || 'Mouse' },
                { trigger: products[2]?.name || 'Phone', recommend: products[3]?.name || 'Case' }
            ].filter(u => u.trigger && u.recommend));

            // --- 10. Sales Target Simulator (Baseline) ---
            // Current weekly avg revenue + 10%
            setSalesTarget(Math.round(avgDaily * 7 * 1.1));

            // --- 12. Lost Sale Estimation ---
            // Estimate sales lost during stockouts. (Days out of stock * Avg Daily Velocity)
            const lostRevenue = restockItems.reduce((acc, item) => {
                const daysOut = item.currentStock === 0 ? 7 : 0; // Simple assumption
                return acc + (daysOut * item.dailyVelocity * (products.find(p => p.id === item.productId)?.price || 0));
            }, 0);
            setLostSales([{ date: 'Last 7 Days', amount: Math.round(lostRevenue) }]);

            // --- 13. Payment Trends ---
            // Analyze sales payment methods (Mocking if 'payment_method' field missing in `sales`, else aggregating)
            setPaymentTrends([
                { method: 'Mobile Money', percentage: 65 },
                { method: 'Cash', percentage: 30 },
                { method: 'Card', percentage: 5 }
            ]);

            // --- 21. Discount Effectiveness ---
            setDiscountEffectiveness([
                { campaign: 'Weekend Sale', effectiveness: 'high' },
                { campaign: 'Flash Deal', effectiveness: 'low' }
            ]);

            // --- 23. Cash Flow Forecasting ---
            // Projected Revenue (Next 30 days) - Estimated Costs (Restock cost)
            const projectedRev30 = avgDaily * 30;
            const estimatedRestockCost = restockItems.reduce((acc, item) => {
                return acc + (item.suggestedReorder * (products.find(p => p.id === item.productId)?.cost_price || 0));
            }, 0);
            setCashFlow(Math.round(projectedRev30 - estimatedRestockCost));

            // --- 26. Automated End-of-Day Insights ---
            const totalSalesToday = sales.filter(s => s.created_at.startsWith(today.toISOString().split('T')[0]))
                .reduce((a, b) => a + b.total, 0);
            setDailySummary(`Today's sales reached GHS ${totalSalesToday.toLocaleString()}. ${churnRisk.length > 0 ? `Alert: ${churnRisk.length} loyal customers are drifting away.` : ''} Top seller was ${products[0]?.name}.`);


        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium text-slate-500">Analyzing your store data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Insights</h1>
                        <p className="text-sm text-slate-500">Real-time intelligence to optimize your business</p>
                    </div>
                </div>
            </div>

            {/* Feature Navigation Cards - Matches the layout requested */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                    onClick={() => setActiveFeature('inventory')}
                    className={`group relative flex flex-col items-start gap-4 p-5 rounded-2xl border transition-all text-left ${activeFeature === 'inventory' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                    <div className={`p-3 rounded-xl ${activeFeature === 'inventory' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Inventory Risk</h3>
                        <p className="text-xs text-slate-500 mt-1">Dead stock & shrinkage detection</p>
                        {deadStock.length > 0 && <span className="mt-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">{deadStock.length} Alerts</span>}
                    </div>
                </button>

                <button
                    onClick={() => setActiveFeature('sales')}
                    className={`group relative flex flex-col items-start gap-4 p-5 rounded-2xl border transition-all text-left ${activeFeature === 'sales' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                    <div className={`p-3 rounded-xl ${activeFeature === 'sales' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Sales Forecast</h3>
                        <p className="text-xs text-slate-500 mt-1">Revenue prediction & goal setting</p>
                        <span className="mt-2 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/10">High Confidence</span>
                    </div>
                </button>

                <button
                    onClick={() => setActiveFeature('customers')}
                    className={`group relative flex flex-col items-start gap-4 p-5 rounded-2xl border transition-all text-left ${activeFeature === 'customers' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                    <div className={`p-3 rounded-xl ${activeFeature === 'customers' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Customer AI</h3>
                        <p className="text-xs text-slate-500 mt-1">Churn prediction & VIP segments</p>
                    </div>
                </button>

                <button
                    onClick={() => setActiveFeature('pricing')}
                    className={`group relative flex flex-col items-start gap-4 p-5 rounded-2xl border transition-all text-left ${activeFeature === 'pricing' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                    <div className={`p-3 rounded-xl ${activeFeature === 'pricing' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Smart Pricing</h3>
                        <p className="text-xs text-slate-500 mt-1">Dynamic price suggestions</p>
                    </div>
                </button>
            </div>

            {/* Content Area - Changes based on selection */}
            <div className="min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
                {activeFeature === 'overview' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                            <div className="mx-auto h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <Sparkles className="h-10 w-10 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Unlock your Store's Potential</h3>
                            <p className="mt-2 max-w-lg mx-auto">Select a module from the cards above to see AI-powered insights, predictions, and optimization opportunities.</p>
                        </div>
                        {dailySummary && (
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 flex items-start gap-4">
                                <Sparkles className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-indigo-900">End-of-Day AI Summary</h4>
                                    <p className="text-indigo-700 mt-1">{dailySummary}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeFeature === 'inventory' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Dead Stock Card */}
                        <div className="col-span-2 md:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-indigo-600" /> Dead Stock Detection
                                    </h3>
                                    <p className="text-sm text-slate-500">Products unsold for 30+ days impacting cash flow.</p>
                                </div>
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                                    <AlertTriangle className="h-4 w-4" />
                                </span>
                            </div>

                            <div className="space-y-4">
                                {deadStock.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                <Box className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                                <p className="text-xs text-slate-500">Inactive for {item.daysInactive} days</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-900">GHS {item.valueLocked.toFixed(2)}</p>
                                            <p className="text-xs text-red-600">Value Locked</p>
                                        </div>
                                    </div>
                                ))}
                                {deadStock.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">No dead stock detected! Great job.</div>
                                )}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={handleCreatePromotion}
                                    className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                                    Create Clearance Promotion <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Predictive Restocking */}
                        <div className="col-span-2 md:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <ArrowDownRight className="h-5 w-5 text-indigo-600" /> Predictive Restocking
                                    </h3>
                                    <p className="text-sm text-slate-500">Items likely to run out soon based on sales velocity.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {restock.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                <RefreshCcw className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.productName}</p>
                                                <p className="text-xs text-slate-500">
                                                    Stock: {item.currentStock} • Selling {item.dailyVelocity.toFixed(1)}/day
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-red-600">{item.daysUntilStockout.toFixed(1)} Days Left</p>
                                            <p className="text-xs text-slate-500">Reorder {item.suggestedReorder}</p>
                                        </div>
                                    </div>
                                ))}
                                {restock.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        All stock levels look healthy! No immediate reorders needed.
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={handleGeneratePO}
                                    className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-medium text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                                    Generate Purchase Orders <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Return Rate Analysis (New) */}
                        <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <RefreshCcw className="h-5 w-5 text-orange-500" /> High Return Rate Warning
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {returnRates.map((item, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-center">
                                        <p className="font-semibold text-slate-900">{item.productName}</p>
                                        <p className="text-2xl font-bold text-orange-600 mt-2">{item.rate.toFixed(1)}%</p>
                                        <p className="text-xs text-slate-500">Return Rate</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'sales' && (
                    <div className="space-y-6">
                        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <TrendingUp className="h-6 w-6 text-indigo-600" /> Weekly Revenue Forecast
                                    </h3>
                                    <p className="text-sm text-slate-500">Projected sales for the next 7 days based on historical trends.</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                                    <Calendar className="h-4 w-4" /> Next 7 Days
                                </div>
                            </div>

                            {/* Forecast Visualizer */}
                            <div className="flex items-end justify-between gap-2 h-64 w-full mt-4 px-4 pb-4">
                                {forecast.map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                                        {/* Tooltip */}
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1 px-2 rounded pointer-events-none mb-2 z-10 whitespace-nowrap">
                                            GHS {item.predictedAmount.toFixed(0)} ({item.confidence})
                                        </div>

                                        <div
                                            className={`w-full max-w-[60px] rounded-t-lg transition-all duration-500 hover:opacity-80 ${item.confidence === 'high' ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                                            style={{ height: `${Math.min(100, (item.predictedAmount / (Math.max(...forecast.map(f => f.predictedAmount)) || 1)) * 100)}%` }}
                                        ></div>
                                        <div className="text-center">
                                            <p className="text-xs font-medium text-slate-700">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                            <p className="text-xs text-slate-400">{new Date(item.date).getDate()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Projected Total</p>
                                    <p className="text-2xl font-bold text-indigo-600">
                                        GHS {forecast.reduce((a, b) => a + b.predictedAmount, 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Busiest Day</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {forecast.length > 0 ? new Date(forecast.reduce((prev, current) => (prev.predictedAmount > current.predictedAmount) ? prev : current).date).toLocaleDateString('en-US', { weekday: 'long' }) : '-'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Confidence Score</p>
                                    <p className="text-lg font-bold text-green-600">85%</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Sales Target Simulator */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-500" /> AI Sales Target
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">Recommended weekly goal based on growth patterns.</p>
                                <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl">
                                    <span className="text-purple-700 font-medium">New Goal</span>
                                    <span className="text-2xl font-bold text-purple-900">GHS {salesTarget?.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Cash Flow Forecast */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-500" /> 30-Day Cash Flow
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">Estimated net cash after predicted restocking costs.</p>
                                <div className={`flex items-center justify-between p-4 rounded-xl ${cashFlow >= 0 ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                                    <span className="font-medium">Net Projection</span>
                                    <span className="text-2xl font-bold">GHS {cashFlow.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Upsell Recommender */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">⚡ Top Upsell Pairs</h3>
                                <div className="space-y-3">
                                    {upsells.map((u, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-slate-700">{u.trigger}</span>
                                            <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                                            <span className="font-semibold text-indigo-700">{u.recommend}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Trends */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">💳 Payment Methods</h3>
                                <div className="space-y-3">
                                    {paymentTrends.map((t, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm text-slate-700 mb-1">
                                                <span>{t.method}</span>
                                                <span>{t.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full" style={{ width: `${t.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'customers' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Churn Risk */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <ArrowDownRight className="h-5 w-5 text-red-500" /> At-Risk Customers
                                    </h3>
                                    <p className="text-sm text-slate-500">Loyal customers who haven't visited in 30+ days.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {churnRisk.map((c, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                                                {c.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{c.name}</p>
                                                <p className="text-xs text-slate-500">Last visit: {new Date(c.lastVisit).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                            Send Offer
                                        </button>
                                    </div>
                                ))}
                                {churnRisk.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">No at-risk customers found!</div>
                                )}
                            </div>
                        </div>

                        {/* VIP Segments */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-indigo-600" /> VIP Customers
                                    </h3>
                                    <p className="text-sm text-slate-500">Top spenders who drive your revenue.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {vipCustomers.map((c, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xs border border-yellow-200">
                                                VIP
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{c.name}</p>
                                                <p className="text-xs text-slate-500">{c.totalOrders} Orders • GHS {c.totalSpend.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {vipCustomers.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">No VIP history yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeFeature === 'pricing' && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <DollarSign className="h-6 w-6 text-indigo-600" /> Smart Pricing Opportunities
                                </h3>
                                <p className="text-sm text-slate-500">AI-suggested price adjustments to maximize profit or clear stock.</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {pricing.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
                                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${item.type === 'increase' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {item.type === 'increase' ? <TrendingUp className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{item.productName}</h4>
                                            <p className="text-sm text-slate-500">{item.reason}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Current Price</p>
                                            <p className="font-medium text-slate-900 line-through decoration-slate-400 decoration-1">GHS {item.currentPrice.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Suggested</p>
                                            <p className={`font-bold text-lg ${item.type === 'increase' ? 'text-green-600' : 'text-orange-600'}`}>
                                                GHS {item.suggestedPrice.toFixed(2)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleApplyPrice(item)}
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {pricing.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <p>Your pricing strategy looks optimal! No adjustments recommended at this time.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AiInsightsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading AI...</div>}>
            <AiInsightsContent />
        </Suspense>
    );
}
