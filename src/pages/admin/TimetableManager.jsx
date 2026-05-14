import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Settings, AlertTriangle, CheckCircle, Download, LayoutGrid, Sparkles, Zap, Clock, Target, Filter, FileText, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TimetableView from '../../components/TimetableView';
import { api } from '../../services/api';

export default function TimetableManager() {
    const [activeTab, setActiveTab] = useState('generate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState(null);

    // Generation Constraints
    const [constraints, setConstraints] = useState({
        maxConsecutiveHours: 4,
        facultyWorkload: 18,
        roomUtilization: 'Balanced'
    });

    // Master View Filters
    const [viewSemester, setViewSemester] = useState('All');
    const [viewBranch, setViewBranch] = useState('All');
    const [viewSection, setViewSection] = useState('All');

    const [masterSchedule, setMasterSchedule] = useState([]);
    const [generateError, setGenerateError] = useState(null);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const exportDropdownRef = React.useRef(null);

    const loadTimetable = async () => {
        try {
            const data = await api.getTimetable(viewBranch, viewSemester, viewSection);
            // Convert to format required by TimetableView
            const formatted = data.map(item => ({
                id: item.id,
                day: item.day_of_week,
                time: `${item.start_time.slice(0, 5)}`,
                end_time: `${item.end_time.slice(0, 5)}`,
                subject: item.course_name,
                room: item.room_name,
                faculty: item.faculty_name,
                class: `${item.branch || item.department_id}-${item.semester}${item.section ? '-' + item.section : ''}`,
                type: item.type || 'Lecture',
                subtitle: `${item.branch || item.department_id} Sem ${item.semester}${item.section ? ' (Sec ' + item.section + ')' : ''}`
            }));
            setMasterSchedule(formatted);
        } catch (err) {
            console.error('Failed to load timetable', err);
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setExportDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (activeTab === 'master') {
            loadTimetable();
        }
    }, [activeTab, viewBranch, viewSemester, viewSection]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerationStatus(null);
        setGenerationProgress(0);
        setGenerateError(null);

        // Simulate progress while waiting for backend
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => (prev < 90 ? prev + Math.random() * 10 : prev));
        }, 500);

        try {
            await api.generateTimetable(viewBranch, viewSemester, viewSection, constraints);

            clearInterval(progressInterval);
            setGenerationProgress(100);
            setGenerationStatus('success');
            setTimeout(() => {
                setActiveTab('master');
                loadTimetable();
            }, 1000);

        } catch (err) {
            clearInterval(progressInterval);
            setGenerationProgress(0);
            setIsGenerating(false);
            setGenerationStatus('error');
            setGenerateError(err.message || 'Failed to generate timetable');
        }
    };

    const handleExportPDF = async () => {
        if (masterSchedule.length === 0) return;
        
        try {
            await api.downloadAdminTimetablePDF(viewBranch, viewSemester, viewSection);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            // Optionally set an error state here if you have a general error display
        }
    };

    const handleExportCSV = () => {
        if (masterSchedule.length === 0) return;

        // CSV Headers
        const headers = ['Day', 'Time', 'Duration', 'Subject', 'Room', 'Faculty', 'Class/Section', 'Type'];

        // Map data to rows
        const rows = masterSchedule.map(item => [
            item.day,
            item.time,
            `${item.time} - ${item.end_time}`,
            `"${item.subject.replace(/"/g, '""')}"`,
            `"${item.room.replace(/"/g, '""')}"`,
            `"${item.faculty.replace(/"/g, '""')}"`,
            `"${item.class.replace(/"/g, '""')}"`,
            item.type
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const filename = `timetable_${viewBranch}_sem${viewSemester}${viewSection !== 'All' ? '_sec' + viewSection : ''}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generationSteps = [
        { label: 'Analyzing constraints', icon: Settings, progress: 25 },
        { label: 'Resolving conflicts', icon: Zap, progress: 50 },
        { label: 'Optimizing schedule', icon: Target, progress: 75 },
        { label: 'Finalizing timetable', icon: CheckCircle, progress: 100 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Timetable Management</h2>
                    <p className="text-slate-500">Generate and manage academic schedules.</p>
                </div>
                <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                            ${activeTab === 'generate' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings size={16} />
                        Generation
                    </button>
                    <button
                        onClick={() => setActiveTab('master')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                            ${activeTab === 'master' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid size={16} />
                        Master View
                    </button>
                </div>
            </div>

            {activeTab === 'generate' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Generation Control Panel */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover-lift">
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isGenerating ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                <RefreshCw className={isGenerating ? 'animate-spin' : ''} size={20} />
                            </div>
                            Generation Control
                        </h3>

                        <div className="space-y-6">
                            {/* Alert */}
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 h-fit">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Action Required</h4>
                                    <p className="text-blue-700 text-sm mt-1">
                                        New course data has been added. Please regenerate the timetable to include recent changes.
                                    </p>
                                </div>
                            </div>

                            {/* Selectors */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Semester</label>
                                    <select
                                        value={viewSemester}
                                        onChange={e => setViewSemester(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-slate-300">
                                        <option value="All">All Semesters</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                            <option key={sem} value={sem}>Semester {sem}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Branch</label>
                                    <select
                                        value={viewBranch}
                                        onChange={e => setViewBranch(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-slate-300">
                                        <option value="All">All Branches</option>
                                        <option value="AI&ML">AI&ML</option>
                                        <option value="CSE">CSE</option>
                                        <option value="IT">IT</option>
                                        <option value="CE">CE</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Section (Optional)</label>
                                    <select
                                        value={viewSection}
                                        onChange={e => setViewSection(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-slate-300">
                                        <option value="All">All Sections</option>
                                        <option value="A">Section A</option>
                                        <option value="B">Section B</option>
                                        <option value="C">Section C</option>
                                    </select>
                                </div>
                            </div>

                            {/* Error Reporting */}
                            {generateError && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                                    {generateError}
                                </div>
                            )}

                            {/* Generation Progress */}
                            {isGenerating && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">Generating...</span>
                                        <span className="font-bold text-emerald-600">{Math.min(Math.round(generationProgress), 100)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-300 relative"
                                            style={{ width: `${Math.min(generationProgress, 100)}%` }}
                                        >
                                            <div className="absolute inset-0 animate-shimmer" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {generationSteps.map((step, idx) => {
                                            const Icon = step.icon;
                                            const isActive = generationProgress >= step.progress - 25 && generationProgress < step.progress;
                                            const isComplete = generationProgress >= step.progress;
                                            return (
                                                <div key={idx} className={`text-center p-2 rounded-lg transition-all ${isComplete ? 'bg-emerald-50 text-emerald-600' : isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <Icon size={18} className={`mx-auto mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                                                    <p className="text-xs font-medium truncate">{step.label.split(' ')[0]}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Success message */}
                            {generationStatus === 'success' && !isGenerating && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                                    <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                        <CheckCircle size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-emerald-800 text-sm">Generation Complete!</p>
                                        <p className="text-emerald-600 text-sm">Timetable has been generated successfully.</p>
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2
                                    ${isGenerating
                                        ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-[1.02] shadow-emerald-500/30 hover:shadow-xl'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={20} />
                                        Generating Schedules...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Generate New Timetable
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Constraints & Settings */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover-lift">
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                                <Settings size={20} />
                            </div>
                            System Constraints
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition group">
                                <div>
                                    <p className="font-medium text-slate-900">Max Consecutive Hours</p>
                                    <p className="text-xs text-slate-500">Per faculty member</p>
                                </div>
                                <select
                                    value={constraints.maxConsecutiveHours}
                                    onChange={(e) => setConstraints({ ...constraints, maxConsecutiveHours: e.target.value })}
                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                >
                                    <option>3</option>
                                    <option>4</option>
                                    <option>5</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition group">
                                <div>
                                    <p className="font-medium text-slate-900">Target Workload</p>
                                    <p className="text-xs text-slate-500">Hours per week</p>
                                </div>
                                <select
                                    value={constraints.facultyWorkload}
                                    onChange={(e) => setConstraints({ ...constraints, facultyWorkload: e.target.value })}
                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                >
                                    <option>15</option>
                                    <option>18</option>
                                    <option>20</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition group">
                                <div>
                                    <p className="font-medium text-slate-900">Room Utilization</p>
                                    <p className="text-xs text-slate-500">Optimization strategy</p>
                                </div>
                                <select
                                    value={constraints.roomUtilization}
                                    onChange={(e) => setConstraints({ ...constraints, roomUtilization: e.target.value })}
                                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                >
                                    <option>Compact</option>
                                    <option>Balanced</option>
                                </select>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h4 className="text-sm font-medium text-slate-500 mb-4">Current Configuration</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                    <p className="text-2xl font-bold text-emerald-600">{constraints.maxConsecutiveHours}h</p>
                                    <p className="text-xs text-emerald-700">Max Hours</p>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-xl">
                                    <p className="text-2xl font-bold text-blue-600">{constraints.facultyWorkload}h</p>
                                    <p className="text-xs text-blue-700">Workload</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-xl">
                                    <p className="text-lg font-bold text-purple-600">{constraints.roomUtilization}</p>
                                    <p className="text-xs text-purple-700">Mode</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-4">
                    {/* Master View Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-700 uppercase">Live Master Schedule</span>
                            </div>

                            {/* Filtering Controls */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Filter size={16} className="text-slate-400" />
                                <select
                                    value={viewBranch}
                                    onChange={(e) => setViewBranch(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer hover:bg-white"
                                >
                                    <option value="All">All Branches</option>
                                    <option value="AI&ML">AI&ML</option>
                                    <option value="CSE">CSE</option>
                                    <option value="IT">IT</option>
                                    <option value="CE">CE</option>
                                </select>
                                <select
                                    value={viewSemester}
                                    onChange={(e) => setViewSemester(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer hover:bg-white"
                                >
                                    <option value="All">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem}>Sem {sem}</option>
                                    ))}
                                </select>
                                <select
                                    value={viewSection}
                                    onChange={(e) => setViewSection(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer hover:bg-white"
                                >
                                    <option value="All">All Sections</option>
                                    <option value="A">Sec A</option>
                                    <option value="B">Sec B</option>
                                    <option value="C">Sec C</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative" ref={exportDropdownRef}>
                            <button
                                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 text-sm font-bold whitespace-nowrap group"
                            >
                                <Download size={18} className={`${exportDropdownOpen ? 'rotate-180' : ''} transition-transform duration-200`} />
                                Export
                                <ChevronDown size={16} className={`opacity-60 transition-transform duration-200 ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {exportDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in">
                                    <button
                                        onClick={() => {
                                            handleExportCSV();
                                            setExportDropdownOpen(false);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-medium border-b border-gray-50 last:border-0"
                                    >
                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                            <Download size={14} />
                                        </div>
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleExportPDF();
                                            setExportDropdownOpen(false);
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-medium border-b border-gray-50 last:border-0"
                                    >
                                        <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                                            <FileText size={14} />
                                        </div>
                                        Export PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule View */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <TimetableView schedule={masterSchedule} userRole="Admin" />
                    </div>

                    {masterSchedule.length === 0 && (
                        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p>No classes found for the selected filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
