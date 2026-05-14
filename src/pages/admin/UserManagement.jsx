import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Save, Users, Shield, GraduationCap, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../context/DialogContext';
import { API_CONFIG } from '../../config/api';

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }) {
    const [count, setCount] = useState(0);
    const numValue = parseInt(value.toString().replace(/,/g, ''));

    useEffect(() => {
        let start = 0;
        const end = numValue;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [numValue, duration]);

    return <span>{count.toLocaleString()}</span>;
}

// Loading Skeleton Component
function TableSkeleton() {
    return (
        <div className="animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                    <div className="h-6 w-16 bg-slate-200 rounded-full" />
                    <div className="flex gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                        <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function UserManagement({ searchQuery }) {
    const { alert, confirm } = useDialog();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'Student',
        studentId: '',
        department: '',
        semester: '',
        expertise: ''
    });

    // Fetch users from API
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await api.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setError('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const query = (searchQuery || searchTerm || '').toLowerCase();
        const matchesSearch = (user.name || '').toLowerCase().includes(query) ||
            (user.email || '').toLowerCase().includes(query) ||
            (user.studentId || '').toLowerCase().includes(query) ||
            (user.department || '').toLowerCase().includes(query);
        const matchesRole = filterRole === 'All' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const roleStats = {
        Admin: users.filter(u => u.role === 'Admin').length,
        Faculty: users.filter(u => u.role === 'Faculty').length,
        Student: users.filter(u => u.role === 'Student').length,
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setError(''); // Clear any previous errors
        setSuccessMessage('');
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId || '',
            department: user.department || '',
            semester: user.semester || '',
            expertise: (user.expertise || []).join(', ')
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm('Deleting this user will remove all their associated data from the system. This action is permanent.', 'Confirm Deletion', 'warning');
        if (ok) {
            try {
                await api.deleteUser(id);
                await fetchUsers(); // Refresh list
            } catch (error) {
                alert('We could not delete the user account at this time: ' + error.message, 'Deletion Error', 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Clean data before sending
            const submitData = { ...formData };
            if (submitData.role === 'Faculty') {
                delete submitData.studentId;
                delete submitData.semester;
                if (submitData.expertise) {
                    submitData.expertise = submitData.expertise.split(',').map(s => s.trim()).filter(s => s !== '');
                } else {
                    submitData.expertise = [];
                }
            } else if (submitData.role === 'Admin') {
                delete submitData.studentId;
                delete submitData.semester;
                delete submitData.expertise;
            } else {
                // Student
                if (submitData.semester === '') delete submitData.semester;
                else submitData.semester = parseInt(submitData.semester);
                delete submitData.expertise;
            }

            // Remove empty optional fields
            if (!submitData.department) delete submitData.department;

            if (editingUser) {
                await api.updateUser(editingUser.id, submitData);
            } else {
                await api.createUser(submitData);
            }

            setIsModalOpen(false);
            setEditingUser(null);
            setFormData({ name: '', email: '', role: 'Student', studentId: '', department: '', semester: '', expertise: '' });
            await fetchUsers(); // Refresh the list

            if (!editingUser) {
                await alert('The invitation has been successfully sent to the user.', 'Invite Sent', 'success');
            }
        } catch (error) {
            const errorMessage = error.message || String(error);
            console.error('Error saving user:', errorMessage);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Admin': return Shield;
            case 'Faculty': return Users;
            default: return GraduationCap;
        }
    };

    const getRoleColors = (role) => {
        switch (role) {
            case 'Admin': return { bg: 'from-amber-400 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700', shadow: 'shadow-amber-500/30' };
            case 'Faculty': return { bg: 'from-emerald-400 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', shadow: 'shadow-emerald-500/30' };
            default: return { bg: 'from-cyan-400 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-700', shadow: 'shadow-cyan-500/30' };
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500">Manage students, faculty, and admins.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setError(''); // Clear any previous errors
                        setSuccessMessage('');
                        setFormData({ name: '', email: '', role: 'Student', studentId: '', department: '', semester: '', expertise: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 hover:shadow-xl font-medium"
                >
                    <Plus size={20} />
                    Add User
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(roleStats).map(([role, count], index) => {
                    const Icon = getRoleIcon(role);
                    const colors = getRoleColors(role);
                    return (
                        <div
                            key={role}
                            className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover-lift group"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${colors.light} rounded-full opacity-50 blur-xl group-hover:opacity-80 transition-opacity`} />
                            <div className="relative flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} text-white shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">{role}s</p>
                                    <p className="text-2xl font-bold text-slate-900">
                                        <AnimatedCounter value={count.toString()} />
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-slate-300"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer transition-all hover:border-slate-300"
                    >
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Student">Student</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-500 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user, index) => {
                                    const colors = getRoleColors(user.role);
                                    return (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-slate-50/80 transition-all group animate-fade-in"
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.bg} text-white flex items-center justify-center font-bold text-sm shadow-lg ${colors.shadow} group-hover:scale-105 transition-transform overflow-hidden`}>
                                                        {user.avatar ? (
                                                            <img
                                                                src={user.avatar.startsWith('/') ? `${API_CONFIG.BASE_URL}${user.avatar}` : user.avatar}
                                                                alt={user.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.parentElement.innerText = user?.name?.charAt(0) || 'U';
                                                                }}
                                                            />
                                                        ) : (
                                                            user.name?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                        {user.role === 'Faculty' && user.expertise && user.expertise.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {user.expertise.map((exp, i) => (
                                                                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-[10px] text-blue-600 font-medium rounded-md border border-blue-100">
                                                                        {exp}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {user.studentId && (
                                                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mt-0.5 inline-block">
                                                                {user.studentId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors.light} ${colors.text}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {user.department || '-'}
                                                {user.semester && <span className="block text-xs text-slate-400">Sem {user.semester}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {!isLoading && filteredUsers.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500">No users found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setError(''); // Clear errors
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>



                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="Student">Student</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {formData.role === 'Student' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                                        <input
                                            type="text"
                                            value={formData.studentId}
                                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                                        <input
                                            type="number"
                                            value={formData.semester}
                                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.role === 'Faculty' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Expertise / Subjects (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={formData.expertise}
                                        onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="e.g. Mathematics, Programming, Data Structures"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Used for intelligent auto-mapping to courses.</p>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setError(''); // Clear errors
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{editingUser ? 'Saving...' : 'Sending...'}</span>
                                        </>
                                    ) : (
                                        editingUser ? 'Save Changes' : 'Send Invite Email'
                                    )}
                                </button >
                            </div >
                        </form >
                    </div >
                </div >
            )
            }
        </div >
    );
}
