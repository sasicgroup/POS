'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSuperAdmin } from '@/lib/super-admin-context';
import Link from 'next/link';
import { ShieldCheck, LayoutDashboard, Building2, LogOut, Settings, ChevronRight, MessageSquare, BarChart2, Globe, Bell, FileText, Activity, Megaphone, Search, Send } from 'lucide-react';
import GlobalSearch from './components/GlobalSearch';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { superAdmin, logout, isLoading } = useSuperAdmin();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !superAdmin && pathname !== '/super-admin/login') {
            router.push('/super-admin/login');
        }
    }, [superAdmin, isLoading, pathname, router]);

    // Login page - no layout wrapper
    if (pathname === '/super-admin/login') return <>{children}</>;

    if (isLoading || !superAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-slate-400 text-sm animate-pulse">Authenticating...</div>
            </div>
        );
    }

    const navItems = [
        { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', href: '/super-admin/analytics', icon: BarChart2 },
        { label: 'Infrastructure Map', href: '/super-admin/performance', icon: Globe },
        { label: 'Businesses', href: '/super-admin/businesses', icon: Building2 },
        { label: 'Audit Logs', href: '/super-admin/audit', icon: Activity },
        { label: 'Support & Tickets', href: '/super-admin/support', icon: Bell },
        { label: 'Broadcasts', href: '/super-admin/broadcasts', icon: Megaphone },
        { label: 'Direct Marketing', href: '/super-admin/marketing', icon: Send },
        { label: 'SMS & Billing', href: '/super-admin/sms', icon: MessageSquare },
        { label: 'Homepage Editor', href: '/super-admin/homepage', icon: Globe },
        { label: 'Settings', href: '/super-admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col fixed inset-y-0 left-0 z-30">
                {/* Logo */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">Super Admin</div>
                        <div className="text-[10px] text-slate-500">Platform Control</div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map(item => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="h-4 w-4 flex-shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
                            {superAdmin.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{superAdmin.name}</p>
                            <p className="text-xs text-slate-500 truncate">{superAdmin.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64 min-h-screen">
                {/* Breadcrumb header */}
                <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm flex items-center px-8 gap-8 sticky top-0 z-20">
                    <div className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap min-w-max">
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-300">
                            {navItems.find(n => pathname.startsWith(n.href))?.label || 'Super Admin'}
                        </span>
                    </div>

                    {/* Global God Mode Search */}
                    <GlobalSearch />
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
