'use client';

import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { useToast } from '@/lib/toast-context';
import { Search, Filter, Plus, MoreHorizontal, Sparkles, Scan, Trash2, Printer, Barcode, CheckSquare, Square, X, Edit, Video, Camera, ShoppingCart, Package, ClipboardList } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function InventoryPage() {
    const { activeStore } = useAuth();
    const {
        products,
        isLoading,
        addProduct,
        activeCategories,
        deleteProduct,
        updateProduct,
        page,
        setPage,
        pageSize,
        setPageSize,
        totalCount,
        addToCart,
        cart,
        setCart
    } = useInventory();
    const { showToast } = useToast();

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
    const [showMoreActions, setShowMoreActions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Recently Added');

    const [imageInputType, setImageInputType] = useState<'url' | 'upload'>('url');
    const [isScanning, setIsScanning] = useState(false);
    const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
    const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

    // Image Compression Utility
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimension 800px for small file size
                    const MAX_SIZE = 800;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to WebP with 0.7 quality to stay under 50KB usually
                    const dataUrl = canvas.toDataURL('image/webp', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };
    const [aiInsights, setAiInsights] = useState<{ reorderCandidates: any[], totalValue: number, lowStockCount: number }>({ reorderCandidates: [], totalValue: 0, lowStockCount: 0 });

    // Patch: Ensure scanner stops if component unmounts
    useEffect(() => {
        return () => {
            // Cleanup global scanner if needed, though ref cleanup covers mostly
        }
    }, []);

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        // Handle YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Extract ID
            let videoId = '';
            if (url.includes('v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else {
                videoId = url.split('/').pop() || '';
            }
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        // Return original for direct MP4 links etc (browsers handle many via iframe or we could use <video> tag if needed, but iframe is safer for generic URLs)
        return url;
    };

    const generateAiInsights = () => {
        // 1. Identify Low Stock / Reorder Candidates
        const reorderCandidates = products.filter(p => p.stock > 0 && p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 3);
        const lowStockCount = products.filter(p => p.stock <= 5).length;

        // 2. Identify Dead Stock (High Stock > 50, but we don't have last sale date easily yet, so let's use High Value items instead for now as a 'Watch' list) or just summary
        // Let's rely on reorder for now as it's most useful

        // 3. Total Inventory Value
        const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

        setAiInsights({ reorderCandidates, totalValue, lowStockCount });
        setShowAiAnalysis(true);
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'All' || product.category === filterCategory;

        let matchesStatus = true;
        if (statusFilter === 'Low Stock') matchesStatus = product.stock <= 10 && product.stock > 0;
        else if (statusFilter === 'Out of Stock') matchesStatus = product.stock === 0;
        else if (statusFilter === 'In Stock') matchesStatus = product.stock > 0;
        else if (statusFilter === 'Missing Image') matchesStatus = !product.image || product.image === 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7';

        return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
        if (sortBy === 'Price: High to Low') return b.price - a.price;
        if (sortBy === 'Price: Low to High') return a.price - b.price;
        if (sortBy === 'Stock: High to Low') return b.stock - a.stock;
        if (sortBy === 'Stock: Low to High') return a.stock - b.stock;
        if (sortBy === 'Name') return a.name.localeCompare(b.name);
        // Default / Recently Added (using ID as proxy for creation time if no created_at, or just reverse original order)
        return 0; // Keeping original order (usually insertion order)
    });

    // Pagination/Lazy Loading
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!loadMoreRef.current) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new window.IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !isLoading && products.length < totalCount) {
                setPage(page + 1);
            }
        });
        observer.current.observe(loadMoreRef.current);
        return () => observer.current?.disconnect();
    }, [products, isLoading, totalCount, page, setPage]);

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


    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) return;
        setBulkDeleteConfirmOpen(true);
    };

    const performBulkDelete = () => {
        selectedProducts.forEach(id => deleteProduct(id));
        showToast('success', `Deleted ${selectedProducts.length} products successfully`);
        setSelectedProducts([]);
        setBulkDeleteConfirmOpen(false);
    };

    // Fix: Add missing handleBulkAddToCart
    const handleBulkAddToCart = () => {
        if (selectedProducts.length === 0) return;
        const selectedItems = products.filter(p => selectedProducts.includes(p.id));
        if (selectedItems.length === 0) return;

        selectedItems.forEach(product => {
            addToCart(product);
        });

        showToast('success', `${selectedItems.length} items added to cart`);
        setSelectedProducts([]);
    };

    const handleBulkBarcode = () => {
        if (selectedProducts.length === 0 || !activeStore) return;
        const selectedItems = products.filter(p => selectedProducts.includes(p.id));
        if (selectedItems.length === 0) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const barcodesHtml = selectedItems.map(product => `
            <div style="display: inline-block; width: 200px; text-align: center; padding: 15px; border: 1px dashed #ccc; margin: 5px; border-radius: 4px;">
                <div style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">${activeStore.name}</div>
                <div style="font-size: 10px; margin-bottom: 5px; height: 24px; overflow: hidden;">${product.name}</div>
                <svg id="barcode-${product.id}"></svg>
                <div style="font-size: 10px; font-weight: bold; margin-top: 5px;">GHS ${product.price.toFixed(2)}</div>
                <script>
                    setTimeout(() => {
                        try {
                            JsBarcode("#barcode-${product.id}", "${product.sku}", {
                                format: "CODE128",
                                width: 1.2,
                                height: 30,
                                displayValue: true,
                                fontSize: 10
                            });
                        } catch(e) { console.error(e); }
                    }, 0);
                </script>
            </div>
        `).join('');

        const html = `
            <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
                    <style>
                        @media print {
                            .no-print { display: none; }
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body style="font-family: sans-serif; padding: 20px;">
                    <div class="no-print" style="margin-bottom: 20px; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">Print Now</button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: flex-start;">
                        ${barcodesHtml}
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                // window.print();
                            }, 1000);
                        };
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();

        showToast('success', `Generated ${selectedItems.length} barcodes`);
        setSelectedProducts([]);
    };

    const handleAddToCart = (product: any) => {
        addToCart(product);
        showToast('success', `Added ${product.name} to cart`);
    };

    const handlePrintBarcode = (product: any) => {
        if (!activeStore) return;
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
    // Scanner Logic
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (isScanning) {
            setCameraError('');
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                // Remove existing instance if any (safety check)
                if (scannerRef.current) {
                    try {
                        scannerRef.current.clear();
                    } catch (e) { console.error("Clear error", e); }
                }

                const html5QrCode = new Html5Qrcode("scanner-reader");
                scannerRef.current = html5QrCode;

                const config = { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 };

                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText: string) => {
                        // Call handleScan to search for product and provide feedback
                        handleScan(decodedText);
                        if (scannerRef.current) {
                            scannerRef.current.stop().catch(console.error);
                        }
                    },
                    (_errorMessage: string) => {
                        // ignore errors
                    }
                ).catch((err: any) => {
                    console.error("Scanner failed to start", err);
                    setCameraError("Could not access camera. Please check permissions.");
                });
            }, 100);
        } else {
            // Cleanup if closed via button (state change triggered not by scan success)
            if (scannerRef.current) {
                // We don't wait for promise here as we might be unmounting, but we try
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().then(() => {
                            scannerRef.current?.clear();
                            scannerRef.current = null;
                        }).catch(err => console.error("Stop failed", err));
                    }
                } catch (e) { console.error(e); }
            }
        }

        return () => {
            // Cleanup on unmount
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop().catch(console.error);
                    }
                    scannerRef.current.clear();
                } catch (e) { console.error("Cleanup error", e); }
            }
        };
    }, [isScanning]);

    // Cleanup when closing manually
    const closeScanner = () => {
        setIsScanning(false);
    };

    const handleScan = (code: string) => {
        if (!code) return;

        // Try to find existing product by SKU
        const existingProduct = products.find(p =>
            p.sku && p.sku.toLowerCase().trim() === code.toLowerCase().trim()
        );

        if (existingProduct) {
            // Product found - highlight it and show only this product
            setSelectedProducts([existingProduct.id]);
            setSearchQuery(existingProduct.sku); // Filter to show only this product
            setIsScanning(false);
            showToast('success', `Product found: ${existingProduct.name}`);

            // Scroll to the product
            setTimeout(() => {
                const element = document.getElementById(`product-${existingProduct.id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        } else {
            // Product not found - pre-fill SKU for new product
            setNewProduct({ ...newProduct, sku: code });
            setIsAddProductOpen(true);
            setIsScanning(false);
            showToast('info', 'Product not found. Create a new one with this SKU.');
        }
    };

    const [editingId, setEditingId] = useState<any | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number, name: string } | null>(null);

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        const productData = {
            ...newProduct,
            status: newProduct.stock === 0 ? 'Out of Stock' : newProduct.stock < 10 ? 'Low Stock' : 'In Stock'
        };

        if (editingId) {
            updateProduct({ ...productData, id: editingId });
            showToast('success', 'Product updated successfully');
        } else {
            addProduct(productData);
            showToast('success', 'Product created successfully');
        }

        setIsAddProductOpen(false);
        setEditingId(null);
        setNewProduct({
            name: '',
            sku: '',
            category: '',
            stock: 0,
            price: 0,
            costPrice: 0,
            status: 'In Stock',
            image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
            video: ''
        });
    };

    if (!activeStore) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage products for <span className="font-semibold text-indigo-600">{activeStore.name}</span></p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/inventory/bundles" className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Package className="h-4 w-4" /> Bundles
                    </Link>
                    <Link href="/dashboard/inventory/stocktake" className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <ClipboardList className="h-4 w-4" /> Stocktake
                    </Link>
                    <button
                        onClick={generateAiInsights}
                        className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Optmize
                    </button>
                    <button
                        onClick={() => setIsScanning(true)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <Camera className="h-4 w-4" />
                        Scan
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
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => { setIsAddProductOpen(false); setEditingId(null); }} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <span className="sr-only">Close</span>
                                <svg className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
                                <input required type="text" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Image</label>
                                <div className="flex gap-2 mb-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setImageInputType('url')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${imageInputType === 'url'
                                            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        Image URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImageInputType('upload')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${imageInputType === 'upload'
                                            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        Upload Image
                                    </button>
                                </div>

                                {imageInputType === 'url' ? (
                                    <input
                                        type="text"
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        value={newProduct.image}
                                        onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                                    />
                                ) : (
                                    <div className="w-full">
                                        <div className="relative flex items-center justify-center w-full">
                                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <svg className="w-8 h-8 mb-4 text-slate-500 dark:text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                                    </svg>
                                                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">SVG, PNG, JPG or GIF (Auto-compressed to WebP)</p>
                                                </div>
                                                <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            const compressed = await compressImage(file);
                                                            setNewProduct({ ...newProduct, image: compressed });
                                                        } catch (err) {
                                                            console.error("Compression failed", err);
                                                            showToast('error', 'Image processing failed');
                                                        }
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                        {newProduct.image && newProduct.image.startsWith('data:image') && (
                                            <div className="mt-2 flex items-center justify-between p-2 border border-slate-200 rounded-lg dark:border-slate-700">
                                                <img src={newProduct.image} alt="Preview" className="h-20 object-contain rounded-md" />
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    {Math.round(newProduct.image.length * 0.75 / 1024)} KB (WebP)
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                    <div className="flex flex-col gap-2">
                                        <input
                                            required
                                            type="text"
                                            value={newProduct.sku}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                            onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                                            placeholder="Scan or enter SKU"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsScanning(true)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <Scan className="h-4 w-4" />
                                                Scan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const randomSku = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
                                                    setNewProduct({ ...newProduct, sku: randomSku });
                                                }}
                                                className="flex-1 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                                    <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
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
                                    <input required type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.costPrice} onChange={e => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) })} />
                                    <p className="text-xs text-slate-500 mt-1">For profit calc</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price (GHS)</label>
                                    <input required type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stock</label>
                                    <input required type="number" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700">
                                    {editingId ? 'Update Product' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Filters */}
            <div className="flex flex-col gap-4">
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
                    {/* Select All Toggle for Mobile/Desktop */}
                    <button
                        onClick={handleSelectAll}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-2 text-sm font-medium"
                    >
                        <CheckSquare className={`h-4 w-4 ${selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="flex flex-row gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <select
                        className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={(e) => setFilterCategory(e.target.value)}
                        value={filterCategory}
                    >
                        <option value="All">All Categories</option>
                        {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <select
                        className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={(e) => setStatusFilter(e.target.value)}
                        value={statusFilter}
                    >
                        <option value="All">All Status</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock (&le; 10)</option>
                        <option value="Out of Stock">Out of Stock</option>
                        <option value="Missing Image">Missing Image</option>
                    </select>

                    <select
                        className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        onChange={(e) => setSortBy(e.target.value)}
                        value={sortBy}
                    >
                        <option value="Recently Added">Recently Added</option>
                        <option value="Name">Name (A-Z)</option>
                        <option value="Price: Low to High">Price: Low to High</option>
                        <option value="Price: High to Low">Price: High to Low</option>
                        <option value="Stock: Low to High">Stock: Low to High</option>
                        <option value="Stock: High to Low">Stock: High to Low</option>
                    </select>
                </div>
            </div>

            {/* Product List - List View */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto dark:bg-slate-800 dark:border-slate-700 pb-20 lg:pb-0">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left">
                                <button onClick={handleSelectAll} className="flex items-center">
                                    <CheckSquare className={`h-5 w-5 ${selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? 'text-indigo-600' : 'text-slate-300'}`} />
                                </button>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Product</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Image</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Video</th>
                            <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">SKU / Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Stock</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">Price</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-800 dark:divide-slate-700">
                        {isLoading ? (
                            // Loading skeleton
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skeleton-${i}`} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                            <div className="ml-4 space-y-2">
                                                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                    <td className="hidden sm:table-cell px-6 py-4">
                                        <div className="space-y-2">
                                            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <div className="text-slate-400 dark:text-slate-500">
                                        <p className="text-lg font-medium mb-2">No products found</p>
                                        <p className="text-sm">Add your first product to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    id={`product-${product.id}`}
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
                                            <div className="ml-0">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{product.name}</div>
                                                <div className="text-xs text-slate-500 sm:hidden">{product.sku}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {product.image ? (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveImageUrl(product.image || null);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 hover:bg-indigo-50 rounded-lg dark:hover:bg-indigo-900/30 transition-colors"
                                                title="View Image"
                                            >
                                                <Camera className="h-5 w-5" />
                                            </button>
                                        ) : (
                                            <div className="flex justify-center w-9">
                                                <Camera className="h-5 w-5 text-slate-200 dark:text-slate-700" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {product.video ? (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveVideoUrl(product.video || null);
                                                }}
                                                className="text-pink-600 hover:text-pink-900 dark:text-pink-400 dark:hover:text-pink-300 p-2 hover:bg-pink-50 rounded-lg dark:hover:bg-pink-900/30 transition-colors"
                                                title="Watch Video"
                                            >
                                                <Video className="h-5 w-5" />
                                            </button>
                                        ) : (
                                            <div className="flex justify-center w-9">
                                                <Video className="h-5 w-5 text-slate-200 dark:text-slate-700" />
                                            </div>
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
                                                    e.stopPropagation();
                                                    handleAddToCart(product);
                                                }}
                                                className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 p-2 hover:bg-emerald-50 rounded-lg dark:hover:bg-emerald-900/30"
                                                title="Add to Cart"
                                            >
                                                <ShoppingCart className="h-4 w-4" />
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
                                                        status: product.status || 'In Stock',
                                                        image: product.image || 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
                                                        video: product.video || ''
                                                    });
                                                    setEditingId(product.id);
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
                                                    if (selectedProducts.length > 0 && selectedProducts.includes(product.id)) {
                                                        // Allow single delete even if bulk selected? simpler to just use confirmation
                                                    }
                                                    setDeleteConfirmation({ id: product.id, name: product.name });
                                                }}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/30"
                                                title="Delete Product"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bulk Action Sticky Bar */}
            {/* Bulk Action Sticky Bar */}
            <div className={`fixed bottom-20 lg:bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-[60] transition-all duration-300 ${selectedProducts.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-[200%] opacity-0'}`}>
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between dark:bg-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 relative">
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
                            <span className="text-sm font-medium hidden sm:inline">Barcodes</span>
                        </button>
                        <button
                            onClick={handleBulkAddToCart}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="text-sm font-medium">Add to Cart</span>
                        </button>

                        {/* Desktop Delete */}
                        <button
                            onClick={handleBulkDelete}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Delete</span>
                        </button>

                        {/* Mobile More Actions */}
                        <div className="relative sm:hidden">
                            <button
                                onClick={() => setShowMoreActions(!showMoreActions)}
                                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white dark:bg-slate-100 dark:text-slate-600"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {showMoreActions && (
                                <div className="absolute right-0 bottom-full mb-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => {
                                            handleBulkDelete();
                                            setShowMoreActions(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>

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
                        <div className="relative aspect-[4/3] bg-black overflow-hidden rounded-lg">
                            <div id="scanner-reader" className="w-full h-full"></div>
                        </div>
                        {/* Status Text */}
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <p className="text-sm font-medium text-white shadow-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                                {cameraError ? cameraError : 'Align barcode within frame'}
                            </p>
                        </div>

                        {/* Manual entry / fallback */}
                        <div className="p-6 bg-slate-900 border-t border-slate-800">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-medium">Scanner Active</h3>
                                <div className="flex gap-2">
                                    <span className="animate-ping h-2 w-2 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-indigo-400">Detecting...</span>
                                </div>
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
                                {aiInsights.reorderCandidates.length > 0 ? (
                                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-900/40">
                                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-indigo-700 text-xs dark:bg-indigo-800 dark:text-indigo-300">1</span>
                                            Reorder Recommendation
                                        </h3>
                                        <div className="mt-2 space-y-2">
                                            {aiInsights.reorderCandidates.map(p => (
                                                <div key={p.id} className="text-sm text-indigo-800/80 dark:text-indigo-300/80 flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800/50 pb-1 last:border-0">
                                                    <span>"{p.name}" is running low ({p.stock} units left).</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Consider restocking these items soon.</p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-900/40">
                                        <h3 className="font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                                            <CheckSquare className="h-5 w-5" />
                                            Stock Levels Healthy
                                        </h3>
                                        <p className="mt-1 text-sm text-green-800/80 dark:text-green-300/80">
                                            Great job! No items are critically low on stock.
                                        </p>
                                    </div>
                                )}

                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40">
                                    <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-700 text-xs dark:bg-amber-800 dark:text-amber-300">2</span>
                                        Inventory Value
                                    </h3>
                                    <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
                                        Your total inventory is valued at <span className="font-bold">GHS {aiInsights.totalValue.toFixed(2)}</span>.
                                    </p>
                                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
                                        {aiInsights.lowStockCount > 0 ? `${aiInsights.lowStockCount} items are low on stock.` : "Inventory is fully stocked."}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setShowAiAnalysis(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400">Dismiss</button>
                                <button className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Apply All Actions</button>
                            </div>
                        </div>
                    </div>
                )}
            {/* Video Player Modal */}
            {activeVideoUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <button
                            onClick={() => setActiveVideoUrl(null)}
                            className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white/80 hover:text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <iframe
                            src={getEmbedUrl(activeVideoUrl)}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {activeImageUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setActiveImageUrl(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-2" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setActiveImageUrl(null)}
                            className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white/80 hover:text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-all"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={activeImageUrl}
                            alt="Product Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Single) */}
            <ConfirmDialog
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if (deleteConfirmation) {
                        deleteProduct(deleteConfirmation.id);
                        setDeleteConfirmation(null);
                        showToast('success', 'Product deleted successfully');
                    }
                }}
                title="Delete Product?"
                description={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
                confirmText="Delete Product"
                variant="danger"
            />

            {/* Bulk Delete Dialog */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirmOpen}
                onClose={() => setBulkDeleteConfirmOpen(false)}
                onConfirm={performBulkDelete}
                title={`Delete ${selectedProducts.length} Products?`}
                description={`Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`}
                confirmText={`Delete ${selectedProducts.length} Items`}
                variant="danger"
            />
        </div>
    );
}
