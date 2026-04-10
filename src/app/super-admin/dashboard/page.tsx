'use client';

import { useEffect } from 'react';
import { useSuperAdmin, computeSubscriptionStatus } from '@/lib/super-admin-context';
import Link from 'next/link';
import { Building2, TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus, Eye, ArrowRight, XCircle } from 'lucide-react';

export default function SuperAdminDashboard() {
    const { businesses, loadBusinesses } = useSuperAdmin();

    useEffect(() => { loadBusinesses(); }, []);

    const total = businesses.length;
    const active = businesses.filter(b => b.subscription_status === 'active' || b.subscription_status === 'forever').length;
    const grace = businesses.filter(b => b.subscription_status === 'grace').length;
    const expired = businesses.filter(b => b.subscription_status === 'expired' || !b.is_active).length;
    const expiringSoon = businesses.filter(b => b.days_remaining !== null && b.days_remaining <= 7 && b.days_remaining >= 0).length;

    const recentBusinesses = [...businesses].slice(0, 5);

    const statusConfig = {
        active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Active', icon: CheckCircle2 },
        forever: { color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', label: 'Forever', icon: CheckCircle2 },
        grace: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Grace Period', icon: Clock },
        expired: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Expired', icon: XCircle },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
                    <p className="text-slate-400 text-sm mt-1">Monitor all businesses on the platform</p>
                </div>
                <Link
                    href="/super-admin/businesses/new"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4" />
                    New Business
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Businesses', value: total, icon: Building2, color: 'text-indigo-400', bg: 'from-indigo-500/10 to-violet-500/10' },
                    { label: 'Active', value: active, icon: CheckCircle2, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/10' },
                    { label: 'Grace Period', value: grace, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/10 to-orange-500/10' },
                    { label: 'Expired / Suspended', value: expired, icon: AlertTriangle, color: 'text-red-400', bg: 'from-red-500/10 to-rose-500/10' },
                ].map(stat => (
                    <div key={stat.label} className={`rounded-2xl border border-white/5 bg-gradient-to-br ${stat.bg} p-5`}>
                        <div className={`${stat.color} mb-3`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Expiring Soon Alert */}
            {expiringSoon > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-amber-300 font-semibold">{expiringSoon} business{expiringSoon > 1 ? 'es' : ''} expiring within 7 days</p>
                        <p className="text-amber-400/70 text-sm">Review and renew subscriptions to avoid service interruption</p>
                    </div>
                    <Link href="/super-admin/businesses" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm font-medium">
                        View <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            )}

            {/* Recent Businesses */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Recent Businesses</h2>
                    <Link href="/super-admin/businesses" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    {recentBusinesses.length === 0 ? (
                        <div className="py-16 text-center">
                            <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400">No businesses yet</p>
                            <Link href="/super-admin/businesses/new" className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-400 hover:underline">
                                <Plus className="h-4 w-4" /> Create your first business
                            </Link>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left px-6 py-3">Business</th>
                                    <th className="text-left px-6 py-3">Plan</th>
                                    <th className="text-left px-6 py-3">Status</th>
                                    <th className="text-left px-6 py-3">Expires</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentBusinesses.map(biz => {
                                    const cfg = statusConfig[biz.subscription_status || 'active'];
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <tr key={biz.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{biz.name}</div>
                                                <div className="text-xs text-slate-500">/{biz.slug}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-300 capitalize">{biz.plan}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {cfg.label}
                                                    {biz.days_remaining !== null && biz.subscription_status !== 'forever' && ` (${biz.days_remaining}d)`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {biz.subscription_end
                                                    ? new Date(biz.subscription_end).toLocaleDateString()
                                                    : <span className="text-indigo-400">Never</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/super-admin/businesses/${biz.id}`}
                                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                                                >
                                                    <Eye className="h-3.5 w-3.5" /> Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
