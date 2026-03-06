'use client';

import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/sms';
import {
    CreditCard,
    Search,
    User,
    Calendar,
    DollarSign,
    ChevronRight,
    Plus,
    History,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    X,
    MessageSquare,
    Scan,
    Settings as SettingsIcon,
    Save,
    Users,
    Activity,
    ShieldCheck,
    Menu,
    Bell,
    LogOut,
    Moon,
    Sun,
    ChevronDown,
    Cloud,
    CloudOff,
    RefreshCw as RefreshIcon,
    ShieldAlert
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useState, useEffect, useRef } from 'react';

interface Installment {
    id: string;
    customer_id: string;
    sale_id: string;
    total_amount: number;
    amount_paid: number;
    balance: number;
    status: 'active' | 'completed' | 'defaulted';
    next_payment_date: string;
    created_at: string;
    customer: {
        name: string;
        phone: string;
    };
    sales?: {
        created_at: string;
    };
}

interface Payment {
    id: string;
    amount: number;
    payment_method: string;
    created_at: string;
}

export default function InstallmentsPage() {
    const { activeStore, user, hasPermission } = useAuth();
    const { showToast } = useToast();

    if (!activeStore) return null;
    if (!hasPermission('manage_installments')) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh] animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-rose-50 p-6 rounded-full dark:bg-rose-900/20 mb-6">
                    <ShieldAlert className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    You do not have permission to manage installments.
                </p>
            </div>
        );
    }

    const [installments, setInstallments] = useState<Installment[]>([]);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);

    // New Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Settings & Tabs
    const [activeTab, setActiveTab] = useState<'manage' | 'customers' | 'settings'>('manage');
    const [installmentSettings, setInstallmentSettings] = useState({
        default_duration_days: 30,
        min_deposit_percentage: 20,
        enable_sms_reminders: true,
        reminder_days_before: 3,
        interest_rate_percentage: 0,
        sms_template_payment: 'Hi {Name}, your installment payment of GHS {AmountPaid} for {Id} has been received. Balance left: GHS {AmountLeft}. Thank you!'
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'defaulted'>('all');

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef<any>(null);

    useEffect(() => {
        if (activeStore?.id) {
            fetchInstallments();
            fetchSettings();
            fetchCustomers();
        }
    }, [activeStore?.id]);

    const fetchCustomers = async () => {
        if (!activeStore?.id) return;
        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', activeStore.id)
            .order('name');
        setAllCustomers(data || []);
    };

    const fetchSettings = async () => {
        if (!activeStore?.id) return;
        const { data } = await supabase
            .from('installment_settings')
            .select('*')
            .eq('store_id', activeStore.id)
            .single();

        if (data) {
            setInstallmentSettings(data);
        }
    };

    const handleSaveSettings = async () => {
        if (!activeStore?.id) return;
        setIsSavingSettings(true);
        const { error } = await supabase
            .from('installment_settings')
            .upsert({
                store_id: activeStore.id,
                ...installmentSettings,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error(error);
            showToast('error', 'Failed to save settings');
        } else {
            showToast('success', 'Settings saved');
        }
        setIsSavingSettings(false);
    };

    const startScanner = async () => {
        setIsScanning(true);
        setCameraError('');

        setTimeout(() => {
            if (document.getElementById("installment-reader")) {
                const html5QrCode = new Html5Qrcode("installment-reader");
                scannerRef.current = html5QrCode;
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setSearchQuery(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => { }
                ).catch(err => {
                    setCameraError("Camera access denied or not found");
                    console.error(err);
                });
            }
        }, 500);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop();
            scannerRef.current.clear();
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const fetchInstallments = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('installments')
                .select(`
                    *,
                    customer:customers(name, phone),
                    sales:sales(created_at)
                `)
                .eq('store_id', activeStore?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInstallments(data || []);
        } catch (error) {
            console.error('Error fetching installments:', error);
            showToast('error', 'Failed to load installments');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPayments = async (installmentId: string) => {
        setIsLoadingPayments(true);
        const { data, error } = await supabase
            .from('installment_payments')
            .select('*')
            .eq('installment_id', installmentId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching payments:', error);
        } else {
            setPayments(data || []);
        }
        setIsLoadingPayments(false);
    };

    const handleSelectInstallment = (inst: Installment) => {
        setSelectedInstallment(inst);
        fetchPayments(inst.id);
    };

    const handleRecordPayment = async () => {
        if (!selectedInstallment || !paymentAmount || isSubmitting) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast('error', 'Please enter a valid amount');
            return;
        }

        if (amount > selectedInstallment.balance) {
            showToast('error', 'Payment amount exceeds balance');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert Payment
            const { data: payment, error: pError } = await supabase.from('installment_payments').insert({
                installment_id: selectedInstallment.id,
                amount: amount,
                payment_method: paymentMethod,
                recorded_by: user?.id
            }).select().single();

            if (pError) throw pError;

            // 2. Update Installment
            const newAmountPaid = selectedInstallment.amount_paid + amount;
            const newBalance = selectedInstallment.total_amount - newAmountPaid;
            const newStatus = newBalance <= 0 ? 'completed' : 'active';

            const { error: instUpdateError } = await supabase
                .from('installments')
                .update({
                    amount_paid: newAmountPaid,
                    balance: newBalance,
                    status: newStatus
                })
                .eq('id', selectedInstallment.id);

            if (instUpdateError) throw instUpdateError;

            // 3. Send SMS using custom template
            let smsMsg = installmentSettings.sms_template_payment || "Hi {Name}, your installment payment of GHS {AmountPaid} for {Id} has been received. Balance left: GHS {AmountLeft}. Thank you!";
            const orderIdForSms = selectedInstallment.sale_id ? `Order #${selectedInstallment.sale_id.slice(0, 8)}` : 'Installment';

            smsMsg = smsMsg
                .replace(/{Name}/g, selectedInstallment.customer.name || 'Customer')
                .replace(/{AmountPaid}/g, amount.toFixed(2))
                .replace(/{AmountLeft}/g, newBalance.toFixed(2))
                .replace(/{Id}/g, orderIdForSms);

            await sendNotification('installment', {
                customMessage: smsMsg,
                customerPhone: selectedInstallment.customer.phone,
                customerName: selectedInstallment.customer.name,
                storeId: activeStore?.id,
                id: orderIdForSms,
                amountPaid: amount,
                amountLeft: newBalance
            });

            showToast('success', 'Payment recorded and SMS sent');
            setShowPaymentModal(false);
            setPaymentAmount('');

            // Refresh data
            await fetchInstallments();
            if (selectedInstallment) {
                const refreshed = {
                    ...selectedInstallment,
                    amount_paid: newAmountPaid,
                    balance: newBalance,
                    status: newStatus as any
                };
                setSelectedInstallment(refreshed);
                fetchPayments(selectedInstallment.id);
            }
        } catch (e: any) {
            console.error(e);
            showToast('error', e.message || 'Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredInstallments = installments.filter(inst => {
        const query = searchQuery.toLowerCase().trim();
        const normalizedQuery = query.replace(/[^a-z0-9]/g, '');

        const customerName = (inst.customer?.name || '').toLowerCase();
        const customerPhone = (inst.customer?.phone || '').replace(/\D/g, '');
        const installmentId = (inst.id || '').toLowerCase();
        const saleId = (inst.sale_id || '').toLowerCase();
        const orderShortId = inst.sale_id ? inst.sale_id.slice(0, 8).toLowerCase() : '';

        const matchesSearch = !query || (
            customerName.includes(query) ||
            customerPhone.includes(normalizedQuery) ||
            installmentId.includes(normalizedQuery) ||
            saleId.includes(normalizedQuery) ||
            orderShortId.includes(normalizedQuery) ||
            `order#${orderShortId}`.includes(normalizedQuery)
        );

        const matchesStatus = filterStatus === 'all' || inst.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const filteredOtherCustomers = searchQuery.trim().length >= 2 ? allCustomers.filter(c => {
        const query = searchQuery.toLowerCase().trim();
        const normalizedQuery = query.replace(/[^a-z0-9]/g, '');
        const isAlreadyInInstallments = installments.some(inst => inst.customer_id === c.id);
        if (isAlreadyInInstallments) return false;

        const customerName = (c.name || '').toLowerCase();
        const customerPhone = (c.phone || '').replace(/\D/g, '');

        return customerName.includes(query) || customerPhone.includes(normalizedQuery);
    }) : [];

    if (!activeStore) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Installments
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage part-payments and credit sales
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'manage' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Manage
                    </button>
                    <button
                        onClick={() => setActiveTab('customers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'customers' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Customers
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        SMS & Settings
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Status:</span>
                {(['all', 'active', 'completed', 'defaulted'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40'
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {activeTab === 'settings' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                <SettingsIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Installment Settings</h2>
                                <p className="text-sm text-slate-500">Configure default behavior for installment sales</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Default Duration (Days)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-sm outline-none focus:border-indigo-500 transition-all focus:bg-white"
                                        value={installmentSettings.default_duration_days}
                                        onChange={e => setInstallmentSettings({ ...installmentSettings, default_duration_days: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2">Min. Deposit (%)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-sm outline-none focus:border-indigo-500 transition-all focus:bg-white"
                                        value={installmentSettings.min_deposit_percentage}
                                        onChange={e => setInstallmentSettings({ ...installmentSettings, min_deposit_percentage: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 space-y-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Enable SMS Reminders</p>
                                        <p className="text-xs text-slate-500">Send automatic payment reminders</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="h-6 w-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={installmentSettings.enable_sms_reminders}
                                        onChange={e => setInstallmentSettings({ ...installmentSettings, enable_sms_reminders: e.target.checked })}
                                    />
                                </div>
                                {installmentSettings.enable_sms_reminders && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Remind</span>
                                        <input
                                            type="number"
                                            className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-center text-sm font-bold"
                                            value={installmentSettings.reminder_days_before}
                                            onChange={e => setInstallmentSettings({ ...installmentSettings, reminder_days_before: parseInt(e.target.value) })}
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase">days before due date</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Payment SMS Template</h2>
                                <p className="text-sm text-slate-500">Sent instantly when a payment is recorded</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Message Template</label>
                                <textarea
                                    className="w-full h-32 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 text-sm outline-none focus:border-indigo-500 transition-all focus:bg-white resize-none font-medium text-slate-700 dark:text-slate-300"
                                    placeholder="Enter SMS template..."
                                    value={installmentSettings.sms_template_payment}
                                    onChange={e => setInstallmentSettings({ ...installmentSettings, sms_template_payment: e.target.value })}
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {['{Name}', '{AmountPaid}', '{AmountLeft}', '{Id}'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setInstallmentSettings({ ...installmentSettings, sms_template_payment: installmentSettings.sms_template_payment + ' ' + tag })}
                                            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Live Preview
                                </p>
                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 text-sm italic text-slate-600 dark:text-slate-400 leading-relaxed shadow-sm">
                                    {installmentSettings.sms_template_payment
                                        .replace(/{Name}/g, 'Kwame Mensah')
                                        .replace(/{AmountPaid}/g, '250.00')
                                        .replace(/{AmountLeft}/g, '1,400.00')
                                        .replace(/{Id}/g, 'Order #A102')}
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="w-full rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 py-4 font-black text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none"
                            >
                                {isSavingSettings ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> SAVE ALL SETTINGS</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'manage' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by customer name, phone, or order ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={isScanning ? stopScanner : startScanner}
                                className={`p-4 rounded-2xl border flex items-center justify-center transition-all ${isScanning ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'}`}
                            >
                                <Scan className="h-6 w-6" />
                            </button>
                        </div>

                        {isScanning && (
                            <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border-4 border-indigo-500 shadow-2xl animate-in zoom-in-95">
                                <div id="installment-reader" className="w-full h-full"></div>
                                {cameraError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-6 text-center">
                                        <div className="space-y-4">
                                            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
                                            <p className="font-bold">{cameraError}</p>
                                            <button onClick={stopScanner} className="px-6 py-2 bg-white text-black rounded-xl font-bold">Close</button>
                                        </div>
                                    </div>
                                )}
                                <button onClick={stopScanner} className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/90">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-24 w-full bg-white dark:bg-slate-800 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-700" />
                                ))
                            ) : (
                                <>
                                    {filteredInstallments.length > 0 && (
                                        <div className="space-y-3">
                                            {filteredInstallments.map((inst) => (
                                                <button
                                                    key={inst.id}
                                                    onClick={() => handleSelectInstallment(inst)}
                                                    className={`w-full text-left group relative flex items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-lg active:scale-[0.99] ${selectedInstallment?.id === inst.id
                                                        ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-900/20'
                                                        : 'border-slate-200 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-800 dark:hover:border-slate-700'
                                                        }`}
                                                >
                                                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                        <User className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                                                {inst.customer?.name}
                                                            </h3>
                                                            <span className={`text-xs font-black uppercase px-2 py-1 rounded-full ${inst.status === 'completed'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                                }`}>
                                                                {inst.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                                <History className="h-3 w-3" />
                                                                {new Date(inst.created_at).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                                <DollarSign className="h-3 w-3" />
                                                                Total: GHS {inst.total_amount.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                            GHS {inst.balance.toFixed(2)}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                            Balance Left
                                                        </p>
                                                    </div>
                                                    <ChevronRight className={`h-5 w-5 text-slate-300 transition-transform ${selectedInstallment?.id === inst.id ? 'translate-x-1 text-indigo-400' : ''}`} />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredOtherCustomers.length > 0 && (
                                        <div className="mt-8 space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Users className="h-4 w-4" /> Other Customers Found
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {filteredOtherCustomers.map(c => (
                                                    <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                                                                <User className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{c.name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium leading-tight">{c.phone}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                showToast('info', 'Customer selected. Use POS to start new installment.');
                                                                window.location.href = '/dashboard/sales';
                                                            }}
                                                            className="text-xs font-black text-indigo-600 hover:text-indigo-700 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-[0.98]"
                                                        >
                                                            START INSTALLMENT
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {filteredInstallments.length === 0 && filteredOtherCustomers.length === 0 && (
                                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            <CreditCard className="h-16 w-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No results found</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {selectedInstallment ? (
                            <div className="sticky top-24 space-y-6 animate-in slide-in-from-right-4 duration-500">
                                <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1 leading-tight">
                                                Summary
                                            </h2>
                                            <p className="text-sm font-medium text-slate-500">{selectedInstallment.customer?.phone}</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center dark:bg-indigo-900/20">
                                            <ArrowUpRight className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                            <span className="text-sm text-slate-500 font-medium">Total Price</span>
                                            <span className="font-bold text-slate-900 dark:text-white">GHS {selectedInstallment.total_amount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                                            <span className="text-sm text-slate-500 font-medium">Amount Paid</span>
                                            <span className="font-bold text-emerald-600">GHS {selectedInstallment.amount_paid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-sm text-slate-900 dark:text-slate-100 font-black">Remaining Balance</span>
                                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">GHS {selectedInstallment.balance.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {selectedInstallment.status !== 'completed' && (
                                        <button
                                            onClick={() => setShowPaymentModal(true)}
                                            className="w-full mt-8 rounded-2xl bg-indigo-600 py-4 font-black text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Plus className="h-5 w-5" /> RECORD PAYMENT
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-3xl bg-slate-100/50 border border-slate-200 p-6 dark:bg-slate-900/50 dark:border-slate-800">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <History className="h-4 w-4" /> Payment History
                                    </h3>
                                    <div className="space-y-3">
                                        {isLoadingPayments ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                            </div>
                                        ) : payments.length === 0 ? (
                                            <p className="text-center py-4 text-xs font-medium text-slate-400">No history found</p>
                                        ) : (
                                            payments.map((p) => (
                                                <div key={p.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">GHS {p.amount.toFixed(2)}</p>
                                                        <p className="text-[10px] font-medium text-slate-500 uppercase">{new Date(p.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                                        {p.payment_method}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden lg:flex h-[60vh] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50 p-12 text-center animate-in fade-in duration-500">
                                <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                                    <ArrowDownRight className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-tight">Select an Installment</h3>
                                <p className="text-slate-500 font-medium">Click on any record to view details, history and manage payments.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Customer Registry</h2>
                                <p className="text-sm text-slate-500">All customers registered in your store</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allCustomers.filter(c => {
                                const q = searchQuery.toLowerCase().trim();
                                if (!q) return true;
                                const nq = q.replace(/[^a-z0-9]/g, '');
                                const name = (c.name || '').toLowerCase();
                                const phone = (c.phone || '').replace(/\D/g, '');
                                return name.includes(q) || phone.includes(nq);
                            }).map(customer => {
                                const hasInstallment = installments.find(inst => inst.customer_id === customer.id);
                                return (
                                    <div key={customer.id} className="p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between gap-4 transition-all hover:border-indigo-300 dark:hover:border-slate-600 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-700">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white leading-tight">{customer.name}</p>
                                                <p className="text-xs font-bold text-slate-500 leading-tight">{customer.phone}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-slate-800">
                                            {hasInstallment ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest leading-tight">Active Balance</span>
                                                    <span className="text-lg font-black dark:text-white">GHS {hasInstallment.balance.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-black leading-tight">No Active Plan</span>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (hasInstallment) {
                                                        setActiveTab('manage');
                                                        handleSelectInstallment(hasInstallment);
                                                    } else {
                                                        showToast('info', 'Redirecting to POS...');
                                                        window.location.href = '/dashboard/sales';
                                                    }
                                                }}
                                                className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {showPaymentModal && selectedInstallment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Record Payment</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 leading-tight">Payment Amount</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400 group-focus-within:text-indigo-500 transition-colors">GHS</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-5 pl-14 pr-4 text-2xl font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                                <div className="mt-4 flex justify-between items-center px-1">
                                    <span className="text-xs font-bold text-slate-400 leading-tight">Current Balance:</span>
                                    <button
                                        onClick={() => setPaymentAmount(selectedInstallment.balance.toString())}
                                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4 leading-tight"
                                    >
                                        PAY FULL GHS {selectedInstallment.balance.toFixed(2)}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 leading-tight">Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['cash', 'momo'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentMethod(m)}
                                            className={`rounded-2xl border-2 py-3 text-sm font-black uppercase tracking-wider transition-all ${paymentMethod === m
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'
                                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800 font-bold'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleRecordPayment}
                                disabled={isSubmitting || !paymentAmount}
                                className="w-full mt-4 rounded-2xl bg-indigo-600 py-4 font-black text-white shadow-xl shadow-indigo-500/30 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> CONFIRM PAYMENT</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
