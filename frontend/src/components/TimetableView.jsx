import React from 'react';
import { Clock, MapPin, User, Coffee, Info } from 'lucide-react';

export default function TimetableView({ schedule, userRole }) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Custom Time Slots Configuration
    const scheduleLayout = [
        { type: 'slot', time: '09:10', label: '09:10 - 10:10' },
        { type: 'slot', time: '10:10', label: '10:10 - 11:10' },
        { type: 'break', label: 'Lunch Break', duration: '11:10 - 12:10' },
        { type: 'slot', time: '12:10', label: '12:10 - 13:10' },
        { type: 'slot', time: '13:10', label: '13:10 - 14:10' },
        { type: 'short-break', label: 'Short Break', duration: '10m' },
        { type: 'slot', time: '14:20', label: '14:20 - 15:20' },
        { type: 'slot', time: '15:20', label: '15:20 - 16:20' },
    ];

    const getEvents = (day, time) => {
        if (!schedule) return [];
        return schedule.filter(s => {
            const sDay = (s.day || s.day_of_week || "").toLowerCase();
            const sTime = (s.time || s.start_time || "").replace(/^0/, ""); // Normalize 09:10 to 9:10
            
            const targetDay = day.toLowerCase();
            const targetTime = time.replace(/^0/, ""); // Normalize 09:10 to 9:10
            
            return sDay === targetDay && sTime === targetTime;
        });
    };

    const getClassType = (event) => {
        if (event.type === 'Practical') {
            return "LAB";
        }
        // Fallback to room name check if type is missing
        if (event.room && (event.room.startsWith("AI-2") || event.room.toLowerCase().includes("lab"))) {
            return "LAB";
        }
        return "LEC";
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <div className="min-w-[900px]">
                {/* Header */}
                <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50">
                    <div className="p-4 font-bold text-slate-500 text-sm uppercase tracking-wide border-r border-slate-200 flex items-center justify-center">
                        <Clock size={16} className="mr-2" /> Time / Day
                    </div>
                    {days.map(day => (
                        <div key={day} className="p-4 font-bold text-slate-700 text-center border-r border-slate-200 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {scheduleLayout.map((row, index) => {
                    if (row.type === 'break' || row.type === 'short-break') {
                        return (
                            <div key={`break-${index}`} className="grid grid-cols-1 border-b border-slate-100 bg-orange-50/50">
                                <div className="p-2 flex items-center justify-center gap-2 text-orange-600 font-medium text-xs uppercase tracking-widest">
                                    <Coffee size={14} />
                                    <span>{row.label} ({row.duration})</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={row.time} className="grid grid-cols-6 border-b border-slate-100 last:border-b-0 min-h-[140px]">
                            {/* Time Column */}
                            <div className="p-4 text-sm font-medium text-slate-500 border-r border-slate-100 flex flex-col items-center justify-center bg-slate-50/30">
                                <span>{row.label.split(' - ')[0]}</span>
                                <span className="text-xs text-slate-400 mt-1">to</span>
                                <span>{row.label.split(' - ')[1]}</span>
                            </div>

                            {/* Days Columns */}
                            {days.map(day => {
                                const events = getEvents(day, row.time);
                                return (
                                    <div key={`${day}-${row.time}`} className="border-r border-slate-100 last:border-r-0 p-2 relative group overflow-y-auto max-h-[200px] scrollbar-thin scrollbar-thumb-slate-200">
                                        {events.length > 0 ? (
                                            <div className="flex flex-col gap-2 h-full">
                                                {events.map((event, idx) => {
                                                    const classType = getClassType(event);
                                                    return (
                                                        <div key={idx} className={`rounded-xl p-2.5 flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer border relative
                                                            ${classType === 'LAB'
                                                                ? 'bg-purple-50 border-purple-100 text-purple-900 shadow-purple-100'
                                                                : (event.subject || '').includes('Audit')
                                                                    ? 'bg-amber-50 border-amber-100 text-amber-900 shadow-amber-100'
                                                                    : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100'}`}>

                                                            {events.length > 1 && (
                                                                <div className="absolute top-0 right-0 p-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Concurrent class"></div>
                                                                </div>
                                                            )}

                                                            <div>
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                                        classType === 'LAB' ? 'bg-purple-200/50 text-purple-700' : 'bg-emerald-200/50 text-emerald-700'
                                                                    }`}>
                                                                        {classType}
                                                                    </span>
                                                                    {userRole === 'Admin' && event.class && (
                                                                        <span className="text-[9px] font-bold text-slate-500 bg-white/50 px-1 rounded border border-slate-100">
                                                                            {event.class}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="font-bold text-xs leading-tight mb-1.5 line-clamp-2">{event.subject}</p>

                                                                <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-1 text-[10px] opacity-90">
                                                                        <MapPin size={10} />
                                                                        <span className="font-medium">{event.room}</span>
                                                                    </div>

                                                                    {(userRole === 'Student' || event.faculty) && (
                                                                        <div className="flex items-center gap-1 text-[10px] opacity-90" title={event.faculty}>
                                                                            <User size={10} />
                                                                            <span className="truncate max-w-[100px]">{event.faculty || 'Faculty'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-full h-full border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-300 text-xs">
                                                    Free
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
