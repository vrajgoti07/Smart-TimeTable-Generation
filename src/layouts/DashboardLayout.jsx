import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Calendar, BookOpen, Settings, LogOut, Menu, X, Bell, Search, ChevronDown, Clock, Sparkles, Building2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { API_CONFIG } from '../config/api';

export default function DashboardLayout({ children, activePage, onPageChange, searchQuery, onSearch }) {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const notificationsRef = useRef(null);
    const API_URL = API_CONFIG.BASE_URL;

    const fetchNotifications = async () => {
        try {
            const data = await api.getNotifications();
            setNotifications(data);
            const count = data.filter(n => !n.is_read).length;
            setUnreadCount(count);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    const formatFullDate = (dateString) => {
        if (!dateString) return '';
        // Force UTC if no timezone is present to fix legacy naive datetime strings
        const normalized = (dateString.endsWith('Z') || dateString.includes('+')) 
            ? dateString 
            : `${dateString}Z`;
        
        const date = new Date(normalized);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        let timeLabel = '';
        if (diffInSeconds < 5) timeLabel = 'Just now';
        else if (diffInSeconds < 60) timeLabel = `${diffInSeconds}s ago`;
        else if (diffInSeconds < 3600) timeLabel = `${Math.floor(diffInSeconds / 60)}m ago`;
        else if (diffInSeconds < 86400) timeLabel = `${Math.floor(diffInSeconds / 3600)}h ago`;
        else timeLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        return {
            relative: timeLabel,
            full: date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) + ' • ' + date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        };
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 15000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getNavItems = () => {
        const base = [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }];
        switch (user?.role) {
            case 'Admin': return [...base, { id: 'users', label: 'Users', icon: Users }, { id: 'faculty', label: 'Faculty', icon: Users }, { id: 'timetable', label: 'Timetable', icon: Calendar }, { id: 'courses', label: 'Courses', icon: BookOpen }, { id: 'classrooms', label: 'Rooms', icon: Building2 }, { id: 'settings', label: 'Settings', icon: Settings }];
            case 'Faculty': return [...base, { id: 'schedule', label: 'Schedule', icon: Calendar }, { id: 'courses', label: 'Courses', icon: BookOpen }];
            case 'Student': return [...base, { id: 'timetable', label: 'Timetable', icon: Calendar }, { id: 'courses', label: 'Courses', icon: BookOpen }, { id: 'profile', label: 'Profile', icon: Users }];
            default: return base;
        }
    };

    const roleColors = {
        Admin: 'from-amber-400 to-amber-600',
        Faculty: 'from-emerald-400 to-emerald-600',
        Student: 'from-cyan-400 to-cyan-600'
    };
    const roleBg = roleColors[user?.role] || 'from-gray-400 to-gray-600';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20 flex sticky">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transform transition-all duration-300 ease-out shadow-xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Sidebar Header */}
                <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-glow-pulse">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 block">Chronos</span>
                            <span className="text-xs text-emerald-600 font-medium">Smart Schedule</span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* User Card */}
                <div className="p-4">
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-100 hover-lift">
                        <div className={`w-12 h-12 bg-gradient-to-br ${roleBg} rounded-xl flex items-center justify-center text-white font-bold shadow-lg overflow-hidden`}>
                            {user?.avatar ? (
                                <img
                                    src={user.avatar.startsWith('/') ? `${API_URL}${user.avatar}` : user.avatar}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerText = user?.name?.charAt(0) || 'U';
                                    }}
                                />
                            ) : (
                                user?.name?.charAt(0) || 'U'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${roleBg}`} />
                                <p className="text-xs text-gray-500">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
                    {getNavItems().map((item, index) => {
                        const Icon = item.icon;
                        const active = activePage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { onPageChange(item.id); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <Icon size={18} className={active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                                {item.label}
                                {active && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Sign Out Button */}
                <div className="p-4 border-t border-gray-100/50">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                    >
                        <LogOut size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 capitalize">{activePage}</h1>
                            <p className="text-xs text-gray-500 hidden sm:block">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar */}
                        <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gray-100/80 rounded-xl w-64 group hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                            <Search size={16} className="text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={`Search ${activePage}...`}
                                value={searchQuery || ''}
                                onChange={(e) => onSearch(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400"
                            />
                        </div>

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationsRef}>
                            <button 
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
                            >
                                <Bell size={20} className={`transition-colors ${notificationsOpen ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                            </button>

                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in max-h-[500px] flex flex-col">
                                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={18} className="text-emerald-600" />
                                            <h3 className="font-bold text-gray-900">Notifications</h3>
                                        </div>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await api.markAllNotificationsAsRead();
                                                        await fetchNotifications();
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="text-xs text-emerald-600 font-medium hover:text-emerald-700"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200">
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div 
                                                    key={n.id} 
                                                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${n.is_read ? 'border-transparent' : 'border-emerald-500 bg-emerald-50/30'}`}
                                                    onClick={async () => {
                                                        if (!n.is_read) {
                                                            try {
                                                                await api.markNotificationAsRead(n.id);
                                                                await fetchNotifications();
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 p-2 rounded-xl shrink-0 w-10 h-10 flex items-center justify-center shadow-sm
                                                            ${n.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                              n.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                                              n.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                            {n.type === 'success' ? <Calendar size={18} /> : 
                                                             n.type === 'warning' ? <AlertTriangle size={18} /> : 
                                                             n.type === 'error' ? <X size={18} /> : <Bell size={18} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-bold ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                                            <div className="text-[10px] text-gray-400 mt-1.5 flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-semibold text-emerald-600/80">{formatFullDate(n.created_at).relative}</span>
                                                                    <span className="text-gray-300">•</span>
                                                                    <span>{formatFullDate(n.created_at).full}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-12 text-center text-gray-500">
                                                <Bell size={32} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">No notifications yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-all duration-200"
                            >
                                <div className={`w-9 h-9 bg-gradient-to-br ${roleBg} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden`}>
                                    {user?.avatar ? (
                                        <img
                                            src={user.avatar.startsWith('/') ? `${API_URL}${user.avatar}` : user.avatar}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerText = user?.name?.charAt(0) || 'U';
                                            }}
                                        />
                                    ) : (
                                        user?.name?.charAt(0)
                                    )}
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 hidden sm:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="font-semibold text-gray-900">{user?.name}</p>
                                        <p className="text-sm text-gray-500">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
