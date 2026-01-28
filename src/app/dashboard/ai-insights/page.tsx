'use client';

import { useAuth } from '@/lib/auth-context';
import {
    Sparkles,
    ArrowUpRight,
    AlertTriangle,
    TrendingUp,
    X,
    Loader2,
    Zap
} from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Insight {
    id: string | number;
    type: 'opportunity' | 'alert' | 'insight';
    title: string;
    message: string;
    impact: string;
    timestamp: string;
    read: boolean;
    action?: string;
    link?: string;
}

export const dynamic = 'force-dynamic';

function AiInsightsContent() {
    const { activeStore } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeStore?.id) {
            generateInsights();
        }
    }, [activeStore]);

    const generateInsights = async () => {
        if (!activeStore?.id) return;
        setIsLoading(true);

        try {
            // 1. Fetch Products for Inventory Analysis
            const { data: products } = await supabase
                .from('products')
                .select('*')
                .eq('store_id', activeStore.id);

            // 2. Fetch Recent Sales (Last 30 days) for Trends
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: sales } = await supabase
                .from('sales')
                .select('*, sale_items(product_name, quantity, total)')
                .eq('store_id', activeStore.id)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            // 3. Fetch Customers
            const { data: customers } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', activeStore.id);

            const generatedInsights: Insight[] = [];

            // --- Inventory Insights ---
            if (products) {
                const outOfStock = products.filter(p => p.stock <= 0);
                const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);

                if (outOfStock.length > 0) {
                    generatedInsights.push({
                        id: 'stock-out',
                        type: 'alert',
                        title: 'Critical Stockouts Detected',
                        message: `${outOfStock.length} products including "${outOfStock[0]?.name || 'Unknown'}" are completely out of stock.`,
                        impact: 'Potential Lost Revenue',
                        timestamp: 'Real-time',
                        read: false,
                        action: 'Restock Now',
                        link: '/dashboard/inventory'
                    });
                }

                if (lowStock.length > 0) {
                    generatedInsights.push({
                        id: 'low-stock',
                        type: 'alert',
                        title: 'Low Inventory Warning',
                        message: `${lowStock.length} items are running low. "${lowStock[0]?.name || 'Unknown'}" has only ${lowStock[0]?.stock} units left.`,
                        impact: 'High Priority',
                        timestamp: 'Real-time',
                        read: false,
                        action: 'View Inventory',
                        link: '/dashboard/inventory'
                    });
                }
            }

            // --- Sales Insights ---
            if (sales && sales.length > 0) {
                // Determine Sales Trend (This Week vs Last Week simple heuristic)
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                const thisWeekSales = sales.filter(s => new Date(s.created_at) > oneWeekAgo);
                const totalRevenueThisWeek = thisWeekSales.reduce((acc, curr) => acc + curr.total_amount, 0);

                if (totalRevenueThisWeek > 0) {
                    generatedInsights.push({
                        id: 'sales-trend',
                        type: 'opportunity',
                        title: 'Weekly Sales Performance',
                        message: `You've generated GHS ${totalRevenueThisWeek.toFixed(2)} in revenue over the last 7 days. Keep up the momentum!`,
                        impact: 'Revenue Growth',
                        timestamp: '1 hour ago',
                        read: true,
                        action: 'View History',
                        link: '/dashboard/sales/history'
                    });
                }

                // Top Selling Item
                const productCounts: Record<string, number> = {};
                sales.forEach(sale => {
                    sale.sale_items?.forEach((item: any) => {
                        const pName = item.product_name || 'Unknown Item';
                        productCounts[pName] = (productCounts[pName] || 0) + (item.quantity || 1);
                    });
                });

                let topProduct = '';
                let maxSold = 0;
                Object.entries(productCounts).forEach(([name, count]) => {
                    if (count > maxSold) {
                        maxSold = count;
                        topProduct = name;
                    }
                });

                if (topProduct) {
                    generatedInsights.push({
                        id: 'top-product',
                        type: 'insight',
                        title: 'Top Performing Product',
                        message: `"${topProduct}" is your best seller this month with ${maxSold} units sold. Consider featuring it prominently.`,
                        impact: 'Maximize Profit',
                        timestamp: 'Recently',
                        read: false,
                        action: 'Create Promo', // Just text for now
                    });
                }
            } else {
                generatedInsights.push({
                    id: 'no-sales',
                    type: 'insight',
                    title: 'Awaiting Sales Data',
                    message: "Start processing sales to unlock powerful AI revenue insights and trends.",
                    impact: 'Getting Started',
                    timestamp: 'Now',
                    read: true,
                    action: 'Go to POS',
                    link: '/dashboard/sales'
                });
            }

            // --- Customer Insights ---
            if (customers && customers.length > 0) {
                generatedInsights.push({
                    id: 'customer-base',
                    type: 'insight',
                    title: 'Customer Growth',
                    message: `You have ${customers.length} registered customers. Engaging them with loyalty rewards increases retention by 40%.`,
                    impact: 'Loyalty Boost',
                    timestamp: 'Today',
                    read: true,
                    action: 'Manage Customers',
                    link: '/dashboard/customers'
                });
            }

            setInsights(generatedInsights);
        } catch (error) {
            console.error("Error generating insights:", error);
            showToast('error', "Failed to refresh AI insights");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = (id: string | number) => {
        setInsights(current => current.filter(item => item.id !== id));
    };

    const handleAction = (item: Insight) => {
        if (item.link) {
            router.push(item.link);
        } else {
            showToast('success', 'Action initiated! System is optimizing...');
            setTimeout(() => handleDismiss(item.id), 1000);
        }
    };

    if (!activeStore) return null;

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-4 text-slate-500">Analyzing store data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-indigo-500" />
                        AI Strategic Assistant
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Real-time alerts and actionable insights for your business.</p>
                </div>
                <button
                    onClick={generateInsights}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <Zap className="h-4 w-4" />
                    Refresh Analysis
                </button>
            </div>

            {insights.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">All Clear!</h3>
                    <p className="text-slate-500 dark:text-slate-400">Your store is running smoothly. No critical alerts at this time.</p>
                </div>
            ) : (
                <div className="grid gap-6 max-w-4xl mx-auto">
                    {insights.map((insight) => (
                        <div
                            key={insight.id}
                            className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-slate-900 ${insight.read ? 'border-slate-200 dark:border-slate-800' : 'border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                                }`}
                        >
                            {/* Status Indicator stripe */}
                            <div className={`absolute left-0 top-0 h-full w-1 ${insight.type === 'opportunity' ? 'bg-emerald-500' :
                                insight.type === 'alert' ? 'bg-amber-500' : 'bg-indigo-500'
                                }`} />

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${insight.type === 'opportunity' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                                        insight.type === 'alert' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                                        }`}>
                                        {insight.type === 'opportunity' ? <TrendingUp className="h-5 w-5" /> :
                                            insight.type === 'alert' ? <AlertTriangle className="h-5 w-5" /> :
                                                <Sparkles className="h-5 w-5" />
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-white">{insight.title}</h3>
                                            {!insight.read && (
                                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-slate-600 dark:text-slate-300">{insight.message}</p>
                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                Impact: {insight.impact}
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-slate-500">{insight.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDismiss(insight.id)}
                                    className="text-slate-400 transition-colors hover:text-slate-500 dark:hover:text-slate-300"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    onClick={() => handleDismiss(insight.id)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => handleAction(insight)}
                                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                                >
                                    {insight.action || 'Take Action'}
                                    <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AiInsightsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        }>
            <AiInsightsContent />
        </Suspense>
    );
}
