'use client';

import { useAuth } from '@/lib/auth-context';
import {
    Award,
    Settings,
    Users,
    Gift,
    TrendingUp,
    Plus,
    Save,
    Trash2,
    X,
    Calendar,
    Megaphone,
    Search,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast-context';

export default function LoyaltyPage() {
    const { activeStore } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // --- Redemption Logic State ---
    const [phone, setPhone] = useState('');
    const [isLoadingRedemption, setIsLoadingRedemption] = useState(false);
    const [customer, setCustomer] = useState<any>(null);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [reason, setReason] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSearch = async () => {
        if (!activeStore?.id || !phone) return;
        setIsLoadingRedemption(true);
        setCustomer(null);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('store_id', activeStore.id)
                .eq('phone', phone)
                .single();

            if (data) {
                setCustomer(data);
            } else {
                setErrorMsg('Customer not found');
            }
        } catch (e) {
            console.error(e);
            setErrorMsg('Error fetching customer');
        } finally {
            setIsLoadingRedemption(false);
        }
    };

    const handleRedeem = async () => {
        if (!customer || !redeemAmount) return;
        const points = parseInt(redeemAmount);
        if (isNaN(points) || points <= 0) {
            setErrorMsg('Invalid points amount');
            return;
        }

        // Apply Min Redemption Limit
        if (customer.points < settings.minRedemptionPoints) {
            setErrorMsg(`Customer must have at least ${settings.minRedemptionPoints} points to redeem.`);
            return;
        }

        if (points > (customer.points || 0)) {
            setErrorMsg('Insufficient points balance');
            return;
        }

        setIsLoadingRedemption(true);
        try {
            const newPoints = (customer.points || 0) - points;

            // Update customer points
            const { error: updateError } = await supabase
                .from('customers')
                .update({ points: newPoints })
                .eq('id', customer.id);

            if (updateError) throw updateError;

            // Log Transaction
            await supabase.from('loyalty_logs').insert({
                store_id: activeStore.id,
                customer_id: customer.id,
                points: -points, // Negative for redemption
                type: 'redeemed',
                description: reason || 'Redemption'
            });

            setSuccessMsg(`Successfully redeemed ${points} points for ${customer.name}. New Balance: ${newPoints}`);
            setCustomer({ ...customer, points: newPoints });
            setRedeemAmount('');
            setReason('');
        } catch (e) {
            console.error(e);
            setErrorMsg('Redemption failed');
        } finally {
            setIsLoadingRedemption(false);
        }
    };

    const [stats, setStats] = useState({
        totalMembers: 0,
        pointsIssued: 0,
        pointsRedeemed: 0,
        activeRate: '0%'
    });

    // Loyalty configuration state
    const [settings, setSettings] = useState({
        enabled: true,
        pointsPerCurrency: 1,
        redemptionRate: 0.05,
        minRedemptionPoints: 100,
        expiryMonths: 12
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const { showToast } = useToast();

    // Load Loyalty Settings & Stats
    useEffect(() => {
        const loadData = async () => {
            if (!activeStore?.id) return;

            // 1. Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('loyalty_programs')
                .select('*')
                .eq('store_id', activeStore.id)
                .single();

            if (settingsData) {
                setSettings({
                    enabled: settingsData.enabled,
                    pointsPerCurrency: settingsData.points_per_currency,
                    redemptionRate: settingsData.redemption_rate,
                    minRedemptionPoints: settingsData.min_points_to_redeem,
                    expiryMonths: 12
                });
            } else if (!settingsData && !settingsError) {
                // Initialize if missing
                await supabase.from('loyalty_programs').insert({
                    store_id: activeStore.id,
                    points_per_currency: 0.01,
                    redemption_rate: 0.01,
                    min_points_to_redeem: 100
                });
            }

            // 2. Fetch Stats
            const { data: customers, error: custError } = await supabase
                .from('customers')
                .select('points, total_spent')
                .eq('store_id', activeStore.id);

            if (customers) {
                const totalMembers = customers.length;
                const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
                // We don't have a direct 'redeemed' counter on customer, would need a transaction table. 
                // For now, we will show 0 or assume we track it later.

                // Calculate "Active" as customers with points > 0
                const activeCount = customers.filter(c => c.points > 0).length;
                const activeRate = totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) + '%' : '0%';

                // Update the stats object (we need to make it stateful)
                setStats({
                    totalMembers,
                    pointsIssued: totalPoints, // Showing current balance sum as a proxy for now
                    pointsRedeemed: 0,
                    activeRate
                });
            }
        };
        loadData();
    }, [activeStore]);



    const handleSaveSettings = async () => {
        if (!activeStore?.id) return;
        setIsSavingSettings(true);

        const { error } = await supabase
            .from('loyalty_programs')
            .upsert({
                store_id: activeStore.id,
                points_per_currency: settings.pointsPerCurrency,
                redemption_rate: settings.redemptionRate,
                min_points_to_redeem: settings.minRedemptionPoints,
                enabled: settings.enabled
            }, { onConflict: 'store_id' });

        if (error) {
            console.error('Failed to save settings:', error);
            showToast('error', 'Failed to save loyalty settings');
        } else {
            showToast('success', 'Loyalty settings saved!');
        }
        setIsSavingSettings(false);
    };

    // Mock Tiers
    const [tiers, setTiers] = useState([
        { id: 1, name: 'Bronze', minPoints: 0, benefits: ['Earn 1x Points'] },
        { id: 2, name: 'Silver', minPoints: 1000, benefits: ['Earn 1.2x Points', 'Birthday Gift'] },
        { id: 3, name: 'Gold', minPoints: 5000, benefits: ['Earn 1.5x Points', 'Free Delivery', 'Priority Support'] },
    ]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<any>(null);

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);



    if (!activeStore) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Award className="h-6 w-6 text-indigo-500" />
                        Loyalty & Rewards
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage customer retention and point systems.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'overview', name: 'Overview', icon: TrendingUp },
                        { id: 'redemption', name: 'Redeem Points', icon: Gift },
                        { id: 'settings', name: 'Program Settings', icon: Settings },
                        { id: 'tiers', name: 'Tiers & Benefits', icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                group flex items-center border-b-2 py-4 px-1 text-sm font-medium
                                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}
                            `}
                        >
                            <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500'}`} />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Areas */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-medium text-slate-500">Total Members</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMembers.toLocaleString()}</h3>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-medium text-slate-500">Total Points Issued</p>
                            <h3 className="text-2xl font-bold text-indigo-600">{stats.pointsIssued.toLocaleString()}</h3>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-medium text-slate-500">Points Redeemed</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pointsRedeemed.toLocaleString()}</h3>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-sm font-medium text-slate-500">Active Participation</p>
                            <h3 className="text-2xl font-bold text-emerald-600">{stats.activeRate}</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Campaigns</h2>
                            {campaigns.length > 0 && (
                                <button
                                    onClick={() => setIsCampaignModalOpen(true)}
                                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                                >
                                    <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                    New Campaign
                                </button>
                            )}
                        </div>

                        {campaigns.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                                <Gift className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No active campaigns</h3>
                                <p className="mt-1 text-sm text-slate-500">Get started by creating a double-points weekend promo.</p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => setIsCampaignModalOpen(true)}
                                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                                    >
                                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                        Create Campaign
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {campaigns.map((campaign) => (
                                    <div key={campaign.id} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                    <Megaphone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900 dark:text-white">{campaign.name}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{campaign.description}</p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${new Date(campaign.endDate) < new Date()
                                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {new Date(campaign.endDate) < new Date() ? 'Ended' : 'Active'}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</span>
                                            </div>
                                            <button
                                                onClick={() => setCampaigns(campaigns.filter(c => c.id !== campaign.id))}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'redemption' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Search Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Find Customer</h2>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isLoadingRedemption}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {isLoadingRedemption ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 animate-in fade-in">
                                <AlertCircle className="h-4 w-4" />
                                {errorMsg}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2 animate-in fade-in">
                                <CheckCircle className="h-4 w-4" />
                                {successMsg}
                            </div>
                        )}
                    </div>

                    {/* Redemption Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden h-fit">
                        {!customer ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 transition-all">
                                <p className="text-slate-400 text-sm font-medium">Search for a customer to redeem points</p>
                            </div>
                        ) : null}

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{customer?.name}</h2>
                            <p className="text-slate-500 text-sm">{customer?.phone}</p>
                            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                <span className="text-indigo-700 dark:text-indigo-300 font-medium text-sm">Available Balance</span>
                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{customer?.points || 0} pts</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Points to Redeem</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="0"
                                    value={redeemAmount}
                                    onChange={(e) => setRedeemAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason / Item Redeemed</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="e.g. T-Shirt, 10% Discount"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleRedeem}
                                disabled={isLoadingRedemption || !redeemAmount}
                                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 disabled:shadow-none text-sm"
                            >
                                Redeem Points
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Program Status</h3>
                                <p className="text-sm text-slate-500">Enable or disable loyalty point accumulation.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-700" />

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Earn Rate</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={settings.pointsPerCurrency}
                                        onChange={e => setSettings({ ...settings, pointsPerCurrency: parseFloat(e.target.value) })}
                                        className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 py-2 border"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <span className="text-slate-500 sm:text-sm">Pts / GHS</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Customer earns {settings.pointsPerCurrency} point for every 1 GHS spent.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Min. Points to Redeem</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={settings.minRedemptionPoints}
                                        onChange={e => setSettings({ ...settings, minRedemptionPoints: parseInt(e.target.value) || 0 })}
                                        className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 py-2 border"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <span className="text-slate-500 sm:text-sm">Pts</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Minimum balance required to start redeeming.</p>
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Redemption Value</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        value={settings.redemptionRate ? Math.round(1 / settings.redemptionRate) : ''}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            setSettings({ ...settings, redemptionRate: val ? 1 / val : 0 })
                                        }}
                                        className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 py-2 border"
                                    />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <span className="text-slate-500 sm:text-sm">Pts = 1 GHS</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Customer needs {Math.round(1 / settings.redemptionRate)} points to get 1 GHS discount.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Expiry</label>
                            <select
                                value={settings.expiryMonths}
                                onChange={e => setSettings({ ...settings, expiryMonths: parseInt(e.target.value) })}
                                className="mt-1 block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 border"
                            >
                                <option value={6}>6 Months</option>
                                <option value={12}>12 Months (1 Year)</option>
                                <option value={24}>24 Months (2 Years)</option>
                                <option value={0}>Never Expire</option>
                            </select>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSavingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tiers' && (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        {tiers.map((tier) => (
                            <div key={tier.id} className={`rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 ${tier.name === 'Gold' ? 'border-amber-200 ring-1 ring-amber-500/20 dark:border-amber-900' :
                                tier.name === 'Silver' ? 'border-slate-300 dark:border-slate-700' : 'border-orange-200 dark:border-orange-900'
                                }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className={`text-lg font-bold ${tier.name === 'Gold' ? 'text-amber-600' :
                                            tier.name === 'Silver' ? 'text-slate-600 dark:text-slate-300' : 'text-orange-700'
                                            }`}>{tier.name}</h3>
                                        <p className="text-xs text-slate-500">Min. {tier.minPoints.toLocaleString()} Points</p>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <Settings className="h-4 w-4" />
                                    </button>
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {tier.benefits.map((benefit, i) => (
                                        <li key={i} className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                            <div className="mr-2 h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => {
                                        setEditingTier(tier);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Edit Benefits
                                </button>
                            </div>
                        ))}
                        <button className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 hover:border-indigo-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-500">
                            <div className="rounded-full bg-white p-3 dark:bg-slate-800">
                                <Plus className="h-6 w-6 text-slate-400" />
                            </div>
                            <span className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">Add New Tier</span>
                        </button>
                    </div>
                </div>
            )}
            {/* Edit Tier Modal */}
            {isEditModalOpen && editingTier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit {editingTier.name} Tier</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tier Name</label>
                                <input
                                    type="text"
                                    value={editingTier.name}
                                    onChange={e => setEditingTier({ ...editingTier, name: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Points</label>
                                <input
                                    type="number"
                                    value={editingTier.minPoints}
                                    onChange={e => setEditingTier({ ...editingTier, minPoints: parseInt(e.target.value) || 0 })}
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Benefits</label>
                                <div className="space-y-2">
                                    {editingTier.benefits.map((benefit: string, index: number) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={benefit}
                                                onChange={e => {
                                                    const newBenefits = [...editingTier.benefits];
                                                    newBenefits[index] = e.target.value;
                                                    setEditingTier({ ...editingTier, benefits: newBenefits });
                                                }}
                                                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newBenefits = editingTier.benefits.filter((_: any, i: number) => i !== index);
                                                    setEditingTier({ ...editingTier, benefits: newBenefits });
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/30"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setEditingTier({ ...editingTier, benefits: [...editingTier.benefits, ''] })}
                                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
                                    >
                                        <Plus className="h-4 w-4" /> Add Benefit
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => {
                                    setTiers(tiers.map(t => t.id === editingTier.id ? editingTier : t));
                                    setIsEditModalOpen(false);
                                }}
                                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Campaign Modal */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Campaign</h2>
                            <button onClick={() => setIsCampaignModalOpen(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const newCampaign = {
                                id: Date.now().toString(),
                                name: formData.get('name') as string,
                                description: formData.get('description') as string,
                                startDate: formData.get('startDate') as string,
                                endDate: formData.get('endDate') as string,
                                createdAt: new Date().toISOString()
                            };
                            setCampaigns([...campaigns, newCampaign]);
                            setIsCampaignModalOpen(false);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Campaign Name</label>
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        placeholder="e.g. Summer Sale"
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                    <input
                                        name="description"
                                        type="text"
                                        placeholder="Brief description of the campaign..."
                                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                        <input
                                            name="startDate"
                                            type="date"
                                            required
                                            defaultValue={new Date().toISOString().split('T')[0]}
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                                        <input
                                            name="endDate"
                                            type="date"
                                            required
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Create Campaign
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCampaignModalOpen(false)}
                                    className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
