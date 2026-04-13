'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { fetchPublicBusiness } from '@/lib/public-business';
import { supabase } from '@/lib/supabase';

// This page handles slug-based login: /{slug}/login
// It resolves the business from the slug, then renders the regular login form
// scoped to that business_id

export default function SlugLoginPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();

    const [step, setStep] = useState<'credentials' | 'otp' | 'masterpass' | 'choice'>('credentials');
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [otp, setOtp] = useState('');
    const [masterpass, setMasterpass] = useState('');
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);
    const [business, setBusiness] = useState<any>(null);
    const [businessError, setBusinessError] = useState('');
    const [businessLoaded, setBusinessLoaded] = useState(false);

    // Resolve business on mount
    useEffect(() => {
        // Check if already logged in to this business
        const storedBusinessSlug = localStorage.getItem('sms_business_slug');
        const storedUser = localStorage.getItem('sms_user');
        if (storedBusinessSlug === slug && storedUser) {
            router.push(`/${slug}/dashboard`);
            return;
        }

        const resolve = async () => {
            const data = await fetchPublicBusiness({ slug });

            if (!data || !data.id) {
                setBusinessError('Business not found. Please check your URL.');
                setBusinessLoaded(true);
                return;
            }

            if (data.is_active === false) {
                setBusinessError('This business account is currently suspended. Please contact support.');
                setBusinessLoaded(true);
                setBusiness(data);
                return;
            }

            // Check subscription expiry
            const now = new Date();
            if (data.subscription_end && String(data.plan) !== 'forever') {
                const end = new Date(String(data.subscription_end));
                const graceEnd = new Date(end);
                graceEnd.setDate(graceEnd.getDate() + Number(data.grace_period_days ?? 7));
                if (now > graceEnd) {
                    setBusinessError('This account\'s subscription has expired. Please contact the platform administrator to renew.');
                    setBusinessLoaded(true);
                    setBusiness(data);
                    return;
                }
            }

            setBusiness(data);
            // Store business_id for the auth context to use
            localStorage.setItem('sms_business_id', String(data.id));
            localStorage.setItem('sms_business_slug', String(data.slug));
            setBusinessLoaded(true);
        };

        resolve();
    }, [slug]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;
        setLoading(true);
        setError('');

        try {
            // Find employee scoped to this business
            let { data: employees } = await supabase
                .from('employees')
                .select('*')
                .eq('business_id', business.id)
                .ilike('username', username)
                .is('deleted_at', null)
                .limit(1);

            // Fallback: try by name
            if (!employees || employees.length === 0) {
                const { data: byName } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('business_id', business.id)
                    .ilike('name', username)
                    .is('deleted_at', null)
                    .limit(1);
                if (byName) employees = byName;
            }

            if (!employees || employees.length === 0) {
                setError('User not found.');
                setLoading(false);
                return;
            }

            const employee = employees[0];

            if (employee.is_locked) {
                setError('Account is locked due to too many failed attempts. Contact your admin.');
                setLoading(false);
                return;
            }

            if (employee.pin !== pin) {
                const attempts = (employee.failed_attempts || 0) + 1;
                const update: any = { failed_attempts: attempts };
                if (attempts >= 3) update.is_locked = true;
                await supabase.from('employees').update(update).eq('id', employee.id);
                setError(update.is_locked ? 'Account locked after 3 failed attempts.' : `Invalid PIN. ${3 - attempts} attempts remaining.`);
                setLoading(false);
                return;
            }

            // Reset failed attempts
            if (employee.failed_attempts > 0) {
                await supabase.from('employees').update({ failed_attempts: 0 }).eq('id', employee.id);
            }

            // Check 2FA
            if (employee.otp_enabled) {
                const methods: string[] = [];
                if (employee.phone) methods.push('sms');
                if (employee.master_password) methods.push('masterpass');
                if (methods.length > 0) {
                    setAvailableMethods(methods);
                    setEmployee(employee);
                    setStep('choice');
                    setLoading(false);
                    return;
                }
            }

            // Success - store user in localStorage and redirect
            completeLogin(employee);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const completeLogin = (emp: any) => {
        const userObj = {
            id: emp.id,
            name: emp.name,
            username: emp.username,
            role: emp.role,
            pin: emp.pin,
            phone: emp.phone,
            otp_enabled: emp.otp_enabled,
            business_id: String(business.id), // ✅ Add business_id for data isolation
        };
        localStorage.setItem('sms_user', JSON.stringify(userObj));
        localStorage.setItem('sms_business_id', String(business.id));
        router.push(`/${slug}/dashboard`);
    };

    const handleOTPVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setLoading(true);
        setError('');
        // Get the stored OTP from DB
        const { data } = await supabase
            .from('employee_otp_codes')
            .select('*')
            .eq('employee_id', employee.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!data || data.code !== otp) {
            setError('Invalid OTP code. Please try again.');
            setLoading(false);
            return;
        }
        const expiry = new Date(data.expires_at);
        if (new Date() > expiry) {
            setError('OTP has expired. Please go back and request a new one.');
            setLoading(false);
            return;
        }
        setLoading(false);
        completeLogin(employee);
    };

    const handleMasterPassVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setLoading(true);
        setError('');
        if (masterpass !== employee.master_password) {
            setError('Incorrect master password.');
            setLoading(false);
            return;
        }
        setLoading(false);
        completeLogin(employee);
    };

    const handleSendOTP = async () => {
        if (!employee?.phone) return;
        setLoading(true);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await supabase.from('employee_otp_codes').insert({
            employee_id: employee.id,
            code,
            expires_at: expires,
        });
        // Send SMS
        await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: employee.phone, message: `Your verification code is ${code}. Valid for 5 minutes.` })
        });
        setLoading(false);
    };

    // ── Loading / Error States ──────────────────────────────────────────────

    if (!businessLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
                <div className="text-slate-400 animate-pulse text-sm">Loading...</div>
            </div>
        );
    }

    const brandColor = business?.primary_color || '#4f46e5';
    const appName = business?.app_name || business?.name || 'Store Management';
    const logoUrl = business?.logo_url;

    if (businessError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="max-w-sm w-full text-center">
                    <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔒</span>
                    </div>
                    <h2 className="text-white font-bold text-xl mb-2">Access Unavailable</h2>
                    <p className="text-slate-400 text-sm">{businessError}</p>
                    {business && (
                        <p className="text-slate-500 text-xs mt-4">Business: {business.name}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
            {/* Subtle background glow using brand color */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ backgroundColor: brandColor }}
            />

            <div className="relative w-full max-w-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
                    {/* Logo / Icon */}
                    <div className="flex justify-center mb-6">
                        <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
                            style={{ backgroundColor: `${brandColor}20`, border: `1px solid ${brandColor}30` }}
                        >
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                            ) : (
                                <span className="text-2xl font-black" style={{ color: brandColor }}>
                                    {appName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-white text-center mb-1">{appName}</h1>
                    <p className="text-slate-400 text-center text-sm mb-8">Enter your credentials to continue</p>

                    {step === 'credentials' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => { setUsername(e.target.value); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm"
                                    style={{ '--tw-ring-color': brandColor } as any}
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">PIN</label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 transition-all"
                                    placeholder="••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || pin.length < 4 || !username}
                                className="w-full flex items-center justify-center py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-2"
                                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`, boxShadow: `0 10px 30px ${brandColor}40` }}
                            >
                                {loading ? 'Verifying...' : 'Sign In →'}
                            </button>
                        </form>
                    )}

                    {step === 'choice' && (
                        <div className="space-y-3">
                            <p className="text-slate-400 text-sm text-center mb-4">Choose verification method</p>
                            {availableMethods.includes('sms') && (
                                <button onClick={() => { setStep('otp'); handleSendOTP(); }} className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm transition-all">
                                    <span className="text-lg">📱</span>
                                    <div className="text-left">
                                        <div className="font-medium">SMS OTP</div>
                                        <div className="text-xs text-slate-400">We'll send a code to {employee?.phone?.slice(0, 4)}****</div>
                                    </div>
                                </button>
                            )}
                            {availableMethods.includes('masterpass') && (
                                <button onClick={() => setStep('masterpass')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm transition-all">
                                    <span className="text-lg">🔑</span>
                                    <div className="text-left">
                                        <div className="font-medium">Master Password</div>
                                        <div className="text-xs text-slate-400">Use your secure master password</div>
                                    </div>
                                </button>
                            )}
                            <button onClick={() => setStep('credentials')} className="w-full text-center text-slate-500 text-sm hover:text-slate-300 pt-2 transition-colors">
                                ← Back to login
                            </button>
                        </div>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleOTPVerify} className="space-y-4">
                            <div className="text-center mb-2">
                                <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-xl">📱</span>
                                </div>
                                <p className="text-sm text-slate-300">Enter the 6-digit code sent to your phone</p>
                                <p className="text-xs text-slate-500 mt-1">{employee?.phone?.replace(/(\d{3})\d+(\d{3})/, '$1****$2')}</p>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-3xl tracking-[0.6em] font-mono focus:outline-none focus:ring-2 transition-all"
                                    style={{ '--tw-ring-color': brandColor } as any}
                                    placeholder="------"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">{error}</div>}
                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
                            >
                                {loading ? 'Verifying...' : 'Verify Code →'}
                            </button>
                            <div className="flex items-center justify-between pt-1">
                                <button type="button" onClick={() => setStep('choice')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back</button>
                                <button type="button" onClick={handleSendOTP} disabled={loading} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Resend code</button>
                            </div>
                        </form>
                    )}

                    {step === 'masterpass' && (
                        <form onSubmit={handleMasterPassVerify} className="space-y-4">
                            <div className="text-center mb-2">
                                <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                                    <span className="text-xl">🔑</span>
                                </div>
                                <p className="text-sm text-slate-300">Enter your master password</p>
                            </div>
                            <div>
                                <input
                                    type="password"
                                    value={masterpass}
                                    onChange={e => { setMasterpass(e.target.value); setError(''); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all text-sm"
                                    style={{ '--tw-ring-color': brandColor } as any}
                                    placeholder="Enter master password"
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">{error}</div>}
                            <button
                                type="submit"
                                disabled={loading || !masterpass}
                                className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
                            >
                                {loading ? 'Verifying...' : 'Confirm →'}
                            </button>
                            <button type="button" onClick={() => setStep('choice')} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 pt-1 transition-colors">← Back</button>
                        </form>
                    )}

                    <div className="mt-8 pt-5 border-t border-white/5 text-center text-xs text-slate-600">
                        Powered by <span className="text-slate-500 font-medium">Sasic Business</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
