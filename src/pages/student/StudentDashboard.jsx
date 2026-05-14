import React from 'react';
import { BookOpen, Clock, Calendar, TrendingUp, Award, ChevronRight, Target, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

import StudentCourses from './StudentCourses';
import StudentProfile from './StudentProfile';
import StudentTimetable from './StudentTimetable';

export default function StudentDashboard({ currentPage, searchQuery }) {
    const [dashboardData, setDashboardData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const data = await api.getStudentDashboard();
                setDashboardData(data);
            } catch (err) {
                console.error("Failed to fetch student dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (currentPage === 'courses') {
        return <StudentCourses />;
    }
    if (currentPage === 'profile') {
        return <StudentProfile />;
    }
    if (currentPage === 'timetable') {
        return <StudentTimetable />;
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

    // Get Today's Schedule from real data
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    let todaySchedule = dashboardData?.todaySchedule || [];
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        todaySchedule = todaySchedule.filter(cls => 
            (cls.subject || '').toLowerCase().includes(query) ||
            (cls.professor || '').toLowerCase().includes(query) ||
            (cls.room || '').toLowerCase().includes(query)
        );
    }
    const stats = dashboardData?.stats || { totalCourses: 0, weeklyHours: 0, semester: 4 };

    const quickStats = [
        { label: 'Weekly Hours', value: `${stats.weeklyHours}h`, icon: Clock, color: 'emerald' },
        { label: 'Total Courses', value: `${stats.totalCourses}`, icon: BookOpen, color: 'blue' },
        { label: 'Semester', value: `${stats.semester}`, icon: Calendar, color: 'purple' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Student Portal</h1>
                    <p className="text-slate-500">View your schedule, courses, and academic progress.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-700">Semester {dashboardData?.semester || 4}</span>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickStats.map((stat, index) => {
                    const Icon = stat.icon;
                    const colorClasses = {
                        emerald: { bg: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/30', light: 'from-emerald-50 to-emerald-100/50' },
                        blue: { bg: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/30', light: 'from-blue-50 to-blue-100/50' },
                        purple: { bg: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/30', light: 'from-purple-50 to-purple-100/50' },
                    };
                    const colors = colorClasses[stat.color];

                    return (
                        <div key={index} className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover-lift group">
                            <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${colors.light} rounded-full opacity-50 blur-xl group-hover:opacity-80 transition-opacity`} />
                            <div className="relative flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} text-white shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Today's Progress Ring + Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white relative overflow-hidden hover-lift">
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />

                    <div className="relative">
                        <h3 className="text-slate-400 text-sm font-medium mb-4">Today's Progress</h3>

                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-32 h-32">
                                {/* Progress Ring */}
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none"
                                        stroke="url(#gradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray="283"
                                        strokeDashoffset="94"
                                        className="transition-all duration-1000"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold">67%</span>
                                    <span className="text-xs text-slate-400">Complete</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm mt-4 pt-4 border-t border-white/10">
                            <div>
                                <p className="text-slate-400">Classes Done</p>
                                <p className="font-bold text-lg">2/3</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400">Hours Left</p>
                                <p className="font-bold text-lg">3h</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Schedule */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Today's Schedule</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{day}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                        </div>
                        <button className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                            View all <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {todaySchedule.length > 0 ? (
                            todaySchedule.map((cls, idx) => (
                                <div
                                    key={idx}
                                    className={`p-5 flex items-center hover:bg-slate-50 transition-all group ${cls.status === 'current' ? 'bg-gradient-to-r from-emerald-50 to-transparent border-l-4 border-emerald-500' : ''}`}
                                >
                                    {/* Time */}
                                    <div className="w-24 flex-shrink-0">
                                        <p className={`font-bold text-sm ${cls.status === 'current' ? 'text-emerald-600' : cls.status === 'completed' ? 'text-slate-400' : 'text-slate-900'}`}>
                                            {cls.time}
                                        </p>
                                    </div>

                                    {/* Subject Details */}
                                    <div className="flex-1 min-w-0 px-4">
                                        <p className={`font-semibold ${cls.status === 'completed' ? 'text-slate-400' : 'text-slate-900'}`}>{cls.subject}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">{cls.room}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-xs text-slate-500">{cls.professor}</span>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${cls.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                                            cls.status === 'current' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                            {cls.status === 'completed' ? '✓ Done' : cls.status === 'current' ? '● Live' : 'Upcoming'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-500">
                                No classes scheduled for today.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
