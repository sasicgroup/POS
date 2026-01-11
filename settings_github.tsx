'use client';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { getSMSConfig, updateSMSConfig, SMSConfig } from '@/lib/sms';
import { useToast } from '@/lib/toast-context';
import { useState, useEffect } from 'react';
import { Building2, Users, Save, Globe, MessageSquare, X, Tag, Package, Edit2, Trash2, Layout, Eye, EyeOff, Archive, RotateCcw, Barcode, QrCode, RefreshCw, ShieldAlert, Key, Palette, Image, Type } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function SettingsPage() {
    const { activeStore, user, updateStoreSettings, teamMembers, addTeamMember, updateTeamMember, removeTeamMember } = useAuth();
    const { showToast } = useToast();
    const { businessTypes, activeCategories, customCategories, toggleBusinessType, addCustomCategory, removeCustomCategory, availableBusinessTypes, addCustomBusinessType, updateBusinessType, deleteBusinessType, updateCustomCategory } = useInventory();

    const [activeTab, setActiveTab] = useState('general');
    const [smsConfig, setSmsConfig] = useState<SMSConfig | null>(null);
    const [storeName, setStoreName] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [receiptPrefix, setReceiptPrefix] = useState('');
    const [receiptSuffix, setReceiptSuffix] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [brandingName, setBrandingName] = useState('');
    const [brandingColor, setBrandingColor] = useState('#4f46e5');
    const [brandingLogo, setBrandingLogo] = useState('');
    const [profileData, setProfileData] = useState({ name: '', phone: '', username: '' });
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [otpEnabled, setOtpEnabled] = useState(true);
    const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<{ id: string, name: string } | null>(null);
    const [storeToDelete, setStoreToDelete] = useState<any>(null);
    const [deletionOtcInput, setDeletionOtcInput] = useState('');
    const [otcSent, setOtcSent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [barcodeCount, setBarcodeCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [barcodeList, setBarcodeList] = useState<any[]>([]);
    const [editingType, setEditingType] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const { updateStoreStatus, requestStoreDeletionOTC, verifyStoreDeletionOTC, deleteStore, stores } = useAuth();

    useEffect(() => {
        setSmsConfig(getSMSConfig());
        if (activeStore) {
            setStoreName(activeStore.name);
            setStoreLocation(activeStore.location);
            setReceiptPrefix(activeStore.receiptPrefix || 'TRX');
            setReceiptSuffix(activeStore.receiptSuffix || '');
            setStorePhone(activeStore.phone || '');
        }
        if (user) setProfileData({ name: user.name || '', phone: user.phone || '', username: user.username || '' });
    }, [activeStore, user]);

    useEffect(() => { if (activeTab === 'barcodes') fetchBarcodeLibrary(); }, [activeTab]);
    useEffect(() => { if (showInviteModal) setOtpEnabled(editingMember ? editingMember.otp_enabled !== false : true); }, [showInviteModal, editingMember]);

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
                const result = await updateStoreSettings({ name: storeName, location: storeLocation, receiptPrefix, receiptSuffix, phone: storePhone });
                if (result && !result.success) throw result.error;
                showToast('success', 'Settings saved successfully!');
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast('error', 'Failed to save settings. Please try again.');
        } finally { setIsSaving(false); }
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

    const drawBarcode = (doc: jsPDF, code: string, x: number, y: number, width: number, height: number) => {
        const barWidth = width / (code.length * 11 + 12);
        let currentX = x + barWidth * 2;
        const code39Map: Record<string, number[]> = { '0': [1,0,2,0,1,0,1,0,2], '1': [2,0,1,0,2,0,1,0,1], '2': [1,0,2,0,2,0,1,0,1], '3': [2,0,2,0,1,0,1,0,1], '4': [1,0,1,0,2,0,2,0,1], '5': [2,0,1,0,1,0,2,0,1], '6': [1,0,2,0,2,0,1,0,2], '7': [1,0,1,0,1,0,2,0,2], '8': [2,0,1,0,1,0,1,0,2], '9': [2,0,1,0,2,0,1,0,2], 'A': [2,0,1,0,1,0,2,0,1], 'B': [1,0,2,0,1,0,2,0,1], 'C': [2,0,2,0,1,0,1,0,1], 'D': [1,0,1,0,2,0,2,0,1], 'E': [2,0,1,0,1,0,2,0,1], 'F': [1,0,2,0,2,0,1,0,2], 'G': [1,0,1,0,1,0,2,0,2], 'H': [2,0,1,0,1,0,1,0,2], 'I': [1,0,2,0,1,0,1,0,2], 'J': [1,0,1,0,2,0,1,0,2], 'K': [2,0,1,0,1,0,1,0,3], 'L': [1,0,2,0,1,0,1,0,3], 'M': [2,0,2,0,1,0,1,0,3], 'N': [1,0,1,0,2,0,1,0,3], 'O': [2,0,1,0,1,0,1,0,3], 'P': [1,0,2,0,2,0,1,0,3], 'Q': [1,0,1,0,1,0,2,0,3], 'R': [2,0,1,0,1,0,2,0,3], 'S': [1,0,2,0,1,0,2,0,3], 'T': [1,0,1,0,1,0,1,0,3], 'U': [3,0,1,0,1,0,2,0,1], 'V': [3,0,1,0,1,0,2,0,1], 'W': [3,0,2,0,1,0,1,0,1], 'X': [3,0,1,0,2,0,1,0,1], 'Y': [3,0,2,0,1,0,1,0,1], 'Z': [3,0,1,0,1,0,2,0,1], '-': [3,0,1,0,1,0,2,0,1], '.': [3,0,1,0,2,0,1,0,1], ' ': [3,0,1,0,1,0,2,0,1], '$': [3,0,3,0,1,0,1,0,1], '/': [3,0,1,0,3,0,1,0,1], '+': [3,0,1,0,1,0,3,0,1], '%': [1,0,3,0,3,0,1,0,1], '*': [3,0,1,0,2,0,1,0,3] };
        const upperCode = code.toUpperCase();
        const startPattern = code39Map['*'] || [];
        startPattern.forEach((val, i) => { const isBar = i % 2 === 0; const w = (val % 2 === 0 ? barWidth : barWidth * 2); if (isBar) doc.rect(currentX, y, w, height, 'F'); currentX += w; });
        for (let char of upperCode) {
            const pattern = code39Map[char] || code39Map[' '] || [];
            pattern.forEach((val, i) => { const isBar = i % 2 === 0; const w = (val % 2 === 0 ? barWidth : barWidth * 2); if (isBar) doc.rect(currentX, y, w, height, 'F'); currentX += w; });
        }
        const endPattern = code39Map['*'] || [];
        endPattern.forEach((val, i) => { const isBar = i % 2 === 0; const w = (val % 2 === 0 ? barWidth : barWidth * 2); if (isBar) doc.rect(currentX, y, w, height, 'F'); currentX += w; });
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
            drawBarcode(doc, item.code, x, y, barcodeWidth, barcodeHeight);
            doc.setFontSize(8);
            doc.text(item.code, x + barcodeWidth / 2, y + barcodeHeight + 4, { align: 'center' });
            doc.setFontSize(7);
            doc.text(item.is_assigned ? 'Assigned' : 'Available', x + barcodeWidth / 2, y + barcodeHeight + 8, { align: 'center' });
            x += barcodeWidth + colGap;
            if (x + barcodeWidth > 190) { x = 15; y += barcodeHeight + rowGap; }
        }
        doc.save('barcode-library.pdf');
        showToast('success', 'Barcode library exported to PDF');
    };

    if (!activeStore || !user || !smsConfig) return null;

    const tabs = [
        { id: 'general', label: 'General', icon: Building2 },
        { id: 'profile', label: 'My Profile', icon: Users },
        { id: 'products', label: 'Product Settings', icon: Package },
        { id: 'users', label: 'Team Members', icon: Users },
        { id: 'stores', label: 'Store Management', icon: Layout },
        { id: 'barcodes', label: 'Barcode Generator', icon: Barcode },
        { id: 'sms', label: 'SMS & Notifications', icon: MessageSquare },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage your store preferences and account settings.</p>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                    <Save className="h-4 w-4" />{isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="w-full lg:w-64 flex-shrink-0">
                    <nav className="flex flex-row overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-col lg:overflow-visible">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                <tab.icon className="h-5 w-5" />{tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex-1 space-y-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Store Details</h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-s
