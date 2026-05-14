import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Clock, ChevronRight, Calendar, Sparkles, Beaker, X, MapPin, Layers, GraduationCap, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

// Loading Skeleton
function CardSkeleton() {
    return (
        <div className="animate-pulse bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="w-16 h-6 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
            <div className="pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
            </div>
        </div>
    );
}

export default function FacultyCourses({ searchQuery }) {
    const [courses, setCourses] = useState([]);
    const [facultyName, setFacultyName] = useState('');
    const [fullSchedule, setFullSchedule] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCourses = async () => {
        try {
            const data = await api.getFacultyDashboard();
            if (!data) throw new Error("No data received from server");
            
            setFacultyName(data.facultyName || '');
            setFullSchedule(data.fullSchedule || []);

            // Normalize course data
            const allCourses = (data.courses || []).map(c => {
                const facData = c.faculty || {};
                let theoryFaculty = [];
                let practicalFaculty = [];

                if (Array.isArray(facData)) {
                    theoryFaculty = facData;
                } else if (facData.theory || facData.practical) {
                    theoryFaculty = Array.isArray(facData.theory) ? facData.theory : (typeof facData.theory === 'string' ? [facData.theory] : []);
                    practicalFaculty = Array.isArray(facData.practical) ? facData.practical : [];
                } else {
                    Object.values(facData).forEach(branch => {
                        if (branch && typeof branch === 'object') {
                            if (Array.isArray(branch.theory)) {
                                theoryFaculty = [...new Set([...theoryFaculty, ...branch.theory])];
                            }
                            if (Array.isArray(branch.practical)) {
                                practicalFaculty = [...new Set([...practicalFaculty, ...branch.practical])];
                            }
                        }
                    });
                }

                return {
                    ...c,
                    theoryHours: c.theoryHours || c.credits || 0,
                    practicalHours: c.practicalHours || 0,
                    faculty: {
                        theory: theoryFaculty,
                        practical: practicalFaculty
                    }
                };
            });

            setCourses(allCourses);
            setError(null);
        } catch (err) {
            console.error('Failed to load courses:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        const interval = setInterval(fetchCourses, 30000);
        return () => clearInterval(interval);
    }, []);

    const myCourses = (courses || []).filter(c => {
        if (!c.faculty) return false;
        const isTheory = (c.faculty.theory || []).includes(facultyName);
        const isPractical = (c.faculty.practical || []).includes(facultyName);
        const isAssigned = isTheory || isPractical;

        if (!isAssigned) return false;

        // Apply Search Filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = (c.name || '').toLowerCase().includes(query);
            const matchesCode = (c.code || '').toLowerCase().includes(query);
            const matchesDept = (c.department || '').toLowerCase().includes(query);
            return matchesName || matchesCode || matchesDept;
        }

        return true;
    });

    const totalCredits = myCourses.reduce((sum, c) => sum + parseInt(c.credits || 0), 0);
    const totalHours = myCourses.reduce((sum, c) => {
        let hours = 0;
        if ((c.faculty?.theory || []).includes(facultyName)) hours += (c.theoryHours || 0);
        if ((c.faculty?.practical || []).includes(facultyName)) hours += (c.practicalHours || 0);
        return sum + hours;
    }, 0);

    // Helper to calculate the date for a session based on the day of the week
    const getSessionDate = (dayName) => {
        if (!dayName) return '--';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0-6 (Sun-Sat)
        const targetDayIndex = days.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
        
        if (targetDayIndex === -1) return '--';

        let diff = 0;
        const isWeekend = currentDayIndex === 0 || currentDayIndex === 6;

        if (isWeekend) {
            // On Weekends (Sat/Sun), show dates for the upcoming week
            diff = (targetDayIndex - currentDayIndex + 7) % 7;
            if (diff === 0) diff = 7; 
        } else {
            // On Weekdays, show dates for the current week
            diff = targetDayIndex - currentDayIndex;
        }

        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + diff);
        return sessionDate.getDate().toString().padStart(2, '0');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
                    <p className="text-slate-500">Courses assigned to you this semester.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
                    <Calendar size={16} />
                    Spring 2026
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-lg shadow-emerald-500/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg"><BookOpen size={18} /></div>
                        <div>
                            <p className="text-emerald-100 text-xs">Courses</p>
                            <p className="text-2xl font-bold">{myCourses.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg shadow-blue-500/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg"><Clock size={18} /></div>
                        <div>
                            <p className="text-blue-100 text-xs">Weekly Hours</p>
                            <p className="text-2xl font-bold">{totalHours}h</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg shadow-purple-500/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg"><Users size={18} /></div>
                        <div>
                            <p className="text-purple-100 text-xs">Total Credits</p>
                            <p className="text-2xl font-bold">{totalCredits}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
                ) : error ? (
                    <div className="col-span-2 p-8 text-center text-red-500">
                        Failed to load courses: {error}. Please try again.
                    </div>
                ) : (
                    myCourses.map((course, index) => {
                        const isTheory = (course.faculty?.theory || []).includes(facultyName);
                        const isPractical = (course.faculty?.practical || []).includes(facultyName);

                        return (
                            <div
                                key={course.id || index}
                                onClick={() => setSelectedCourse(course)}
                                className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group cursor-pointer animate-fade-in"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-100 to-blue-200/50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg block mb-1">{course.code}</span>
                                            {isTheory && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">THEORY</span>}
                                            {isPractical && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1">LAB</span>}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{course.name}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{course.department}</p>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1"><Clock size={14} />{(isTheory ? (course.theoryHours || 0) : 0) + (isPractical ? (course.practicalHours || 0) : 0)}h/week assigned</span>
                                            <span className="flex items-center gap-1"><Users size={14} />{course.credits} credits</span>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {!isLoading && !error && myCourses.length === 0 && (
                <div className="col-span-2 p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">No courses assigned yet.</p>
                </div>
            )}

            {/* Course Details Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedCourse(null)}>
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-400 p-8 flex items-end justify-between">
                            <div className="relative">
                                <h3 className="text-2xl font-black text-white leading-none mb-1">{selectedCourse.name}</h3>
                                <p className="text-blue-50 font-bold tracking-widest text-xs uppercase opacity-80">{selectedCourse.code} • {selectedCourse.department}</p>
                            </div>
                            <button onClick={() => setSelectedCourse(null)} className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credits</p>
                                    <div className="flex items-center gap-2 text-slate-900"><GraduationCap size={18} className="text-blue-500" /><span className="text-xl font-black">{selectedCourse.credits} pts</span></div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Theory</p>
                                    <div className="flex items-center gap-2 text-slate-900"><Clock size={18} className="text-emerald-500" /><span className="text-xl font-black">{selectedCourse.theoryHours}h</span></div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Lab</p>
                                    <div className="flex items-center gap-2 text-slate-900"><Beaker size={18} className="text-purple-500" /><span className="text-xl font-black">{selectedCourse.practicalHours}h</span></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2"><Calendar size={20} className="text-blue-500" />Your Scheduled Sessions</h4>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                    {(fullSchedule || []).filter(s => (s.course_name || s.subject) === selectedCourse.name).length > 0 ? (
                                        (fullSchedule || [])
                                            .filter(s => (s.course_name || s.subject) === selectedCourse.name)
                                            .sort((a, b) => {
                                                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                                                const dayDiff = days.indexOf(a.day || a.day_of_week) - days.indexOf(b.day || b.day_of_week);
                                                if (dayDiff !== 0) return dayDiff;
                                                return (a.time || a.start_time || '').localeCompare(b.time || b.start_time || '');
                                            })
                                            .map((session, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                                                            <span className="text-[10px] font-black text-blue-500 uppercase leading-none mb-0.5">{(session.day || session.day_of_week || 'MON').slice(0, 3)}</span>
                                                            <span className="text-sm font-black text-slate-900">{getSessionDate(session.day || session.day_of_week)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{session.day || session.day_of_week}</p>
                                                            <p className="text-xs font-bold text-slate-500">{session.time || session.start_time} - {parseInt((session.time || session.start_time || '00:00').split(':')[0]) + 1}:{(session.time || session.start_time || '00:00').split(':')[1]}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1.5 justify-end text-slate-400 mb-0.5"><MapPin size={12} /><span className="text-[10px] font-black uppercase tracking-widest">{session.room_name || session.room || 'TBD'}</span></div>
                                                        <div className="flex items-center gap-1.5 justify-end text-slate-400"><Layers size={12} /><span className="text-[10px] font-black uppercase tracking-widest">{session.department_id || ''} {session.semester || ''}-{session.section || ''}</span></div>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                            <Sparkles size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-slate-500 font-bold">No sessions scheduled for this course.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
