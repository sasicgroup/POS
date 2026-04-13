'use client';

import { useState, useEffect } from 'react';
import { useSuperAdmin } from '@/lib/super-admin-context';
import { ShieldCheck, Plus, Trash2, Eye, EyeOff, Save, User, Mail, Lock, Check, X } from 'lucide-react';

interface SuperAdminUser {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
}

export default function SuperAdminSettingsPage() {
    const { superAdmin } = useSuperAdmin();

    const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Profile edit state
    const [profileForm, setProfileForm] = useState({ name: '', email: '', current_password: '', new_password: '', confirm_password: '' });
    const [showPasswords, setShowPasswords] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Add new admin state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const [addingAdmin, setAddingAdmin] = useState(false);

    useEffect(() => {
        if (superAdmin) {
            setProfileForm(p => ({ ...p, name: superAdmin.name, email: superAdmin.email }));
        }
        loadAdmins();
    }, [superAdmin]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadAdmins = async () => {
        setLoading(true);
        const res = await fetch('/api/super-admin/admins', { credentials: 'include' });
        if (res.ok) {
            const { admins } = await res.json();
            if (admins) setAdmins(admins);
        }
        setLoading(false);
    };

    const handleSaveProfile = async () => {
        if (!superAdmin) return;
        setSavingProfile(true);

        if (profileForm.new_password) {
            if (profileForm.new_password !== profileForm.confirm_password) {
                showToast('New passwords do not match', 'error');
                setSavingProfile(false);
                return;
            }
        }

        const res = await fetch(`/api/super-admin/admins/${superAdmin.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: profileForm.name,
                email: profileForm.email,
                current_password: profileForm.current_password,
                ...(profileForm.new_password ? { new_password: profileForm.new_password } : {}),
            }),
        });
        const data = await res.json();
        setSavingProfile(false);
        if (!res.ok) {
            showToast(data.error || 'Failed to update profile', 'error');
        } else {
            showToast('Profile updated successfully!');
            setProfileForm(p => ({ ...p, current_password: '', new_password: '', confirm_password: '' }));
            loadAdmins();
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return;
        setAddingAdmin(true);
        const res = await fetch('/api/super-admin/admins', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newAdmin.name,
                email: newAdmin.email,
                password: newAdmin.password,
            }),
        });
        const data = await res.json();
        setAddingAdmin(false);
        if (!res.ok) {
            showToast('Failed to add admin: ' + (data.error || res.statusText), 'error');
        } else {
            showToast('Super admin added successfully!');
            setNewAdmin({ name: '', email: '', password: '' });
            setShowAddForm(false);
            loadAdmins();
        }
    };

    const handleToggleAdmin = async (id: string, isActive: boolean) => {
        if (id === superAdmin?.id) { showToast('Cannot deactivate yourself', 'error'); return; }
        const res = await fetch(`/api/super-admin/admins/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !isActive }),
        });
        if (res.ok) {
            showToast(`Admin ${isActive ? 'deactivated' : 'activated'}`);
            loadAdmins();
        }
    };

    const handleDeleteAdmin = async (id: string) => {
        if (id === superAdmin?.id) { showToast('Cannot delete yourself', 'error'); return; }
        if (!confirm('Are you sure you want to permanently delete this admin?')) return;
        const res = await fetch(`/api/super-admin/admins/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
            showToast('Admin deleted');
            loadAdmins();
        }
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all";
    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Manage your account and platform administrators</p>
            </div>

            {/* ── My Profile ──────────────────────────────────────── */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-6">
                    <User className="h-5 w-5 text-indigo-400" /> My Profile
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Full Name</label>
                        <input className={inputClass} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                    </div>
                    <div>
                        <label className={labelClass}>Email Address</label>
                        <input type="email" className={inputClass} value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                    </div>

                    <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-300">Change Password</span>
                            <button onClick={() => setShowPasswords(!showPasswords)} className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1">
                                {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {showPasswords ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Current Password *</label>
                                <input type={showPasswords ? 'text' : 'password'} className={inputClass} value={profileForm.current_password} onChange={e => setProfileForm(p => ({ ...p, current_password: e.target.value }))} placeholder="Required to save" />
                            </div>
                            <div>
                                <label className={labelClass}>New Password</label>
                                <input type={showPasswords ? 'text' : 'password'} className={inputClass} value={profileForm.new_password} onChange={e => setProfileForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Leave blank to keep" />
                            </div>
                            <div>
                                <label className={labelClass}>Confirm New Password</label>
                                <input type={showPasswords ? 'text' : 'password'} className={inputClass} value={profileForm.confirm_password} onChange={e => setProfileForm(p => ({ ...p, confirm_password: e.target.value }))} placeholder="Repeat new password" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-5 flex justify-end">
                    <button onClick={handleSaveProfile} disabled={savingProfile || !profileForm.current_password} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>

            {/* ── Super Admins ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" /> Super Administrators
                    </h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 text-sm font-medium transition-all"
                    >
                        <Plus className="h-4 w-4" /> Add Admin
                    </button>
                </div>

                {/* Add Admin Form */}
                {showAddForm && (
                    <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4 animate-in slide-in-from-top-2">
                        <h3 className="text-sm font-medium text-indigo-300">New Super Admin</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Full Name *</label>
                                <input className={inputClass} placeholder="Admin name" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Email *</label>
                                <input type="email" className={inputClass} placeholder="admin@email.com" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelClass}>Password *</label>
                                <input type="password" className={inputClass} placeholder="Secure password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleAddAdmin} disabled={addingAdmin || !newAdmin.name || !newAdmin.email || !newAdmin.password}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60 transition-all">
                                <Check className="h-4 w-4" /> {addingAdmin ? 'Adding...' : 'Add Admin'}
                            </button>
                            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Admins Table */}
                {loading ? (
                    <div className="text-slate-400 text-sm animate-pulse py-4">Loading administrators...</div>
                ) : (
                    <div className="space-y-2">
                        {admins.map(admin => (
                            <div key={admin.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${admin.id === superAdmin?.id ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${admin.id === superAdmin?.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}>
                                        {admin.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{admin.name}</span>
                                            {admin.id === superAdmin?.id && <span className="text-[10px] bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                                            {!admin.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium">Inactive</span>}
                                        </div>
                                        <div className="text-xs text-slate-500">{admin.email}</div>
                                        {admin.last_login_at && (
                                            <div className="text-[10px] text-slate-600 mt-0.5">
                                                Last login: {new Date(admin.last_login_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {admin.id !== superAdmin?.id && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleAdmin(admin.id, admin.is_active)}
                                            className={`p-2 rounded-lg transition-all text-sm ${admin.is_active ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                            title={admin.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {admin.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAdmin(admin.id)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Delete admin"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
