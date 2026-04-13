'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Building2, User, Box, Receipt, Loader2, X } from 'lucide-react';
import Link from 'next/link';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (query.length < 2) {
                setResults(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/super-admin/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results);
                }
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setIsLoading(false);
                setIsOpen(true);
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [query]);

    return (
        <div className="relative flex-1 max-w-xl" ref={searchRef}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                    type="text"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-lg"
                    placeholder="Search businesses, orders, owners, or products (God Mode)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 animate-spin" />
                )}
                {query && !isLoading && (
                    <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && results && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-4">
                        {/* Businesses */}
                        {results.businesses?.length > 0 && (
                            <div>
                                <h4 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Businesses</h4>
                                {results.businesses.map((b: any) => (
                                    <Link key={b.id} href={`/super-admin/businesses/${b.id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                            <Building2 className="h-4 w-4 text-indigo-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{b.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{b.owner_email} · /{b.slug}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Employees / Owners */}
                        {results.employees?.length > 0 && (
                            <div>
                                <h4 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">People</h4>
                                {results.employees.map((e: any) => (
                                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => (window.location.href = `/super-admin/businesses/${e.business_id}`)}>
                                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <User className="h-4 w-4 text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{e.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{e.phone} · {e.role} @ {e.stores?.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Products */}
                        {results.products?.length > 0 && (
                            <div>
                                <h4 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Products</h4>
                                {results.products.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => (window.location.href = `/super-admin/businesses/${p.business_id}`)}>
                                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                            <Box className="h-4 w-4 text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">{p.name}</div>
                                            <div className="text-xs text-slate-500 truncate">SKU: {p.sku} · GHS {p.price} · {p.stores?.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sales */}
                        {results.sales?.length > 0 && (
                            <div>
                                <h4 className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transactions</h4>
                                {results.sales.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => (window.location.href = `/super-admin/businesses/${s.business_id}`)}>
                                        <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                            <Receipt className="h-4 w-4 text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors">{s.receipt_number}</div>
                                            <div className="text-xs text-slate-500 truncate">Total: GHS {s.total_amount} · {new Date(s.created_at).toLocaleDateString()} · {s.stores?.name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {Object.values(results).every((arr: any) => arr.length === 0) && (
                            <div className="py-12 text-center">
                                <Search className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                                <div className="text-slate-500 text-sm">No results found for "{query}"</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
