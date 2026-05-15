import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Clock, Calendar, Save, X, Check, BarChart, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { API_CONFIG } from '../../config/api';

// Constants for time slots
const TIME_SLOTS = [
    '09:10', '10:10', '12:10', '13:10', '14:20', '15:20'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function AdminFaculty({ searchQuery }) {
    const [faculty, setFaculty] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [timetable, setTimetable] = useState([]);
    const [selectedDept, setSelectedDept] = useState('All');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [facultyData, coursesData, timetableData] = await Promise.all([
                api.getAllFaculty(),
                api.getAllCourses ? api.getAllCourses() : Promise.resolve([]),
                api.getTimetable()
            ]);

            // Normalize faculty data
            const normalizedFaculty = facultyData.map(f => ({
                ...f,
                max_hours: f.max_hours || 15,
                availability: f.availability || {}
            }));

            setFaculty(normalizedFaculty);
            setTimetable(timetableData || []);

            // Normalize course data
            const normalizedCourses = coursesData.map(c => {
                let facultyMap = c.faculty || {};

                // Migrate legacy flat format if encountered
                if (facultyMap.theory || facultyMap.practical) {
                    const primaryBr = c.branch || c.department || c.department_id || 'CSE';
                    facultyMap = { [primaryBr]: facultyMap };
                }

                return {
                    ...c,
                    theoryHours: parseInt(c.theoryHours !== undefined ? c.theoryHours : (c.theory_credit || 0)),
                    practicalHours: parseInt(c.practicalHours !== undefined ? c.practicalHours : (c.practical_credit || 0)),
                    department: c.branch || c.department || c.department_id || '',
                    faculty: facultyMap
                };
            });
            setCourses(normalizedCourses);
        } catch (err) {
            setError(err.message || 'Failed to load faculty data');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate current assigned hours for a faculty member based on course assignments
    const getAssignedHours = (facultyName) => {
        let totalHours = 0;
        courses.forEach(course => {
            const facultyMap = course.faculty || {};
            // Sum hours across all branches in the dictionary
            Object.values(facultyMap).forEach(assignment => {
                if (assignment.theory?.includes(facultyName)) {
                    totalHours += (course.theoryHours || 0);
                }
                if (assignment.practical?.includes(facultyName)) {
                    totalHours += (course.practicalHours || 0);
                }
            });
        });

        return totalHours;
    };

    const handleEditClick = (fac) => {
        setEditingId(fac.id);
        setEditForm({
            max_hours: fac.max_hours,
            department: fac.department || '',
            expertise: (fac.expertise || []).join(', '),
            availability: { ...fac.availability }
        });
    };

    const handleSave = async (id) => {
        const fac = faculty.find(f => f.id === id);
        if (!fac) return;

        const updatedData = {
            name: fac.name,
            email: fac.email,
            department: editForm.department,
            max_hours: parseInt(editForm.max_hours),
            availability: editForm.availability,
            expertise: editForm.expertise.split(',').map(s => s.trim()).filter(s => s !== ''),
            current_hours: fac.current_hours || 0,
            available_slots: fac.available_slots || 0
        };

        try {
            await api.updateFaculty(id, updatedData);
            // Update local state on success
            const updated = faculty.map(f => {
                if (f.id === id) {
                    return {
                        ...f,
                        max_hours: parseInt(editForm.max_hours),
                        department: editForm.department,
                        expertise: editForm.expertise.split(',').map(s => s.trim()).filter(s => s !== ''),
                        availability: editForm.availability
                    };
                }
                return f;
            });
            setFaculty(updated);
            setEditingId(null);
            setEditForm(null);
        } catch (err) {
            setError(err.message || 'Failed to save faculty');
        }
    };

    const toggleAvailability = (day, slot) => {
        const currentDaySlots = editForm.availability[day] || [];
        let newDaySlots;

        if (currentDaySlots.includes(slot)) {
            newDaySlots = currentDaySlots.filter(s => s !== slot);
        } else {
            newDaySlots = [...currentDaySlots, slot].sort();
        }

        setEditForm({
            ...editForm,
            availability: {
                ...editForm.availability,
                [day]: newDaySlots
            }
        });
    };

    const getScheduleForSlot = (day, time, facultyName) => {
        return timetable.find(entry =>
            entry.day_of_week === day &&
            entry.start_time && entry.start_time.startsWith(time) &&
            entry.faculty_name === facultyName
        );
    };

    const departments = ['All', ...new Set(faculty.map(f => f.department))];

    const filteredFaculty = faculty.filter(f => {
        const query = (searchQuery || searchTerm || '').toLowerCase();
        const matchesSearch = (f.name || '').toLowerCase().includes(query) ||
            (f.department || '').toLowerCase().includes(query) ||
            (f.email || '').toLowerCase().includes(query) ||
            (f.expertise || []).some(exp => exp.toLowerCase().includes(query));
        const matchesDept = selectedDept === 'All' || f.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="ml-3 text-slate-500 font-medium">Loading faculty...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Faculty Workload</h2>
                    <p className="text-slate-500">Manage working hours and availability schedules.</p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search faculty..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <select
                        value={selectedDept}
                        onChange={e => setSelectedDept(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                    >
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Faculty List */}
            <div className="grid grid-cols-1 gap-6">
                {filteredFaculty.map((fac, index) => {
                    const isEditing = editingId === fac.id;
                    const assignedHours = getAssignedHours(fac.name);
                    const maxHours = isEditing ? editForm.max_hours : fac.max_hours;
                    const workloadPercent = Math.min(100, Math.round((assignedHours / maxHours) * 100));

                    let workloadColor = 'bg-emerald-500';
                    if (workloadPercent > 80) workloadColor = 'bg-amber-500';
                    if (workloadPercent > 100) workloadColor = 'bg-red-500';

                    return (
                        <div key={fac.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            {/* Card Header / Summary */}
                            <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30 overflow-hidden">
                                        {(fac.avatar && fac.avatar.startsWith('/uploads')) ? (
                                            <img
                                                src={`${API_CONFIG.BASE_URL}${fac.avatar}`}
                                                alt={fac.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            fac.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{fac.name}</h3>
                                        <p className="text-sm text-slate-500">{fac.department}</p>
                                    </div>
                                </div>

                                {/* Workload Bar */}
                                <div className="flex-1 w-full md:max-w-md">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-medium text-slate-700">Workload</span>
                                        <span className="text-slate-500">
                                            <strong className={assignedHours > maxHours ? 'text-red-600' : 'text-slate-900'}>{assignedHours}</strong>
                                            / {isEditing
                                                ? <input
                                                    type="number"
                                                    className="w-16 px-1 py-0.5 border rounded text-center mx-1"
                                                    value={editForm.max_hours}
                                                    onChange={(e) => setEditForm({ ...editForm, max_hours: e.target.value })}
                                                />
                                                : maxHours} hours
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${workloadColor}`}
                                            style={{ width: `${workloadPercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                            >
                                                <X size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleSave(fac.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
                                            >
                                                <Save size={18} /> Save
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEditClick(fac)}
                                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                        >
                                            Edit Details
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Edit Section */}
                            {isEditing && (
                                <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Calendar size={16} className="text-emerald-500" />
                                        Weekly Availability
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Primary Department</label>
                                            <select
                                                value={editForm.department}
                                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            >
                                                <option value="">Select Department</option>
                                                <option value="AI&ML">AI&ML</option>
                                                <option value="CSE">CSE</option>
                                                <option value="CE">CE</option>
                                                <option value="Basic Sciences">Basic Sciences</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Expertise / Subjects (Comma separated)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Mathematics, Calculus, Algebra"
                                                value={editForm.expertise}
                                                onChange={(e) => setEditForm({ ...editForm, expertise: e.target.value })}
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">The system uses these keywords to auto-assign courses.</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="text-left w-24 p-2 text-slate-500">Day</th>
                                                    {TIME_SLOTS.map(slot => (
                                                        <th key={slot} className="p-2 text-center text-slate-500 font-medium">{slot}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {DAYS.map(day => (
                                                    <tr key={day} className="border-b border-slate-200/50 last:border-0">
                                                        <td className="font-medium text-slate-700 p-2">{day}</td>
                                                        {TIME_SLOTS.map(slot => {
                                                            const schedule = getScheduleForSlot(day, slot, fac.name);
                                                            const isAvailable = (editForm.availability[day] || []).includes(slot);
                                                            return (
                                                                <td key={slot} className="p-1 text-center">
                                                                    {schedule ? (
                                                                        <div className="w-full h-8 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center cursor-not-allowed relative group">
                                                                            <span className="text-[10px] font-bold text-indigo-700 truncate px-1" title={schedule.course_name}>
                                                                                Class
                                                                            </span>
                                                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1.5 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-lg border border-slate-700">
                                                                                <p className="font-bold text-emerald-400">{schedule.course_name}</p>
                                                                                <p className="text-slate-300 mt-0.5">{schedule.branch || schedule.department_id} S{schedule.semester} {schedule.section ? `Sec ${schedule.section}` : ''}</p>
                                                                                <p className="text-slate-300">Room: {schedule.room_name}</p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => toggleAvailability(day, slot)}
                                                                            className={`w-full h-8 rounded-md transition-all duration-200 ${isAvailable
                                                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                                                : 'bg-white border border-slate-200 hover:border-emerald-300'
                                                                                }`}
                                                                        >
                                                                            {isAvailable && <Check size={14} className="mx-auto" />}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center gap-4 mt-4">
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Available
                                        </p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded border border-slate-200 bg-white inline-block"></span> Unavailable
                                        </p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded border border-indigo-200 bg-indigo-50 inline-block"></span> Scheduled Class
                                        </p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1.5 ml-auto">
                                            <AlertCircle size={12} />
                                            Click empty slots to toggle availability.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Read-Only Availability Preview */}
                            {!isEditing && (
                                <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Weekly Availability</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {DAYS.map(day => {
                                            const slots = (fac.availability[day] || []);
                                            if (slots.length === 0) return null;

                                            // Helper to format 09:10 to 9:10 AM
                                            const formatTime = (t) => {
                                                const [h, m] = t.split(':');
                                                const hour = parseInt(h);
                                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                                const displayHour = hour > 12 ? hour - 12 : hour;
                                                return `${displayHour}:${m} ${ampm}`;
                                            };

                                            return (
                                                <div key={day} className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-slate-900">{day}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {slots.map(s => (
                                                            <span key={s} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] text-emerald-600 font-medium whitespace-nowrap">
                                                                {formatTime(s)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.values(fac.availability).flat().length === 0 && (
                                            <span className="text-slate-400 italic text-xs">No availability configured</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
