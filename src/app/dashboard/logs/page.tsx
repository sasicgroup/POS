'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

import { Search, Filter, RefreshCw, User, Shield } from 'lucide-react';

export default function ActivityLogsPage() {
    const { activeStore, user } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');

    useEffect(() => {
        if (activeStore?.id) fetchLogs();
    }, [activeStore?.id]);

    const fetchLogs = async () => {
        if (!activeStore?.id) return;
        setLoading(true);

        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                employees (
                    name,
                    username,
                    role,
                    avatar_url
                )
            `)
            .eq('store_id', activeStore.id)
            .order('created_at', { ascending: false })
            .limit(100);

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching logs:', JSON.stringify(error, null, 2));
            if (error.code === 'PGRST116') {
                // JSON object requested, multiple (or no) rows returned
            }
            // If table does not exist (404/42P01), it might fail silently or with code
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    };

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        const userName = log.employees?.name?.toLowerCase() || '';
        const userUsername = log.employees?.username?.toLowerCase() || '';
        const action = log.action.toLowerCase();

        const matchesUser = userName.includes(filterUser.toLowerCase()) || userUsername.includes(filterUser.toLowerCase());
        const matchesAction = action.includes(filterAction.toLowerCase());

        return matchesUser && matchesAction;
    });

    if (!user || (user.role !== 'owner' && user.role !== 'manager')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <Shield className="h-16 w-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Access Restricted</h2>
                <p className="text-slate-500 mt-2">Only Managers and Admins can view activity logs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Activity Logs</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monitor system access and actions.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter by User..."
                        className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter by Action..."
                        className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Timestamp</th>
                                <th className="px-6 py-3 font-medium">User</th>
                                <th className="px-6 py-3 font-medium">Action</th>
                                <th className="px-6 py-3 font-medium">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                    {log.employees?.avatar_url ? (
                                                        <img src={log.employees.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                                    ) : (
                                                        <User className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">
                                                        {log.employees?.name || 'Unknown User'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {log.employees?.role || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${log.action.includes('DELETE') ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' :
                                                log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                                    log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' :
                                                        log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' :
                                                            'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={JSON.stringify(log.details)}>
                                            {JSON.stringify(log.details).replace(/["{}]/g, '').replace(/:/g, ': ').replace(/,/g, ', ')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No activity logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
