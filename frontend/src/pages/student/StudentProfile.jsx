import React, { useState, useRef } from 'react';
import { User, Mail, Book, Hash, Calendar, Camera, Save, Phone, MapPin, Shield, Award, TrendingUp, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/api';

export default function StudentProfile() {
    const { user, login, updateUser } = useAuth();
    const { alert, confirm } = useDialog();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const API_URL = API_CONFIG.BASE_URL;

    // Use real user data (no mock/hardcoded values)
    const [formData, setFormData] = useState({
        phone: user.phone || '',
        address: user.address || '',
        dob: user.dob || '',
        admissionDate: user.admissionDate || '',
        guardianName: user.guardianName || '',
        guardianContact: user.guardianContact || '',
    });

    const [liveProfile, setLiveProfile] = useState(null);

    // Fetch fresh profile data to avoid "stale" context issues
    React.useEffect(() => {
        const fetchLiveProfile = async () => {
            try {
                const data = await api.getStudentDashboard();
                if (data.profile) {
                    setLiveProfile(data.profile);
                    setFormData(prev => ({
                        ...prev,
                        phone: data.profile.phone || prev.phone,
                        // We could sync other fields here too if available
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch fresh profile data:", err);
            }
        };
        fetchLiveProfile();
    }, [api]);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await api.uploadAvatar(file);

            // Update context and localStorage
            if (updateUser) {
                updateUser({ avatar: result.avatar_url });
            } else {
                localStorage.setItem('timetable_user', JSON.stringify({ ...user, avatar: result.avatar_url }));
                window.location.reload();
            }
        } catch (error) {
            alert(error.message || 'Failed to upload avatar', 'Upload Error', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        const ok = await confirm('Are you sure you want to remove your profile photo? This action cannot be undone.', 'Remove Photo', 'warning');
        if (!ok) return;
        
        setIsUploading(true);
        try {
            await api.deleteAvatar();
            
            // Update context and localStorage
            if (updateUser) {
                updateUser({ avatar: null });
            } else {
                const refreshed = { ...user, avatar: null };
                localStorage.setItem('timetable_user', JSON.stringify(refreshed));
                window.location.reload();
            }
        } catch (error) {
            alert(error.message || 'Failed to remove photo', 'Action Failed', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateStudentProfile(formData);
            
            // Update local user state with new data
            const updatedUser = { ...user, ...formData };
            localStorage.setItem('timetable_user', JSON.stringify(updatedUser));
            if (updateUser) {
                updateUser(updatedUser);
            }
            
            setIsEditing(false);
            await alert('Your profile information has been updated successfully.', 'Success!', 'success');
        } catch (error) {
            alert(error.message || 'We encountered an error while updating your profile. Please try again.', 'Update Failed', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const achievements = [
        { label: 'Dean\'s List', icon: Award, color: 'amber' },
        { label: 'Perfect Attendance', icon: CheckCircle, color: 'emerald' },
        { label: 'Top Performer', icon: TrendingUp, color: 'blue' },
    ];

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
            />
            <div>
                <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
                <p className="text-slate-500">Manage your personal information.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - ID Card Style */}
                <div className="w-full lg:w-1/3 space-y-6">
                    {/* Profile Card */}
                    <div className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover-lift">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-emerald-400 to-cyan-500" />
                        <div className="absolute top-0 left-0 right-0 h-24 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />

                        <div className="relative flex flex-col items-center text-center pt-8">
                            <div className="relative mb-4">
                                <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-4xl font-bold font-mon shadow-xl shadow-emerald-500/30 border-4 border-white overflow-hidden">
                                    {user.avatar && (
                                        <button
                                            onClick={handleRemoveAvatar}
                                            disabled={isUploading}
                                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg hover:scale-110 disabled:opacity-50 z-10 border-2 border-white"
                                            title="Remove Photo"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar.startsWith('/') ? `${API_URL}${user.avatar}` : user.avatar}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerText = user.name?.[0] || 'S';
                                            }}
                                        />
                                    ) : (
                                        user.name?.[0] || 'S'
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={isUploading}
                                    className="absolute -bottom-2 -right-2 p-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:scale-110 disabled:opacity-50"
                                    title="Change Photo"
                                >
                                    {isUploading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Camera size={16} />
                                    )}
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
                            <p className="text-emerald-600 font-medium">{user.department || 'N/A'}</p>
                            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
                                <Hash size={14} />
                                ID: {liveProfile?.studentId || user.studentId || 'N/A'}
                            </div>

                            {/* Badges */}
                            <div className="mt-6 flex gap-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                                    Active
                                </span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                                    Sem {user.semester || 4}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Academic Summary */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white hover-lift">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl" />

                        <div className="relative">
                            <h4 className="font-bold text-slate-300 text-sm mb-6 flex items-center gap-2">
                                <Shield size={16} />
                                Academic Info
                            </h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl backdrop-blur-sm">
                                    <span className="text-slate-400 text-sm">Semester</span>
                                    <span className="font-bold text-xl">{user.semester || 4}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl backdrop-blur-sm">
                                    <span className="text-slate-400 text-sm">Department</span>
                                    <span className="font-bold text-xl text-emerald-400">{user.department || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Details Form */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                        <h3 className="font-bold text-slate-900">Personal Details</h3>
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            disabled={isSaving}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                                ${isEditing
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : isEditing ? (
                                <><Save size={16} /> Save Changes</>
                            ) : (
                                'Edit Profile'
                            )}
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Read-only fields */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Full Name</label>
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <User className="text-slate-400" size={18} />
                                <span className="text-slate-900 font-medium">{user.name}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <Mail className="text-slate-400" size={18} />
                                <span className="text-slate-900">{user.email}</span>
                            </div>
                        </div>

                        {/* Editable fields */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Phone Number</label>
                            {isEditing ? (
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                                    <Phone className="text-slate-400" size={18} />
                                    <span className="text-slate-600">{formData.phone}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Department</label>
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <Book className="text-slate-400" size={18} />
                                <span className="text-slate-900">{user.department || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                            {isEditing ? (
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <Calendar className="text-slate-400" size={18} />
                                    <span className="text-slate-900">{formData.dob || 'Not set'}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Admission Date</label>
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <Calendar className="text-slate-400" size={18} />
                                <span className="text-slate-900">{formData.admissionDate || 'Not set'}</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Current Address</label>
                            {isEditing ? (
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={2}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                                    <MapPin className="text-slate-400 mt-0.5" size={18} />
                                    <span className="text-slate-600">{formData.address}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Guardian Info */}
                    <div className="p-6 border-t border-slate-100 bg-gradient-to-b from-slate-50 to-white">
                        <h4 className="font-bold text-slate-700 mb-4">Guardian Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isEditing ? (
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Guardian Name"
                                        value={formData.guardianName}
                                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                                    <User className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-xs text-slate-500">Guardian Name</p>
                                        <p className="text-slate-900 font-medium">{formData.guardianName || 'Not set'}</p>
                                    </div>
                                </div>
                            )}
                            {isEditing ? (
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Guardian Contact"
                                        value={formData.guardianContact}
                                        onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                                    <Phone className="text-slate-400" size={18} />
                                    <div>
                                        <p className="text-xs text-slate-500">Contact</p>
                                        <p className="text-slate-900 font-medium">{formData.guardianContact || 'Not set'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
