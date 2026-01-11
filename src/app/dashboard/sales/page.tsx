'use client';

import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { loadSMSConfigFromDB, sendNotification } from '@/lib/sms';
import { useToast } from '@/lib/toast-context';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Receipt, RotateCcw, Scan, Camera, Tag, CheckSquare, Square, X, Users, Edit2, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

export default function SalesPage() {
    const { activeStore, user, updateStoreSettings } = useAuth();
    const {
        products,
        isLoading,
        processSale,
        cart,
        setCart,
        addToCart: contextAddToCart,
        removeFromCart,
        updateCartQuantity,
        setCartQuantity: contextSetCartQuantity,
        clearCart
    } = useInventory();
    const { showToast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
    const [scannedProduct, setScannedProduct] = useState<any | null>(null);



    const searchInputRef = useRef<HTMLInputElement>(null);

    // Price Edit Modal State
    const [priceEditItem, setPriceEditItem] = useState<{ id: number, name: string, currentPrice: number } | null>(null);
    const [priceEditValue, setPriceEditValue] = useState('');

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loyaltyPoints, setLoyaltyPoints] = useState(0);
    const [redeemPoints, setRedeemPoints] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState(100);
    const [existingCustomer, setExistingCustomer] = useState<any>(null);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

    // Fetch Customer on Phone Change
    useEffect(() => {
        const fetchCustomer = async () => {
            if (!activeStore?.id || customerPhone.length < 10) {
                setExistingCustomer(null);
                setLoyaltyPoints(0);
                // Only clear name if we are dropping from a valid customer context or it was auto-filled
                if (existingCustomer) setCustomerName('');
                return;
            }

            setIsLoadingCustomer(true);
            const { data } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', activeStore.id)
                .eq('phone', customerPhone)
                .single();

            if (data) {
                setExistingCustomer(data);
                setCustomerName(data.name);
                setLoyaltyPoints(data.points || 0);
            } else {
                setExistingCustomer(null);
                setCustomerName(''); // Clear to allow manual entry for new customer
                setLoyaltyPoints(0);
            }
            setIsLoadingCustomer(false);
        };

        const debounce = setTimeout(fetchCustomer, 500);
        return () => clearTimeout(debounce);
    }, [customerPhone, activeStore]);

    const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
    const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | null>(null);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);


    // Scanner Logic - must be declared before early return
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [registerId, setRegisterId] = useState('Main-01');
    const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);

    useEffect(() => {
        const storedRegister = localStorage.getItem('sms_register_id');
        if (storedRegister) setRegisterId(storedRegister);

        // Fetch Loyalty Config
        const loadLoyalty = async () => {
            if (!activeStore?.id) return;
            const { data } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();

            if (data) setLoyaltyConfig(data);
        };
        loadLoyalty();
    }, [activeStore]);

    const handleEditRegister = () => {
        const newId = prompt("Enter Register/Terminal Name:", registerId);
        if (newId && newId.trim()) {
            setRegisterId(newId.trim());
            localStorage.setItem('sms_register_id', newId.trim());
        }
    };

    // Scanner useEffect - must be before early return
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

                if (document.getElementById("sales-scanner-reader")) {
                    try {
                        const html5QrCode = new Html5Qrcode("sales-scanner-reader");
                        scannerRef.current = html5QrCode;

                        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

                        html5QrCode.start(
                            { facingMode: "environment" },
                            config,
                            async (decodedText, decodedResult) => {
                                // Stop scanning first
                                if (scannerRef.current && scannerRef.current.isScanning) {
                                    try {
                                        await scannerRef.current.stop();
                                        scannerRef.current.clear();
                                    } catch (e) { console.error("Stop error", e); }
                                }
                                handleScan(decodedText);
                                setIsScanning(false);
                            },
                            (errorMessage) => {
                                // ignore errors
                            }
                        ).catch(err => {
                            console.error("Camera start error:", err);
                            setCameraError("Unable to access camera. Please check permissions.");
                        });
                    } catch (e) {
                        console.error("Scanner init error", e);
                        setCameraError("Failed to initialize scanner.");
                    }
                }
            }, 300); // 300ms delay to ensure Modal animation completes and DOM is ready
        } else {
            // Cleanup immediately if closed
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(e => console.error(e));
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        }

        return () => {
            // Cleanup on unmount/re-run
            if (scannerRef.current) {
                const stopScanner = async () => {
                    try {
                        if (scannerRef.current?.isScanning) {
                            await scannerRef.current.stop();
                        }
                        scannerRef.current?.clear();
                    } catch (e) {
                        console.error("Scanner cleanup error", e);
                    } finally {
                        scannerRef.current = null;
                    }
                };
                stopScanner();
            }
        };
    }, [isScanning]);

    // Early return AFTER all hooks
    if (!activeStore) return null;

    // Audio Refs
    const beepAudio = typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3') : null;
    const errorAudio = typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3') : null;
    const successAudio = typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3') : null;

    const playBeep = () => {
        if (beepAudio) {
            beepAudio.currentTime = 0;
            beepAudio.play().catch(e => console.error("Audio play failed", e));
        }
    };

    const playSuccess = () => {
        if (successAudio) {
            successAudio.currentTime = 0;
            successAudio.play().catch(e => console.error("Audio play failed", e));
        }
    }



    const addToCart = (product: any) => {
        // Prevent out of stock addition
        if (product.stock <= 0) {
            playError();
            showToast('error', 'This item is out of stock!');
            return;
        }

        playBeep();
        contextAddToCart(product);
    };

    const playError = () => {
        if (errorAudio) {
            errorAudio.currentTime = 0;
            errorAudio.play().catch(e => console.error("Audio play failed", e));
        }
    }

    const handleScan = (query: string) => {
        if (!query) return;

        // Safely find product
        const product = products.find(p => {
            const sku = p.sku ? String(p.sku).toLowerCase().trim() : '';
            const name = p.name ? String(p.name).toLowerCase() : '';
            const q = String(query).toLowerCase().trim();

            // Prioritize SKU exact match, then loose match on name
            return sku === q || (name && name.includes(q)) || (sku && sku.includes(q));
        });

        if (product) {
            // Always add to cart in POS
            addToCart(product);
            setSearchQuery('');
        } else {
            playError();
            showToast('error', 'Product not found');
        }
    };

    const updateQuantity = (id: number, delta: number) => {
        updateCartQuantity(id, delta);
    };

    const setCartQuantity = (id: number, quantity: number) => {
        contextSetCartQuantity(id, quantity);
    };

    const updateItemPrice = (id: number, newPrice: number) => {
        const newCart = cart.map(item => {
            if (item.id === id) {
                return { ...item, price: newPrice };
            }
            return item;
        });
        setCart(newCart);
    };


    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Dynamic Tax Calculation
    const taxSettings = activeStore.taxSettings || { enabled: true, type: 'percentage', value: 8 };
    const taxAmount = taxSettings.enabled
        ? (taxSettings.type === 'percentage'
            ? cartTotal * (taxSettings.value / 100)
            : taxSettings.value)
        : 0;

    // Loyalty Redemption Calculation
    const minRedeemPoints = loyaltyConfig?.min_points_to_redeem || 100;
    const loyaltyRedeemValue = (redeemPoints ? pointsToRedeem : 0) * (loyaltyConfig?.redemption_rate || 0.05);

    const grandTotal = Math.max(0, cartTotal + taxAmount - loyaltyRedeemValue);

    const handlePrintReceipt = (transactionId: string) => {
        const receiptWindow = window.open('', '_blank', 'width=400,height=600');
        if (!receiptWindow) return;

        // Calculate totals for receipt
        const totalDiscount = cart.reduce((sum, item) => {
            const originalProduct = products.find(p => p.id === item.id);
            const originalPrice = originalProduct?.price || item.price;
            const diff = originalPrice - item.price;
            return sum + (diff > 0 ? diff * item.quantity : 0);
        }, 0);

        const pointsEarned = loyaltyConfig?.enabled
            ? Math.floor(cartTotal * (loyaltyConfig.points_per_currency || 0.01)) // Use cartTotal (before tax) for points
            : 0;

        const receiptContent = `
            <html>
            <head>
                <title>Receipt ${transactionId}</title>
                <style>
                    @page { margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; font-size: 13px; margin: 0; padding: 25px; line-height: 1.4; color: #000; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .store-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                    .divider { border-top: 1px dashed #000; margin: 12px 0; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .item-name { flex: 1; padding-right: 10px; }
                    .item-total { text-align: right; min-width: 70px; }
                    .summary-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
                    .loyalty-section { margin-top: 20px; text-align: center; font-size: 11px; padding: 10px; border: 1px solid #000; }
                    .loyalty-title { font-weight: bold; margin-bottom: 5px; text-decoration: underline; }
                    .footer { text-align: center; margin-top: 25px; font-size: 11px; }
                    .barcode { text-align: center; margin-top: 15px; font-size: 16px; letter-spacing: 2px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="store-name">${activeStore.name}</div>
                    <div style="font-size: 11px;">${activeStore.location}</div>
                    ${activeStore.phone ? `<div style="font-size: 11px;">Tel: ${activeStore.phone}</div>` : ''}
                    <div class="divider"></div>
                    <div>RECEIPT #${transactionId}</div>
                    <div>${new Date().toLocaleString()}</div>
                    ${customerName ? `<div style="font-weight: bold;">CUSTOMER: ${customerName.toUpperCase()}</div>` : ''}
                    <div>CASHIER: ${(user?.name || 'Staff').toUpperCase()}</div>
                </div>
                
                <div class="divider"></div>
                
                ${cart.map(item => `
                    <div class="item">
                        <span class="item-name">${item.name} x${item.quantity}</span>
                        <span class="item-total">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                
                <div class="divider"></div>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                ${totalDiscount > 0 ? `
                <div class="summary-row" style="color: #444;">
                    <span>Direct Discount</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                </div>` : ''}

                ${taxSettings.enabled && taxAmount > 0 ? `
                <div class="summary-row">
                    <span>Tax (${taxSettings.type === 'percentage' ? taxSettings.value + '%' : 'Fixed'})</span>
                    <span>${taxAmount.toFixed(2)}</span>
                </div>` : ''}
                
                ${redeemPoints ? `
                <div class="summary-row">
                    <span>Loyalty Redemption</span>
                    <span>-${loyaltyRedeemValue.toFixed(2)}</span>
                </div>` : ''}
                
                <div class="total-row">
                    <span>TOTAL</span>
                    <span>GHS ${grandTotal.toFixed(2)}</span>
                </div>
                
                <div class="summary-row" style="margin-top: 5px;">
                    <span>Payment Method</span>
                    <span style="text-transform: uppercase;">${paymentMethod}</span>
                </div>

                ${(customerName && loyaltyConfig?.enabled) ? `
                <div class="loyalty-section">
                    <div class="loyalty-title">LOYALTY SUMMARY</div>
                    ${redeemPoints ? `<div class="summary-row"><span>Points Used:</span> <span>${pointsToRedeem}</span></div>` : ''}
                    <div class="summary-row"><span>Points Earned:</span> <span>+${pointsEarned}</span></div>
                    <div class="summary-row" style="font-weight: bold; border-top: 0.5px solid #ccc; margin-top: 3px; padding-top: 3px;">
                        <span>New Balance:</span> <span>${redeemPoints ? (loyaltyPoints - pointsToRedeem + pointsEarned) : (loyaltyPoints + pointsEarned)}</span>
                    </div>
                </div>` : ''}

                <div class="barcode">
                    *${transactionId}*
                </div>
                
                <div class="footer">
                    THANK YOU FOR SHOPPING WITH US!<br>
                    PLEASE KEEP YOUR RECEIPT FOR RETURNS
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        receiptWindow.document.write(receiptContent);
        receiptWindow.document.close();
    };

    // Customer Lookup
    const checkCustomer = (phone: string) => {
        // In future, call Supabase customers table
        // For now, minimal local check or leave empty until backend hook is ready
        // Removing mock logic for "John Doe"
        setLoyaltyPoints(0);
        if (customerName === 'John Doe (Loyal)') setCustomerName('');
    };


    const handleCheckout = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // Process Payment Logic would go here

            // Generate transaction ID with store prefix and sequential number
            const transactionNumber = (activeStore.lastTransactionNumber || 0) + 1;
            const prefix = activeStore.receiptPrefix || 'TRX';
            const suffix = activeStore.receiptSuffix || '';
            const paddedNumber = transactionNumber.toString().padStart(5, '0');
            const trxId = `${prefix}-${paddedNumber}${suffix}`;

            // Process Inventory Sync & DB Save
            const saleId = await processSale({
                items: cart.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: grandTotal,
                paymentMethod: paymentMethod!,
                customer: (customerName || customerPhone) ? {
                    name: customerName,
                    phone: customerPhone
                } : undefined
            });

            if (!saleId) {
                showToast('error', "Failed to process sale. Please try again.");
                return;
            }

            // Update transaction counter in database
            const { error: storeUpdateError } = await supabase
                .from('stores')
                .update({ last_transaction_number: transactionNumber })
                .eq('id', activeStore.id);

            if (!storeUpdateError) {
                // CRITICAL: Update local state so next transaction ID is incremented
                updateStoreSettings({ lastTransactionNumber: transactionNumber });
            }

            // Create order notification
            await supabase.from('notifications').insert({
                store_id: activeStore.id,
                type: 'order',
                title: `New Order #${trxId}`,
                message: `${customerName || 'A customer'} placed a new order for GHS ${grandTotal.toFixed(2)}.`,
                metadata: {
                    sale_id: saleId,
                    transaction_id: trxId,
                    amount: grandTotal,
                    customer: customerName || 'Guest'
                }
            });

            const pointsEarned = loyaltyConfig?.enabled
                ? Math.floor(cartTotal * (loyaltyConfig.points_per_currency || 0.01)) // Use cartTotal (before tax) for points
                : 0;

            // --- Update Customer Loyalty Points & Stats ---
            if (customerPhone) {
                // 1. Fetch fresh customer data to ensure we have the latest points/existence
                const { data: freshCust } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('store_id', activeStore.id)
                    .eq('phone', customerPhone)
                    .single();

                if (freshCust) {
                    // Calculate based on DB data
                    const currentDbPoints = freshCust.points || 0;
                    // If redeeming, we subtract 100, then add earned. 
                    // Note: grandTotal already has the discount applied if redeemPoints was true, 
                    // so we don't need to adjust pointsEarned, just the starting balance.
                    // If redeeming, we subtract the redemption amount
                    // Note: grandTotal already has the discount applied if redeemPoints was true
                    const finalPoints = redeemPoints
                        ? (currentDbPoints - pointsToRedeem) + pointsEarned
                        : currentDbPoints + pointsEarned;

                    await supabase.from('customers').update({
                        points: finalPoints,
                        total_spent: (freshCust.total_spent || 0) + grandTotal,
                        total_visits: (freshCust.total_visits || 0) + 1,
                        last_visit: new Date().toISOString()
                    }).eq('id', freshCust.id);

                    // Update Local State for UI
                    setLoyaltyPoints(finalPoints);
                    setExistingCustomer({
                        ...freshCust,
                        points: finalPoints,
                        total_spent: (freshCust.total_spent || 0) + grandTotal,
                        total_visits: (freshCust.total_visits || 0) + 1
                    });
                    setRedeemPoints(false);

                    // --- Notifications ---
                    // Trigger 'new customer' welcome if they were just created (points check or created_at check?)
                    // Since we just updated them, let's use the local 'existingCustomer' state check
                    // If existingCustomer was null BEFORE this transaction, they are new.
                    if (!existingCustomer) {
                        await sendNotification('welcome', {
                            customerName: freshCust.name,
                            customerPhone: customerPhone
                        });
                    }

                    // Sale Receipt
                    await sendNotification('sale', {
                        id: trxId,
                        amount: grandTotal,
                        customerPhone: customerPhone,
                        customerName: customerName,
                        ownerPhone: user?.phone, // Send to current user's phone as owner notification
                        items: cart.length,
                        pointsEarned: pointsEarned,
                        totalPoints: finalPoints,
                        staffName: user?.name,
                        storeId: activeStore.id
                    });

                } else {
                    console.warn("Customer not found for points update after sale processing", customerPhone);
                }
            }

            console.log(`Processing Sale: ${trxId}`);
            handlePrintReceipt(trxId);

            // Play Success Sound
            playSuccess();

            setShowCheckoutSuccess(true);
            setCart([]);
            localStorage.removeItem('sms_cart');
            setCustomerName('');
            setCustomerPhone('');
            setLoyaltyPoints(0);
            setRedeemPoints(false);

            setTimeout(() => {
                setShowCheckoutSuccess(false);
            }, 3000);
        } finally {
            setIsProcessing(false);
        }
    };


    const filteredProducts = products.filter(p =>
        (p.name && String(p.name).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && String(p.category).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && String(p.sku).toLowerCase().includes(searchQuery.toLowerCase()))
    );



    // ... (keep existing scanner/modal logic)

    return (
        <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative flex flex-col lg:flex-row gap-4 lg:gap-6">

            {/* Scanner Overlay Modal */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full h-full lg:h-auto lg:max-w-2xl rounded-none lg:rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 flex flex-col">
                        <div className="mb-4 flex items-center justify-between flex-shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Camera className="h-6 w-6 text-indigo-600" /> Scanner Active
                            </h2>
                            <button onClick={() => setIsScanning(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-6 w-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 flex items-center justify-center relative bg-slate-950 rounded-xl overflow-hidden mb-6">
                            {/* Real Camera Feed */}
                            <div id="sales-scanner-reader" className="w-full h-full"></div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/20">
                            <p className="text-sm text-center text-indigo-700 dark:text-indigo-400 font-medium">
                                📦 Scan to add items to cart
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Details Modal */}
            {scannedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Product Scanned</h3>
                            <button onClick={() => setScannedProduct(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>
                        <img src={scannedProduct.image} className="w-32 h-32 rounded-xl mx-auto mb-4 bg-slate-100 object-cover" />
                        <div className="text-center space-y-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{scannedProduct.name}</h4>
                            <p className="text-sm text-slate-500">{scannedProduct.sku}</p>
                            <p className="text-2xl font-bold text-indigo-600">GHS {scannedProduct.price.toFixed(2)}</p>
                        </div>
                        <div className="mt-6">
                            <button onClick={() => setScannedProduct(null)} className="w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Success Modal */}
            {showCheckoutSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
                            <Receipt className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                        <p className="text-slate-500 mb-6">Transaction completed successfully.</p>
                        <div className="animate-pulse flex justify-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                            <div className="h-2 w-2 rounded-full bg-indigo-600 delay-75"></div>
                            <div className="h-2 w-2 rounded-full bg-indigo-600 delay-150"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Side: Product List */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900 lg:pr-2">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Point of Sale</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            Register:
                            <button onClick={handleEditRegister} className="font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                                {registerId} <Edit2 className="h-3 w-3" />
                            </button>
                        </p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        {/* Removed scan mode toggle - POS always adds to cart */}
                    </div>
                </div>

                {/* Search & Scan Bar */}
                <div className="mb-4 sm:mb-6 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search or scan..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleScan(searchQuery);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                            onClick={() => setIsScanning(true)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600"
                            title="Open Camera Scanner"
                        >
                            <Scan className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Product List View */}
                <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                    <div className="space-y-3">
                        {/* Headers primarily for desktop, hidden on very small screens if needed, but useful */}
                        <div className="grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            <div className="col-span-8 sm:col-span-6">Product</div>
                            <div className="hidden sm:block sm:col-span-3">Details / Stock</div>
                            <div className="col-span-3 sm:col-span-2 text-right">Price</div>
                            <div className="col-span-1"></div>
                        </div>

                        {isLoading ? (
                            // Loading skeleton
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={`skeleton-${i}`} className="grid grid-cols-12 gap-2 sm:gap-4 items-center rounded-xl border border-slate-200 bg-white p-2 sm:p-3 shadow-sm dark:border-slate-800 dark:bg-slate-800 animate-pulse">
                                    <div className="col-span-8 sm:col-span-6 flex items-center gap-3 sm:gap-4">
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                            <Camera className="h-5 w-5 text-slate-300" />
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block sm:col-span-3">
                                        <div className="space-y-2">
                                            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="col-span-3 sm:col-span-2 text-right">
                                        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto"></div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg ml-auto"></div>
                                    </div>
                                </div>
                            ))
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400 dark:text-slate-500 text-lg">No products found</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Try adjusting your search</p>
                            </div>
                        ) : (
                            filteredProducts.map(product => {
                                const cartItem = cart.find(item => item.id === product.id);
                                const qty = cartItem ? cartItem.quantity : 0;

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => {
                                            // Mobile Tap to Add
                                            if (window.innerWidth < 1024) addToCart(product);
                                        }}
                                        className={`group relative grid grid-cols-12 gap-2 sm:gap-4 items-center rounded-xl border ${qty > 0 ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-200 bg-white'} p-2 sm:p-3 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-800 dark:hover:border-indigo-900 active:scale-[0.99] lg:active:scale-100`}
                                    >
                                        <div className="col-span-8 sm:col-span-6 flex items-center gap-3 sm:gap-4">
                                            <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg dark:bg-slate-800">
                                                {product.image ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveImageUrl(product.image);
                                                        }}
                                                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Camera className="h-6 w-6" />
                                                    </button>
                                                ) : (
                                                    <Camera className="h-6 w-6 text-slate-200" />
                                                )}
                                                {qty > 0 && (
                                                    <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-indigo-600 text-[10px] font-bold text-white flex items-center justify-center shadow-sm sm:hidden border-2 border-white dark:border-slate-800">
                                                        {qty}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{product.name}</h3>
                                                <p className="text-xs text-slate-500">{product.sku}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block sm:col-span-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    <Tag className="h-3 w-3" />
                                                    {product.category}
                                                </span>
                                                <span className={`text-xs font-bold ${product.stock > 10 ? 'text-emerald-600 dark:text-emerald-400' : product.stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                    {product.stock} in stock
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 sm:col-span-2 text-right">
                                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                {product.price.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="col-span-1 text-right flex justify-end">
                                            {qty > 0 ? (
                                                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm animate-in zoom-in">
                                                    {qty}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(product);
                                                    }}
                                                    disabled={product.stock <= 0}
                                                    className={`rounded-lg p-2 transition-colors hidden sm:inline-block ${product.stock <= 0
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40'}`}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            )}

                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Cart Bar */}
            <div className={`fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-slate-200 lg:hidden z-[60] dark:bg-slate-950 dark:border-slate-800 transition-transform duration-300 ${showMobileCart ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cart.length} items in cart</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">GHS {grandTotal.toFixed(2)}</p>
                    </div>
                    <button
                        onClick={() => setShowMobileCart(true)}
                        disabled={cart.length === 0}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        View Cart
                    </button>
                </div>
            </div>

            {/* Right Side: Cart/Checkout - Responsive Sidebar/Modal */}
            <div className={`
                fixed inset-0 z-[60] bg-white/50 backdrop-blur-sm lg:hidden
                ${showMobileCart ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-200'}
                transition-opacity duration-300
            `} onClick={() => setShowMobileCart(false)} />

            <div className={`
                fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-900
                lg:static lg:h-full lg:w-96 lg:bg-transparent lg:shadow-none lg:translate-x-0 lg:z-0
                ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="h-full flex flex-col rounded-none lg:rounded-2xl border-l lg:border border-slate-200 lg:bg-white lg:shadow-xl dark:border-slate-800 dark:lg:bg-slate-900">
                    <div className="border-b border-slate-200 p-4 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" /> Current Order
                            </h2>
                        </div>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {cart.length} items
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                                <ShoppingCart className="mb-4 h-16 w-16 opacity-20" />
                                <p>Cart is empty</p>
                                <p className="text-sm">Scan items to add to cart</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex gap-3 animate-in slide-in-from-right-4 duration-300">
                                    <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                        {(products.find(p => p.id === item.id)?.image || item.image) ? (
                                            <button
                                                onClick={() => setActiveImageUrl(products.find(p => p.id === item.id)?.image || item.image)}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Camera className="h-6 w-6" />
                                            </button>
                                        ) : (
                                            <Camera className="h-6 w-6 text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-medium text-slate-900 line-clamp-2 dark:text-slate-100">{item.name}</h4>
                                            <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 ml-2">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-l-lg text-slate-600 dark:text-slate-400">
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => setCartQuantity(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-12 text-center text-xs font-medium bg-transparent outline-none dark:text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-none p-0 focus:ring-0"
                                                />
                                                <button onClick={() => addToCart(item)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-r-lg text-slate-600 dark:text-slate-400">
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <button
                                                    onClick={() => {
                                                        setPriceEditItem({
                                                            id: item.id,
                                                            name: item.name,
                                                            currentPrice: item.price
                                                        });
                                                        setPriceEditValue(item.price.toString());
                                                    }}
                                                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 border-b border-dashed border-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:text-slate-100 dark:border-slate-600"
                                                >
                                                    {`GHS ${(item.price * item.quantity).toFixed(2)}`}
                                                    <Edit2 className="h-3 w-3 opacity-50" />
                                                </button>
                                                {item.costPrice && item.price <= item.costPrice && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                                                        <AlertTriangle className="h-3 w-3" /> Below Cost
                                                    </span>
                                                )}
                                                {item.costPrice && item.price > item.costPrice && item.price < item.costPrice * 1.05 && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                                        <AlertTriangle className="h-3 w-3" /> Low Margin
                                                    </span>
                                                )}
                                                {item.price !== products.find((p: any) => p.id === item.id)?.price && (
                                                    <span className="text-[10px] text-slate-400 line-through">
                                                        {`Std: ${(products.find((p: any) => p.id === item.id)?.price || 0).toFixed(2)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 rounded-none lg:rounded-b-2xl">
                        {/* Customer & Loyalty Section */}
                        <div className="mb-4 space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/30 dark:bg-indigo-900/20">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        placeholder="Customer Phone"
                                        maxLength={10}
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                        value={customerPhone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setCustomerPhone(val);
                                        }}
                                    />
                                    {isLoadingCustomer && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Existing Customer Found */}
                            {existingCustomer && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                {customerName.charAt(0)}
                                            </span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{loyaltyPoints} Points</span>
                                    </div>
                                    {loyaltyPoints >= (loyaltyConfig?.min_points_to_redeem || 100) && (
                                        <div className="mt-2 space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={redeemPoints}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setRedeemPoints(isChecked);
                                                        if (isChecked) {
                                                            setPointsToRedeem(loyaltyConfig?.min_points_to_redeem || 100);
                                                        }
                                                    }}
                                                    className="h-3 w-3 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    Redeem Loyalty Points
                                                </span>
                                            </label>

                                            {redeemPoints && (
                                                <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setPointsToRedeem(Math.max(loyaltyConfig?.min_points_to_redeem || 100, pointsToRedeem - 100))}
                                                            disabled={pointsToRedeem <= (loyaltyConfig?.min_points_to_redeem || 100)}
                                                            className="h-6 w-6 flex items-center justify-center rounded bg-white shadow text-indigo-600 disabled:opacity-50 dark:bg-slate-800"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 w-12 text-center">
                                                            {pointsToRedeem}
                                                        </span>
                                                        <button
                                                            onClick={() => setPointsToRedeem(Math.min(loyaltyPoints, pointsToRedeem + 100))}
                                                            disabled={pointsToRedeem + 100 > loyaltyPoints}
                                                            className="h-6 w-6 flex items-center justify-center rounded bg-white shadow text-indigo-600 disabled:opacity-50 dark:bg-slate-800"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        -GHS {((pointsToRedeem) * (loyaltyConfig?.redemption_rate || 0.05)).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* New Customer Input - Shown if phone is valid but no user found */}
                            {!existingCustomer && customerPhone.length >= 10 && !isLoadingCustomer && (
                                <div className="space-y-2 animate-in fade-in">
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Plus className="h-3 w-3" /> New customer registration
                                    </div>
                                    <div className="relative">
                                        <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter Customer Name"
                                            value={customerName}
                                            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>Subtotal</span>
                                <span>{`GHS ${cartTotal.toFixed(2)}`}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>Tax</span>
                                <span>{`GHS ${taxAmount.toFixed(2)}`}</span>
                            </div>
                            {redeemPoints && (
                                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    <span>Loyalty</span>
                                    <span>- GHS {loyaltyRedeemValue.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>Total</span>
                                <span>{`GHS ${grandTotal.toFixed(2)}`}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                            >
                                <Banknote className={`h-6 w-6 ${paymentMethod === 'cash' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('momo')}
                                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm font-medium transition-all ${paymentMethod === 'momo' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                            >
                                <Smartphone className={`h-6 w-6 ${paymentMethod === 'momo' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} /> MoMo
                            </button>
                        </div>

                        <button
                            onClick={() => setShowCheckoutConfirm(true)}
                            disabled={cart.length === 0 || !paymentMethod || isProcessing}
                            className="w-full rounded-xl bg-indigo-600 py-3.5 text-center font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                            title={isProcessing ? "Processing..." : (!paymentMethod ? "Please select a payment method" : "")}
                        >
                            {isProcessing ? 'Processing...' : (paymentMethod ? `Checkout • GHS ${grandTotal.toFixed(2)}` : 'Select Payment Method')}
                        </button>
                    </div>

                    {/* Checkout Confirmation Modal */}
                    {showCheckoutConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Order</h3>
                                <p className="text-slate-500 mb-6">
                                    Are you sure you want to place this order for <span className="font-bold text-slate-900 dark:text-slate-100">GHS {grandTotal.toFixed(2)}</span>?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCheckoutConfirm(false)}
                                        className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowCheckoutConfirm(false);
                                            // All payment methods (cash, momo, card) now proceed directly to checkout
                                            handleCheckout();
                                        }}
                                        className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Price Edit Modal */}
            {
                priceEditItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Edit Price</h3>
                            <p className="text-sm text-slate-500 mb-4">Set new price for <span className="font-semibold">{priceEditItem.name}</span></p>

                            <div className="relative mb-6">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-12 pr-4 text-lg font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                    value={priceEditValue}
                                    onChange={(e) => setPriceEditValue(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPriceEditItem(null)}
                                    className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const val = parseFloat(priceEditValue);
                                        if (!isNaN(val) && val >= 0) {
                                            updateItemPrice(priceEditItem.id, val);
                                            setPriceEditItem(null);
                                        }
                                    }}
                                    className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
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
        </div >
    );
}
