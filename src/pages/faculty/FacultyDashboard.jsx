import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, BookOpen, TrendingUp, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

import FacultyCourses from './FacultyCourses';
import FacultySchedule from './FacultySchedule';

export default function FacultyDashboard({ currentPage, searchQuery }) {
    if (currentPage === 'courses') {
        return <FacultyCourses searchQuery={searchQuery} />;
    }
    if (currentPage === 'schedule') {
        return <FacultySchedule />;
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

    return <FacultyOverview />;
}

function FacultyOverview() {
    const [dashData, setDashData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await api.getFacultyDashboard();
            setDashData(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load faculty dashboard:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll every 30 seconds for auto-update syncing with admin changes
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !dashData) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">Faculty Dashboard</h1>
                        <p className="text-slate-500">Manage your classes and schedule efficiently.</p>
                    </div>
                </div>
                <div className="flex items-center justify-center p-12">
                    <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="ml-3 text-slate-500 font-medium">Loading dashboard...</span>
                </div>
            </div>
        );
    }

    if (error && !dashData) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">Faculty Dashboard</h1>
                        <p className="text-slate-500">Manage your classes and schedule efficiently.</p>
                    </div>
                </div>
                <div className="p-8 text-center text-red-500">
                    Failed to load dashboard data. Please try again.
                </div>
            </div>
        );
    }

    const stats = dashData?.stats || {};
    const todaySchedule = dashData?.todaySchedule || [];

    // Determine the real current day name
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:MM"

    // Build today's classes with real status based on current time
    const upcomingClasses = todaySchedule.map((cls) => {
        const slotTime = cls.time || cls.start_time || '00:00';
        const subject = cls.subject || cls.course_name || 'Unknown';
        const room = cls.room || cls.room_name || '-';
        const faculty = cls.faculty || cls.faculty_name || '-';
        
        // Each slot is 1 hour
        const [h, m] = slotTime.split(':').map(Number);
        const endH = h + 1;
        const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        let status = 'upcoming';
        if (currentTimeStr >= endTime) {
            status = 'completed';
        } else if (currentTimeStr >= slotTime && currentTimeStr < endTime) {
            status = 'current';
        }

        return {
            time: slotTime,
            subject: subject,
            room: room,
            students: cls.students || '-',
            status: status,
            class: cls.class || '',
            faculty: faculty
        };
    });

    // Find the next upcoming/current class info
    const nextClass = upcomingClasses.find(c => c.status === 'upcoming' || c.status === 'current');

    // Calculate "starts in" for the next class
    let startsInLabel = '-';
    if (nextClass) {
        const [nh, nm] = nextClass.time.split(':').map(Number);
        const [ch, cm] = currentTimeStr.split(':').map(Number);
        const diffMin = (nh * 60 + nm) - (ch * 60 + cm);
        if (diffMin > 0) {
            if (diffMin >= 60) {
                startsInLabel = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
            } else {
                startsInLabel = `${diffMin}m`;
            }
        } else {
            startsInLabel = 'Now';
        }
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['09:10', '10:10', '12:10', '13:10', '14:20', '15:20'];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Faculty Dashboard</h1>
                    <p className="text-slate-500">Manage your classes and schedule efficiently.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Next Class Card - Featured */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-xl shadow-emerald-500/30 text-white hover-lift">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Next Class</p>
                                <p className="text-white font-bold text-lg">
                                    {nextClass?.subject || 'No more classes'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <div>
                                <p className="text-emerald-100 text-xs">
                                    {nextClass?.room || '-'}
                                </p>
                                <p className="text-white font-bold">
                                    {nextClass?.time || '-'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-100 text-xs">Starts in</p>
                                <p className="text-2xl font-bold">{startsInLabel}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Students */}
                <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg shadow-blue-500/10 border border-slate-100 hover-lift group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-full opacity-50 blur-2xl group-hover:opacity-80 transition-opacity" />

                    <div className="relative flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Students</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalStudents ?? 0}</p>
                        </div>
                    </div>
                </div>

                {/* Weekly Hours */}
                <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg shadow-purple-500/10 border border-slate-100 hover-lift group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-full opacity-50 blur-2xl group-hover:opacity-80 transition-opacity" />

                    <div className="relative flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Weekly Hours</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.weeklyHours ?? 0}h</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full"
                                        style={{ width: `${Math.min(100, ((stats.weeklyHours || 0) / (dashData.maxHours || 24)) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400">of {dashData.maxHours || 24}h max</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Today's Schedule (Left 2/3) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden h-full">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Today's Schedule</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{dayName}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {upcomingClasses.length > 0 ? (
                            upcomingClasses.map((cls, idx) => (
                                <div
                                    key={idx}
                                    className={`p-5 flex items-center hover:bg-slate-50 transition-colors group ${cls.status === 'current' ? 'bg-emerald-50/50' : ''}`}
                                >
                                    <div className="w-20 flex-shrink-0">
                                        <p className={`font-bold ${cls.status === 'current' ? 'text-emerald-600' : 'text-slate-900'}`}>{cls.time}</p>
                                    </div>

                                    <div className="relative mx-4">
                                        <div className={`w-3 h-3 rounded-full ${cls.status === 'completed' ? 'bg-slate-300' :
                                            cls.status === 'current' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' :
                                                'bg-slate-200'
                                            }`} />
                                        {idx < upcomingClasses.length - 1 && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-slate-200" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold ${cls.status === 'current' ? 'text-emerald-900' : 'text-slate-900'} truncate`}>{cls.subject}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-slate-500">{cls.room}</span>
                                            {cls.class && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="text-sm text-slate-500">{cls.class}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold ${cls.status === 'completed' ? 'bg-slate-100 text-slate-500' :
                                            cls.status === 'current' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                            {cls.status === 'completed' ? 'Done' : cls.status === 'current' ? 'Live' : 'Next'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-400">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No classes scheduled for today.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Availability & Rules (Right 1/3) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                Your Academic Profile
                            </h3>
                        </div>
                        
                        <div className="p-5 space-y-6">
                            {/* Expertise badges */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Expertise</p>
                                <div className="flex flex-wrap gap-2">
                                    {(dashData.expertise || []).length > 0 ? (
                                        dashData.expertise.map(exp => (
                                            <span key={exp} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                                                {exp}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">No expertise added</span>
                                    )}
                                </div>
                            </div>

                            {/* Rules Summary */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-700 mb-2">Scheduling Rules</p>
                                <ul className="space-y-2 text-[11px] text-slate-500">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Max Workload: {dashData.maxHours}h/week
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Department: {dashData.department}
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Availability Preference Active
                                    </li>
                                </ul>
                            </div>

                            {/* Mini Availability Grid */}
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Availability</p>
                                <div className="grid grid-cols-6 gap-1 min-w-[200px]">
                                    <div className="w-8"></div>
                                    {timeSlots.map(t => (
                                        <div key={t} className="text-[8px] text-center text-slate-400">{t.slice(0, 5)}</div>
                                    ))}
                                    
                                    {days.map(day => (
                                        <React.Fragment key={day}>
                                            <div className="text-[9px] font-medium text-slate-500">{day.slice(0, 3)}</div>
                                            {timeSlots.map(time => {
                                                const isAvailable = (dashData.availability?.[day] || []).includes(time);
                                                return (
                                                    <div 
                                                        key={`${day}-${time}`}
                                                        className={`h-4 rounded-sm border ${isAvailable ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-100 border-slate-200'}`}
                                                        title={`${day} ${time}: ${isAvailable ? 'Available' : 'Busy'}`}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-3 italic text-center">Contact Admin to update your availability grid.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
