'use client';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { getSMSConfig, updateSMSConfig, SMSConfig } from '@/lib/sms';

import { useToast } from '@/lib/toast-context';
import { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    CreditCard,
    Bell,
    Save,
    Globe,
    Lock,
    MessageSquare,
    X,
    Tag,
    Package,
    Edit2,
    Trash2,
    Layout,
    Eye,
    EyeOff,
    Archive,
    RotateCcw,
    Barcode,
    QrCode,
    RefreshCw,
    ShieldAlert,
    Key
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function SettingsPage() {
    const { activeStore, user, updateStoreSettings, teamMembers, addTeamMember, updateTeamMember, removeTeamMember } = useAuth();
    const { showToast } = useToast();
    const {
        businessTypes,
        activeCategories,
        customCategories,
        toggleBusinessType,
        addCustomCategory,
        removeCustomCategory,
        availableBusinessTypes,
        addCustomBusinessType,
        updateBusinessType,
        deleteBusinessType,
        updateCustomCategory
    } = useInventory();

    const [activeTab, setActiveTab] = useState('general');
    const [smsConfig, setSmsConfig] = useState<SMSConfig | null>(null);
    const [storeName, setStoreName] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [receiptPrefix, setReceiptPrefix] = useState('');
    const [receiptSuffix, setReceiptSuffix] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Profile Edit State
    const [profileData, setProfileData] = useState({
        name: '',
        phone: '',
        username: ''
    });
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Store Management State
    const [storeToDelete, setStoreToDelete] = useState<any>(null);
    const [deletionOtcInput, setDeletionOtcInput] = useState('');
    const [otcSent, setOtcSent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Barcode Generator State
    const [barcodeCount, setBarcodeCount] = useState(10);
    const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [barcodeList, setBarcodeList] = useState<any[]>([]);

    const {
        updateStoreStatus,
        requestStoreDeletionOTC,
        verifyStoreDeletionOTC,
        deleteStore,
        stores
    } = useAuth();





    const handleUpdateProfile = async () => {
        if (!user?.id) return;

        // Don't allow deleting self through accidental empty fields if logic existed, 
        // but here we just update.

        const { error } = await supabase
            .from('employees')
            .update({
                name: profileData.name,
                phone: profileData.phone,
                username: profileData.username
            })
            .eq('id', user.id);

        if (error) {
            showToast('error', 'Failed to update profile');
        } else {
            showToast('success', 'Profile updated successfully!');
            // Update local user object - primitive way, context might need refresh but this helps persists slightly
            const updatedUser = { ...user, ...profileData };
            localStorage.setItem('sms_user', JSON.stringify(updatedUser));
        }
    };



    // Team Management State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<{ id: string, name: string } | null>(null);

    // Edit State for Types/Categories
    const [editingType, setEditingType] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);

    useEffect(() => {
        setSmsConfig(getSMSConfig());
        if (activeStore) {
            setStoreName(activeStore.name);
            setStoreLocation(activeStore.location);
            setReceiptPrefix(activeStore.receiptPrefix || 'TRX');
            setReceiptSuffix(activeStore.receiptSuffix || '');
        }
        if (user) {
            setProfileData({
                name: user.name || '',
                phone: user.phone || '',
                username: user.username || ''
            });
        }
    }, [activeStore, user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save SMS Config
            if (smsConfig && activeStore?.id) {
                await updateSMSConfig(smsConfig, activeStore.id);
            }

            // Save Store Settings
            // Save Store Settings
            if (activeStore) {
                const result = await updateStoreSettings({
                    name: storeName,
                    location: storeLocation,
                    receiptPrefix,
                    receiptSuffix
                });

                if (result && !result.success) {
                    throw result.error;
                }

                if (result && result.error && typeof result.error === 'string') {
                    showToast('error', result.error);
                } else {
                    showToast('success', 'Settings saved successfully!');
                }
            } else {
                showToast('success', 'Settings saved successfully!');
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast('error', 'Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchBarcodeLibrary = async () => {
        if (!activeStore?.id) return;
        const { data, error } = await supabase
            .from('generated_barcodes')
            .select('*')
            .eq('store_id', activeStore.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setBarcodeList(data);
        }
    };

    useEffect(() => {
        if (activeTab === 'barcodes') {
            fetchBarcodeLibrary();
        }
    }, [activeTab]);

    const handleGenerateBarcodes = async () => {
        if (!activeStore?.id || barcodeCount <= 0) return;
        setIsGenerating(true);

        try {
            const newCodes = [];
            const timestamp = Date.now().toString().slice(-6);
            for (let i = 0; i < barcodeCount; i++) {
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const code = `BC-${timestamp}-${random}`;
                newCodes.push({
                    store_id: activeStore.id,
                    code: code,
                    is_assigned: false
                });
            }

            const { error } = await supabase
                .from('generated_barcodes')
                .insert(newCodes);

            if (error) throw error;

            showToast('success', `Successfully generated ${barcodeCount} barcodes`);
            fetchBarcodeLibrary();
        } catch (err) {
            console.error(err);
            showToast('error', 'Failed to generate barcodes');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRequestDeletion = async (store: any) => {
        setStoreToDelete(store);
        const success = await requestStoreDeletionOTC(store.id);
        if (success) {
            setOtcSent(true);
            showToast('success', 'Deletion code sent to your phone');
        } else {
            showToast('error', 'Failed to send deletion code');
        }
    };

    const handleVerifyAndDelete = async () => {
        if (!storeToDelete || !deletionOtcInput) return;
        setIsDeleting(true);

        try {
            const isValid = await verifyStoreDeletionOTC(storeToDelete.id, deletionOtcInput);
            if (isValid) {
                await deleteStore(storeToDelete.id);
                showToast('success', 'Store deleted successfully');
                setStoreToDelete(null);
                setDeletionOtcInput('');
                setOtcSent(false);
            } else {
                showToast('error', 'Invalid or expired code');
            }
        } catch (err) {
            showToast('error', 'Deletion failed');
        } finally {
            setIsDeleting(false);
        }
    };

    const downloadBarcodesPDF = () => {
        if (barcodeList.length === 0) return;
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Barcode Library', 10, 20);
        doc.setFontSize(12);

        let y = 40;
        barcodeList.forEach((item, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${index + 1}. Code: ${item.code} (${item.is_assigned ? 'Assigned' : 'Available'})`, 10, y);
            y += 10;
        });

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
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* Sidebar Navigation for Settings */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <nav className="flex flex-row overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-col lg:overflow-visible">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
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
                                            <input
                                                type="text"
                                                value={storeName}
                                                onChange={(e) => setStoreName(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
                                        <select className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                            <option value="GHS">GHS (Ghana Cedi)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location Address</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <textarea
                                                value={storeLocation}
                                                onChange={(e) => setStoreLocation(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Initial Transaction Configuration</h2>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction ID Prefix</label>
                                            <div className="relative">
                                                <Tag className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={receiptPrefix}
                                                    onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                                                    placeholder="TRX"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">Appears before the number (e.g., <span className="font-bold">{receiptPrefix || 'TRX'}</span>-00001)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction ID Suffix</label>
                                            <div className="relative">
                                                <Tag className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={receiptSuffix}
                                                    onChange={(e) => setReceiptSuffix(e.target.value)}
                                                    placeholder="-2024"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500">Appears after the number (e.g., {receiptPrefix || 'TRX'}-00001<span className="font-bold">{receiptSuffix}</span>)</p>
                                        </div>
                                    </div>
                                </div>


                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Information</h2>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                                            <input
                                                type="tel"
                                                placeholder="024 400 0000"
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Tax Configuration</h2>
                                <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Tax Calculation</p>
                                        <p className="text-xs text-slate-500">Apply tax to sales automatically</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={activeStore.taxSettings?.enabled ?? true}
                                            onChange={(e) => updateStoreSettings({ taxSettings: { ...activeStore.taxSettings!, enabled: e.target.checked } })}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {(activeStore.taxSettings?.enabled ?? true) && (
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tax Type</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateStoreSettings({ taxSettings: { ...activeStore.taxSettings!, type: 'percentage' } })}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeStore.taxSettings?.type !== 'fixed' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                                >
                                                    Percentage (%)
                                                </button>
                                                <button
                                                    onClick={() => updateStoreSettings({ taxSettings: { ...activeStore.taxSettings!, type: 'fixed' } })}
                                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeStore.taxSettings?.type === 'fixed' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                                >
                                                    Fixed Amount
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                {activeStore.taxSettings?.type === 'fixed' ? 'Tax Amount (GHS)' : 'Tax Percentage (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={activeStore.taxSettings?.value ?? 8}
                                                onChange={(e) => updateStoreSettings({ taxSettings: { ...activeStore.taxSettings!, value: parseFloat(e.target.value) } })}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">My Profile</h2>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                        <input
                                            type="text"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                                        <input
                                            type="text"
                                            value={profileData.username}
                                            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={handleUpdateProfile}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Save Profile Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                                >
                                    + Invite Member
                                </button>
                            </div>

                            <div className="space-y-4">
                                {teamMembers.map((member: any) => (
                                    <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                                                {member.avatar ? <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" /> : member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                    {member.name}
                                                    {member.id === user.id && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">You</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`capitalize px-3 py-1 rounded-full text-xs font-medium 
                                                ${member.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    member.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {member.role}
                                            </span>

                                            {member.id !== user.id && (
                                                <div className="flex items-center gap-1">
                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => {
                                                            setEditingMember(member);
                                                            setShowInviteModal(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Edit Role">
                                                        <Users className="h-4 w-4" />
                                                    </button>
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => {
                                                            setDeleteMemberConfirm({ id: member.id, name: member.name });
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove Member">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {teamMembers.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        No team members found. Invite someone to get started!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}



                    {/* Invite/Edit Modal */}
                    {showInviteModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingMember ? 'Edit Member' : 'Invite New Member'}
                                    </h3>
                                    <button onClick={() => { setShowInviteModal(false); setEditingMember(null); }} className="text-slate-400 hover:text-slate-600">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const data = {
                                        name: formData.get('name') as string,
                                        username: formData.get('username') as string,
                                        phone: formData.get('phone') as string,
                                        pin: formData.get('pin') as string,
                                        otp_enabled: formData.get('otp_enabled') === 'on',
                                        role: formData.get('role') as any
                                    };

                                    try {
                                        if (editingMember) {
                                            await updateTeamMember(editingMember.id, data);
                                        } else {
                                            await addTeamMember(data);
                                        }
                                        setShowInviteModal(false);
                                        setEditingMember(null);
                                    } catch (err) {
                                        alert('Failed to save member. Please try again.');
                                    }
                                }}>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                            <input name="name" required defaultValue={editingMember?.name} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="e.g. John Doe" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                                            <input name="username" required defaultValue={editingMember?.username} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="e.g. johndoe" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                            <input name="phone" type="tel" defaultValue={editingMember?.phone} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="e.g. 0244000000" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                                                <select name="role" required defaultValue={editingMember?.role || 'staff'} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                                    <option value="staff">Staff</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="owner">Owner</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Access PIN</label>
                                                <input name="pin" type="text" pattern="[0-9]{4,6}" required defaultValue={editingMember?.pin} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="e.g. 1234" title="4-6 digit PIN" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="checkbox"
                                                name="otp_enabled"
                                                id="otp_enabled_edit"
                                                defaultChecked={editingMember ? editingMember.otp_enabled : true}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="otp_enabled_edit" className="text-sm text-slate-700 dark:text-slate-300">Enable OTP (Requires Phone Number)</label>
                                        </div>
                                    </div>
                                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
                                        <button type="button" onClick={() => { setShowInviteModal(false); setEditingMember(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95">
                                            {editingMember ? 'Save Changes' : 'Send Invitation'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Business Type & Categories</h2>
                                <p className="text-sm text-slate-500 mb-6">Select your business types to automatically populate relevant categories. You can also add custom categories.</p>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Types</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {availableBusinessTypes.map((type) => (
                                                <div key={type} className="group relative">
                                                    {editingType === type ? (
                                                        <input
                                                            autoFocus
                                                            className="w-full p-3 rounded-lg border border-indigo-500 bg-white text-sm outline-none ring-2 ring-indigo-200"
                                                            defaultValue={type}
                                                            onBlur={(e) => {
                                                                const newVal = e.currentTarget.value.trim();
                                                                if (newVal && newVal !== type) updateBusinessType(type, newVal);
                                                                setEditingType(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const newVal = e.currentTarget.value.trim();
                                                                    if (newVal && newVal !== type) updateBusinessType(type, newVal);
                                                                    setEditingType(null);
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750">
                                                            <input
                                                                type="checkbox"
                                                                checked={businessTypes.includes(type)}
                                                                onChange={() => toggleBusinessType(type)}
                                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{type}</span>

                                                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setEditingType(type);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-indigo-600"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (confirm('Delete this business type?')) deleteBusinessType(type);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-red-600"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </label>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 max-w-md mt-3">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add custom business type..."
                                                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) addCustomBusinessType(val);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <button
                                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                                onClick={(e) => {
                                                    const input = e.currentTarget.previousElementSibling?.querySelector('input');
                                                    if (input && input.value.trim()) {
                                                        addCustomBusinessType(input.value.trim());
                                                        input.value = '';
                                                    }
                                                }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Active Categories</label>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {activeCategories.map((category) => (
                                                <div key={category} className="group flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                                    {editingCategory === category ? (
                                                        <input
                                                            autoFocus
                                                            className="w-24 bg-transparent outline-none border-b border-indigo-500 text-xs"
                                                            defaultValue={category}
                                                            onBlur={(e) => {
                                                                const newVal = e.currentTarget.value.trim();
                                                                if (newVal && newVal !== category) updateCustomCategory(category, newVal);
                                                                setEditingCategory(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const newVal = e.currentTarget.value.trim();
                                                                    if (newVal && newVal !== category) updateCustomCategory(category, newVal);
                                                                    setEditingCategory(null);
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <>
                                                            <span
                                                                onClick={() => setEditingCategory(category)}
                                                                className="cursor-pointer hover:underline"
                                                                title="Click to edit"
                                                            >
                                                                {category}
                                                            </span>
                                                            <button
                                                                onClick={() => removeCustomCategory(category)}
                                                                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
                                                                title="Remove"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 max-w-md">
                                            <div className="relative flex-1">
                                                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Add custom category..."
                                                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) addCustomCategory(val);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <button
                                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                                onClick={(e) => {
                                                    const input = e.currentTarget.previousElementSibling?.querySelector('input');
                                                    if (input && input.value.trim()) {
                                                        addCustomCategory(input.value.trim());
                                                        input.value = '';
                                                    }
                                                }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stores' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Store Management</h2>
                                    <span className="text-xs font-mono text-slate-500">Total: {stores.length}</span>
                                </div>

                                <div className="grid gap-4">
                                    {stores.map((store: any) => (
                                        <div key={store.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{store.name}</p>
                                                    <p className="text-xs text-slate-500">{store.location}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${store.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    store.status === 'hidden' ? 'bg-slate-200 text-slate-600' :
                                                        store.status === 'archived' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {store.status || 'active'}
                                                </span>

                                                <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                                <button
                                                    onClick={() => updateStoreStatus(store.id, store.status === 'hidden' ? 'active' : 'hidden')}
                                                    className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
                                                    title={store.status === 'hidden' ? 'Show Store' : 'Hide Store'}
                                                >
                                                    {store.status === 'hidden' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                </button>

                                                <button
                                                    onClick={() => updateStoreStatus(store.id, store.status === 'archived' ? 'active' : 'archived')}
                                                    className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-amber-600 transition-all shadow-sm"
                                                    title={store.status === 'archived' ? 'Restore Store' : 'Archive Store'}
                                                >
                                                    {store.status === 'archived' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                                </button>

                                                <button
                                                    onClick={() => handleRequestDeletion(store)}
                                                    className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-red-600 transition-all shadow-sm"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'barcodes' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Barcode Generator</h2>

                                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2 uppercase">Quantity to Generate</label>
                                        <input
                                            type="number"
                                            value={barcodeCount}
                                            onChange={(e) => setBarcodeCount(parseInt(e.target.value) || 1)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                                            min="1"
                                            max="100"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleGenerateBarcodes}
                                            disabled={isGenerating}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                            {isGenerating ? 'Generating...' : 'Generate Codes'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <QrCode className="h-4 w-4 text-indigo-500" />
                                            Barcode Library
                                        </h3>
                                        <button
                                            onClick={downloadBarcodesPDF}
                                            className="text-xs text-indigo-600 hover:underline font-bold"
                                        >
                                            Download All (PDF)
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {barcodeList.map((item) => (
                                            <div key={item.id} className="p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center gap-2 group hover:border-indigo-300 transition-all">
                                                <div className="w-full h-8 bg-slate-100 rounded flex items-center justify-center">
                                                    <div className="h-4 w-full flex items-center justify-center gap-0.5 px-2">
                                                        {[...Array(20)].map((_, i) => (
                                                            <div key={i} className={`h-full w-px bg-slate-900 ${i % 3 === 0 ? 'w-[2px]' : ''}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">{item.code}</span>
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${item.is_assigned ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {item.is_assigned ? 'Assigned' : 'Available'}
                                                </span>
                                            </div>
                                        ))}
                                        {barcodeList.length === 0 && (
                                            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                                <p className="text-sm text-slate-400">No barcodes generated yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sms' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-6">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Provider Settings</h2>
                                    <p className="text-sm text-slate-500">Configure your SMS and WhatsApp providers.</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">SMS Provider</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="provider"
                                                    value="hubtel"
                                                    checked={smsConfig.provider === 'hubtel'}
                                                    onChange={() => setSmsConfig({ ...smsConfig, provider: 'hubtel' })}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Hubtel</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="provider"
                                                    value="mnotify"
                                                    checked={smsConfig.provider === 'mnotify'}
                                                    onChange={() => setSmsConfig({ ...smsConfig, provider: 'mnotify' })}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">mNotify</span>
                                            </label>
                                        </div>
                                    </div>

                                    {smsConfig.provider === 'hubtel' ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hubtel Client ID</label>
                                                <input
                                                    type="text"
                                                    value={smsConfig.hubtel?.clientId || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel!, clientId: e.target.value } })}
                                                    placeholder="Enter Client ID"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hubtel Client Secret</label>
                                                <input
                                                    type="password"
                                                    value={smsConfig.hubtel?.clientSecret || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel!, clientSecret: e.target.value } })}
                                                    placeholder="Enter Client Secret"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID</label>
                                                <input
                                                    type="text"
                                                    value={smsConfig.hubtel?.senderId || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, hubtel: { ...smsConfig.hubtel!, senderId: e.target.value } })}
                                                    placeholder="Brand Name"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">mNotify API Key</label>
                                                <input
                                                    type="password"
                                                    value={smsConfig.mnotify?.apiKey || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, mnotify: { ...smsConfig.mnotify!, apiKey: e.target.value } })}
                                                    placeholder="Enter API Key"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sender ID</label>
                                                <input
                                                    type="text"
                                                    value={smsConfig.mnotify?.senderId || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, mnotify: { ...smsConfig.mnotify!, senderId: e.target.value } })}
                                                    placeholder="Brand Name"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
                                        <div className="mb-4">
                                            <h3 className="text-md font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <div className="bg-green-100 text-green-600 p-1 rounded"><span className="text-xs font-bold">WA</span></div>
                                                WhatsApp Integration (Meta Cloud API)
                                            </h3>
                                            <p className="text-sm text-slate-500">Configure your Meta (Facebook) developer credentials to send WhatsApp messages.</p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number ID</label>
                                                <input
                                                    type="text"
                                                    value={smsConfig.meta?.phoneNumberId || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, meta: { ...(smsConfig.meta || { accessToken: '', businessAccountId: '' }), phoneNumberId: e.target.value } })}
                                                    placeholder="e.g. 100555555555555"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Account ID</label>
                                                <input
                                                    type="text"
                                                    value={smsConfig.meta?.businessAccountId || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, meta: { ...(smsConfig.meta || { accessToken: '', phoneNumberId: '' }), businessAccountId: e.target.value } })}
                                                    placeholder="e.g. 100555555555555"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Permanent Access Token</label>
                                                <input
                                                    type="password"
                                                    value={smsConfig.meta?.accessToken || ''}
                                                    onChange={(e) => setSmsConfig({ ...smsConfig, meta: { ...(smsConfig.meta || { phoneNumberId: '', businessAccountId: '' }), accessToken: e.target.value } })}
                                                    placeholder="EAAG... (Start with EAAG)"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Notification Actions</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Shop Owner Notifications</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Send SMS on Sale</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={smsConfig.notifications.owner.sms}
                                                        onChange={(e) => setSmsConfig({ ...smsConfig, notifications: { ...smsConfig.notifications, owner: { ...smsConfig.notifications.owner, sms: e.target.checked } } })}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Customer Notifications</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Send SMS Receipt</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={smsConfig.notifications.customer.sms}
                                                        onChange={(e) => setSmsConfig({ ...smsConfig, notifications: { ...smsConfig.notifications, customer: { ...smsConfig.notifications.customer, sms: e.target.checked } } })}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                    Send WhatsApp Receipt
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">NEW</span>
                                                </span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={smsConfig.notifications.customer.whatsapp}
                                                        onChange={(e) => setSmsConfig({ ...smsConfig, notifications: { ...smsConfig.notifications, customer: { ...smsConfig.notifications.customer, whatsapp: e.target.checked } } })}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Delete Member Confirmation Modal */}
            {
                deleteMemberConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 p-4">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Remove Team Member?</h3>
                            <p className="text-sm text-center text-slate-500 mb-6">
                                Are you sure you want to remove <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteMemberConfirm.name}</span>? They will no longer have access.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteMemberConfirm(null)}
                                    className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        removeTeamMember(deleteMemberConfirm.id);
                                        setDeleteMemberConfirm(null);
                                        showToast('success', 'Team member removed successfully');
                                    }}
                                    className="flex-1 rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Store Deletion / OTC Modal */}
            {storeToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-red-100 dark:border-red-900/30">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 mb-4 animate-bounce">
                            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Security Checkpoint</h3>
                        <p className="text-sm text-center text-slate-500 mb-6 font-medium">
                            You are about to permanently delete <span className="font-bold text-red-600">{storeToDelete.name}</span>. This will destroy all sales data, inventory, and analytics.
                        </p>

                        {!otcSent ? (
                            <button
                                onClick={() => handleRequestDeletion(storeToDelete)}
                                className="w-full rounded-xl bg-red-600 py-4 font-bold text-white hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Key className="h-5 w-5" />
                                REQUEST DELETION OTC
                            </button>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Enter 6-Digit Code</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={deletionOtcInput}
                                        onChange={(e) => setDeletionOtcInput(e.target.value)}
                                        placeholder="000000"
                                        className="w-full h-14 text-center text-2xl font-bold tracking-widest rounded-xl border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                                    />
                                </div>
                                <button
                                    onClick={handleVerifyAndDelete}
                                    disabled={isDeleting || deletionOtcInput.length < 6}
                                    className="w-full rounded-xl bg-red-600 py-4 font-bold text-white hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'CONFIRM PERMANENT DELETION'}
                                </button>
                                <p className="text-[10px] text-center text-slate-400 italic">Code expires in 10 minutes</p>
                            </div>
                        )}

                        <button
                            onClick={() => { setStoreToDelete(null); setOtcSent(false); setDeletionOtcInput(''); }}
                            className="mt-4 w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
