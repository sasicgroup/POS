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
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="p-8">
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-indigo-100 p-4 shadow-lg">
                            {step === 'otp' ? <Lock className="h-10 w-10 text-indigo-600" /> : <Store className="h-10 w-10 text-indigo-600" />}
                        </div>
                    </div>

                    <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-slate-900">{step === 'otp' ? 'Security Check' : 'Store Access'}</h2>
                    <p className="mb-8 text-center text-slate-500">{step === 'otp' ? 'Enter the code sent to your phone' : 'Enter your credentials to continue'}</p>

                    {step === 'credentials' ? (
                        <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                setError('');
                                            }}
                                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:ring focus:ring-indigo-200 outline-none"
                                            placeholder="Enter username"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Security PIN</label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setPin(val);
                                            setError('');
                                        }}
                                        className="block w-full text-center text-2xl tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring focus:ring-indigo-200 outline-none font-mono"
                                        placeholder="••••"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-center text-sm text-red-600 font-medium animate-pulse bg-red-50 p-2 rounded-lg border border-red-200">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4 || !username}
                                className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-indigo-600 p-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
                                <label className="mb-1 block text-sm font-medium text-slate-700 text-center">One-Time Password</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setOtp(val);
                                        setError('');
                                    }}
                                    className="block w-full text-center text-3xl tracking-[0.5em] rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 placeholder-slate-300 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring focus:ring-indigo-200 outline-none font-mono"
                                    placeholder="••••••"
                                    autoFocus
                                    required
                                />
                                {error && (
                                    <p className="mt-2 text-center text-sm text-red-600 font-medium animate-pulse">{error}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-70"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <div className="flex justify-between items-center text-sm">
                                <button
                                    type="button"
                                    onClick={() => setStep('credentials')}
                                    className="text-slate-500 hover:text-indigo-600 underline"
                                >
                                    Back to Login
                                </button>
                                <button
                                    type="button"
                                    disabled={resendCooldown > 0 || loading}
                                    onClick={handleResendOTP}
                                    className="text-slate-500 hover:text-indigo-600 disabled:opacity-50"
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-center text-xs text-slate-400">
                            Powered by <a href="https://sasicgroup.com/sasicbusiness" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Sasic Business</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
