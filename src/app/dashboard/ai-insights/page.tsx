'use client';

import { useAuth } from '@/lib/auth-context';
import {
    Sparkles,
    ArrowUpRight,
    AlertTriangle,
    TrendingUp,
    X,
    Check,
    MessageSquare,
    Zap
} from 'lucide-react';
import { useToast } from '@/lib/toast-context';
import { useState } from 'react';

export default function AiInsightsPage() {
    const { activeStore } = useAuth();
    const { showToast } = useToast();

    // Mock AI Recommendations Data
    const [insights, setInsights] = useState([
        {
            id: 1,
            type: 'opportunity',
            title: 'Price Optimization Opportunity',
            message: 'We\'ve detected that your "Premium Leather Bag" is priced 15% lower than local competitors. Increasing the price by 8% could boost your net profit margin without significantly impacting sales volume.',
            impact: 'Potential +GHS 450.00 / week',
            timestamp: '2 hours ago',
            read: false,
            action: 'Apply Settings'
        },
        {
            id: 2,
            type: 'alert',
            title: 'Inventory Forecast Alert',
            message: 'Based on current sales velocity and upcoming holiday trends, "Running Sneakers" are predicted to stock out in 4 days. Recommended reorder: 50 units immediately.',
            impact: 'Prevent Loss of GHS 1,200.00 Sales',
            timestamp: '5 hours ago',
            read: false,
            action: 'Order Stock'
        },
        {
            id: 3,
            type: 'insight',
            title: 'Customer Segmentation Findings',
            message: '20% of your revenue this month came from "Returning VIPs". Consider launching a dedicated loyalty email campaign to this segment to drive repeat inspections.',
            impact: 'Retention Boost',
            timestamp: '1 day ago',
            read: true,
            action: 'Create Campaign'
        },
        {
            id: 4,
            type: 'alert',
            title: 'Dead Stock Warning',
            message: '"Silver Wrist Watch" has not sold a single unit in 45 days. Consider running a "Clearance Sale" (15% off) to free up capital.',
            impact: 'Unlock Capital: GHS 2,400.00',
            timestamp: '2 days ago',
            read: true,
            action: 'Create Promo'
        }
    ]);

    const handleDismiss = (id: number) => {
        setInsights(current => current.filter(item => item.id !== id));
    };

    const handleAction = (id: number) => {
        // In real app, this would trigger a function or redirect
        showToast('success', 'Optimization applied successfully! System is updating...');
        // Remove the item to simulate action taken
        setTimeout(() => handleDismiss(id), 1000);
    };

    if (!activeStore) return null;

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
            </div>

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

                        <div className="flex items-start gap-4">
                            <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${insight.type === 'opportunity' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                insight.type === 'alert' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                }`}>
                                {insight.type === 'opportunity' ? <TrendingUp className="h-5 w-5" /> :
                                    insight.type === 'alert' ? <AlertTriangle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            {insight.title}
                                            {!insight.read && <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">New</span>}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                            {insight.message}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDismiss(insight.id)}
                                        className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
                                    >
                                        <span className="sr-only">Dismiss</span>
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        <span className={`flex items-center gap-1 ${insight.type === 'opportunity' ? 'text-emerald-600 dark:text-emerald-400' :
                                            insight.type === 'alert' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                            Possible Impact: {insight.impact}
                                        </span>
                                        <span>•</span>
                                        <span>{insight.timestamp}</span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                            Details
                                        </button>
                                        <button
                                            onClick={() => handleAction(insight.id)}
                                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
                                        >
                                            <Check className="h-4 w-4" />
                                            {insight.action}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {insights.length === 0 && (
                    <div className="text-center py-12">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <Check className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">All Clear!</h3>
                        <p className="max-w-sm mx-auto mt-2 text-sm text-slate-500 dark:text-slate-400">
                            You're up to date on all strategic insights. Check back later for more AI recommendations.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
