'use client';

import { useEffect, useState } from 'react';
import { useSuperAdmin, Business, computeSubscriptionStatus } from '@/lib/super-admin-context';
import Link from 'next/link';
import { Building2, Plus, Search, CheckCircle2, Clock, XCircle, Eye, Edit, ToggleLeft, ToggleRight, RefreshCw, ChevronDown, Filter } from 'lucide-react';

const STATUS_FILTERS = ['all', 'active', 'grace', 'expired', 'suspended'];
const PLAN_FILTERS = ['all', 'monthly', 'yearly', 'forever', 'trial'];

export default function BusinessesPage() {
    const { businesses, loadBusinesses, toggleBusinessActive, startViewAs } = useSuperAdmin();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        loadBusinesses().finally(() => setLoading(false));
    }, []);

    const filtered = businesses.filter(b => {
        const matchSearch = !search ||
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.slug.toLowerCase().includes(search.toLowerCase()) ||
            (b.owner_email || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' ||
            (statusFilter === 'suspended' ? !b.is_active : b.subscription_status === statusFilter);
        const matchPlan = planFilter === 'all' || b.plan === planFilter;
        return matchSearch && matchStatus && matchPlan;
    });

    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
        active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20', icon: CheckCircle2 },
        forever: { label: 'Forever', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border border-indigo-500/20', icon: CheckCircle2 },
        grace: { label: 'Grace Period', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20', icon: Clock },
        expired: { label: 'Expired', color: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/20', icon: XCircle },
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Businesses</h1>
                    <p className="text-slate-400 text-sm mt-1">{businesses.length} total client{businesses.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => loadBusinesses()} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <Link
                        href="/super-admin/businesses/new"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-[1.02]"
                    >
                        <Plus className="h-4 w-4" />
                        New Business
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name, slug, or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                    {STATUS_FILTERS.map(f => <option key={f} value={f} className="bg-slate-800 capitalize">{f === 'all' ? 'All Statuses' : f}</option>)}
                </select>
                <select
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {PLAN_FILTERS.map(f => <option key={f} value={f} className="bg-slate-800 capitalize">{f === 'all' ? 'All Plans' : f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center text-slate-400 animate-pulse">Loading businesses...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400">No businesses found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left px-6 py-3">Business</th>
                                    <th className="text-left px-6 py-3">Plan</th>
                                    <th className="text-left px-6 py-3">Status</th>
                                    <th className="text-left px-6 py-3">Subscription End</th>
                                    <th className="text-left px-6 py-3">URL</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(biz => {
                                    const status = biz.is_active ? (biz.subscription_status || 'active') : 'expired';
                                    const cfg = statusConfig[status] || statusConfig.active;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={biz.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-indigo-400">
                                                        {biz.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{biz.name}</div>
                                                        <div className="text-xs text-slate-500">{biz.owner_email || 'No email'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-300 capitalize">{biz.plan}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {!biz.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">
                                                        <XCircle className="h-3 w-3" /> Suspended
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                                                        <Icon className="h-3 w-3" />
                                                        {cfg.label}
                                                        {biz.days_remaining !== null && biz.subscription_status !== 'forever' && biz.days_remaining >= 0
                                                            ? ` · ${biz.days_remaining}d`
                                                            : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {biz.subscription_end
                                                    ? new Date(biz.subscription_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : <span className="text-indigo-400 font-medium">∞ Never</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">/{biz.slug}/login</code>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startViewAs(biz, 'read_only')}
                                                        title="View as (read-only)"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <Link
                                                        href={`/super-admin/businesses/${biz.id}`}
                                                        title="Manage"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleBusinessActive(biz.id, !biz.is_active)}
                                                        title={biz.is_active ? 'Suspend' : 'Reactivate'}
                                                        className={`p-1.5 rounded-lg transition-all ${biz.is_active
                                                            ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                                            }`}
                                                    >
                                                        {biz.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
