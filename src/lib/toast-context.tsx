'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, type, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none p-4">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)}
                        className={`pointer-events-auto flex items-stretch w-full max-w-sm rounded-lg shadow-xl cursor-pointer animate-in slide-in-from-right-full duration-300 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden bg-white dark:bg-slate-900`}
                    >
                        <div className={`w-1.5 flex-shrink-0
                            ${toast.type === 'success' ? 'bg-emerald-500' :
                                toast.type === 'error' ? 'bg-red-500' :
                                    toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}
                        >
                        </div>
                        <div className="flex-1 p-4 flex items-start gap-3">
                            <div className={`flex-shrink-0 mt-0.5
                                ${toast.type === 'success' ? 'text-emerald-500' :
                                    toast.type === 'error' ? 'text-red-500' :
                                        toast.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`}
                            >
                                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                {toast.type === 'info' && <Info className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white capitalize leading-tight">
                                    {toast.type}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
