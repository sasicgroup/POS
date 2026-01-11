'use client';

import { Trash2, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}: ConfirmDialogProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
            case 'info':
                return <Info className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />;
        }
    };

    const getBgColor = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-100 dark:bg-red-900/30';
            case 'warning':
                return 'bg-amber-100 dark:bg-amber-900/30';
            case 'info':
                return 'bg-indigo-100 dark:bg-indigo-900/30';
        }
    };

    const getConfirmBtnColor = () => {
        switch (variant) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
            case 'info':
                return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className={`relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 transform transition-all duration-200 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${getBgColor()}`}>
                    {getIcon()}
                </div>

                <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
                    {title}
                </h3>

                <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                    {description}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 rounded-xl py-3 font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmBtnColor()}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                                Processing...
                            </span>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
