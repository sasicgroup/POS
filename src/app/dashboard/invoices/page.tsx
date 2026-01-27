'use client';

import { useState, useRef } from 'react';
import { useInventory } from '@/lib/inventory-context';
import { useAuth } from '@/lib/auth-context';
import { Plus, Trash2, Download, Printer, FileText, Search, User, Calendar, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/lib/toast-context';

/* 
  Extend jsPDF type definition to include autoTable 
  (This is a common workaround if types are not perfectly aligned)
*/
interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: any) => jsPDF;
}

export default function InvoiceGenerator() {
    const { user, activeStore } = useAuth();
    const { products } = useInventory();
    const { showToast } = useToast();

    // Invoice Meta
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDetails, setCustomerDetails] = useState({
        email: '',
        address: ''
    });

    // Invoice Items
    const [items, setItems] = useState<Array<{
        id: string | number;
        name: string;
        quantity: number;
        price: number;
        description?: string;
    }>>([]);

    // Product Search
    const [searchQuery, setSearchQuery] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    // Other settings
    const [taxRate, setTaxRate] = useState(0);
    const [notes, setNotes] = useState('Thank you for your business!');
    const [terms, setTerms] = useState('Payment is due within 15 days.');

    const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const calculateTax = () => calculateSubtotal() * (taxRate / 100);
    const calculateTotal = () => calculateSubtotal() + calculateTax();

    const addItem = (product?: any) => {
        if (product) {
            const existing = items.find(i => i.id === product.id);
            if (existing) {
                setItems(items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
            } else {
                setItems([...items, {
                    id: product.id,
                    name: product.name,
                    quantity: 1,
                    price: product.price,
                    description: product.description || ''
                }]);
            }
            setSearchQuery('');
            setShowProductDropdown(false);
        } else {
            // Add custom item
            setItems([...items, {
                id: `custom-${Date.now()}`,
                name: 'New Item',
                quantity: 1,
                price: 0,
                description: ''
            }]);
        }
    };

    const removeItem = (id: string | number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string | number, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const generatePDF = () => {
        if (!activeStore) return;

        const doc = new jsPDF() as jsPDFWithAutoTable;

        // Colors
        const primaryColor = [79, 70, 229]; // Indigo 600

        // Header
        doc.setFontSize(20);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("INVOICE", 150, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`#${invoiceNumber}`, 150, 25);

        // Store Info
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(activeStore.name, 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(activeStore.location || 'Location Address', 14, 26);
        doc.text(activeStore.phone ? `Phone: ${activeStore.phone}` : '', 14, 31);
        doc.text(`Date: ${invoiceDate}`, 150, 35);
        if (dueDate) doc.text(`Due Date: ${dueDate}`, 150, 40);

        // Bill To
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 45, 196, 45);

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.setFont("helvetica", "bold");
        doc.text("BILL TO:", 14, 55);

        doc.setFont("helvetica", "normal");
        doc.text(customerName || 'Walk-in Customer', 14, 60);
        if (customerPhone) doc.text(customerPhone, 14, 65);
        if (customerDetails.email) doc.text(customerDetails.email, 14, 70);
        if (customerDetails.address) doc.text(customerDetails.address, 14, 75);

        // Table
        const tableColumn = ["Item", "Description", "Qty", "Price", "Total"];
        const tableRows = items.map(item => [
            item.name,
            item.description || '',
            item.quantity,
            item.price.toFixed(2),
            (item.quantity * item.price).toFixed(2)
        ]);

        autoTable(doc, {
            startY: 85,
            head: [tableColumn],
            body: tableRows,
            headStyles: { fillColor: primaryColor as [number, number, number] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 60 },
                4: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text(`Subtotal:`, 140, finalY);
        doc.text(`${calculateSubtotal().toFixed(2)}`, 196, finalY, { align: 'right' });

        if (taxRate > 0) {
            doc.text(`Tax (${taxRate}%):`, 140, finalY + 5);
            doc.text(`${calculateTax().toFixed(2)}`, 196, finalY + 5, { align: 'right' });
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`Total:`, 140, finalY + 12);
        doc.text(`${activeStore.currency || 'GHS'} ${calculateTotal().toFixed(2)}`, 196, finalY + 12, { align: 'right' });

        // Notes & Terms
        const notesY = finalY + 30;
        if (notes) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Notes:", 14, notesY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(notes, 14, notesY + 5);
        }

        if (terms) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("Terms & Conditions:", 14, notesY + 15);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(terms, 14, notesY + 20);
        }

        // Save
        doc.save(`Invoice_${invoiceNumber}.pdf`);
        showToast('success', 'Invoice generated successfully!');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
            {/* Editor Side */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" /> Invoice Generator
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setItems([]);
                                setCustomerName('');
                                setCustomerPhone('');
                                setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer Details</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Customer Name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full text-lg font-medium border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent placeholder-slate-400"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Phone Number"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-1/2 text-sm border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={customerDetails.email}
                                            onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                            className="w-1/2 text-sm border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent"
                                        />
                                    </div>
                                    <textarea
                                        placeholder="Billing Address"
                                        value={customerDetails.address}
                                        onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                                        className="w-full text-sm border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent resize-none h-16"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice Details</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400">Invoice #</label>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            className="w-full text-sm font-medium border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Date Issued</label>
                                        <input
                                            type="date"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            className="w-full text-sm font-medium border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full text-sm font-medium border-0 border-b border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-0 px-0 bg-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="mb-8">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items</label>

                        {/* Add Item search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products directly..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                                onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            {showProductDropdown && searchQuery && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addItem(p)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.name}</div>
                                                    <div className="text-xs text-slate-500">{p.sku}</div>
                                                </div>
                                                <div className="font-bold text-indigo-600 text-sm">GHS {p.price}</div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-slate-500">
                                            No products found.
                                            <button onClick={() => addItem()} className="ml-2 text-indigo-600 hover:underline">Add Custom Item</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Items Table - using div structure for responsiveness */}
                        <div className="space-y-2">
                            {items.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    <p className="text-slate-400 text-sm">No items added yet</p>
                                    <button onClick={() => addItem()} className="mt-2 text-indigo-600 text-sm font-medium hover:underline">Add Empty Row</button>
                                </div>
                            )}

                            {items.map((item, index) => (
                                <div key={item.id} className="flex flex-col sm:flex-row gap-2 sm:items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 group">
                                    <div className="flex-1 space-y-1">
                                        <input
                                            className="w-full bg-transparent font-medium text-sm border-none p-0 focus:ring-0 text-slate-900 dark:text-white"
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                            placeholder="Item Name"
                                        />
                                        <input
                                            className="w-full bg-transparent text-xs text-slate-500 border-none p-0 focus:ring-0"
                                            value={item.description || ''}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Description (optional)"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20">
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm text-center"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                min="1"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm text-right"
                                                value={item.price}
                                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="w-24 text-right font-medium text-slate-900 dark:text-white">
                                            {(item.quantity * item.price).toFixed(2)}
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                                <textarea
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-sm focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                                    placeholder="Add notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Terms</label>
                                <textarea
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent p-3 text-sm focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                                    placeholder="Add terms..."
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                ></textarea>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-6 h-fit">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium">{calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-500">Tax Rate (%)</span>
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 text-sm"
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Tax Amount</span>
                                    <span className="font-medium">{calculateTax().toFixed(2)}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">Total</span>
                                    <span className="text-xl font-bold text-indigo-600">GHS {calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                            <button
                                onClick={generatePDF}
                                className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg hover:shadow-indigo-500/30"
                            >
                                <Download className="h-5 w-5" /> Download Invoice PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Side (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/3 flex-col gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 p-8 relative overflow-hidden flex items-center justify-center bg-dots">
                    <div className="text-center opacity-30">
                        <FileText className="h-24 w-24 mx-auto mb-4 text-slate-400" />
                        <p className="text-lg font-medium text-slate-500">PDF Preview Generated on Download</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
