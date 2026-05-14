import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Plus, Edit2, Trash2, Users, Clock, X, Check, Sparkles, Monitor, Book, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../context/DialogContext';

// Constants
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['09:10', '10:10', '12:10', '13:10', '14:20', '15:20'];

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
        </div>
    );
}

export default function AdminRooms({ searchQuery }) {
    const { confirm } = useDialog();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);

    const initialAvailability = DAYS.reduce((acc, day) => ({ ...acc, [day]: [...TIME_SLOTS] }), {});

    const [formData, setFormData] = useState({
        name: '',
        type: 'Theory',
        capacity: 40,
        availability: initialAvailability
    });

    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const roomsData = await api.getAllRooms();
            // Map backend field names to frontend
            const normalizedRooms = roomsData.map(r => ({
                ...r,
                type: r.type || r.room_type || 'Theory',
                availability: r.availability || initialAvailability
            }));
            setRooms(normalizedRooms);
        } catch (err) {
            setError(err.message || 'Failed to load rooms');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRooms = rooms.filter(r => {
        const query = (searchQuery || searchTerm || '').toLowerCase();
        const matchSearch = (r.name || '').toLowerCase().includes(query) ||
            (r.type || '').toLowerCase().includes(query);
        const matchType = filterType === 'All' || r.type === filterType;
        return matchSearch && matchType;
    });

    const getRoomIcon = (type) => {
        if (type === 'Lab') return Monitor;
        return Book;
    };

    const getRoomColor = (type) => {
        if (type === 'Lab') {
            return { gradient: 'from-purple-400 to-purple-600', shadow: 'shadow-purple-500/30', bg: 'bg-purple-50', text: 'text-purple-600' };
        }
        return { gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/30', bg: 'bg-amber-50', text: 'text-amber-600' };
    };

    const handleSaveRoom = async () => {
        if (!formData.name) return;

        // Map frontend field names to backend model
        const roomPayload = {
            name: formData.name,
            room_type: formData.type,
            capacity: formData.capacity,
            availability: formData.availability
        };

        try {
            if (editingRoom) {
                await api.updateRoom(editingRoom.id, roomPayload);
            } else {
                await api.createRoom(roomPayload);
            }
            setShowModal(false);
            setEditingRoom(null);
            setFormData({ name: '', type: 'Theory', capacity: 40, availability: initialAvailability });
            await loadData();
        } catch (err) {
            setError(err.message || 'Failed to save room');
        }
    };

    const handleEditRoom = (room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            type: room.type || room.room_type || 'Theory',
            capacity: room.capacity,
            availability: room.availability || initialAvailability
        });
        setShowModal(true);
    };

    const handleDeleteRoom = async (id) => {
        const ok = await confirm('Deleting this room will remove it from all existing schedules. This cannot be undone.', 'Delete Room?', 'warning');
        if (ok) {
            try {
                await api.deleteRoom(id);
                await loadData();
            } catch (err) {
                setError(err.message || 'Failed to delete room');
            }
        }
    };

    const toggleSlot = (day, slot) => {
        setFormData(prev => {
            const daySlots = prev.availability[day] || [];
            const newSlots = daySlots.includes(slot)
                ? daySlots.filter(s => s !== slot)
                : [...daySlots, slot].sort();

            return {
                ...prev,
                availability: {
                    ...prev.availability,
                    [day]: newSlots
                }
            };
        });
    };

    const toggleDay = (day) => {
        setFormData(prev => {
            const allSelected = (prev.availability[day] || []).length === TIME_SLOTS.length;
            return {
                ...prev,
                availability: {
                    ...prev.availability,
                    [day]: allSelected ? [] : [...TIME_SLOTS]
                }
            };
        });
    };

    const stats = {
        total: rooms.length,
        labs: rooms.filter(r => r.type === 'Lab').length,
        classrooms: rooms.filter(r => r.type === 'Theory').length
    };

    if (error && !isLoading && rooms.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Room Management</h2>
                    <p className="text-slate-500">Manage classrooms, labs, and their availability slots.</p>
                </div>
                <button
                    onClick={() => { setEditingRoom(null); setFormData({ name: '', type: 'Theory', capacity: 40, availability: initialAvailability }); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 font-medium hover-lift"
                >
                    <Plus size={18} />
                    Add Room
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Total Rooms</p>
                            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-white shadow-lg shadow-amber-500/30">
                            <Book size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Theory Rooms</p>
                            <p className="text-xl font-bold text-amber-600">{stats.classrooms}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover-lift">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg text-white shadow-lg shadow-purple-500/30">
                            <Monitor size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Labs</p>
                            <p className="text-xl font-bold text-purple-600">{stats.labs}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer transition-all"
                    >
                        <option value="All">All Types</option>
                        <option value="Theory">Theory Room</option>
                        <option value="Lab">Lab</option>
                    </select>
                </div>
            </div>

            {/* Room Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    [...Array(6)].map((_, i) => <CardSkeleton key={i} />)
                ) : filteredRooms.length > 0 ? (
                    filteredRooms.map((room, index) => {
                        const colors = getRoomColor(room.type);
                        const Icon = getRoomIcon(room.type);

                        // Calculate quick stats
                        const totalSlots = DAYS.length * TIME_SLOTS.length;
                        const availableSlots = DAYS.reduce((acc, day) => acc + (room.availability[day]?.length || 0), 0);
                        const availabilityPct = Math.round((availableSlots / totalSlots) * 100);

                        return (
                            <div
                                key={room.id}
                                className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group hover-lift animate-fade-in"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${colors.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity`} />

                                <div className="relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.gradient} text-white shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 ${colors.bg} ${colors.text} rounded-lg`}>
                                            {room.type}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-lg mb-1">{room.name}</h3>

                                    <div className="space-y-3 mb-4 mt-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Users size={16} className="text-slate-400" />
                                            <span>Capacity: {room.capacity} students</span>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Weekly Availability</span>
                                                <span className="font-bold text-slate-700">{availabilityPct}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`}
                                                    style={{ width: `${availabilityPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditRoom(room)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteRoom(room.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500">No rooms found.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Room Modal */}
            {showModal && (
                <div className="modal-backdrop flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingRoom ? 'Edit Room' : 'Add New Room'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Room Name/Number</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                        placeholder="e.g. CS-101"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Room Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    >
                                        <option value="Theory">Theory</option>
                                        <option value="Lab">Lab</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Capacity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                        className="mt-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            {/* Availability Grid */}
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <Clock size={16} className="text-emerald-500" />
                                    Availability Slots
                                </h4>
                                <div className="space-y-4">
                                    {DAYS.map(day => (
                                        <div key={day} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-medium text-slate-700">{day}</span>
                                                <button
                                                    onClick={() => toggleDay(day)}
                                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {TIME_SLOTS.map(slot => {
                                                    const isSelected = formData.availability[day]?.includes(slot);
                                                    return (
                                                        <button
                                                            key={slot}
                                                            onClick={() => toggleSlot(day, slot)}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isSelected
                                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                                : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-300'
                                                                }`}
                                                        >
                                                            {slot}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRoom}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30"
                            >
                                {editingRoom ? 'Save Changes' : 'Add Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
