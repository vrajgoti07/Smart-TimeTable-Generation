import React, { useState, useEffect } from 'react';
import { BookOpen, User, Clock, Search, Filter, ChevronRight, Beaker, Hash, X } from 'lucide-react';
import { api } from '../../services/api';

function CourseCardSkeleton() {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="w-16 h-6 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
            <div className="space-y-2">
                <div className="h-10 bg-slate-50 rounded-lg" />
                <div className="h-10 bg-slate-50 rounded-lg" />
            </div>
        </div>
    );
}

export default function StudentCourses() {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // Force Semester 4 as per USER STRICT RULES
                const data = await api.getStudentDashboard(); // Dashboard data contains courses
                const loadedCourses = data.courses.map(c => ({
                    id: c.id,
                    name: c.name,
                    code: c.code,
                    credits: c.credits,
                    department: c.department,
                    theoryHours: c.credits || 0,
                    practicalHours: 0,
                    faculty: {
                        theory: c.faculty?.theory || [],
                        practical: c.faculty?.practical || []
                    }
                }));
                setCourses(loadedCourses);
            } catch (err) {
                console.error("Failed to fetch courses:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCourseColor = (index) => {
        const palette = [
            { 
                gradient: 'from-blue-400 to-blue-600', 
                hoverGradient: 'hover:from-blue-500 hover:to-blue-700',
                shadow: 'shadow-blue-500/30', 
                hoverShadow: 'hover:shadow-blue-500/50',
                bg: 'bg-blue-50', 
                text: 'text-blue-600', 
                hoverText: 'group-hover:text-blue-700',
                border: 'border-blue-100' 
            },
            { 
                gradient: 'from-emerald-400 to-emerald-600', 
                hoverGradient: 'hover:from-emerald-500 hover:to-emerald-700',
                shadow: 'shadow-emerald-500/30', 
                hoverShadow: 'hover:shadow-emerald-500/50',
                bg: 'bg-emerald-50', 
                text: 'text-emerald-600', 
                hoverText: 'group-hover:text-emerald-700',
                border: 'border-emerald-100' 
            },
            { 
                gradient: 'from-orange-400 to-orange-600', 
                hoverGradient: 'hover:from-orange-500 hover:to-orange-700',
                shadow: 'shadow-orange-500/30', 
                hoverShadow: 'hover:shadow-orange-500/50',
                bg: 'bg-orange-50', 
                text: 'text-orange-600', 
                hoverText: 'group-hover:text-orange-700',
                border: 'border-orange-100' 
            },
            { 
                gradient: 'from-rose-400 to-rose-600', 
                hoverGradient: 'hover:from-rose-500 hover:to-rose-700',
                shadow: 'shadow-rose-500/30', 
                hoverShadow: 'hover:shadow-rose-500/50',
                bg: 'bg-rose-50', 
                text: 'text-rose-600', 
                hoverText: 'group-hover:text-rose-700',
                border: 'border-rose-100' 
            },
            { 
                gradient: 'from-violet-400 to-violet-600', 
                hoverGradient: 'hover:from-violet-500 hover:to-violet-700',
                shadow: 'shadow-violet-500/30', 
                hoverShadow: 'hover:shadow-violet-500/50',
                bg: 'bg-violet-50', 
                text: 'text-violet-600', 
                hoverText: 'group-hover:text-violet-700',
                border: 'border-violet-100' 
            },
            { 
                gradient: 'from-cyan-400 to-cyan-600', 
                hoverGradient: 'hover:from-cyan-500 hover:to-cyan-700',
                shadow: 'shadow-cyan-500/30', 
                hoverShadow: 'hover:shadow-cyan-500/50',
                bg: 'bg-cyan-50', 
                text: 'text-cyan-600', 
                hoverText: 'group-hover:text-cyan-700',
                border: 'border-cyan-100' 
            },
            { 
                gradient: 'from-amber-400 to-amber-600', 
                hoverGradient: 'hover:from-amber-500 hover:to-amber-700',
                shadow: 'shadow-amber-500/30', 
                hoverShadow: 'hover:shadow-amber-500/50',
                bg: 'bg-amber-50', 
                text: 'text-amber-600', 
                hoverText: 'group-hover:text-amber-700',
                border: 'border-amber-100' 
            },
            { 
                gradient: 'from-pink-400 to-pink-600', 
                hoverGradient: 'hover:from-pink-500 hover:to-pink-700',
                shadow: 'shadow-pink-500/30', 
                hoverShadow: 'hover:shadow-pink-500/50',
                bg: 'bg-pink-50', 
                text: 'text-pink-600', 
                hoverText: 'group-hover:text-pink-700',
                border: 'border-pink-100' 
            },
        ];
        return palette[index % palette.length];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
                    <p className="text-slate-500">View enrolled courses and faculty details.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full sm:w-64 transition-all"
                    />
                </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    [...Array(6)].map((_, i) => <CourseCardSkeleton key={i} />)
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map((course, index) => {
                        const colors = getCourseColor(index);

                        return (
                            <div
                                key={course.id}
                                className={`group relative overflow-hidden bg-white p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-2 animate-fade-in
                                    border-slate-200 hover:border-transparent ${colors.hoverShadow} shadow-sm hover:shadow-2xl`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Background Accent Layer */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} opacity-5 rounded-bl-full group-hover:scale-150 transition-transform duration-700 ease-out`} />

                                <div className="relative">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                            <BookOpen size={20} />
                                        </div>
                                        <div className={`px-3 py-1 text-xs font-bold rounded-lg ${colors.bg} ${colors.text} border ${colors.border} group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                            {course.code}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4">
                                        <h3 className={`text-xl font-bold mb-1 transition-all duration-300 group-hover:translate-x-1 ${colors.hoverText} text-slate-900`}>
                                            {course.name}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 capitalize">
                                            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${colors.gradient}`} />
                                            {course.department}
                                        </p>
                                    </div>

                                    {/* Credits Badge */}
                                    <div className="flex gap-2 mb-6">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                                            <BookOpen size={12} className="text-slate-400" />
                                            <span>{course.credits} Credits</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 group-hover:bg-white group-hover:border-slate-200 transition-colors">
                                            <Clock size={12} className="text-slate-400" />
                                            <span>{course.theoryHours + course.practicalHours}h Total</span>
                                        </div>
                                    </div>

                                    {/* Faculty Sections */}
                                    <div className="space-y-3">
                                        <div className={`p-3.5 rounded-xl border ${colors.border} ${colors.bg} group-hover:bg-white group-hover:shadow-sm transition-all duration-300`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1 rounded-md bg-white ${colors.text}`}>
                                                    <User size={12} />
                                                </div>
                                                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${colors.text}`}>Theory Faculty</span>
                                            </div>
                                            {course.faculty.theory.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {course.faculty.theory.map((name, i) => (
                                                        <span key={i} className="text-sm font-bold text-slate-800">
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic font-medium">Auto-assigning in progress...</span>
                                            )}
                                        </div>

                                        {course.practicalHours > 0 && (
                                            <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50 group-hover:bg-white group-hover:shadow-sm transition-all duration-300">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 rounded-md bg-white text-purple-600">
                                                        <Beaker size={12} />
                                                    </div>
                                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">Practical Faculty</span>
                                                </div>
                                                {course.faculty.practical.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {course.faculty.practical.map((name, i) => (
                                                            <span key={i} className="text-sm font-bold text-slate-800">
                                                                {name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic font-medium">Pending assignment</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setSelectedCourse(course); setSelectedColor(colors); }}
                                        className={`w-full mt-5 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300
                                            ${colors.bg} ${colors.text} border ${colors.border} 
                                            hover:bg-gradient-to-r ${colors.hoverGradient} hover:text-white hover:border-transparent ${colors.hoverShadow}`}
                                    >
                                        View Details <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        No courses found matching your search.
                    </div>
                )}
            </div>

            {/* Course Detail Modal */}
            {selectedCourse && selectedColor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCourse(null)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`relative p-6 bg-gradient-to-br ${selectedColor.gradient} text-white`}>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
                            <button
                                onClick={() => setSelectedCourse(null)}
                                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <BookOpen size={22} />
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-white/20 text-sm font-bold rounded-lg">{selectedCourse.code}</span>
                                </div>
                                <h3 className="text-xl font-bold">{selectedCourse.name}</h3>
                                <p className="text-white/70 text-sm mt-1">{selectedCourse.department}</p>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[11px] text-slate-400 uppercase font-medium">Credits</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{selectedCourse.credits}</p>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[11px] text-slate-400 uppercase font-medium">Theory</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{selectedCourse.theoryHours}h</p>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[11px] text-slate-400 uppercase font-medium">Practical</p>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{selectedCourse.practicalHours}h</p>
                                </div>
                            </div>

                            {/* Faculty Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Faculty</h4>
                                <div className="space-y-2">
                                    <div className={`p-3 rounded-xl border ${selectedColor.border} ${selectedColor.bg}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User size={14} className={selectedColor.text} />
                                            <span className={`text-xs font-bold uppercase ${selectedColor.text}`}>Theory</span>
                                        </div>
                                        {selectedCourse.faculty.theory.length > 0 ? (
                                            <p className="text-sm text-slate-700 pl-5">{selectedCourse.faculty.theory.join(', ')}</p>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic pl-5">No faculty assigned</p>
                                        )}
                                    </div>
                                    {selectedCourse.practicalHours > 0 && (
                                        <div className="p-3 rounded-xl border border-purple-100 bg-purple-50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Beaker size={14} className="text-purple-600" />
                                                <span className="text-xs font-bold uppercase text-purple-600">Practical</span>
                                            </div>
                                            {selectedCourse.faculty.practical.length > 0 ? (
                                                <p className="text-sm text-slate-700 pl-5">{selectedCourse.faculty.practical.join(', ')}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic pl-5">No faculty assigned</p>
                                            )}
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
