'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Store, Lock, ArrowRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login, verifyOTP, resendOTP } = useAuth();
    const router = useRouter();

    // Form State
    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [otp, setOtp] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await login(username, pin);

            if (result.success) {
                if (result.status === 'OTP_REQUIRED') {
                    setStep('otp');
                } else {
                    router.push('/dashboard');
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            setError('System error during login.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[Login] OTP submit clicked, username:', username, 'otp:', otp);
        setLoading(true);
        setError('');

        try {
            console.log('[Login] Calling verifyOTP...');
            const success = await verifyOTP(username, otp);
            console.log('[Login] verifyOTP result:', success);
            if (success) {
                console.log('[Login] OTP verified, redirecting...');
                router.push('/dashboard');
            } else {
                setError('Invalid or expired OTP code.');
                setLoading(false);
            }
        } catch (err) {
            console.error('[Login] verifyOTP error:', err);
            setError('Verification failed.');
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        try {
            await resendOTP(username);
            setResendCooldown(30);
            const interval = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            alert('New code sent!');
        } catch (e) {
            setError('Failed to resend OTP.');
        } finally {
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
                            {step === 'otp' ? <Lock className="h-10 w-10 text-white" /> : <Store className="h-10 w-10 text-white" />}
                        </div>
                    </div>

                    <h2 className="mb-2 text-center text-3xl font-bold tracking-tight">{step === 'otp' ? 'Security Check' : 'Store Access'}</h2>
                    <p className="mb-8 text-center text-indigo-100">{step === 'otp' ? 'Enter the code sent to your phone' : 'Enter your credentials to continue'}</p>

                    {step === 'credentials' ? (
                        <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-indigo-100">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                setError('');
                                            }}
                                            className="block w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-indigo-100">Security PIN</label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setPin(val);
                                            setError('');
                                        }}
                                        className="block w-full text-center text-2xl tracking-[0.5em] rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none font-mono"
                                        placeholder="••••"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-center text-sm text-pink-300 font-medium animate-pulse bg-pink-500/20 p-2 rounded-lg border border-pink-500/30">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4 || !username}
                                className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-white p-3 font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? 'Verifying...' : (
                                    <span className="flex items-center gap-2">
                                        Login <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-6">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-indigo-100 text-center">One-Time Password</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setOtp(val);
                                        setError('');
                                    }}
                                    className="block w-full text-center text-3xl tracking-[0.5em] rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-indigo-200 shadow-sm transition-all focus:border-indigo-300 focus:bg-white/10 focus:ring focus:ring-indigo-300/20 outline-none font-mono"
                                    placeholder="••••••"
                                    autoFocus
                                    required
                                />
                                {error && (
                                    <p className="mt-2 text-center text-sm text-pink-300 font-medium animate-pulse">{error}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full rounded-lg bg-white p-3 font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-70"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <div className="flex justify-between items-center text-sm">
                                <button
                                    type="button"
                                    onClick={() => setStep('credentials')}
                                    className="text-indigo-200 hover:text-white underline"
                                >
                                    Back to Login
                                </button>
                                <button
                                    type="button"
                                    disabled={resendCooldown > 0 || loading}
                                    onClick={handleResendOTP}
                                    className="text-indigo-200 hover:text-white disabled:opacity-50"
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 flex items-center justify-center gap-4 text-xs text-indigo-200/60">
                        <span>Restricted Access</span>
                        <span>•</span>
                        <span>POS v3.1</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
