'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function SuperAdminLoginPage() {
    const { login } = useSuperAdmin();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/super-admin/dashboard');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white text-center mb-1">Super Admin</h1>
                    <p className="text-slate-400 text-center text-sm mb-8">Secure access to platform management</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="admin@yourdomain.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Access Panel <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-600">
                        This area is restricted to authorized platform administrators only.
                    </p>
                </div>
            </div>
        </div>
    );
}
