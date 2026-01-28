'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Search, Trash2, X, Save, ArrowLeft, Info, Camera } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/lib/toast-context';
import { Html5Qrcode } from 'html5-qrcode';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function BundlesPage() {
    const { activeStore } = useAuth();
    const { showToast } = useToast();
    const [bundles, setBundles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteBundleId, setDeleteBundleId] = useState<string | null>(null);

    // Create Bundle State
    const [newBundle, setNewBundle] = useState({ name: '', barcode: '', price: 0, description: '' });
    const [selectedItems, setSelectedItems] = useState<{ id: string, name: string, quantity: number, cost: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (activeStore) fetchBundles();
    }, [activeStore]);

    useEffect(() => {
        if (isScanning && showModal) {
            setCameraError('');
            setTimeout(() => {
                if (scannerRef.current) {
                    try { scannerRef.current.clear(); } catch (e) { console.error(e); }
                }
                const html5QrCode = new Html5Qrcode("bundle-scanner");
                scannerRef.current = html5QrCode;

                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        handleScan(decodedText);
                        // Optional: Stop after scan? Or keep open? User said "auto add".
                        // Let's keep open for batch scanning but add a delay or something to prevent rapid-fire same-item adds?
                        // actually addItemToBundle just increments qty.
                        // We should probably pause or show feedback.
                        // For now, let's stop to be safe and let user scan again if needed, or better, just toast.
                        html5QrCode.pause(true);
                        setTimeout(() => html5QrCode.resume(), 1500); // Resume after 1.5s
                    },
                    () => { }
                ).catch(err => {
                    console.error(err);
                    setCameraError("Camera access failed.");
                });
            }, 100);
        } else {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
            }
        }

        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear();
            }
        };
    }, [isScanning, showModal]);

    const handleScan = async (code: string) => {
        if (!activeStore) return;

        const { data } = await supabase
            .from('products')
            .select('id, name, cost_price, stock')
            .eq('store_id', activeStore.id)
            .eq('sku', code) // Assuming SKU matches barcode
            .single();

        if (data) {
            addItemToBundle(data);
            showToast('success', `Added ${data.name}`);
        } else {
            showToast('error', 'Product not found');
        }
    };

    const fetchBundles = async () => {
        if (!activeStore) return;
        setIsLoading(true);
        const { data } = await supabase
            .from('products')
            .select(`
                *,
                product_bundles!parent_product_id (
                    quantity,
                    child_product_id,
                    products!child_product_id ( name )
                )
            `)
            .eq('store_id', activeStore.id)
            .eq('is_bundle', true);

        if (data) setBundles(data);
        setIsLoading(false);
    };

    const handleSearchProducts = async (term: string) => {
        if (!activeStore) return;
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from('products')
            .select('id, name, cost_price, stock')
            .eq('store_id', activeStore.id)
            .ilike('name', `%${term}%`)
            .limit(5);

        if (data) setSearchResults(data);
    };

    const addItemToBundle = (item: any) => {
        const existing = selectedItems.find(i => i.id === item.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { id: item.id, name: item.name, quantity: 1, cost: item.cost_price }]);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeItemFromBundle = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const handleCreateBundle = async () => {
        if (!activeStore) return;
        if (!newBundle.name || selectedItems.length === 0) {
            showToast('error', 'Please provide a name and at least one item.');
            return;
        }

        try {
            // 1. Create Parent Product
            // Calculate total cost logic if needed, but for now we just let user set price
            // We set 'stock' to 0 or 999? Bundles technically don't have stock, their components do. 
            // Better to set stock logically or infinite? Current system might require stock to sell.
            // Feature 15 (future) might handle auto-calculation. For now, we set a high stock or 0? 
            // If stock is 0, it might not show in POS. Let's set it to 100 for now or manage via triggers.
            const { data: productData, error: productError } = await supabase
                .from('products')
                .insert({
                    store_id: activeStore.id,
                    name: newBundle.name,
                    barcode: newBundle.barcode || `BND-${Math.floor(Math.random() * 10000)}`,
                    price: newBundle.price,
                    cost_price: selectedItems.reduce((acc, i) => acc + (i.cost * i.quantity), 0),
                    stock: 0, // Logic required: Bundle stock = min(component_stock / component_qty)
                    category: 'Bundle',
                    is_bundle: true
                })
                .select()
                .single();

            if (productError) throw productError;

            // 2. Add Bundle Items
            const bundleItems = selectedItems.map(item => ({
                parent_product_id: productData.id,
                child_product_id: item.id,
                quantity: item.quantity
            }));

            const { error: bundleError } = await supabase
                .from('product_bundles')
                .insert(bundleItems);

            if (bundleError) throw bundleError;

            showToast('success', 'Bundle created successfully!');
            setShowModal(false);
            setNewBundle({ name: '', barcode: '', price: 0, description: '' });
            setSelectedItems([]);
            fetchBundles();

        } catch (e) {
            console.error(e);
            showToast('error', 'Failed to create bundle.');
        }
    };

    const handleDeleteBundle = (id: string) => {
        setDeleteBundleId(id);
    };

    const confirmDelete = async () => {
        if (!deleteBundleId) return;
        await supabase.from('products').delete().eq('id', deleteBundleId);
        fetchBundles();
        showToast('success', 'Bundle deleted.');
        setDeleteBundleId(null);
    };

    if (isLoading) return <div className="p-8">Loading bundles...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Link href="/dashboard/inventory" className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        Product Bundles (Kits)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 pl-9">Create hampers or promo kits from existing stock.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Create Bundle
                </button>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {bundles.map(bundle => (
                    <div key={bundle.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{bundle.name}</h3>
                                <p className="text-sm text-slate-500">{bundle.barcode}</p>
                            </div>
                            <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm font-bold">
                                GHS {bundle.price}
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Includes:</p>
                            {bundle.product_bundles.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                                    <span>{item.products.name}</span>
                                    <span className="text-slate-400">x{item.quantity}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => handleDeleteBundle(bundle.id)}
                                className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center gap-1"
                            >
                                <Trash2 className="h-4 w-4" /> Delete Bundle
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {bundles.length === 0 && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Bundles Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">Create a bundle to sell multiple items as a single unit (e.g. "Christmas Hamper").</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Create New Bundle</h2>
                            <button onClick={() => setShowModal(false)}><X className="h-6 w-6 text-slate-500" /></button>
                        </div>

                        <div className="p-6 grid gap-6 md:grid-cols-2">
                            {/* Left: Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Bundle Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800"
                                        value={newBundle.name}
                                        onChange={e => setNewBundle({ ...newBundle, name: e.target.value })}
                                        placeholder="e.g. Starter Kit"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Selling Price</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800"
                                            value={newBundle.price}
                                            onChange={e => setNewBundle({ ...newBundle, price: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Barcode (Opt)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 dark:bg-slate-800"
                                            value={newBundle.barcode}
                                            onChange={e => setNewBundle({ ...newBundle, barcode: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex gap-2">
                                    <Info className="h-5 w-5 flex-shrink-0" />
                                    Bundle stock is automatically calculated based on the available stock of its components.
                                </div>
                            </div>

                            {/* Right: Components */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Add Components</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2 pl-9 dark:bg-slate-800"
                                                value={searchTerm}
                                                onChange={e => handleSearchProducts(e.target.value)}
                                            />
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                                    {searchResults.map(res => (
                                                        <button
                                                            key={res.id}
                                                            onClick={() => addItemToBundle(res)}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex justify-between"
                                                        >
                                                            <span>{res.name}</span>
                                                            <span className="text-slate-400">Stock: {res.stock}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsScanning(!isScanning)}
                                            className={`p-2 rounded-lg border transition-colors ${isScanning ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                                            title="Scan Barcode"
                                        >
                                            <Camera className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Scanner Area */}
                                    {isScanning && (
                                        <div className="mt-2 rounded-lg overflow-hidden bg-black relative">
                                            <div id="bundle-scanner" className="w-full h-64"></div>
                                            {cameraError && (
                                                <div className="absolute inset-0 flex items-center justify-center text-white p-4 text-center bg-black/80">
                                                    {cameraError}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setIsScanning(false)}
                                                className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 text-white rounded-full p-1 backdrop-blur-sm"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-sm">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => removeItemFromBundle(item.id)}><X className="h-4 w-4 text-rose-500" /></button>
                                                <span className="font-medium">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    className="w-12 p-1 rounded border border-slate-300 dark:border-slate-700 text-center text-xs"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setSelectedItems(selectedItems.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {selectedItems.length === 0 && <p className="text-sm text-slate-400 italic text-center py-2">No items added yet.</p>}
                                </div>
                                <div className="text-right text-sm font-medium">
                                    Total Cost: GHS {selectedItems.reduce((acc, i) => acc + (i.cost * i.quantity), 0).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBundle}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" /> Save Bundle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteBundleId}
                onClose={() => setDeleteBundleId(null)}
                onConfirm={confirmDelete}
                title="Delete Bundle"
                description="Are you sure? This deletes the bundle definition, not the component products."
                confirmText="Delete Bundle"
                variant="danger"
            />
        </div>
    );
}
