'use client';

import { useAuth } from '@/lib/auth-context';
import { InventoryProvider } from '@/lib/inventory-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Settings,
    LogOut,
    Store,
    ChevronDown,
    Menu,
    X,
    CreditCard,
    Package,
    Bell,
    TrendingUp,
    MessageSquare,
    Sparkles,
    Award,
    CalendarClock,
    ShieldCheck,
    Receipt,
    Activity
} from 'lucide-react';


import { ToastProvider } from '@/lib/toast-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, activeStore, stores, switchStore, createStore, hasPermission } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('sms_user')) {
            router.push('/');
        }
    }, [router, user]);

    if (!user) return null;

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
        { name: 'Inventory', href: '/dashboard/inventory', icon: Package, permission: 'view_inventory' },
        { name: 'Sales / POS', href: '/dashboard/sales', icon: ShoppingBag, permission: 'access_pos' },
        { name: 'Sales History', href: '/dashboard/sales/history', icon: CalendarClock, permission: 'view_sales_history' },
        { name: 'AI Insights', href: '/dashboard/ai-insights', icon: Sparkles, permission: 'view_analytics' },
        { name: 'Loyalty Program', href: '/dashboard/loyalty', icon: Award, permission: 'manage_customers' },
        { name: 'Customers', href: '/dashboard/customers', icon: Users, permission: 'view_customers' },
        { name: 'Employees', href: '/dashboard/employees', icon: CreditCard, permission: 'view_employees' },
        { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt, permission: 'view_analytics' },
        { name: 'Reports', href: '/dashboard/reports', icon: TrendingUp, permission: 'view_analytics' },
        { name: 'Activity Logs', href: '/dashboard/logs', icon: Activity, permission: 'view_analytics' },
        { name: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldCheck, permission: 'view_roles' },
        { name: 'SMS / WhatsApp', href: '/dashboard/communication', icon: MessageSquare, permission: 'manage_customers' },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'access_settings' },
    ];

    const filteredNavigation = navigation.filter(item => !item.permission || hasPermission(item.permission));

    return (
        <ToastProvider>
            <InventoryProvider>
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
                    {/* ... */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200 bg-white/80 backdrop-blur-md transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950/80 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="flex h-full flex-col">
                            {/* Logo */}
                            <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
                                <Store className="mr-2 h-8 w-8 text-indigo-600" />
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                                    SASIC STORES
                                </span>
                            </div>

                            {/* Nav Links */}
                            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                                {filteredNavigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'}`} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* User Profile & Logout */}
                            <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt="User" className="h-10 w-10 rounded-full bg-slate-200 ring-2 ring-indigo-500/20" />
                                    <div className="overflow-hidden">
                                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex flex-1 flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
                        {/* Top Header */}
                        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/50 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/50 lg:px-8 sticky top-0 z-40">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
                            >
                                <Menu className="h-6 w-6" />
                            </button>

                            {/* Store Switcher */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    {activeStore ? (
                                        <>
                                            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                <Store className="h-4 w-4" />
                                            </div>
                                            <span className="font-semibold truncate max-w-[120px] sm:max-w-[200px]">{activeStore.name}</span>
                                        </>
                                    ) : (
                                        'Select Store'
                                    )}
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                </button>

                                {isStoreMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-60 origin-top-left rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 z-50">
                                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Switch Business
                                        </div>
                                        {stores.map((store) => (
                                            <button
                                                key={store.id}
                                                onClick={() => {
                                                    switchStore(store.id);
                                                    setIsStoreMenuOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${activeStore?.id === store.id
                                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className={`h-2 w-2 rounded-full ${activeStore?.id === store.id ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                <div>
                                                    <div className="font-medium">{store.name}</div>
                                                    <div className="text-xs text-slate-400">{store.location}</div>
                                                </div>
                                            </button>
                                        ))}
                                        <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                                        <button
                                            onClick={() => {
                                                setIsStoreMenuOpen(false);
                                                setIsAddStoreModalOpen(true);
                                            }}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                                        >
                                            + Add New Store
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 relative">
                                <button
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950"></span>
                                </button>

                                {isNotificationsOpen && (
                                    <div className="absolute right-0 top-12 w-80 rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
                                            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Mark all read</button>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {[
                                                { title: 'New Order #ORD-7752', desc: 'Sarah Willis placed a new order.', time: '2 mins ago', unread: true },
                                                { title: 'Low Stock Alert', desc: 'Premium Leather Bag is running low (3 items left).', time: '1 hour ago', unread: true },
                                                { title: 'Daily Report Ready', desc: 'Yesterday\'s sales report is ready for view.', time: '5 hours ago', unread: false },
                                            ].map((notif, i) => (
                                                <div key={i} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 cursor-pointer ${notif.unread ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                                    <div className="flex justify-between items-start">
                                                        <p className={`text-sm ${notif.unread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{notif.title}</p>
                                                        {notif.unread && <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5"></span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{notif.desc}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1.5">{notif.time}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center">
                                            <Link
                                                href="/dashboard/communication"
                                                className="text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 block py-1"
                                                onClick={() => setIsNotificationsOpen(false)}
                                            >
                                                View All Notifications
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </header>

                        {/* Page Content */}
                        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-24 dark:bg-slate-900 lg:p-8 lg:pb-8">
                            {children}
                        </main>
                    </div>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-1 dark:border-slate-800 dark:bg-slate-950/95 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
                    {[
                        { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
                        { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
                        { name: 'Sales', href: '/dashboard/sales', icon: ShoppingBag },
                        { name: 'Customers', href: '/dashboard/customers', icon: Users },
                        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
                    ].map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full rounded-lg transition-colors active:scale-95 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <item.icon className={`h-6 w-6 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                <span className="text-[10px] font-medium leading-none">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Add New Store Modal */}
                {isAddStoreModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Store</h2>
                                <button onClick={() => setIsAddStoreModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Downtown Branch"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        id="new-store-name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 123 Main St, Accra"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        id="new-store-location"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsAddStoreModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        const nameInput = document.getElementById('new-store-name') as HTMLInputElement;
                                        const locInput = document.getElementById('new-store-location') as HTMLInputElement;

                                        if (nameInput.value && locInput.value) {
                                            await createStore(nameInput.value, locInput.value);
                                            setIsAddStoreModalOpen(false);
                                        }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Create Store
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </InventoryProvider>
        </ToastProvider>
    );
}
