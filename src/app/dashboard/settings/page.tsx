'use client';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useInventory } from '@/lib/inventory-context';
import { getSMSConfig, updateSMSConfig, SMSConfig } from '@/lib/sms';
import { getPaymentSettings, savePaymentSettings, PaymentSettings } from '@/lib/payment-settings';
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
    Trash2
} from 'lucide-react';

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

    // Payment Settings State
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
        default_provider: 'hubtel',
        hubtel: { enabled: false, api_id: '', api_key: '' },
        paystack: { enabled: false, public_key: '', secret_key: '' }
    });

    useEffect(() => {
        const loadPaymentSettings = async () => {
            if (activeStore?.id) {
                const settings = await getPaymentSettings(activeStore.id);
                setPaymentSettings(settings);
            }
        };
        loadPaymentSettings();
    }, [activeStore]);

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

    const handleSavePaymentSettings = async () => {
        if (!activeStore?.id) return;

        const success = await savePaymentSettings(activeStore.id, paymentSettings);
        if (success) {
            showToast('success', 'Payment settings saved successfully!');
        } else {
            showToast('error', 'Failed to save payment settings');
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

    if (!activeStore || !user || !smsConfig) return null;

    const tabs = [
        { id: 'general', label: 'General', icon: Building2 },
        { id: 'profile', label: 'My Profile', icon: Users },
        { id: 'products', label: 'Product Settings', icon: Package },
        { id: 'users', label: 'Team Members', icon: Users },
        { id: 'payments', label: 'Payments', icon: CreditCard },
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

                    {activeTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

                                {/* Provider Selector */}
                                <div className="mb-8 p-4 bg-slate-50 rounded-xl dark:bg-slate-800/50">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Active MoMo Provider</h3>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentSettings.default_provider === 'hubtel'
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentSettings.default_provider === 'hubtel' ? 'border-indigo-600' : 'border-slate-400'
                                                    }`}>
                                                    {paymentSettings.default_provider === 'hubtel' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                                </div>
                                                <span className="font-medium">Hubtel</span>
                                            </div>
                                            <input
                                                type="radio"
                                                name="provider"
                                                value="hubtel"
                                                checked={paymentSettings.default_provider === 'hubtel'}
                                                onChange={() => setPaymentSettings({ ...paymentSettings, default_provider: 'hubtel' })}
                                                className="hidden"
                                            />
                                        </label>

                                        <label className={`flex-1 flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${paymentSettings.default_provider === 'paystack'
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentSettings.default_provider === 'paystack' ? 'border-indigo-600' : 'border-slate-400'
                                                    }`}>
                                                    {paymentSettings.default_provider === 'paystack' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                                </div>
                                                <span className="font-medium">Paystack</span>
                                            </div>
                                            <input
                                                type="radio"
                                                name="provider"
                                                value="paystack"
                                                checked={paymentSettings.default_provider === 'paystack'}
                                                onChange={() => setPaymentSettings({ ...paymentSettings, default_provider: 'paystack' })}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Hubtel Configuration */}
                                {paymentSettings.default_provider === 'hubtel' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hubtel Configuration</h2>
                                                <p className="text-sm text-slate-500 mt-1">Configure Hubtel MoMo payments</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={paymentSettings.hubtel.enabled}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        hubtel: { ...paymentSettings.hubtel, enabled: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {paymentSettings.hubtel.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">API ID</label>
                                                <input
                                                    type="text"
                                                    value={paymentSettings.hubtel.api_id}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        hubtel: { ...paymentSettings.hubtel, api_id: e.target.value }
                                                    })}
                                                    placeholder="Enter your Hubtel API ID"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">API Key</label>
                                                <input
                                                    type="password"
                                                    value={paymentSettings.hubtel.api_key}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        hubtel: { ...paymentSettings.hubtel, api_key: e.target.value }
                                                    })}
                                                    placeholder="Enter your Hubtel API Key"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Paystack Configuration */}
                                {paymentSettings.default_provider === 'paystack' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Paystack Configuration</h2>
                                                <p className="text-sm text-slate-500 mt-1">Configure Paystack MoMo payments</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={paymentSettings.paystack.enabled}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        paystack: { ...paymentSettings.paystack, enabled: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {paymentSettings.paystack.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </label>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Secret Key</label>
                                                <input
                                                    type="password"
                                                    value={paymentSettings.paystack.secret_key}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        paystack: { ...paymentSettings.paystack, secret_key: e.target.value }
                                                    })}
                                                    placeholder="Enter your Paystack Secret Key"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Public Key (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={paymentSettings.paystack.public_key}
                                                    onChange={(e) => setPaymentSettings({
                                                        ...paymentSettings,
                                                        paystack: { ...paymentSettings.paystack, public_key: e.target.value }
                                                    })}
                                                    placeholder="Enter your Paystack Public Key"
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={handleSavePaymentSettings}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Save Payment Settings
                                    </button>
                                </div>
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
        </div >
    );
}
