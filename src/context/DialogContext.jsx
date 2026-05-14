import React, { createContext, useContext, useState, useCallback } from 'react';
import ProfessionalDialog from '../components/ui/ProfessionalDialog';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info', // 'success', 'error', 'warning', 'info', 'confirm'
        resolve: null,
    });

    const showDialog = useCallback((options) => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                title: options.title || 'Notification',
                message: options.message || '',
                type: options.type || 'info',
                confirmText: options.confirmText || 'OK',
                cancelText: options.cancelText || 'Cancel',
                resolve,
            });
        });
    }, []);

    const alert = useCallback((message, title = 'Notification', type = 'info') => {
        return showDialog({ message, title, type, confirmText: 'Got it' });
    }, [showDialog]);

    const confirm = useCallback((message, title = 'Confirm Action', type = 'warning') => {
        return showDialog({ message, title, type, confirmText: 'Proceed', cancelText: 'Cancel' });
    }, [showDialog]);

    const handleClose = (result) => {
        const resolve = dialog.resolve;
        setDialog(prev => ({ ...prev, isOpen: false }));
        if (resolve) resolve(result);
    };

    return (
        <DialogContext.Provider value={{ alert, confirm, showDialog }}>
            {children}
            <ProfessionalDialog
                isOpen={dialog.isOpen}
                onClose={() => handleClose(false)}
                onConfirm={() => handleClose(true)}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                confirmText={dialog.confirmText}
                cancelText={dialog.cancelText}
            />
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
