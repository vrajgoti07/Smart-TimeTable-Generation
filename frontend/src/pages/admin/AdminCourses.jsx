import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Plus, Edit2, Trash2, User, Clock, X, Check, Sparkles, Users, Beaker, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

// Loading Skeleton
function CardSkeleton() {
    return (
        <div className="animate-pulse bg-white p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="w-16 h-6 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
            <div className="pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
        </div>
    );
}

export default function AdminCourses({ searchQuery }) {
    const { confirm } = useDialog();
    const [courses, setCourses] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [departmentList, setDepartmentList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterSem, setFilterSem] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);

    // Updated formData to include separate hours
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        branch: '',
        semester: 1,
        credits: 3,
        theoryHours: 3,
        practicalHours: 0,
        type: 'BRANCH',
        required_room_type: 'Theory',
        branches: [],
        faculty: {} // Map: { branchName: { theory: [], practical: [] } }
    });

    const [activeAssignBranch, setActiveAssignBranch] = useState('');
    const [showAllFaculty, setShowAllFaculty] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [coursesData, facultyData, deptData] = await Promise.all([
                api.getAllCourses(),
                api.getAllFaculty(),
                api.getDepartments()
            ]);

            const normalizedCourses = coursesData.map(c => {
                let facultyMap = {};
                const primaryBr = c.branch || c.department || c.department_id || 'CSE';
                
                if (c.faculty && typeof c.faculty === 'object' && !Array.isArray(c.faculty)) {
                    // Check if it's the new format (branch keys) or old (theory/practical keys)
                    const keys = Object.keys(c.faculty);
                    const isOldFormat = keys.includes('theory') || keys.includes('practical');
                    const isNewFormat = !isOldFormat && keys.length > 0;
                    
                    if (isNewFormat) {
                        facultyMap = c.faculty;
                    } else {
                        facultyMap[primaryBr] = {
                            theory: Array.isArray(c.faculty.theory) ? c.faculty.theory : [],
                            practical: Array.isArray(c.faculty.practical) ? c.faculty.practical : []
                        };
                    }
                }

                // Ensure all involved branches have a valid entry
                const targetBranches = c.type === 'COMMON' ? (c.branches || []) : [primaryBr];
                targetBranches.forEach(b => {
                    if (!facultyMap[b]) facultyMap[b] = { theory: [], practical: [] };
                    else {
                        // Ensure theory/practical arrays exist
                        if (!Array.isArray(facultyMap[b].theory)) facultyMap[b].theory = [];
                        if (!Array.isArray(facultyMap[b].practical)) facultyMap[b].practical = [];
                    }
                });

                return {
                    ...c,
                    id: c.id || c._id?.toString() || String(Math.random()),
                    branch: primaryBr,
                    displayBranch: primaryBr,
                    branches: c.branches || [],
                    semester: c.semester || 1,
                    theoryHours: c.theoryHours || c.theory_credit || 0,
                    practicalHours: c.practicalHours || c.practical_credit || 0,
                    credits: c.credits || c.total_credit || 0,
                    faculty: facultyMap
                };
            });

            setCourses(normalizedCourses);
            setFacultyList(facultyData);
            setDepartmentList(deptData);
        } catch (err) {
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const saveCourses = (updated) => {
        setCourses(updated);
    };

    const branches = ['CSE', 'IT', 'CE', 'AI&ML'];
    const activeBranch = filterDept === 'All' ? branches[0] : filterDept;

    const filteredCourses = courses.filter(c => {
        const query = (searchQuery || searchTerm || '').toLowerCase();
        const matchSearch = (c.name || '').toLowerCase().includes(query) ||
            (c.code || '').toLowerCase().includes(query) ||
            (c.department || '').toLowerCase().includes(query);
        const matchBranch = c.branch === activeBranch || (c.type === 'COMMON' && Array.isArray(c.branches) && c.branches.includes(activeBranch));
        return matchSearch && matchBranch;
    });

    // Group courses by semester for the active branch
    const semesterGroups = {};
    filteredCourses.forEach(c => {
        if (!semesterGroups[c.semester]) semesterGroups[c.semester] = [];
        semesterGroups[c.semester].push(c);
    });
    // Sort semesters numerically
    const sortedSemesters = Object.keys(semesterGroups).sort((a, b) => a - b);

    const getDeptColor = (dept) => {
        const colors = {
            'CSE': { 
                gradient: 'from-blue-400 to-blue-600', 
                shadow: 'shadow-blue-500/30', 
                bg: 'bg-blue-50', 
                text: 'text-blue-600',
                border: 'border-blue-100',
                accent: 'bg-blue-400/20',
                hoverText: 'group-hover:text-blue-600',
                assigned: 'bg-blue-50/60 border-blue-100 hover:bg-blue-100/70',
                assignedText: 'text-blue-700',
                assignedIcon: 'bg-blue-500 shadow-blue-500/30'
            },
            'AI&ML': { 
                gradient: 'from-purple-400 to-purple-600', 
                shadow: 'shadow-purple-500/30', 
                bg: 'bg-purple-50', 
                text: 'text-purple-600',
                border: 'border-purple-100',
                accent: 'bg-purple-400/20',
                hoverText: 'group-hover:text-purple-600',
                assigned: 'bg-purple-50/60 border-purple-100 hover:bg-purple-100/70',
                assignedText: 'text-purple-700',
                assignedIcon: 'bg-purple-500 shadow-purple-500/30'
            },
            'CE': { 
                gradient: 'from-amber-400 to-amber-600', 
                shadow: 'shadow-amber-500/30', 
                bg: 'bg-amber-50', 
                text: 'text-amber-600',
                border: 'border-amber-100',
                accent: 'bg-amber-400/20',
                hoverText: 'group-hover:text-amber-600',
                assigned: 'bg-amber-50/60 border-amber-100 hover:bg-amber-100/70',
                assignedText: 'text-amber-700',
                assignedIcon: 'bg-amber-500 shadow-amber-500/30'
            },
            'IT': { 
                gradient: 'from-emerald-400 to-emerald-600', 
                shadow: 'shadow-emerald-500/30', 
                bg: 'bg-emerald-50', 
                text: 'text-emerald-700',
                border: 'border-emerald-100',
                accent: 'bg-emerald-400/20',
                hoverText: 'group-hover:text-emerald-700',
                assigned: 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/70',
                assignedText: 'text-emerald-700',
                assignedIcon: 'bg-emerald-500 shadow-emerald-500/30'
            },
        };
        return colors[dept] || { 
            gradient: 'from-slate-400 to-slate-600', 
            shadow: 'shadow-slate-500/30', 
            bg: 'bg-slate-50', 
            text: 'text-slate-600',
            border: 'border-slate-100',
            accent: 'bg-slate-400/10',
            assigned: 'bg-slate-50/60 border-slate-100 hover:bg-slate-50',
            assignedText: 'text-slate-700',
            assignedIcon: 'bg-slate-500 shadow-slate-500/30'
        };
    };

    // --- RE-IMPLEMENTED LOGIC START ---

    const handleSaveCourse = async () => {
        const coursePayload = {
            code: formData.code,
            name: formData.name,
            branch: formData.branch || activeBranch,
            branches: formData.branches,
            type: formData.type,
            semester: formData.semester,
            credits: formData.credits,
            theory_credit: formData.theoryHours,
            practical_credit: formData.practicalHours,
            total_credit: formData.credits,
            required_room_type: formData.required_room_type,
            faculty: formData.faculty
        };

        try {
            if (editingCourse) {
                await api.updateCourse(editingCourse.id, coursePayload);
            } else {
                await api.createCourse(coursePayload);
            }
            setShowModal(false);
            setEditingCourse(null);
            setFormData({ code: '', name: '', branch: activeBranch, branches: [], type: 'BRANCH', required_room_type: 'Theory', semester: 1, credits: 3, theoryHours: 3, practicalHours: 0, faculty: {} });
            await loadData();
        } catch (err) {
            setError(err.message || 'Failed to save course');
        }
    };

    const handleEditCourse = (course) => {
        setEditingCourse(course);
        setFormData({
            code: course.code,
            name: course.name,
            branch: course.branch,
            branches: course.branches || [],
            type: course.type || 'BRANCH',
            required_room_type: course.required_room_type || (course.practicalHours > 0 ? 'Lab' : 'Theory'),
            semester: course.semester || 1,
            credits: course.credits || course.total_credit || 0,
            theoryHours: course.theoryHours || course.theory_credit || 0,
            practicalHours: course.practicalHours || course.practical_credit || 0,
            faculty: course.faculty
        });
        setShowModal(true);
    };

    const handleDeleteCourse = async (id) => {
        const ok = await confirm('Are you sure you want to delete this course? This will remove it from all departmental records.', 'Confirm Deletion', 'warning');
        if (ok) {
            try {
                await api.deleteCourse(id);
                loadData();
            } catch (err) {
                setError(err.message || 'Failed to delete course');
            }
        }
    };

    const handleAutoAssign = async () => {
        setIsAutoAssigning(true);
        setError('');
        try {
            await api.autoAssignCourses();
            await loadData();
        } catch (err) {
            setError(err.message || 'Failed to auto-assign faculty');
        } finally {
            setIsAutoAssigning(false);
        }
    };

    const handleOpenAssign = (course) => {
        setSelectedCourse(course);
        const firstBranch = course.type === 'COMMON' ? (course.branches?.[0] || course.branch) : course.branch;
        setActiveAssignBranch(firstBranch);
        setShowAllFaculty(false); // Reset to departmental view
        setShowAssignModal(true);
    };

    const handleAssignFaculty = async (type, facultyName) => {
        if (!selectedCourse || !activeAssignBranch) return;
        
        const currentFacultyMap = { ...selectedCourse.faculty };
        if (!currentFacultyMap[activeAssignBranch]) {
            currentFacultyMap[activeAssignBranch] = { theory: [], practical: [] };
        }
        
        const branchAssignment = { ...currentFacultyMap[activeAssignBranch] };
        const list = branchAssignment[type] || [];

        let newList = list.includes(facultyName)
            ? list.filter(f => f !== facultyName)
            : [...list, facultyName];

        branchAssignment[type] = newList;
        currentFacultyMap[activeAssignBranch] = branchAssignment;

        const updatedCourse = { ...selectedCourse, faculty: currentFacultyMap };
        setSelectedCourse(updatedCourse);
        setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));

        try {
            const coursePayload = {
                code: selectedCourse.code,
                name: selectedCourse.name,
                branch: selectedCourse.branch,
                branches: selectedCourse.branches,
                type: selectedCourse.type,
                semester: selectedCourse.semester,
                credits: selectedCourse.credits,
                theory_credit: selectedCourse.theoryHours,
                practical_credit: selectedCourse.practicalHours,
                total_credit: selectedCourse.credits,
                required_room_type: selectedCourse.required_room_type,
                faculty: currentFacultyMap
            };
            await api.updateCourse(selectedCourse.id, coursePayload);
        } catch (err) {
            setError(err.message || 'Failed to assign faculty');
        }
    };

    const getAssignmentCount = (facultyData) => {
        if (!facultyData || typeof facultyData !== 'object') return 0;
        let count = 0;
        // Faculty is branch-keyed: { "CSE": { theory: [...], practical: [...] }, ... }
        for (const branchKey of Object.keys(facultyData)) {
            const assignment = facultyData[branchKey];
            if (assignment && typeof assignment === 'object') {
                count += (assignment.theory?.length || 0) + (assignment.practical?.length || 0);
            }
        }
        return count;
    };

    const stats = {
        total: courses.length,
        assigned: courses.filter(c => getAssignmentCount(c.faculty) > 0).length,
        unassigned: courses.filter(c => getAssignmentCount(c.faculty) === 0).length
    };

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Course Management</h2>
                    <p className="text-slate-500 font-medium">Configure courses with Theory/Practical hours and assign faculty.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoAssign}
                        disabled={isAutoAssigning}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg hover-lift
                            ${isAutoAssigning ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 shadow-blue-500/10'}`}
                    >
                        {isAutoAssigning ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isAutoAssigning ? 'Mapping...' : 'Auto-Assign'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingCourse(null);
                            setFormData({ code: '', name: '', branch: activeBranch, branches: [], type: 'BRANCH', required_room_type: 'Theory', semester: 1, credits: 3, theoryHours: 3, practicalHours: 0, faculty: {} });
                           setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 font-medium hover-lift"
                    >
                        <Plus size={18} />
                        Add Subject
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover-lift group">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Courses</p>
                            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover-lift group">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                            <Check size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Faculty Assigned</p>
                            <p className="text-3xl font-black text-emerald-600">{stats.assigned}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover-lift group">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl text-white shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">Needs Assignment</p>
                            <p className="text-3xl font-black text-amber-600">{stats.unassigned}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 border border-slate-200 rounded-full w-fit">
                {branches.map(b => (
                    <button
                        key={b}
                        onClick={() => setFilterDept(b)}
                        className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeBranch === b 
                            ? 'bg-white text-slate-900 shadow-lg ring-1 ring-slate-200/50 scale-100' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 hover:scale-105'}`}
                    >
                        {b}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder={`Search ${activeBranch} subjects...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
                />
            </div>

            {/* Grouped Course List */}
            <div className="space-y-10">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                ) : sortedSemesters.length > 0 ? (
                    sortedSemesters.map(sem => (
                        <div key={sem} className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-slate-800">Semester {sem}</h3>
                                <div className="h-px flex-1 bg-slate-100" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {semesterGroups[sem].length} Subjects
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {semesterGroups[sem].map((course, index) => {
                                    const colors = getDeptColor(course.branch);
                                    const branchAssignment = course.faculty[activeBranch] || { theory: [], practical: [] };
                                    const theoryAssigned = branchAssignment.theory?.length > 0;
                                    const labAssigned = (course.practicalHours === 0) || (branchAssignment.practical?.length > 0);
                                    const fullyAssigned = theoryAssigned && labAssigned;

                                    return (
                                        <div
                                            key={course.id}
                                            className="relative overflow-hidden bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all duration-300 group animate-fade-in"
                                        >
                                            {/* Top Glassmorphic Gradient Overlay (The Blob) */}
                                            <div className={`absolute top-0 right-0 w-40 h-40 ${colors.accent} blur-3xl rounded-full -mr-16 -mt-16 transition-all duration-700 group-hover:scale-150 group-hover:opacity-100 opacity-60`} />

                                            <div className="relative">
                                                {/* Header Row */}
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:scale-105 transition-transform duration-500`}>
                                                        <BookOpen size={24} />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-[11px] font-black ${colors.text} opacity-40 uppercase tracking-widest mb-0.5`}>
                                                            {course.code}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            Sem {course.semester}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Title Section */}
                                                <div className="mb-4">
                                                    <h3 className={`text-lg font-black text-slate-900 leading-tight mb-1 ${colors.hoverText} transition-colors truncate`} title={course.name}>
                                                        {course.name}
                                                    </h3>
                                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${colors.text} opacity-70`}>
                                                        {course.branch}
                                                    </p>
                                                </div>

                                                {/* Meta Info Tags (L, P, C) */}
                                                <div className="flex gap-2 mb-6">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50/80 border border-slate-100 rounded-lg">
                                                        <span className="text-[9px] font-bold text-slate-400">L:</span>
                                                        <span className="text-[10px] font-black text-slate-600">{course.theoryHours}h</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50/80 border border-slate-100 rounded-lg">
                                                        <span className="text-[9px] font-bold text-slate-400">P:</span>
                                                        <span className="text-[10px] font-black text-slate-600">{course.practicalHours}h</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50/80 border border-slate-100 rounded-lg">
                                                        <span className="text-[9px] font-bold text-slate-400">C:</span>
                                                        <span className="text-[10px] font-black text-slate-600">{course.credits}</span>
                                                    </div>
                                                </div>

                                                {/* Faculty Assignment Bar */}
                                                <div className="mb-6">
                                                    <button
                                                        onClick={() => handleOpenAssign(course)}
                                                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border ${fullyAssigned 
                                                            ? colors.assigned
                                                            : 'border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold transition-all ${fullyAssigned ? colors.assignedIcon : 'bg-slate-200 shadow-inner'}`}>
                                                            {fullyAssigned ? (branchAssignment.theory?.length || '1') : <User size={18} />}
                                                        </div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className={`text-[11px] font-black uppercase tracking-wider truncate ${fullyAssigned ? colors.assignedText : 'text-slate-400'}`}>
                                                                {fullyAssigned ? (branchAssignment.theory?.[0] || 'ASSIGNED') : 'Unassigned'}
                                                            </p>
                                                            <p className={`text-[9px] font-bold ${fullyAssigned ? colors.text : 'text-slate-400'} opacity-60 uppercase tracking-tighter`}>
                                                                {fullyAssigned ? 'Faculty Ready' : 'Needs Assignment'}
                                                            </p>
                                                        </div>
                                                        <div className={`p-1.5 rounded-lg ${fullyAssigned ? colors.text + ' group-hover:bg-white' : 'text-slate-300'} transition-all`}>
                                                            <Edit2 size={14} />
                                                        </div>
                                                    </button>
                                                </div>

                                                {/* Footer Actions */}
                                                <div className="flex justify-between items-center pt-5 border-t border-slate-100">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock size={12} className="opacity-50" />
                                                        Total: {course.theoryHours + course.practicalHours}h/week
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEditCourse(course); }} 
                                                            className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-xl transition-all border border-transparent hover:border-blue-100"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} 
                                                            className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-slate-200" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">No Curriculum Defined</h4>
                        <p className="text-slate-500 text-sm mb-6">Start by adding subjects for {activeBranch}.</p>
                        <button
                            onClick={() => { setEditingCourse(null); setFormData({ code: '', name: '', branch: activeBranch, branches: [], semester: 1, credits: 3, theoryHours: 3, practicalHours: 0, faculty: { theory: [], practical: [] } }); setShowModal(true); }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Create First Subject
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Course Modal */}
            {showModal && (
                <div className="modal-backdrop flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingCourse ? 'Edit Course' : 'Add New Course'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Subject Title</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="e.g. Advanced Machine Learning"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 ml-1">Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="CS401"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 ml-1">Semester</label>
                                    <select
                                        value={formData.semester}
                                        onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                        className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Subject Classification</label>
                                    <div className="flex gap-2">
                                        {['BRANCH', 'COMMON'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setFormData({ ...formData, type: t })}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${formData.type === t
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                                            >
                                                {t === 'BRANCH' ? 'Branch Specific' : 'Common Subject'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.type === 'COMMON' && (
                                    <div className="animate-fade-in">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Available Branches</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {branches.map(b => (
                                                <button
                                                    key={b}
                                                    onClick={() => {
                                                        const newBranches = formData.branches.includes(b)
                                                            ? formData.branches.filter(x => x !== b)
                                                            : [...formData.branches, b];
                                                        setFormData({ ...formData, branches: newBranches });
                                                    }}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${formData.branches.includes(b)
                                                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Required Room Type</label>
                                <div className="flex border border-slate-200 rounded-xl overflow-hidden mt-2 bg-white p-1 gap-1">
                                    {['Theory', 'Lab'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setFormData({ ...formData, required_room_type: r })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.required_room_type === r 
                                                ? 'bg-blue-500 text-white shadow-lg' 
                                                : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Load Configuration</h4>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{formData.credits} Credits</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Theory</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.theoryHours}
                                                onChange={e => setFormData({ ...formData, theoryHours: parseInt(e.target.value) || 0 })}
                                                className="w-full text-sm font-bold outline-none"
                                            />
                                            <span className="text-[10px] text-slate-400">HRS</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Lab</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.practicalHours}
                                                onChange={e => setFormData({ ...formData, practicalHours: parseInt(e.target.value) || 0 })}
                                                className="w-full text-sm font-bold outline-none"
                                            />
                                            <span className="text-[10px] text-slate-400">HRS</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Credits</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.credits}
                                            onChange={e => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                                            className="w-full text-sm font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCourse}
                                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30"
                            >
                                {editingCourse ? 'Update Core' : 'Publish Subject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Faculty Modal - Split Theory/Practical */}
            {showAssignModal && selectedCourse && (
                <div className="modal-backdrop flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAssignModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-slate-900">Assign Faculty</h3>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <p className="text-slate-500 mb-6">
                            Assign faculty for <span className="font-semibold text-slate-700">{selectedCourse.name}</span>
                        </p>

                        <div className="space-y-6">
                            {/* Branch Selector for Common Subjects */}
                            {selectedCourse.type === 'COMMON' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">Assign Faculty Per Branch</label>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {(selectedCourse.branches || []).map(br => (
                                            <button
                                                key={br}
                                                onClick={() => setActiveAssignBranch(br)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeAssignBranch === br
                                                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200'}`}
                                            >
                                                {br}
                                                <span className="ml-2 opacity-60 text-[10px]">
                                                    ({(selectedCourse.faculty[br]?.theory?.length || 0) + (selectedCourse.faculty[br]?.practical?.length || 0)})
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Theory Section */}
                            <div className={`transition-opacity duration-300 ${!activeAssignBranch ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex justify-between items-center mb-3 px-2">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg flex-1">
                                        <BookOpen size={16} className="text-blue-500" />
                                        Theory Faculty for {activeAssignBranch}
                                        <span className="ml-auto text-xs font-normal text-slate-400">({selectedCourse.theoryHours}h/week)</span>
                                    </h4>
                                    <button 
                                        onClick={() => setShowAllFaculty(!showAllFaculty)}
                                        className={`ml-3 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${showAllFaculty ? 'bg-blue-100 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                                    >
                                        {showAllFaculty ? 'Filtering Active' : 'Show All'}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {facultyList
                                        .filter(f => showAllFaculty || f.department === activeAssignBranch)
                                        .sort((a, b) => {
                                            // Sort by Expertise Match first
                                            const aExpert = (a.expertise || []).some(exp => selectedCourse.name.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(selectedCourse.name.toLowerCase()));
                                            const bExpert = (b.expertise || []).some(exp => selectedCourse.name.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(selectedCourse.name.toLowerCase()));
                                            if (aExpert && !bExpert) return -1;
                                            if (!aExpert && bExpert) return 1;
                                            return 0;
                                        })
                                        .map((faculty) => {
                                            const assignedNames = selectedCourse.faculty[activeAssignBranch]?.theory || [];
                                            const isAssigned = assignedNames.some(name => name.trim().toLowerCase() === faculty.name.trim().toLowerCase());
                                            return (
                                            <button
                                                key={`theory-${faculty.id}`}
                                                onClick={() => handleAssignFaculty('theory', faculty.name)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isAssigned
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-100 bg-white hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${isAssigned ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-200'
                                                    }`}>
                                                    {faculty.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className={`text-sm font-medium ${isAssigned ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>
                                                        {faculty.name}
                                                    </p>
                                                    {faculty.expertise && faculty.expertise.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {faculty.expertise.map((exp, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-blue-100/50 text-[9px] text-blue-600 font-bold rounded-md uppercase tracking-tighter">
                                                                    {exp}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {isAssigned && <Check size={14} className="text-blue-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Practical Section */}
                            <div className={`transition-opacity duration-300 ${!activeAssignBranch ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg mb-3">
                                    <Beaker size={16} className="text-purple-500" />
                                    Practical Faculty for {activeAssignBranch}
                                    <span className="ml-auto text-xs font-normal text-slate-400">({selectedCourse.practicalHours}h/week)</span>
                                </h4>
                                <div className="space-y-2">
                                    {facultyList
                                        .filter(f => showAllFaculty || f.department === activeAssignBranch)
                                        .sort((a, b) => {
                                            // Sort by Expertise Match first
                                            const aExpert = (a.expertise || []).some(exp => selectedCourse.name.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(selectedCourse.name.toLowerCase()));
                                            const bExpert = (b.expertise || []).some(exp => selectedCourse.name.toLowerCase().includes(exp.toLowerCase()) || exp.toLowerCase().includes(selectedCourse.name.toLowerCase()));
                                            if (aExpert && !bExpert) return -1;
                                            if (!aExpert && bExpert) return 1;
                                            return 0;
                                        })
                                        .map((faculty) => {
                                            const assignedNames = selectedCourse.faculty[activeAssignBranch]?.practical || [];
                                            const isAssigned = assignedNames.some(name => name.trim().toLowerCase() === faculty.name.trim().toLowerCase());
                                            return (
                                            <button
                                                key={`practical-${faculty.id}`}
                                                onClick={() => handleAssignFaculty('practical', faculty.name)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isAssigned
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-slate-100 bg-white hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${isAssigned ? 'bg-purple-500 shadow-lg shadow-purple-500/20' : 'bg-slate-200'
                                                    }`}>
                                                    {faculty.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className={`text-sm font-medium ${isAssigned ? 'text-purple-900 font-bold' : 'text-slate-700'}`}>
                                                        {faculty.name}
                                                    </p>
                                                    {faculty.expertise && faculty.expertise.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {faculty.expertise.map((exp, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-purple-100/50 text-[9px] text-purple-600 font-bold rounded-md uppercase tracking-tighter">
                                                                    {exp}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {isAssigned && <Check size={14} className="text-purple-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 hover-lift"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
