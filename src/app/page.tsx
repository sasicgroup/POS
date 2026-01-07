'use client';

import { useState } from 'react';
import { useAuth, Role } from '../lib/auth-context';
import { Store, Shield, User, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('admin@store.com');
    const [password, setPassword] = useState('password');
    const [role, setRole] = useState<Role>('admin');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            login(email, role);
            setLoading(false);
        }, 800);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
                <div className="p-8 text-white">
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-white/20 p-4 shadow-lg ring-1 ring-white/30">
                            <Store className="h-10 w-10 text-white" />
                        </div>
                    </div>

                    <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Welcome Back</h2>
                    <p className="mb-8 text-center text-indigo-100">Sign in to manage your empire</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-indigo-100">Email Address</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-5 w-5 text-indigo-200" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 p-3 pl-10 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-indigo-100">Password</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-indigo-200" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 p-3 pl-10 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-indigo-100">Select Role (Demo)</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Shield className="h-5 w-5 text-indigo-200" />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as Role)}
                                    className="block w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 p-3 pl-10 text-white shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none [&>option]:text-black"
                                >
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Store Manager</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-white p-3 font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Accessing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Enter System <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-4 text-xs text-indigo-200/60">
                        <span>Secure Enterprise System</span>
                        <span>•</span>
                        <span>v2.4.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
