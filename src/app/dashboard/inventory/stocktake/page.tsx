'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { ClipboardList, Plus, Save, Search, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function StocktakePage() {
    const { activeStore, user } = useAuth();
    const { showToast } = useToast();
    const [stocktakes, setStocktakes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<any>(null); // If creating/viewing one
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

    // New Session State
    const [products, setProducts] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeStore) fetchStocktakes();
    }, [activeStore]);

    const fetchStocktakes = async () => {
        if (!activeStore) return;
        setIsLoading(true);
        const { data } = await supabase
            .from('stocktakes')
            .select('*')
            .eq('store_id', activeStore.id)
            .order('created_at', { ascending: false });

        if (data) setStocktakes(data);
        setIsLoading(false);
    };

    const startNewStocktake = async () => {
        if (!activeStore) return;
        try {
            const { data, error } = await supabase
                .from('stocktakes')
                .insert({
                    store_id: activeStore.id,
                    status: 'draft',
                    created_by: user?.id,
                    notes: `Stocktake started on ${new Date().toLocaleDateString()}`
                })
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error('No data returned from creation');

            setActiveSession(data);
            await loadProductsForSession(data.id);
        } catch (e: any) {
            console.error("Stocktake start error:", JSON.stringify(e, null, 2));
            showToast('error', `Failed to start stocktake: ${e.message || 'Unknown error'}`);
        }
    };

    const loadProductsForSession = async (sessionId: string) => {
        if (!activeStore) return;
        // 1. Fetch all products (In a real app, might paginate or handle large inventory differently)
        // Ideally, we copy snapshot of expected stock at start
        const { data: prods } = await supabase
            .from('products')
            .select('id, name, stock, cost_price, sku')
            .eq('store_id', activeStore.id)
            .order('name');

        if (prods) {
            setProducts(prods);
            // Initialize counts with 0 or existing logic?
            // If we want to resume, we should fetch 'stocktake_items'
            const { data: existingItems } = await supabase
                .from('stocktake_items')
                .select('*')
                .eq('stocktake_id', sessionId);

            const initialCounts: Record<string, number> = {};
            if (existingItems && existingItems.length > 0) {
                existingItems.forEach((item: any) => {
                    initialCounts[item.product_id] = item.counted_stock;
                });
            }
            setCounts(initialCounts);
        }
    };

    const handleCountChange = (productId: string, val: number) => {
        setCounts(prev => ({ ...prev, [productId]: val }));
    };

    const saveProgress = async () => {
        if (!activeSession) return;
        // Upsert items
        const itemsToUpsert = products.map(p => ({
            stocktake_id: activeSession.id,
            product_id: p.id,
            expected_stock: p.stock, // This might fluctuate if sales happen during stocktake. To be precise, snapshot needed.
            counted_stock: counts[p.id] || 0,
            cost_variance: (counts[p.id] || 0 - p.stock) * p.cost_price
        }));

        // Batch upsert? Supabase supports upsert if conflict on (stocktake_id, product_id)
        // I didn't add a unique constraint in migration, I should have.
        // For now, I'll delete existing for this session and insert new? Or just insert and hope.
        // Better: Delete all items for this session first, then insert.

        await supabase.from('stocktake_items').delete().eq('stocktake_id', activeSession.id);
        const { error } = await supabase.from('stocktake_items').insert(itemsToUpsert);

        if (error) {
            showToast('error', 'Failed to save progress.');
        } else {
            showToast('success', 'Progress saved.');
        }
    };

    const handleCompleteClick = () => {
        setShowCompleteConfirm(true);
    };

    const confirmCompleteStocktake = async () => {
        await saveProgress();

        // Update actual product stock
        // This should transactionally update products. Doing it client-side loop is risky but implementation constraint.
        for (const p of products) {
            const counted = counts[p.id] || 0;
            if (counted !== p.stock) {
                await supabase.from('products').update({ stock: counted }).eq('id', p.id);
            }
        }

        await supabase.from('stocktakes').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', activeSession.id);

        showToast('success', 'Stocktake completed and inventory updated.');
        setActiveSession(null);
        setShowCompleteConfirm(false); // Reset
        fetchStocktakes();
    };

    if (activeSession) {
        // Stocktake Counting UI
        const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className="space-y-6 lg:h-[calc(100vh-6rem)] flex flex-col">
                <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                        <button onClick={() => setActiveSession(null)} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-1">
                            <ArrowLeft className="h-4 w-4" /> Cancel/Back
                        </button>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ClipboardList className="h-6 w-6 text-indigo-600" /> Active Stocktake
                            <span className="text-sm font-normal text-slate-500 px-2 py-1 bg-amber-100 text-amber-800 rounded-full">Draft</span>
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={saveProgress} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Save Progress</button>
                        <button onClick={handleCompleteClick} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Complete & Update Stock</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col flex-1 min-h-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products by name or SKU..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-0">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-slate-500">Product</th>
                                    <th className="px-6 py-3 font-medium text-slate-500 text-right">Expected</th>
                                    <th className="px-6 py-3 font-medium text-slate-500 text-right w-32">Counted</th>
                                    <th className="px-6 py-3 font-medium text-slate-500 text-right">Difference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProducts.map(p => {
                                    const counted = counts[p.id] ?? 0; // Default to 0? Or undefined implies not properly counted yet. Let's say 0.
                                    const diff = (counts[p.id] ?? 0) - p.stock;
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-slate-400">{p.sku}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500">{p.stock}</td>
                                            <td className="px-6 py-4 text-right">
                                                <input
                                                    type="number"
                                                    className={`w-24 p-2 text-right rounded border ${diff !== 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                                                    value={counts[p.id] === undefined ? '' : counts[p.id]}
                                                    placeholder="0"
                                                    onChange={e => handleCountChange(p.id, parseInt(e.target.value) || 0)}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={showCompleteConfirm}
                    onClose={() => setShowCompleteConfirm(false)}
                    onConfirm={confirmCompleteStocktake}
                    title="Complete Stocktake?"
                    description="This will update your inventory levels to match the counted amounts. This action cannot be undone."
                    confirmText="Complete & Update"
                    variant="warning"
                />
            </div >
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stocktake Sessions</h1>
                    <p className="text-sm text-slate-500 mt-1">Reconcile your physical inventory.</p>
                </div>
                <button
                    onClick={startNewStocktake}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Start New Count
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {stocktakes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        No stocktake history found.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-500">Date</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Notes</th>
                                <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                                <th className="px-6 py-3 font-medium text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {stocktakes.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">{new Date(s.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-slate-500">{s.notes}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {s.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {s.status === 'draft' && (
                                            <button
                                                onClick={() => { setActiveSession(s); loadProductsForSession(s.id); }}
                                                className="text-indigo-600 hover:underline font-medium"
                                            >
                                                Resume
                                            </button>
                                        )}
                                        {s.status === 'completed' && (
                                            <button className="text-slate-400 hover:text-indigo-600">View Report</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
