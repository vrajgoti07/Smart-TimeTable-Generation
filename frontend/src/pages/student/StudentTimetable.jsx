import React, { useState, useEffect } from 'react';
import TimetableView from '../../components/TimetableView';
import { Calendar, Download, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

export default function StudentTimetable() {
    const { alert } = useDialog();
    const [schedule, setSchedule] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ weeklyHours: 0, totalClasses: 0, uniqueDays: 0 });

    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                // Force Semester 4 as per USER STRICT RULES
                const data = await api.getTimetable(null, 4);
                
                // Map backend fields to what TimetableView expects
                const mappedData = data.map(entry => {
                    // Normalize day (e.g., "monday" -> "Monday")
                    const rawDay = entry.day_of_week || "";
                    const normalizedDay = rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase();
                    
                    // Normalize time (e.g., "9:10" -> "09:10")
                    let normalizedTime = entry.start_time || "";
                    if (normalizedTime.length === 4 && normalizedTime.includes(':')) {
                        normalizedTime = '0' + normalizedTime;
                    }

                    return {
                        ...entry,
                        day: normalizedDay,
                        time: normalizedTime,
                        subject: entry.course_name,
                        room: entry.room_name,
                        faculty: entry.faculty_name
                    };
                });
                
                setSchedule(mappedData);
                
                // Calculate stats from real data
                const days = [...new Set(data.map(s => s.day_of_week))].length;
                const totalHours = mappedData.reduce((acc, s) => {
                    const isLab = s.room && s.room.startsWith("AI-2");
                    return acc + (isLab ? 2 : 1);
                }, 0);

                setStats({
                    weeklyHours: totalHours,
                    totalClasses: data.length,
                    uniqueDays: days
                });
            } catch (err) {
                console.error("Failed to fetch timetable:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTimetable();
    }, []);

    const handleDownloadPDF = async () => {
        try {
            await api.downloadStudentTimetablePDF();
        } catch (err) {
            await alert("Failed to download PDF. Please try again.", "Error", "error");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Timetable</h2>
                    <p className="text-slate-500">Class schedule for Spring 2026.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 border border-cyan-200 text-cyan-700 text-sm font-medium rounded-xl">
                        <Calendar size={16} />
                        Semester 4
                    </span>
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 text-sm font-medium hover-lift"
                    >
                        <Download size={16} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                            <Clock size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Weekly Hours</p>
                            <p className="text-xl font-bold text-slate-900">{stats.weeklyHours}h</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Total Classes</p>
                            <p className="text-xl font-bold text-slate-900">{stats.totalClasses}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Class Days</p>
                            <p className="text-xl font-bold text-slate-900">{stats.uniqueDays} Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timetable */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-slate-500 font-medium">Loading timetable...</span>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <TimetableView schedule={schedule} userRole="Student" />
                </div>
            )}

            {/* Info Notice */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <AlertCircle size={18} />
                </div>
                <div>
                    <span className="font-bold text-blue-800 text-sm">Note:</span>
                    <p className="text-blue-700 text-sm mt-0.5">
                        Labs are conducted in their respective blocks. Please check the notice board for any last-minute rescheduling.
                    </p>
                </div>
            </div>
        </div>
    );
}
