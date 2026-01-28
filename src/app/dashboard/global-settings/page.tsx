'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Palette, Globe, Plus, Store, Archive as ArchiveIcon, Edit2, RotateCcw, Trash2, RefreshCw, Save, ShieldAlert, X } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase';

export default function GlobalSettingsPage() {
    const { user, globalSettings, updateGlobalSettings, stores, createStore, updateStoreStatus, requestStoreDeletionOTC, verifyStoreDeletionOTC, deleteStore } = useAuth();
    const { showToast } = useToast();

    // Branding State
    const [brandingName, setBrandingName] = useState('');
    const [brandingColor, setBrandingColor] = useState('#4f46e5');
    const [brandingLogo, setBrandingLogo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Store Management State
    const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
    const [newStoreData, setNewStoreData] = useState({ name: '', location: '' });
    const [editingStore, setEditingStore] = useState<any>(null);
    const [archiveStoreConfirm, setArchiveStoreConfirm] = useState<any>(null);

    // Deletion State
    const [storeToDelete, setStoreToDelete] = useState<any>(null);
    const [deletionOtcInput, setDeletionOtcInput] = useState('');
    const [otcSent, setOtcSent] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (globalSettings) {
            setBrandingName(globalSettings.appName || 'SASIC STORES');
            setBrandingColor(globalSettings.primaryColor || '#4f46e5');
            setBrandingLogo(globalSettings.appLogo || '');
        }
    }, [globalSettings]);

    const handleSaveBranding = async () => {
        setIsSaving(true);
        try {
            await updateGlobalSettings({
                appName: brandingName,
                primaryColor: brandingColor,
                appLogo: brandingLogo
            });
            showToast('success', 'Global settings saved!');
        } catch (error) {
            console.error("Failed to save global settings:", error);
            showToast('error', 'Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateOrUpdateStore = async () => {
        if (!newStoreData.name || !newStoreData.location) return;
        try {
            if (editingStore) {
                const { error } = await supabase.from('stores').update({ name: newStoreData.name, location: newStoreData.location }).eq('id', editingStore.id);
                if (error) throw error;
                showToast('success', 'Store updated successfully');
                window.location.reload();
            } else {
                await createStore(newStoreData.name, newStoreData.location);
                showToast('success', 'Store created successfully');
            }
            setShowCreateStoreModal(false);
            setNewStoreData({ name: '', location: '' });
            setEditingStore(null);
        } catch (e) {
            showToast('error', `Failed to ${editingStore ? 'update' : 'create'} store`);
            console.error(e);
        }
    };

    const handleEditStore = (store: any) => {
        setEditingStore(store);
        setNewStoreData({ name: store.name, location: store.location });
        setShowCreateStoreModal(true);
    };

    const handleArchiveStore = (store: any) => {
        setArchiveStoreConfirm(store);
    };

    const confirmArchiveStore = async () => {
        if (!archiveStoreConfirm) return;
        await updateStoreStatus(archiveStoreConfirm.id, 'archived');
        showToast('success', 'Store archived');
        setArchiveStoreConfirm(null);
    };

    const handleRestoreStore = async (store: any) => {
        await updateStoreStatus(store.id, 'active');
        showToast('success', 'Store restored');
    };

    const handleRequestDeletion = async (store: any) => {
        setStoreToDelete(store);
        const success = await requestStoreDeletionOTC(store.id);
        if (success) { setOtcSent(true); showToast('success', 'Deletion code sent to your phone'); }
        else { showToast('error', 'Failed to send deletion code'); }
    };

    const handleVerifyAndDelete = async () => {
        if (!storeToDelete || !deletionOtcInput) return;
        setIsDeleting(true);
        try {
            const isValid = await verifyStoreDeletionOTC(storeToDelete.id, deletionOtcInput);
            if (isValid) { await deleteStore(storeToDelete.id); showToast('success', 'Store deleted successfully'); setStoreToDelete(null); setDeletionOtcInput(''); setOtcSent(false); }
            else { showToast('error', 'Invalid or expired code'); }
        } finally { setIsDeleting(false); }
    };

    if (!user || user.role !== 'owner') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <ShieldAlert className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
                <p className="text-slate-500 max-w-md mt-2">Only the business owner can access Global Settings and Store Management.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Global Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage branding and multi-store configurations.</p>
                </div>
                <button
                    onClick={handleSaveBranding}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="space-y-6">
                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                            <Palette className="h-5 w-5 text-pink-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Global App Branding</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">App Name (Overrides Store Name)</label>
                            <input type="text" value={brandingName} onChange={(e) => setBrandingName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="App Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brand Logo URL</label>
                            <div className="flex gap-2">
                                <input type="text" value={brandingLogo} onChange={(e) => setBrandingLogo(e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                                {brandingLogo && <img src={brandingLogo} alt="Logo" className="h-10 w-10 rounded object-cover border border-slate-200" />}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Color</label>
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-sm border border-slate-200" style={{ backgroundColor: brandingColor }}></div>
                                <input type="text" value={brandingColor} onChange={(e) => setBrandingColor(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" placeholder="#HEX" />
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-4">
                    <section className="flex justify-between items-center mb-2">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All Stores</h2>
                            <p className="text-sm text-slate-500">Manage your multi-store configurations.</p>
                        </div>
                        <button onClick={() => { setEditingStore(null); setNewStoreData({ name: '', location: '' }); setShowCreateStoreModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
                            <Plus className="h-4 w-4" /> Create New Store
                        </button>
                    </section>

                    {stores.map((store) => (
                        <div key={store.id} className={`bg-white dark:bg-slate-900 rounded-xl border p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${store.status === 'archived' ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${store.status === 'archived' ? 'bg-amber-100 text-amber-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                                    {store.status === 'archived' ? <ArchiveIcon className="h-6 w-6" /> : <Store className="h-6 w-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{store.name}</h3>
                                        {store.status === 'archived' && <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Archived</span>}
                                    </div>
                                    <p className="text-sm text-slate-500">{store.location} • <span className="capitalize">{store.status || 'Active'}</span></p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                <button onClick={() => handleEditStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors border border-slate-200 dark:border-slate-800">
                                    <Edit2 className="h-4 w-4" /> Edit
                                </button>

                                {store.status === 'archived' ? (
                                    <>
                                        <button onClick={() => handleRestoreStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-900/30">
                                            <RotateCcw className="h-4 w-4" /> Restore
                                        </button>

                                        {stores.length > 1 && (
                                            <button
                                                onClick={() => handleRequestDeletion(store)}
                                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-500 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/30"
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button onClick={() => handleArchiveStore(store)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/20 rounded-lg transition-colors border border-amber-200 dark:border-amber-900/30">
                                        <ArchiveIcon className="h-4 w-4" /> Archive
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!archiveStoreConfirm}
                onClose={() => setArchiveStoreConfirm(null)}
                onConfirm={confirmArchiveStore}
                title="Archive Store"
                description={`Are you sure you want to archive "${archiveStoreConfirm?.name}"? It will not be accessible until restored.`}
                confirmText="Archive Store"
                variant="warning"
            />

            {/* Create/Edit Store Modal */}
            {showCreateStoreModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingStore ? 'Edit Store' : 'Create New Store'}</h3>
                            <button onClick={() => setShowCreateStoreModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Store Name</label>
                                <input
                                    type="text"
                                    value={newStoreData.name}
                                    onChange={(e) => setNewStoreData({ ...newStoreData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    placeholder="e.g. Downtown Branch"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={newStoreData.location}
                                    onChange={(e) => setNewStoreData({ ...newStoreData, location: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    placeholder="e.g. Accra"
                                />
                            </div>
                            <button
                                onClick={handleCreateOrUpdateStore}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                {editingStore ? 'Update Store' : 'Create Store'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Store Deletion OTP Modal */}
            {otcSent && storeToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                                <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirm Store Deletion</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                We've sent a verification code to your phone. Enter it below to permanently delete <strong>{storeToDelete.name}</strong>.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Verification Code</label>
                                <input
                                    type="text"
                                    value={deletionOtcInput}
                                    onChange={(e) => setDeletionOtcInput(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                                    maxLength={6}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setOtcSent(false); setStoreToDelete(null); setDeletionOtcInput(''); }}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyAndDelete}
                                    disabled={!deletionOtcInput || isDeleting}
                                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    {isDeleting ? 'Deleting...' : 'Delete Store'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
