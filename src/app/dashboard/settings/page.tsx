'use client';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { getSMSConfig, updateSMSConfig, SMSConfig, sendDirectMessage, getSMSBalance } from '@/lib/sms';
import { useToast } from '@/lib/toast-context';
import { useState, useEffect, useRef } from 'react';
import {
    Building2, Users, Save, Globe, MessageSquare, X, Tag, Package,
    Edit2, Trash2, Layout, Eye, EyeOff, Archive, RotateCcw,
    Barcode, QrCode, RefreshCw, ShieldAlert, Key, Palette, Image,
    Type, DollarSign, Percent, Store, Check, Plus, Search, ChevronRight,
    CreditCard, Smartphone, Download, Archive as ArchiveIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
    const { activeStore, user, updateStoreSettings, teamMembers, addTeamMember, updateTeamMember, removeTeamMember, globalSettings, updateGlobalSettings } = useAuth();
    const { showToast } = useToast();

    const { businessTypes, activeCategories, customCategories, toggleBusinessType, addCustomCategory, removeCustomCategory, availableBusinessTypes, addCustomBusinessType, updateBusinessType, deleteBusinessType, updateCustomCategory } = useInventory();

    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const [smsConfig, setSmsConfig] = useState<SMSConfig | null>(null);
    const [storeName, setStoreName] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [receiptPrefix, setReceiptPrefix] = useState('');
    const [receiptSuffix, setReceiptSuffix] = useState('');
    const [storePhone, setStorePhone] = useState('');

    // General Settings
    const [taxEnabled, setTaxEnabled] = useState(true);
    const [taxType, setTaxType] = useState('percentage');
    const [taxValue, setTaxValue] = useState(0);

    // Branding State
    const [brandingName, setBrandingName] = useState('');
    const [brandingColor, setBrandingColor] = useState('#4f46e5');
    const [brandingLogo, setBrandingLogo] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [profileData, setProfileData] = useState({ name: '', phone: '', username: '' });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [otpEnabled, setOtpEnabled] = useState(true);
    const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<{ id: string, name: string } | null>(null);
    const [storeToDelete, setStoreToDelete] = useState<any>(null);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [deletionOtcInput, setDeletionOtcInput] = useState('');
    const [otcSent, setOtcSent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [barcodeCount, setBarcodeCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [barcodeList, setBarcodeList] = useState<any[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [newBusinessType, setNewBusinessType] = useState('');
    const [editingItem, setEditingItem] = useState<{ type: 'business' | 'category', original: string, current: string } | null>(null);

    const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
    const [newStoreData, setNewStoreData] = useState({ name: '', location: '' });

    // PWA Settings State
    const [pwaSettings, setPwaSettings] = useState({
        app_name: 'Store Management Software',
        short_name: 'POS System',
        theme_color: '#4f46e5',
        icon_192: null as string | null,
        icon_512: null as string | null
    });
    const [icon192, setIcon192] = useState<string | null>(null);
    const [icon512, setIcon512] = useState<string | null>(null);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const [isSavingPWA, setIsSavingPWA] = useState(false);
    const icon192Ref = useRef<HTMLInputElement>(null);
    const icon512Ref = useRef<HTMLInputElement>(null);
    const [smsBalance, setSmsBalance] = useState<number | null>(null);
    const [testSMSPhone, setTestSMSPhone] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [showChangePin, setShowChangePin] = useState(false);
    const [newPin, setNewPin] = useState('');

    // Auth & Deletion
    const { updateStoreStatus, requestStoreDeletionOTC, verifyStoreDeletionOTC, deleteStore, stores, createStore } = useAuth();

    useEffect(() => {
        setSmsConfig(getSMSConfig());
        if (activeStore) {
            setStoreName(activeStore.name);
            setStoreLocation(activeStore.location);
            setReceiptPrefix(activeStore.receiptPrefix || 'TRX');
            setReceiptSuffix(activeStore.receiptSuffix || '');
            setStorePhone(activeStore.phone || '');

            if (activeStore.taxSettings) {
                setTaxEnabled(activeStore.taxSettings.enabled);
                setTaxType(activeStore.taxSettings.type);
                setTaxValue(activeStore.taxSettings.value);
            }
        }
        // Load Global Branding
        if (globalSettings) {
            setBrandingName(globalSettings.appName || 'SASIC STORES');
            setBrandingColor(globalSettings.primaryColor || '#4f46e5');
            setBrandingLogo(globalSettings.appLogo || '');
        }
        if (user) setProfileData({ name: user.name || '', phone: user.phone || '', username: user.username || '' });
    }, [activeStore, user, globalSettings]);

    useEffect(() => {
        const fetchBalance = async () => {
            if (activeTab === 'sms') {
                const bal = await getSMSBalance();
                setSmsBalance(bal);
            }
        };
        fetchBalance();
    }, [activeTab]);

    useEffect(() => { if (activeTab === 'barcodes') fetchBarcodeLibrary(); }, [activeTab]);
    useEffect(() => {
        if (showInviteModal) setOtpEnabled(editingMember ? editingMember.otp_enabled !== false : true);
    }, [showInviteModal, editingMember]);

    // Load PWA Settings from Database
    useEffect(() => {
        const loadPWASettings = async () => {
            if (!activeStore?.id) return;

            const { data } = await supabase
                .from('stores')
                .select('pwa_settings')
                .eq('id', activeStore.id)
                .single();

            if (data?.pwa_settings) {
                setPwaSettings(data.pwa_settings);
                setIcon192(data.pwa_settings.icon_192);
                setIcon512(data.pwa_settings.icon_512);
            }
        };

        if (activeTab === 'pwa') {
            loadPWASettings();
        }
    }, [activeTab, activeStore?.id]);

    // Save PWA Settings to Database
    const handleSavePWASettings = async () => {
        if (!activeStore?.id) return;
        setIsSavingPWA(true);

        try {
            const { error } = await supabase
                .from('stores')
                .update({
                    pwa_settings: {
                        ...pwaSettings,
                        icon_192: icon192,
                        icon_512: icon512
                    }
                })
                .eq('id', activeStore.id);

            if (error) throw error;

            showToast('success', 'PWA settings saved successfully!');
        } catch (error) {
            console.error('Error saving PWA settings:', error);
            showToast('error', 'Failed to save PWA settings');
        } finally {
            setIsSavingPWA(false);
        }
    };

    // Handle PWA Icon Upload
    const handleIconUpload = async (file: File, size: 192 | 512) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('error', 'Please upload an image file');
            return;
        }

        setIsUploadingIcon(true);

        try {
            // Read file as data URL
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    // Validate dimensions
                    if (img.width !== size || img.height !== size) {
                        showToast('error', `Image must be exactly ${size}x${size} pixels`);
                        setIsUploadingIcon(false);
                        return;
                    }

                    // Save to state only (will be saved to DB when user clicks Save)
                    const dataUrl = e.target?.result as string;
                    if (size === 192) {
                        setIcon192(dataUrl);
                    } else {
                        setIcon512(dataUrl);
                    }

                    showToast('success', `${size}x${size} icon uploaded! Click Save to persist.`);
                    setIsUploadingIcon(false);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload error:', error);
            showToast('error', 'Failed to upload icon');
            setIsUploadingIcon(false);
        }
    };

    const fetchBarcodeLibrary = async () => {
        if (!activeStore?.id) return;
        const { data } = await supabase.from('generated_barcodes').select('*').eq('store_id', activeStore.id).order('created_at', { ascending: false });
        if (data) setBarcodeList(data);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (smsConfig && activeStore?.id) await updateSMSConfig(smsConfig, activeStore.id);
            if (activeStore) {
                const result = await updateStoreSettings({
                    name: storeName,
                    location: storeLocation,
                    receiptPrefix,
                    receiptSuffix,
                    phone: storePhone,
                    currency: 'GHS', // Locked to GHS
                    taxSettings: {
                        enabled: taxEnabled,
                        type: taxType as 'percentage' | 'fixed',
                        value: taxValue
                    },
                    branding: {
                        name: activeStore.branding?.name, // Preserve old branding or clear it?
                        color: activeStore.branding?.color,
                        logoUrl: activeStore.branding?.logoUrl
                    },
                    businessTypes: availableBusinessTypes,
                    categories: customCategories
                });
                console.log("Saving settings with:", { availableBusinessTypes, customCategories });
                if (result && !result.success) throw result.error;

                // removed redundant second call

                showToast('success', 'Store settings saved successfully!');
            }

            // Save Global Branding
            await updateGlobalSettings({
                appName: brandingName,
                primaryColor: brandingColor,
                appLogo: brandingLogo
            });
            showToast('success', 'Global settings saved!');

        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast('error', 'Failed to save settings. Please try again.');
        } finally { setIsSaving(false); }
    };

    const handleCreateOrUpdateStore = async () => {
        if (!newStoreData.name || !newStoreData.location) return;
        try {
            if (editingStore) {
                // Update existing store logic (assuming we have an updateStore function or using Supabase directly)
                const { error } = await supabase.from('stores').update({ name: newStoreData.name, location: newStoreData.location }).eq('id', editingStore.id);
                if (error) throw error;
                showToast('success', 'Store updated successfully');
                // Trigger a refresh of stores if possible, or manually update local state if stores comes from context
                // Reloading window is a crude way, ideally updateStores() context method exists.
                // Assuming stores updates automatically via subscription or context refresh
                window.location.reload(); // Temporary fix if no live update
            } else {
                await createStore(newStoreData.name, newStoreData.location);
                showToast('success', 'Store created successfully');
            }
            setShowCreateStoreModal(false);
            setNewStoreData({ name: '', location: '' });
            setEditingStore(null);
        } catch (e) {
            showToast('error', `Failed to ${editingStore ? 'update' : 'create'} store`);
            console.error(e);
        }
    };

    const handleEditStore = (store: any) => {
        setEditingStore(store);
        setNewStoreData({ name: store.name, location: store.location });
        setShowCreateStoreModal(true);
    };

    const handleArchiveStore = async (store: any) => {
        if (confirm(`Are you sure you want to archive "${store.name}"? It will not be accessible until restored.`)) {
            await updateStoreStatus(store.id, 'archived');
            showToast('success', 'Store archived');
        }
    };

    const handleRestoreStore = async (store: any) => {
        await updateStoreStatus(store.id, 'active');
        showToast('success', 'Store restored');
    };

    const handleSendTestSMS = async () => {
        if (!testSMSPhone) return;
        setIsSendingTest(true);
        try {
            await sendDirectMessage(testSMSPhone, "This is a test message from your Store settings.", ['sms', 'whatsapp'], activeStore?.id);
            showToast('success', 'Test message sent!');
        } catch (e) {
            showToast('error', 'Failed to send test message');
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleUpdatePin = async () => {
        if (!newPin || newPin.length < 4) {
            showToast('error', 'PIN must be at least 4 digits');
            return;
        }
        if (user?.id) {
            await supabase.from('employees').update({ pin: newPin }).eq('id', user.id);
            showToast('success', 'PIN updated successfully');
            setNewPin('');
            setShowChangePin(false);
        }
    };

    const handleGenerateBarcodes = async () => {
        if (!activeStore?.id || barcodeCount <= 0) return;
        setIsGenerating(true);
        try {
            const newCodes = [];
            const timestamp = Date.now().toString().slice(-6);
            for (let i = 0; i < barcodeCount; i++) {
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                newCodes.push({ store_id: activeStore.id, code: `BC-${timestamp}-${random}`, is_assigned: false });
            }
            await supabase.from('generated_barcodes').insert(newCodes);
            showToast('success', `Successfully generated ${barcodeCount} barcodes`);
            fetchBarcodeLibrary();
        } catch { showToast('error', 'Failed to generate barcodes'); }
        finally { setIsGenerating(false); }
    };

    const handleRequestDeletion = async (store: any) => {
        setStoreToDelete(store);
        const success = await requestStoreDeletionOTC(store.id);
        if (success) { setOtcSent(true); showToast('success', 'Deletion code sent to your phone'); }
        else { showToast('error', 'Failed to send deletion code'); }
    };

    const handleVerifyAndDelete = async () => {
        if (!storeToDelete || !deletionOtcInput) return;
        setIsDeleting(true);
        try {
            const isValid = await verifyStoreDeletionOTC(storeToDelete.id, deletionOtcInput);
            if (isValid) { await deleteStore(storeToDelete.id); showToast('success', 'Store deleted successfully'); setStoreToDelete(null); setDeletionOtcInput(''); setOtcSent(false); }
            else { showToast('error', 'Invalid or expired code'); }
        } finally { setIsDeleting(false); }
    };

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            addCustomCategory(newCategory.trim());
            setNewCategory('');
            showToast('success', 'Category added');
        }
    };

    const handleAddBusinessType = () => {
        if (newBusinessType.trim()) {
            addCustomBusinessType(newBusinessType.trim());
            setNewBusinessType('');
            showToast('success', 'Business Type added');
        }
    };

    const handleStartEdit = (type: 'business' | 'category', value: string) => {
        setEditingItem({ type, original: value, current: value });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveEdit = () => {
        if (!editingItem || !editingItem.current.trim()) return;
        if (editingItem.type === 'business') {
            updateBusinessType(editingItem.original, editingItem.current.trim());
        } else {
            updateCustomCategory(editingItem.original, editingItem.current.trim());
        }
        setEditingItem(null);
        showToast('success', 'Updated successfully');
    };

    const handleDeleteItem = (type: 'business' | 'category', value: string) => {
        if (confirm(`Delete ${value}?`)) {
            if (type === 'business') deleteBusinessType(value);
            else removeCustomCategory(value);
            showToast('success', 'Deleted successfully');
        }
    };

    const drawBarcode = (doc: jsPDF, code: string, x: number, y: number, width: number, height: number) => {
        // Simplified Code39 logic for brevity - in production use a library
        const barWidth = width / (code.length * 11 + 12);
        let currentX = x + barWidth * 2;
        // Mock pattern
        doc.rect(x, y, width, height, 'F'); // Placeholder black box if logic fails
        // Re-implement or import drawing logic if needed, keeping simple for now
    };

    const downloadBarcodesPDF = async () => {
        if (barcodeList.length === 0) return;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Barcode Library', 10, 20);
        doc.setFontSize(10);
        let y = 35, x = 15;
        const barcodeWidth = 60, barcodeHeight = 12, colGap = 25, rowGap = 25;
        for (let i = 0; i < barcodeList.length; i++) {
            const item = barcodeList[i];
            if (y + barcodeHeight + 18 > 280) { doc.addPage(); y = 20; }
            doc.setFillColor(0, 0, 0);
            doc.rect(x, y, barcodeWidth, barcodeHeight, 'F'); // Placeholder for actual barcode
            doc.setFontSize(8);
            doc.text(item.code, x + barcodeWidth / 2, y + barcodeHeight + 4, { align: 'center' });
            x += barcodeWidth + colGap;
            if (x + barcodeWidth > 190) { x = 15; y += barcodeHeight + rowGap; }
        }
        doc.save('barcode-library.pdf');
        showToast('success', 'Barcode library exported to PDF');
    };

    if (!activeStore || !user || !smsConfig) return null;

    const tabs = [
        { id: 'general', label: 'General', description: 'Store details & preference', icon: Building2 },
        { id: 'profile', label: 'My Profile', description: 'Account & security', icon: Users },
        { id: 'products', label: 'Product Settings', description: 'Categories & types', icon: Package },
        { id: 'users', label: 'Team Members', description: 'Manage staff access', icon: Users },
        { id: 'stores', label: 'Store Management', description: 'Multi-store config', icon: Store },
        { id: 'barcodes', label: 'Barcodes', description: 'Generate & export', icon: Barcode },
        { id: 'sms', label: 'SMS Config', description: 'Gateway settings', icon: MessageSquare },

        { id: 'pwa', label: 'PWA Settings', description: 'App installation', icon: Smartphone },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your store preferences and account configurations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar / Tabs */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                        >
                            <tab.icon className="h-5 w-5" />
                            <div className="text-left">
                                <div className="font-semibold">{tab.label}</div>
                                <div className="text-xs opacity-80">{tab.description}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6">
                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="grid gap-6">
                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                        <Store className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Store Profile</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
                                        <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="My Awesome Store" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</label>
                                        <input type="text" value={storeLocation} onChange={(e) => setStoreLocation(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="City, Country" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                                        <input type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="+233 00 000 0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
                                        <div className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-500 cursor-not-allowed">
                                            GHS - Ghanaian Cedi
                                        </div>
                                        <p className="text-xs text-slate-500">Fixed to local currency.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <Tag className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Receipt & Tax</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Receipt Prefix</label>
                                        <input type="text" value={receiptPrefix} onChange={(e) => setReceiptPrefix(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g., TRX" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Receipt Suffix</label>
                                        <input type="text" value={receiptSuffix} onChange={(e) => setReceiptSuffix(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="e.g., -A" />
                                    </div>
                                    <div className="space-y-4 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-900 dark:text-white">Enable Tax Calculation</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {taxEnabled && (
                                            <div className="flex gap-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="w-1/2">
                                                    <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none">
                                                        <option value="percentage">Percentage (%)</option>
                                                        <option value="fixed">Fixed Amount</option>
                                                    </select>
                                                </div>
                                                <div className="w-1/2">
                                                    <input type="number" value={taxValue} onChange={(e) => setTaxValue(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" placeholder="Value" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>


                            {/* Removed Branding Section from General Tab */}
                        </div>
                    )}
                    {
                        activeTab === 'global-branding' && (
                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                                        <Palette className="h-5 w-5 text-pink-600" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Global App Branding</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">App Name (Overrides Store Name)</label>
                                        <input type="text" value={brandingName} onChange={(e) => setBrandingName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="App Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brand Logo URL</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={brandingLogo} onChange={(e) => setBrandingLogo(e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                                            {brandingLogo && <img src={brandingLogo} alt="Logo" className="h-10 w-10 rounded object-cover border border-slate-200" />}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Color</label>
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-lg shadow-sm border border-slate-200" style={{ backgroundColor: brandingColor }}></div>
                                            <input type="text" value={brandingColor} onChange={(e) => setBrandingColor(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="#HEX" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )
                    }

                    {/* PROFILE TAB */}
                    {
                        activeTab === 'profile' && (
                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold text-indigo-600">
                                        {profileData.name ? profileData.name.charAt(0) : <Users className="h-8 w-8" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profileData.name || 'User Profile'}</h2>
                                        <p className="text-slate-500 text-sm">Update your personal details</p>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                        <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                                        <input type="text" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                                        <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                                    </div>
                                    <div className="md:col-span-2 pt-4 flex gap-4">
                                        <button onClick={async () => {
                                            if (!user?.id) return;
                                            const { error } = await supabase.from('employees').update({ name: profileData.name, phone: profileData.phone, username: profileData.username }).eq('id', user.id);
                                            if (error) showToast('error', 'Failed to update profile');
                                            else { showToast('success', 'Profile updated'); const updatedUser = { ...user, ...profileData }; localStorage.setItem('sms_user', JSON.stringify(updatedUser)); }
                                        }} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">Update Profile</button>

                                        {!showChangePin ? (
                                            <button onClick={() => setShowChangePin(true)} className="px-6 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">Change PIN</button>
                                        ) : (
                                            <div className="flex items-center gap-2 animate-in fade-in">
                                                <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="New PIN" className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" maxLength={6} />
                                                <button onClick={handleUpdatePin} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium text-sm">Save</button>
                                                <button onClick={() => { setShowChangePin(false); setNewPin(''); }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )
                    }

                    {/* PRODUCT SETTINGS */}
                    {
                        activeTab === 'products' && (
                            <div className="grid gap-6">
                                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Business Types</h2>
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={newBusinessType}
                                            onChange={(e) => setNewBusinessType(e.target.value)}
                                            placeholder="New Business Type"
                                            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        />
                                        <button onClick={handleAddBusinessType} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {availableBusinessTypes.map((type) => (
                                            <div key={type}
                                                className={`
                                                    group p-3 rounded-lg border transition-all flex items-center justify-between
                                                    ${businessTypes.includes(type)
                                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600'
                                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
                                                `}
                                                onClick={() => toggleBusinessType(type)}
                                            >
                                                {editingItem?.type === 'business' && editingItem.original === type ? (
                                                    <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="text"
                                                            value={editingItem.current}
                                                            onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                                                            className="w-full px-2 py-1 text-sm rounded border border-indigo-200 outline-none dark:bg-slate-950 dark:border-slate-700"
                                                            autoFocus
                                                        />
                                                        <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check className="h-4 w-4" /></button>
                                                        <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X className="h-4 w-4" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{type}</span>
                                                        <div className="flex items-center gap-2">
                                                            {businessTypes.includes(type) && <Check className="h-4 w-4 text-indigo-600" />}
                                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                <button onClick={() => handleStartEdit('business', type)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors">
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDeleteItem('business', type)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Categories</h2>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New Category Name" className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                                        <button onClick={handleAddCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Plus className="h-5 w-5" /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {customCategories.map(cat => (
                                            <div key={cat} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                                {editingItem?.type === 'category' && editingItem.original === cat ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={editingItem.current}
                                                            onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                                                            className="w-24 px-1 py-0.5 text-xs rounded border border-indigo-300 outline-none bg-white dark:bg-slate-950 dark:border-slate-700"
                                                            autoFocus
                                                        />
                                                        <Check onClick={handleSaveEdit} className="h-3 w-3 cursor-pointer hover:text-green-600" />
                                                        <X onClick={handleCancelEdit} className="h-3 w-3 cursor-pointer hover:text-slate-500" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {cat}
                                                        <Edit2 onClick={() => handleStartEdit('category', cat)} className="h-3 w-3 cursor-pointer hover:text-indigo-900 opacity-50 hover:opacity-100" />
                                                        <X onClick={() => handleDeleteItem('category', cat)} className="h-3 w-3 cursor-pointer hover:text-red-500 opacity-50 hover:opacity-100" />
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {activeCategories.filter(c => !customCategories.includes(c)).map(cat => (
                                            <span key={cat} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {smsConfig && (
                                    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Stock Alerts</h2>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="space-y-0.5">
                                                <label className="text-sm font-medium text-slate-900 dark:text-white">Low Stock Automatic Alerts</label>
                                                <p className="text-xs text-slate-500">Automatically send alerts when stock is low.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={smsConfig.automations.lowStockAlert.enabled} onChange={(e) => setSmsConfig({ ...smsConfig, automations: { ...smsConfig.automations, lowStockAlert: { ...smsConfig.automations.lowStockAlert, enabled: e.target.checked } } })} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {smsConfig.automations.lowStockAlert.enabled && (
                                            <div className="flex gap-4 items-center">
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Trigger alert when stock is at or below:</span>
                                                <input type="number" value={smsConfig.automations.lowStockAlert.threshold} onChange={(e) => setSmsConfig({ ...smsConfig, automations: { ...smsConfig.automations, lowStockAlert: { ...smsConfig.automations.lowStockAlert, threshold: parseInt(e.target.value) || 0 } } })} className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center outline-none" />
                                                <span className="text-sm text-slate-500">units</span>
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>
                        )
                    }

                    {/* TEAM MEMBERS */}
                    {
                        activeTab === 'users' && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage access and roles for your store.</p>
                                    </div>
                                    <button onClick={() => { setEditingMember(null); setShowInviteModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                                        <Plus className="h-4 w-4" /> Add Member
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {teamMembers.map((member) => (
                                        <div key={member.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${member.role === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <span className="tabular-nums">{member.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { setEditingMember(member); setShowInviteModal(true); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteMemberConfirm({ id: member.id, name: member.name })}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg transition-colors border border-rose-100 dark:border-rose-800"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {teamMembers.length === 0 && (
                                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p>No team members found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* STORE MANAGEMENT */}
                    {/* STORE MANAGEMENT */}
                    {
                        activeTab === 'stores' && (
                            <div className="grid gap-4">
                                <section className="flex justify-between items-center mb-2">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Stores</h2>
                                        <p className="text-sm text-slate-500">Manage your multi-store configurations.</p>
                                    </div>
                                    <button onClick={() => { setEditingStore(null); setNewStoreData({ name: '', location: '' }); setShowCreateStoreModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                                        <Plus className="h-4 w-4" /> Create New Store
                                    </button>
                                </section>
                                {stores.map((store) => (
                                    <div key={store.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${store.status === 'archived' ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${store.status === 'archived' ? 'bg-amber-100 text-amber-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                                                {store.status === 'archived' ? <ArchiveIcon className="h-6 w-6" /> : <Store className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">{store.name}</h3>
                                                    {store.status === 'archived' && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Archived</span>}
                                                </div>
                                                <p className="text-sm text-slate-500">{store.location} • <span className="capitalize">{store.status || 'Active'}</span></p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                            <button onClick={() => handleEditStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors border border-slate-200 dark:border-slate-800">
                                                <Edit2 className="h-4 w-4" /> Edit
                                            </button>

                                            {store.status === 'archived' ? (
                                                <>
                                                    <button onClick={() => handleRestoreStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-900/30">
                                                        <RotateCcw className="h-4 w-4" /> Restore
                                                    </button>

                                                    {stores.length > 1 && (
                                                        <button
                                                            onClick={() => handleRequestDeletion(store)}
                                                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/30"
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <button onClick={() => handleArchiveStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/20 rounded-lg transition-colors border border-amber-200 dark:border-amber-900/30">
                                                    <ArchiveIcon className="h-4 w-4" /> Archive
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {/* BARCODES */}
                    {
                        activeTab === 'barcodes' && (
                            <div className="space-y-6">
                                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Generate Barcodes</h2>
                                    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                                        <div className="flex-1 w-full sm:w-auto">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Quantity</label>
                                            <input type="number" value={barcodeCount} onChange={(e) => setBarcodeCount(parseInt(e.target.value) || 0)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        </div>
                                        <button onClick={handleGenerateBarcodes} disabled={isGenerating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                            {isGenerating ? 'Generating...' : 'Generate New Codes'}
                                        </button>
                                        {barcodeList.length > 0 && (
                                            <button onClick={downloadBarcodesPDF} className="px-6 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors">
                                                Export to PDF
                                            </button>
                                        )}
                                    </div>
                                </section>
                                {barcodeList.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                                            {barcodeList.map((item) => (
                                                <div key={item.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg text-center bg-slate-50 dark:bg-slate-950/50">
                                                    <div className="text-xs font-mono text-slate-500 mb-1">{item.code}</div>
                                                    <div className={`text-[10px] uppercase font-bold tracking-wider ${item.is_assigned ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {item.is_assigned ? 'Assigned' : 'Available'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* SMS Config */}
                    {
                        activeTab === 'sms' && smsConfig && (<div className="grid gap-6">
                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-2xl">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">SMS Gateway Configuration</h2>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Provider</label>
                                        <select value={smsConfig.provider} onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value as 'hubtel' | 'mnotify' })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none">
                                            <option value="hubtel">Hubtel</option>
                                            <option value="mnotify">mNotify</option>
                                        </select>
                                    </div>
                                    {smsConfig.provider === 'hubtel' && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client ID</label>
                                                <input type="text" value={smsConfig.hubtel?.clientId || ''} onChange={(e) => setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel, clientId: e.target.value } as any })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client Secret</label>
                                                <input type="password" value={smsConfig.hubtel?.clientSecret || ''} onChange={(e) => setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel, clientSecret: e.target.value } as any })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" />
                                            </div>
                                        </>
                                    )}
                                    {smsConfig.provider === 'mnotify' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">API Key</label>
                                            <input type="text" value={smsConfig.mnotify?.apiKey || ''} onChange={(e) => setSmsConfig({ ...smsConfig, mnotify: { ...smsConfig.mnotify, apiKey: e.target.value } as any })} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID</label>
                                        <input type="text" value={smsConfig.provider === 'hubtel' ? smsConfig.hubtel?.senderId : smsConfig.mnotify?.senderId} onChange={(e) => {
                                            if (smsConfig.provider === 'hubtel') setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel, senderId: e.target.value } as any });
                                            else setSmsConfig({ ...smsConfig, mnotify: { ...smsConfig.mnotify, senderId: e.target.value } as any });
                                        }} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm max-w-2xl mt-6">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Test Configuration</h2>
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-500">Current Balance</h4>
                                                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                                    {smsBalance !== null ? `GHS ${smsBalance.toFixed(2)}` : '---'}
                                                </div>
                                            </div>
                                            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                                                <CreditCard className="h-5 w-5 text-indigo-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Send Test Message</label>
                                        <div className="flex gap-2">
                                            <input type="tel" value={testSMSPhone} onChange={(e) => setTestSMSPhone(e.target.value)} placeholder="Recipient Phone Number" className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none" />
                                            <button onClick={handleSendTestSMS} disabled={isSendingTest || !testSMSPhone} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                                {isSendingTest ? 'Sending...' : 'Send'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500">This will send a generic test message to verify your Sender ID and credentials.</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                        )
                    }

                    {
                        activeTab === 'pwa' && (
                            <div className="space-y-6">
                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Progressive Web App (PWA)</h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Configure your app for installation on devices</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                                            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                                            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Active</span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* App Information */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                            <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-4">App Information</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">App Name</label>
                                                    <input
                                                        type="text"
                                                        value={pwaSettings.app_name}
                                                        onChange={(e) => setPwaSettings({ ...pwaSettings, app_name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Short Name</label>
                                                    <input
                                                        type="text"
                                                        value={pwaSettings.short_name}
                                                        onChange={(e) => setPwaSettings({ ...pwaSettings, short_name: e.target.value })}
                                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Theme Color</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="color"
                                                        value={pwaSettings.theme_color}
                                                        onChange={(e) => setPwaSettings({ ...pwaSettings, theme_color: e.target.value })}
                                                        className="h-10 w-20 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={pwaSettings.theme_color}
                                                        onChange={(e) => setPwaSettings({ ...pwaSettings, theme_color: e.target.value })}
                                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* App Icons */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                            <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-4">App Icons</h3>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                                                    <div className="flex flex-col items-center gap-3">
                                                        {icon192 ? (
                                                            <img src={icon192} alt="192x192 Icon" className="h-24 w-24 rounded-2xl shadow-lg object-cover" />
                                                        ) : (
                                                            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <Smartphone className="h-12 w-12 text-white" />
                                                            </div>
                                                        )}
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">192x192 Icon</p>
                                                            <p className="text-xs text-slate-500">Required for home screen</p>
                                                        </div>
                                                        <input
                                                            ref={icon192Ref}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleIconUpload(file, 192);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => icon192Ref.current?.click()}
                                                            disabled={isUploadingIcon}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                                                    <div className="flex flex-col items-center gap-3">
                                                        {icon512 ? (
                                                            <img src={icon512} alt="512x512 Icon" className="h-24 w-24 rounded-2xl shadow-lg object-cover" />
                                                        ) : (
                                                            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <Smartphone className="h-12 w-12 text-white" />
                                                            </div>
                                                        )}
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">512x512 Icon</p>
                                                            <p className="text-xs text-slate-500">Required for splash screen</p>
                                                        </div>
                                                        <input
                                                            ref={icon512Ref}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleIconUpload(file, 512);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => icon512Ref.current?.click()}
                                                            disabled={isUploadingIcon}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {isUploadingIcon ? 'Uploading...' : 'Upload Icon'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-4">
                                                💡 Tip: Use square PNG images with transparent backgrounds for best results
                                            </p>
                                        </div>

                                        {/* Installation Instructions */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="p-2 rounded-lg bg-indigo-600">
                                                    <Download className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">How to Install</h3>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">Follow these steps to install the app on your device</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Open in Browser</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400">Visit this site in Chrome, Safari, or Edge</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Find Install Option</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400">Look for "Add to Home Screen" or "Install App" in browser menu</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Confirm Installation</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400">The app will be added to your home screen like a native app</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                    <h4 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">Offline Access</h4>
                                                </div>
                                                <p className="text-xs text-emerald-700 dark:text-emerald-300">Works without internet connection</p>
                                            </div>
                                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Fast Loading</h4>
                                                </div>
                                                <p className="text-xs text-blue-700 dark:text-blue-300">Instant startup like native apps</p>
                                            </div>
                                            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                    <h4 className="font-semibold text-sm text-purple-900 dark:text-purple-100">Full Screen</h4>
                                                </div>
                                                <p className="text-xs text-purple-700 dark:text-purple-300">Immersive app experience</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSavePWASettings}
                                            disabled={isSavingPWA}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isSavingPWA ? 'Saving...' : 'Save PWA Settings'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
            </div >
        </div >
    );
};
