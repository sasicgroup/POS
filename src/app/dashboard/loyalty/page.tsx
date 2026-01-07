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
    X
} from 'lucide-react';
import { useState } from 'react';

export default function LoyaltyPage() {
    const { activeStore } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Mock Loyalty Settings
    const [settings, setSettings] = useState({
        enabled: true,
        pointsPerCurrency: 1, // 1 point per 1 GHS
        redemptionRate: 0.05, // 1 point = 0.05 GHS value (so 100 points = 5 GHS)
        minRedemptionPoints: 100,
        expiryMonths: 12
    });

    // Mock Tiers
    const [tiers, setTiers] = useState([
        { id: 1, name: 'Bronze', minPoints: 0, benefits: ['Earn 1x Points'] },
        { id: 2, name: 'Silver', minPoints: 1000, benefits: ['Earn 1.2x Points', 'Birthday Gift'] },
        { id: 3, name: 'Gold', minPoints: 5000, benefits: ['Earn 1.5x Points', 'Free Delivery', 'Priority Support'] },
    ]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<any>(null);

    // Mock Customer Data for Dashboard
    const stats = {
        totalMembers: 1240,
        pointsIssued: 45000,
        pointsRedeemed: 12500,
        activeRate: '65%'
    };

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

                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                        <Gift className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No active campaigns</h3>
                        <p className="mt-1 text-sm text-slate-500">Get started by creating a double-points weekend promo.</p>
                        <div className="mt-6">
                            <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                Create Campaign
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
                            <button className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                                <Save className="mr-2 h-4 w-4" />
                                Save Settings
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
        </div>
    );
}
