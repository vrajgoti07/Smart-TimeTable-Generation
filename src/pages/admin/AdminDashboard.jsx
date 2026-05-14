import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Building2, Calendar, TrendingUp, ArrowUpRight, Activity, Clock, Sparkles, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import MetricChart from '../../components/MetricChart';

import UserManagement from './UserManagement';
import TimetableManager from './TimetableManager';
import AdminCourses from './AdminCourses';
import AdminFaculty from './AdminFaculty';
import AdminRooms from './AdminRooms';
import SettingsPage from './SettingsPage';

export default function AdminDashboard({ currentPage, onNavigate, searchQuery }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMetric, setSelectedMetric] = useState(null); // 'serverLoad' or 'memoryUsage'
    const [metricsHistory, setMetricsHistory] = useState([]);
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (currentPage === 'overview') {
            loadDashboardData();
            const interval = setInterval(pollMetrics, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [currentPage]);

    const pollMetrics = async () => {
        try {
            const data = await api.getAdminDashboard();
            setDashboardData(prev => ({
                ...prev,
                systemStatus: data.systemStatus,
                recentActivities: data.recentActivities
            }));
            
            // Real-time update for the metrics history
            if (data.systemStatus && data.systemStatus.time) {
                setMetricsHistory(prev => {
                    const newPoint = {
                        time: data.systemStatus.time,
                        serverLoad: data.systemStatus.serverLoad,
                        memoryUsage: data.systemStatus.memoryUsage,
                        dbLatency: parseFloat(data.systemStatus.dbLatency?.replace('ms', '')) || 0
                    };
                    
                    // Avoid duplicate timestamps in history
                    if (prev.length > 0 && prev[prev.length - 1].time === newPoint.time) {
                        return prev;
                    }

                    const updated = [...prev, newPoint].slice(-30);
                    return updated;
                });
            }
        } catch (err) {
            console.error("Failed to poll metrics:", err);
        }
    };

    const loadDashboardData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getAdminDashboard();
            setDashboardData(data);
            const history = await api.getMetricsHistory(20);
            setMetricsHistory(history);
        } catch (err) {
            console.error("Initial load failed:", err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMetricClick = async (metric) => {
        setSelectedMetric(metric);
        try {
            const history = await api.getMetricsHistory(30);
            setMetricsHistory(history);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    if (currentPage === 'users') {
        return <UserManagement searchQuery={searchQuery} />;
    }
    if (currentPage === 'faculty') {
        return <AdminFaculty searchQuery={searchQuery} />;
    }
    if (currentPage === 'timetable') {
        return <TimetableManager searchQuery={searchQuery} />;
    }
    if (currentPage === 'courses') {
        return <AdminCourses searchQuery={searchQuery} />;
    }
    if (currentPage === 'classrooms') {
        return <AdminRooms searchQuery={searchQuery} />;
    }
    if (currentPage === 'settings') {
        return <SettingsPage />;
    }

    if (currentPage !== 'overview') {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-slate-800 capitalize mb-4">{currentPage}</h2>
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-br from-slate-50 to-white">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">Content for {currentPage} will be implemented here.</p>
                </div>
            </div>
        );
    }

    const s = dashboardData?.stats || {};

    const stats = [
        {
            label: 'Total Users',
            value: s.totalUsers ?? '—',
            detail: `${s.adminCount ?? 0} Admins · ${s.facultyCount ?? 0} Faculty · ${s.studentCount ?? 0} Students`,
            icon: Users,
            gradient: 'from-emerald-400 to-emerald-600',
            bgGradient: 'from-emerald-50 to-emerald-100/50',
            shadowColor: 'shadow-emerald-500/20'
        },
        {
            label: 'Total Courses',
            value: s.totalCourses ?? '—',
            detail: 'Active courses',
            icon: BookOpen,
            gradient: 'from-blue-400 to-blue-600',
            bgGradient: 'from-blue-50 to-blue-100/50',
            shadowColor: 'shadow-blue-500/20'
        },
        {
            label: 'Theory Rooms',
            value: s.totalRooms ?? '—',
            detail: 'Available rooms',
            icon: Building2,
            gradient: 'from-amber-400 to-amber-600',
            bgGradient: 'from-amber-50 to-amber-100/50',
            shadowColor: 'shadow-amber-500/20'
        },
        {
            label: 'Schedules',
            value: s.totalSchedules ?? '—',
            detail: 'Generated entries',
            icon: Calendar,
            gradient: 'from-rose-400 to-rose-600',
            bgGradient: 'from-rose-50 to-rose-100/50',
            shadowColor: 'shadow-rose-500/20'
        },
    ];

    const recentActivities = dashboardData?.recentActivities || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="ml-3 text-slate-500 font-medium">Loading dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={loadDashboardData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard Overview</h1>
                    <p className="text-slate-500">Welcome back, Admin. Here's what's happening today.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">System Online</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg ${stat.shadowColor} border border-slate-100 hover-lift group`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Background gradient decoration */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${stat.bgGradient} opacity-50 blur-2xl group-hover:opacity-80 transition-opacity`} />

                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                                    <p className="text-xs text-slate-400 mt-2">{stat.detail}</p>
                                </div>
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadowColor} group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => onNavigate('users')}
                        className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-50 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 group hover-lift"
                    >
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                            <Users size={22} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">Add User</span>
                    </button>
                    <button
                        onClick={() => onNavigate('courses')}
                        className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-50 transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 group hover-lift"
                    >
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                            <BookOpen size={22} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">Add Course</span>
                    </button>
                    <button
                        onClick={() => onNavigate('classrooms')}
                        className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col items-center gap-3 hover:bg-slate-50 transition-all duration-300 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10 group hover-lift"
                    >
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                            <Building2 size={22} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors">Add Room</span>
                    </button>
                    <button
                        onClick={() => onNavigate('timetable')}
                        className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-500 rounded-2xl flex flex-col items-center gap-3 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 group hover-lift"
                    >
                        <div className="p-3 bg-white/20 text-white rounded-xl group-hover:scale-110 transition-transform">
                            <Sparkles size={22} />
                        </div>
                        <span className="text-sm font-semibold text-white">Generate</span>
                    </button>
                </div>
            </div>

            {/* Activity & Status Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 h-[420px] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            Recent Activities
                        </h3>
                        <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline">
                            View all <ArrowUpRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                        {recentActivities.map((activity, i) => (
                            <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                <div className={`w-2.5 h-2.5 rounded-full mt-2 ${activity.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{activity.action}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">by {activity.user}</p>
                                </div>
                                <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 h-[420px] flex flex-col overflow-hidden">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 shrink-0">
                        <Clock className="w-5 h-5 text-emerald-500" />
                        System Status
                    </h3>
                    <div className="space-y-6 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                        <div 
                            className="group cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                            onClick={() => handleMetricClick('serverLoad')}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600">Server Load</span>
                                    <div className="p-1 bg-emerald-100 text-emerald-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrendingUp size={12} />
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">
                                    {dashboardData?.systemStatus?.serverLoad ?? 0}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div 
                                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2.5 rounded-full" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dashboardData?.systemStatus?.serverLoad ?? 0}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        <div 
                            className="group cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                            onClick={() => handleMetricClick('memoryUsage')}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600">Memory Usage</span>
                                    <div className="p-1 bg-blue-100 text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Activity size={12} />
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-blue-600">
                                    {dashboardData?.systemStatus?.memoryUsage ?? 0}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div 
                                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-2.5 rounded-full" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dashboardData?.systemStatus?.memoryUsage ?? 0}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-600">Database</span>
                                <span className={`text-sm font-bold ${dashboardData?.systemStatus?.dbStatus === 'Online' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {dashboardData?.systemStatus?.dbStatus || 'Checking...'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`flex items-center gap-1.5 px-2 py-1 ${dashboardData?.systemStatus?.dbStatus === 'Online' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} rounded-lg text-xs font-medium`}>
                                    <span className={`w-1.5 h-1.5 ${dashboardData?.systemStatus?.dbStatus === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full animate-pulse`} />
                                    {dashboardData?.systemStatus?.dbStatus === 'Online' ? 'Connected' : 'Disconnected'}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {dashboardData?.systemStatus?.dbLatency || '—'} latency
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics History Modal */}
            <AnimatePresence>
                {selectedMetric && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl bg-${selectedMetric === 'serverLoad' ? 'emerald' : 'blue'}-50 text-${selectedMetric === 'serverLoad' ? 'emerald' : 'blue'}-600`}>
                                        {selectedMetric === 'serverLoad' ? <TrendingUp size={20} /> : <Activity size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">
                                            {selectedMetric === 'serverLoad' ? 'Server Load Analysis' : 'Memory Usage Analysis'}
                                        </h3>
                                        <p className="text-xs text-slate-500">Real-time performance metrics</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedMetric(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8">
                                <MetricChart 
                                    data={metricsHistory} 
                                    metricKey={selectedMetric}
                                    color={selectedMetric === 'serverLoad' ? '#10b981' : '#3b82f6'}
                                    label={selectedMetric === 'serverLoad' ? 'CPU %' : 'RAM %'}
                                />
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-xs text-slate-500 mb-1">Current</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {dashboardData?.systemStatus?.[selectedMetric] ?? 0}%
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-xs text-slate-500 mb-1">Status</p>
                                        <p className="text-2xl font-bold text-emerald-600">Optimal</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
