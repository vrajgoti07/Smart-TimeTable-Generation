import React, { useState, useEffect, useRef } from 'react';
import TimetableView from '../../components/TimetableView';
import { api } from '../../services/api';
import { Calendar, Clock, Download, BookOpen, FileText } from 'lucide-react';
import { useDialog } from '../../context/DialogContext';

export default function FacultySchedule() {
    const { alert } = useDialog();
    const [isLoading, setIsLoading] = useState(true);
    const [schedule, setSchedule] = useState([]);
    const [error, setError] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef(null);

    const fetchSchedule = async () => {
        try {
            const data = await api.getTimetable();
            const normalizedData = (data || []).map(s => ({
                ...s,
                day: s.day || s.day_of_week || 'Monday',
                time: s.time || s.start_time || '09:10',
                subject: s.subject || s.course_name || 'Unknown',
                room: s.room || s.room_name || '-',
                faculty: s.faculty || s.faculty_name || '-'
            }));
            setSchedule(normalizedData);
            setError(null);
        } catch (err) {
            console.error('Failed to load schedule:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
        // Poll every 30 seconds for auto-update
        const interval = setInterval(fetchSchedule, 30000);

        const handleClickOutside = (event) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getClassType = (room) => {
        if (room && room.startsWith("AI-2")) {
            return "LAB";
        }
        return "LEC";
    };

    // Calculate stats from live data
    const uniqueDays = [...new Set(schedule.map(s => (s.day || s.day_of_week || '')))].filter(Boolean).length;
    const totalSessions = schedule.length;
    const totalHours = schedule.reduce((acc, s) => acc + (getClassType(s.room) === 'LAB' ? 2 : 1), 0);

    const handleExportPDF = async () => {
        try {
            await api.downloadFacultyTimetablePDF();
            setShowExportMenu(false);
        } catch (err) {
            alert("We could not generate your PDF at this moment. Please check your connection and try again.", "Download Failed", "error");
        }
    };

    const handleExportCSV = () => {
        if (schedule.length === 0) return;

        // CSV Headers
        const headers = ['Day', 'Time', 'Duration', 'Subject', 'Room', 'Class/Section', 'Type'];
        
        // Map data to rows
        const rows = schedule.map(item => {
            const timeStr = item.time || '';
            let duration = timeStr;
            
            if (timeStr && timeStr.includes(':')) {
                const [h, m] = timeStr.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) {
                    const isLab = getClassType(item.room) === 'LAB';
                    const durationH = isLab ? 2 : 1;
                    duration = `${timeStr} - ${String(h + durationH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }
            
            const className = `${item.department_id || ''} Sem ${item.semester || ''}${item.section ? ' (' + item.section + ')' : ''}`;

            return [
                item.day,
                timeStr,
                duration,
                `"${(item.subject || '').replace(/"/g, '""')}"`,
                `"${(item.room || '').replace(/"/g, '""')}"`,
                `"${className.replace(/"/g, '""')}"`,
                getClassType(item.room)
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `faculty_schedule_${timestamp}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowExportMenu(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Weekly Schedule</h2>
                    <p className="text-slate-500">Your teaching timetable for Spring 2026.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Active Semester
                    </span>
                    
                    <div className="relative" ref={exportMenuRef}>
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 text-sm font-medium hover-lift"
                        >
                            <Download size={16} />
                            Export
                        </button>
                        
                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button 
                                    onClick={handleExportCSV}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                        <BookOpen size={14} />
                                    </div>
                                    Export as CSV
                                </button>
                                <button 
                                    onClick={handleExportPDF}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                >
                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <FileText size={14} />
                                    </div>
                                    Export as PDF
                                </button>
                            </div>
                        )}
                    </div>
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
                            <p className="text-xs text-slate-500 font-medium uppercase">Total Hours</p>
                            <p className="text-xl font-bold text-slate-900">{totalHours} Hrs/Week</p>
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
                            <p className="text-xl font-bold text-slate-900">{totalSessions} Sessions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Teaching Days</p>
                            <p className="text-xl font-bold text-slate-900">{uniqueDays} Days</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timetable */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-slate-500 font-medium">Loading schedule...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    <div className="text-center text-red-500">Failed to load schedule. Please try again.</div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <TimetableView schedule={schedule} userRole="Faculty" />
                </div>
            )}
        </div>
    );
}
