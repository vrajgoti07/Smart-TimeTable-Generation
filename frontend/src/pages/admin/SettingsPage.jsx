import React, { useState } from 'react';
import { Lock, Trash2, Key, AlertTriangle, Save, Loader2, CheckCircle2, ChevronRight, AlertCircle, Eye, EyeOff, X, Image, Upload } from 'lucide-react';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Photo Upload State
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(user?.avatar || null);

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorMessage("New passwords don't match");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setErrorMessage("Password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);

        try {
            await api.changePassword(passwordData.currentPassword, passwordData.newPassword, passwordData.confirmPassword);
            setSuccessMessage('Password changed successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswordModal(false);
        } catch (err) {
            setErrorMessage(err.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setErrorMessage('');
        setIsLoading(true);

        try {
            await api.deleteAccount(deletePassword);
            setShowDeleteConfirm(false);
            setDeletePassword('');
            logout();
        } catch (err) {
            setErrorMessage(err.message || 'Failed to delete account');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrorMessage("File size should be less than 5MB");
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handlePhotoUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setErrorMessage('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const data = await api.uploadAvatar(selectedFile);
            setSuccessMessage('Profile photo updated successfully');
            
            // Update auth context with new avatar URL
            const newAvatar = data.avatar_url;
            updateUser({ avatar: newAvatar });
            
            setShowPhotoModal(false);
            setSelectedFile(null);
        } catch (err) {
            setErrorMessage(err.message || 'Failed to upload photo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePhoto = async () => {
        setErrorMessage('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            await api.deleteAvatar();
            setSuccessMessage('Profile photo removed successfully');
            updateUser({ avatar: '' });
            setShowPhotoModal(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err) {
            setErrorMessage(err.message || 'Failed to remove photo');
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setShowPasswordModal(false);
        setShowDeleteConfirm(false);
        setShowPhotoModal(false);
        setErrorMessage('');
        setSuccessMessage('');
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setDeletePassword('');
        setSelectedFile(null);
        setPreviewUrl(user?.avatar || null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
                    <p className="text-slate-500">Manage your account security and preferences.</p>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 animate-fade-in border border-emerald-100 shadow-sm">
                    <CheckCircle2 size={20} className="shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 animate-fade-in border border-red-100 shadow-sm">
                    <AlertTriangle size={20} className="shrink-0" />
                    <span className="font-medium">{errorMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Change Photo Option */}
                <div
                    onClick={() => setShowPhotoModal(true)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group h-full flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                            <Image size={24} />
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Update Profile Picture</h3>
                        <p className="text-sm text-slate-500">Change your profile picture to personalize your account</p>
                    </div>
                </div>

                {/* Change Password Option */}
                <div
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group h-full flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                            <Lock size={24} />
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Change Password</h3>
                        <p className="text-sm text-slate-500">Update your password to keep your account secure</p>
                    </div>
                </div>

                {/* Delete Account Option */}
                <div
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-red-200 transition-all group h-full flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-100 transition-colors">
                            <Trash2 size={24} />
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-red-500 transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Account</h3>
                        <p className="text-sm text-slate-500">Permanently remove your account and all data</p>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Change Password</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleChangePasswordSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                                        <div className="relative group">
                                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type={showPasswords.current ? "text" : "password"}
                                                name="currentPassword"
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="Enter current password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('current')}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type={showPasswords.new ? "text" : "password"}
                                                name="newPassword"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="New password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('new')}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                            <input
                                                type={showPasswords.confirm ? "text" : "password"}
                                                name="confirmPassword"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                placeholder="Confirm password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                        <div className="p-6 bg-red-50 border-b border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-900">Delete Account?</h3>
                                    <p className="text-sm text-red-700">This action cannot be undone.</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-red-400 hover:text-red-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 mb-6 font-medium">
                                To confirm deletion, please enter your password below. All your data will be permanently removed.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                    <div className="relative group">
                                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                        <input
                                            type={showDeletePassword ? "text" : "password"}
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                            placeholder="Enter your password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={!deletePassword || isLoading}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 hover:shadow-red-500/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Change Photo Modal */}
            {showPhotoModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Update Profile Picture</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handlePhotoUpload} className="space-y-6">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center">
                                            {previewUrl && previewUrl !== '' ? (
                                                <img 
                                                    src={previewUrl.startsWith('/') ? `${API_CONFIG.BASE_URL}${previewUrl}` : previewUrl} 
                                                    alt="Avatar Preview" 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">${user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}</div>`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-3xl font-bold">
                                                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 shadow-lg transition-all active:scale-90">
                                            <Upload size={18} />
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-900 mb-1">
                                            {selectedFile ? selectedFile.name : 'Choose a photo'}
                                        </p>
                                        <p className="text-xs text-slate-500 mb-4">JPEG, PNG or WEBP. Max 5MB.</p>
                                        
                                        {user?.avatar && !selectedFile && (
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                disabled={isLoading}
                                                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-red-50"
                                            >
                                                Remove Current Photo
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !selectedFile}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Save Photo
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
