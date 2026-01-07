'use client';

import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { Search, Filter, Plus, MoreHorizontal, Sparkles, Scan, Trash2, Printer, Barcode, CheckSquare, Square, X, Edit, Video } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function InventoryPage() {
    const { activeStore } = useAuth();
    const { products, addProduct, activeCategories, deleteProduct } = useInventory(); // Assuming deleteProduct exists or will be added

    if (!activeStore) return null;

    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        sku: '',
        category: '',
        stock: 0,
        price: 0,
        costPrice: 0,
        status: 'In Stock',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7', // Default placeholder
        video: ''
    });
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<any | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    const [isScanning, setIsScanning] = useState(false);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSelectProduct = (id: number) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(p => p.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;
        selectedProducts.forEach(id => deleteProduct(id));
        setSelectedProducts([]);
    };

    const handleBulkBarcode = () => {
        const selectedItems = products.filter(p => selectedProducts.includes(p.id));
        if (selectedItems.length === 0) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
                        .item { text-align: center; border: 1px dashed #ccc; padding: 10px; page-break-inside: avoid; }
                        @media print { .item { break-inside: avoid; } }
                    </style>
                </head>
                <body>
                    <div class="grid">
                        ${selectedItems.map(p => `
                            <div class="item">
                                <div style="font-weight: bold; font-size: 10px; margin-bottom: 5px;">${activeStore.name}</div>
                                <div style="font-size: 10px; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                                <svg class="barcode" data-sku="${p.sku}"></svg>
                                <div style="font-weight: bold; font-size: 12px; margin-top: 2px;">GHS ${p.price.toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <script>
                        document.querySelectorAll('.barcode').forEach(el => {
                            JsBarcode(el, el.dataset.sku, {
                                format: "CODE128",
                                width: 1.5,
                                height: 30,
                                fontSize: 10,
                                displayValue: true
                            });
                        });
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 1000);
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handlePrintBarcode = (product: any) => {
        const printWindow = window.open('', '_blank', 'width=300,height=200');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
                </head>
                <body style="text-align: center; padding: 20px; font-family: sans-serif;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${activeStore.name}</div>
                    <div style="font-size: 12px; margin-bottom: 10px;">${product.name}</div>
                    <svg id="barcode"></svg>
                    <div style="font-weight: bold; margin-top: 5px;">GHS ${product.price.toFixed(2)}</div>
                    <script>
                        JsBarcode("#barcode", "${product.sku}", {
                            format: "CODE128",
                            width: 2,
                            height: 40,
                            displayValue: true
                        });
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
    };

    // Scanner Logic
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraError, setCameraError] = useState('');

    useEffect(() => {
        let stream: MediaStream | null = null;

        if (isScanning) {
            setCameraError('');
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play();
                    }
                })
                .catch(err => {
                    console.error("Camera access error:", err);
                    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        setCameraError('No camera found on this device. Please enter manually.');
                    } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setCameraError('Camera permission denied. Please allow camera access.');
                    } else {
                        setCameraError('Unable to access camera. Please enter manually.');
                    }
                });
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isScanning]);

    // Cleanup when closing manually
    const closeScanner = () => {
        setIsScanning(false);
    };

    const handleScan = (code: string) => {
        setNewProduct({ ...newProduct, sku: code });
        setIsScanning(false);
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        addProduct({
            ...newProduct,
            status: newProduct.stock === 0 ? 'Out of Stock' : newProduct.stock < 10 ? 'Low Stock' : 'In Stock'
        });
        setIsAddProductOpen(false);
        setNewProduct({
            name: '',
            sku: '',
            category: '',
            stock: 0,
            price: 0,
            costPrice: 0,
            status: 'In Stock',
            image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7', // Default placeholder
            video: ''
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage products for <span className="font-semibold text-indigo-600">{activeStore.name}</span></p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAiAnalysis(true)}
                        className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Optmize
                    </button>
                    <button
                        onClick={() => setIsAddProductOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {isAddProductOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Product</h2>
                            <button onClick={() => setIsAddProductOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <span className="sr-only">Close</span>
                                <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
                                <input required type="text" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Video URL (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="YouTube link or direct video URL"
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white pl-10"
                                        value={newProduct.video || ''}
                                        onChange={e => setNewProduct({ ...newProduct, video: e.target.value })}
                                    />
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">SKU</label>
                                    <div className="relative">
                                        <input required type="text" value={newProduct.sku} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white pr-10" onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsScanning(true);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors z-10 cursor-pointer"
                                            title="Scan Barcode"
                                        >
                                            <Scan className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                                    <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                        <option value="">Select...</option>
                                        {activeCategories.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost Price (GHS)</label>
                                    <input required type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" onChange={e => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) })} />
                                    <p className="text-xs text-slate-500 mt-1">For profit calc</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price (GHS)</label>
                                    <input required type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stock</label>
                                    <input required type="number" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700">
                                    Create Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    onChange={(e) => setFilterCategory(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                {/* Select All Toggle for Mobile/Desktop */}
                <button
                    onClick={handleSelectAll}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-2 text-sm font-medium"
                >
                    <CheckSquare className={`h-4 w-4 ${selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {/* Product List - List View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700 pb-20 lg:pb-0">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <button onClick={handleSelectAll} className="flex items-center">
                                    <CheckSquare className={`h-5 w-5 ${selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'text-indigo-600' : 'text-slate-300'}`} />
                                </button>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Product</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Video</th>
                            <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">SKU / Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Stock</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Price</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                        {filteredProducts.map((product) => (
                            <tr
                                key={product.id}
                                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedProducts.includes(product.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                onClick={(e) => {
                                    if (!(e.target as HTMLElement).closest('button')) {
                                        handleSelectProduct(product.id);
                                    }
                                }}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectProduct(product.id);
                                        }}
                                        className="text-slate-400 hover:text-indigo-600"
                                    >
                                        {selectedProducts.includes(product.id) ?
                                            <CheckSquare className="h-5 w-5 text-indigo-600" /> :
                                            <Square className="h-5 w-5" />
                                        }
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0">
                                            <img className="h-10 w-10 rounded-lg object-cover" src={product.image} alt={product.name} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{product.name}</div>
                                            <div className="text-xs text-slate-500 sm:hidden">{product.sku}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {product.video ? (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(product.video, '_blank');
                                            }}
                                            className="text-pink-600 hover:text-pink-900 dark:text-pink-400 dark:hover:text-pink-300 p-2 hover:bg-pink-50 rounded-lg dark:hover:bg-pink-900/30 transition-colors"
                                            title="Watch Video"
                                        >
                                            <Video className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No video</span>
                                    )}
                                </td>
                                <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-900 dark:text-white">{product.sku}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{product.category}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        product.status === 'Low Stock' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                        {product.stock} Units
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                    GHS {product.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePrintBarcode(product);
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 hover:bg-indigo-50 rounded-lg dark:hover:bg-indigo-900/30"
                                            title="Print Barcode"
                                        >
                                            <Barcode className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setNewProduct({
                                                    name: product.name,
                                                    sku: product.sku,
                                                    category: product.category,
                                                    stock: product.stock,
                                                    price: product.price,
                                                    costPrice: product.costPrice || 0,
                                                    status: product.status,
                                                    image: product.image,
                                                    video: product.video || ''
                                                });
                                                setIsAddProductOpen(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/30"
                                            title="Edit Product"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this product?')) {
                                                    deleteProduct(product.id);
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/30"
                                            title="Delete Product"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bulk Action Sticky Bar */}
            <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-40 transition-all duration-300 ${selectedProducts.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-[200%] opacity-0'}`}>
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between dark:bg-white dark:text-slate-900 border border-slate-800 dark:border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {selectedProducts.length}
                        </div>
                        <span className="font-medium text-sm hidden sm:inline-block">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkBarcode}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors dark:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-200 dark:hover:text-slate-900"
                        >
                            <Barcode className="h-4 w-4" />
                            <span className="text-sm font-medium">Barcodes</span>
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Delete</span>
                        </button>
                        <div className="w-px h-6 bg-slate-700 dark:bg-slate-200 mx-1"></div>
                        <button
                            onClick={() => setSelectedProducts([])}
                            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 dark:hover:bg-slate-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scanner Modal */}
            {isScanning && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md rounded-2xl bg-slate-900 overflow-hidden shadow-2xl border border-slate-800">
                        <div className="absolute top-4 right-4 z-20">
                            <button onClick={closeScanner} className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 backdrop-blur-sm transition-colors">
                                <span className="sr-only">Close</span>
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="relative aspect-[4/3] bg-black">
                            <video
                                ref={videoRef}
                                className="h-full w-full object-cover opacity-80"
                                playsInline
                                muted
                                autoPlay
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Scanning overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative h-48 w-64 border-2 border-indigo-500/50 rounded-lg">
                                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg animate-pulse"></div>
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan"></div>
                                </div>
                            </div>

                            {/* Status Text */}
                            <div className="absolute bottom-4 left-0 right-0 text-center">
                                <p className="text-sm font-medium text-white shadow-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                                    {cameraError ? cameraError : 'Align barcode within frame'}
                                </p>
                            </div>
                        </div>

                        {/* Manual entry / fallback */}
                        <div className="p-6 bg-slate-900 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-medium">Scanner Active</h3>
                                <div className="flex gap-2">
                                    <span className="animate-ping h-2 w-2 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-indigo-400">Detecting...</span>
                                </div>
                            </div>

                            {/* Simulation Buttons for testing */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleScan('ACC-001')}
                                    className="px-3 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                                >
                                    Simulate 'ACC-001'
                                </button>
                                <button
                                    onClick={() => handleScan('APP-004')}
                                    className="px-3 py-2 text-xs font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                                >
                                    Simulate 'APP-004'
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Optimization Modal */}
            {
                showAiAnalysis && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200 scale-100">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Inventory Analysis</h2>
                                </div>
                                <button onClick={() => setShowAiAnalysis(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <span className="sr-only">Close</span>
                                    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/40">
                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 text-xs dark:bg-indigo-800 dark:text-indigo-300">1</span>
                                        Reorder Recommendation
                                    </h3>
                                    <p className="mt-1 text-sm text-indigo-800/80 dark:text-indigo-300/80">
                                        "Premium Leather Bag" sales velocity has increased by 15%. Stock will deplete in 4 days.
                                    </p>
                                    <button className="mt-3 text-xs font-bold text-indigo-700 hover:underline dark:text-indigo-400">Create Purchase Order &rarr;</button>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40">
                                    <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-700 text-xs dark:bg-amber-800 dark:text-amber-300">2</span>
                                        Dead Stock Alert
                                    </h3>
                                    <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
                                        12 units of "Slim Fit Denim Jeans" haven't moved in 45 days.
                                    </p>
                                    <button className="mt-3 text-xs font-bold text-amber-700 hover:underline dark:text-amber-400">Apply 20% Discount &rarr;</button>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setShowAiAnalysis(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400">Dismiss</button>
                                <button className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Apply All Actions</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
