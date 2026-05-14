import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export default function ProfessionalDialog({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Cancel'
}) {
    if (!isOpen) return null;

    const themes = {
        success: {
            icon: CheckCircle,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
            glow: 'shadow-emerald-500/10'
        },
        error: {
            icon: AlertOctagon,
            color: 'text-red-500',
            bg: 'bg-red-50',
            border: 'border-red-100',
            btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
            glow: 'shadow-red-500/10'
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
            glow: 'shadow-amber-500/10'
        },
        info: {
            icon: Info,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20',
            glow: 'shadow-blue-500/10'
        },
        confirm: {
            icon: AlertTriangle,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            border: 'border-slate-100',
            btn: 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20',
            glow: 'shadow-slate-900/10'
        }
    };

    const theme = themes[type] || themes.info;
    const Icon = theme.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-slate-100 ${theme.glow}`}>
                {/* Header Decoration */}
                <div className={`h-2 w-full ${theme.btn.split(' ')[0]}`} />
                
                <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                        {/* Icon Container */}
                        <div className={`w-16 h-16 ${theme.bg} ${theme.color} rounded-2xl flex items-center justify-center mb-6 border ${theme.border} animate-bounce-subtle`}>
                            <Icon size={32} strokeWidth={2.5} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                        <p className="text-slate-500 leading-relaxed">{message}</p>
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                        <button
                            onClick={onConfirm}
                            className={`w-full py-3.5 px-4 text-white rounded-2xl font-bold transition-all transform active:scale-95 shadow-lg ${theme.btn}`}
                        >
                            {confirmText}
                        </button>
                        
                        {type === 'warning' || type === 'confirm' ? (
                            <button
                                onClick={onClose}
                                className="w-full py-3.5 px-4 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl font-semibold transition-all"
                            >
                                {cancelText}
                            </button>
                        ) : null}
                    </div>
                </div>
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
