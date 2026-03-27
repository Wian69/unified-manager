"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight, Info, AlertCircle, CheckCircle2, ShieldAlert, X } from "lucide-react";

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

export default function RoomCalendar() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [isDemo, setIsDemo] = useState(false);
    const [demoReason, setDemoReason] = useState<string | null>(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Rooms
            const roomsRes = await fetch('/api/rooms');
            const roomsData = await roomsRes.json();
            
            if (!roomsRes.ok && !roomsData.success) throw new Error(roomsData.details || roomsData.error);
            
            setRooms(roomsData.data || []);
            setIsDemo(!!roomsData.isDemo);
            setDemoReason(roomsData.detailedError || null);

            // 2. Fetch Schedules
            if (roomsData.data && roomsData.data.length > 0) {
                setScheduleError(null);
                const emails = roomsData.data.map((r: any) => r.emailAddress);
                const scheduleRes = await fetch('/api/rooms/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomEmails: emails })
                });
                const scheduleData = await scheduleRes.json();
                
                if (!scheduleRes.ok || !scheduleData.success) {
                    setScheduleError(scheduleData.error || "Failed to sync calendar blocks");
                } else {
                    const scheduleMap: Record<string, any[]> = {};
                    (scheduleData.data || []).forEach((s: any) => {
                        scheduleMap[s.scheduleId] = s.scheduleItems || [];
                    });
                    setSchedules(scheduleMap);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getBookingForSlot = (roomEmail: string, hour: number) => {
        const roomSchedule = schedules[roomEmail] || [];
        return roomSchedule.find(item => {
            const start = new Date(item.start.dateTime);
            const end = new Date(item.end.dateTime);
            const slotStart = new Date(viewDate);
            slotStart.setHours(hour, 0, 0, 0);
            const slotEnd = new Date(viewDate);
            slotEnd.setHours(hour + 1, 0, 0, 0);
            
            return start < slotEnd && end > slotStart;
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-600/20 shadow-lg shadow-blue-600/5 transition-transform hover:scale-105">
                        <Calendar size={32} className="text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            Meeting Room <span className="text-blue-500">Calendar</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Resource Availability & Bookings</p>
                    </div>
                </div>

                <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                    <button className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-6 font-black text-xs text-white uppercase tracking-widest">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button 
                    onClick={fetchData}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    {loading ? 'Syncing...' : 'Sync Schedule'}
                </button>
            </div>

            {/* Permission or Schedule Warning */}
            {(isDemo || scheduleError) && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500">
                        <ShieldAlert size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                            {scheduleError ? 'Calendar Sync Restricted' : 'Room Discovery Alert'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {scheduleError 
                                ? `Access to room schedules was denied. Please ensure 'Calendars.Read.Shared' is granted.` 
                                : `Could not access organizational room metadata. Showing demo rooms.`
                            }
                        </p>
                        {(demoReason || scheduleError) && (
                            <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                                <p className="text-[9px] font-mono text-rose-400 leading-tight">
                                    Status: {scheduleError || demoReason}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {loading && rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <RefreshCw size={48} className="animate-spin text-blue-500 opacity-50" />
                    <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">Mapping Office Resources...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-500/5 border border-rose-500/10 p-20 rounded-[3rem] text-center">
                    <AlertCircle className="mx-auto text-rose-500 mb-6" size={64} />
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Sync Failure</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                </div>
            ) : (
                <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-3xl shadow-black/50 backdrop-blur-3xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[1200px]">
                            {/* Grid Header (Time) */}
                            <div className="grid grid-cols-[320px_repeat(11,1fr)] bg-slate-900 border-b border-slate-800">
                                <div className="p-8 border-r border-slate-800 bg-slate-950 flex flex-col justify-center">
                                    <span className="text-xs text-slate-500 font-black uppercase tracking-widest mb-1">Room Identity</span>
                                    <span className="text-slate-200 font-bold text-lg">Workspace Overview</span>
                                </div>
                                {HOURS.map(hour => (
                                    <div key={hour} className="py-6 border-r border-slate-800 last:border-r-0 flex flex-col items-center justify-center group hover:bg-slate-800/50 transition-colors">
                                        <span className="text-xs font-black text-slate-300 group-hover:text-blue-400 transition-colors">
                                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                        </span>
                                        <span className="text-[8px] text-slate-600 font-mono mt-1 uppercase tracking-tighter">00:00 - 59:59</span>
                                    </div>
                                ))}
                            </div>

                            {/* Grid Rows (Rooms) */}
                            <div className="divide-y divide-slate-800/50">
                                {rooms.map((room, rIdx) => (
                                    <div key={room.id} className="grid grid-cols-[320px_repeat(11,1fr)] group hover:bg-slate-900/20 transition-all">
                                        {/* Room Info */}
                                        <div className="p-8 border-r border-slate-800 pr-10 relative">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-blue-500/30 transition-all">
                                                    <MapPin size={22} className="text-slate-500 group-hover:text-blue-500 transition-all" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-lg text-slate-200 truncate group-hover:text-white transition-colors">{room.displayName}</h4>
                                                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest truncate mt-1">
                                                        Capacity: {room.capacity || 'N/A'} • Floor {room.floorNumber || '1'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Time Slots */}
                                        {HOURS.map(hour => {
                                            const booking = getBookingForSlot(room.emailAddress, hour);
                                            return (
                                                <div key={hour} className="relative group/slot border-r border-slate-800/10 h-32 last:border-r-0 hover:bg-white/5 transition-all">
                                                    {booking ? (
                                                        <div 
                                                            onClick={() => setSelectedEvent({ ...booking, room })}
                                                            className="absolute inset-x-1.5 inset-y-2.5 bg-blue-600 rounded-2xl p-4 shadow-lg shadow-blue-900/40 border border-blue-500 flex flex-col justify-between overflow-hidden cursor-pointer hover:z-30 hover:scale-[1.02] active:scale-95 transition-all"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight">
                                                                    {booking.subject || 'Meeting'}
                                                                </p>
                                                                <p className="text-[10px] text-blue-200 font-bold truncate mt-1.5 opacity-80">
                                                                    {booking.organizer}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-auto">
                                                                <Clock size={10} className="text-blue-200" />
                                                                <span className="text-[10px] text-blue-200 font-bold">
                                                                    {new Date(booking.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-all">
                                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                                                <CheckCircle2 size={10} /> Available
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Confirmed Booking</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <div className="w-2 h-2 rounded-full border border-slate-700" />
                                <span>Available Slot</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 italic">
                            <Info size={12} className="text-blue-500" />
                            Showing data for Equinox Global Real Estate
                        </div>
                    </div>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setSelectedEvent(null)}
                    />
                    <div className="relative bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-[2.5rem] shadow-3xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-blue-600 p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8">
                                <button 
                                    onClick={() => setSelectedEvent(null)}
                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all shadow-xl"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3 text-blue-100 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
                                <div className="w-8 h-[2px] bg-blue-100" />
                                Meeting Details
                            </div>
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                                {selectedEvent.subject}
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                <div className="px-4 py-2 bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} />
                                    {new Date(selectedEvent.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    -
                                    {new Date(selectedEvent.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="px-4 py-2 bg-black/20 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <MapPin size={14} />
                                    {selectedEvent.room.displayName}
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-10 space-y-10">
                            {/* Organizer */}
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl">
                                    <Users size={28} className="text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">Organizer</p>
                                    <p className="text-2xl font-black text-white">{selectedEvent.organizer}</p>
                                    <p className="text-sm text-slate-400 mt-1">{selectedEvent.organizerEmail}</p>
                                </div>
                            </div>

                            {/* Description / Body */}
                            {(selectedEvent.description || selectedEvent.bodyPreview) && (
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">Agenda / Preview</p>
                                    <div className="text-slate-300 text-sm leading-relaxed bg-slate-800/30 p-6 rounded-2xl border border-slate-800 italic">
                                        "{selectedEvent.description || selectedEvent.bodyPreview}"
                                    </div>
                                </div>
                            )}

                            {/* Attendees */}
                            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
                                        Attendees ({selectedEvent.attendees.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEvent.attendees.map((a: any, idx: number) => (
                                            <div key={idx} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700/50">
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-8 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                            <button 
                                onClick={() => setSelectedEvent(null)}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
