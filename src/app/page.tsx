'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Store, Lock, ArrowRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const success = await login(pin);
            if (success) {
                router.push('/dashboard');
            } else {
                setError('Invalid PIN. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('System error during login.');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <div className="z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
                <div className="p-8 text-white">
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-white/20 p-4 shadow-lg ring-1 ring-white/30">
                            <Store className="h-10 w-10 text-white" />
                        </div>
                    </div>

                    <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">Store Access</h2>
                    <p className="mb-8 text-center text-indigo-100">Enter your PIN to continue</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-indigo-100 text-center">Security PIN</label>
                            <div className="relative flex justify-center">
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setPin(val);
                                        setError('');
                                    }}
                                    className="block w-40 text-center text-3xl tracking-[0.5em] rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none font-mono"
                                    placeholder="••••"
                                    autoFocus
                                    required
                                />
                            </div>
                            {error && (
                                <p className="mt-2 text-center text-sm text-pink-300 font-medium animate-pulse">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || pin.length < 4}
                            className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-white p-3 font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Login <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-4 text-xs text-indigo-200/60">
                        <span>Restricted Access</span>
                        <span>•</span>
                        <span>POS v3.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

