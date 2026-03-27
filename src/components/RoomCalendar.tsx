"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, MapPin, RefreshCw, ChevronLeft, ChevronRight, Info, AlertCircle, CheckCircle2, ShieldAlert, X } from "lucide-react";

export default function RoomCalendar() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [isDemo, setIsDemo] = useState(false);
    const [demoReason, setDemoReason] = useState<string | null>(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const roomsRes = await fetch('/api/rooms');
            const roomsData = await roomsRes.json();
            
            if (!roomsRes.ok && !roomsData.success) throw new Error(roomsData.details || roomsData.error);
            
            const fetchedRooms = roomsData.data || [];
            setRooms(fetchedRooms);
            if (fetchedRooms.length > 0 && !selectedRoom) {
                setSelectedRoom(fetchedRooms[0]);
            }
            setIsDemo(!!roomsData.isDemo);
            setDemoReason(roomsData.detailedError || null);

            if (fetchedRooms.length > 0) {
                setScheduleError(null);
                const emails = fetchedRooms.map((r: any) => r.emailAddress);
                
                // Calculate the full 42-day range shown in the grid
                const days = getDaysInMonth(viewDate);
                const startDate = days[0].date;
                const endDate = new Date(days[days.length - 1].date);
                endDate.setHours(23, 59, 59, 999);

                const scheduleRes = await fetch('/api/rooms/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        roomEmails: emails,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString()
                    })
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
    }, [viewDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        
        const days = [];
        const startDay = startOfMonth.getDay();
        
        const prevMonthEnd = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthEnd - i, currentMonth: false, date: new Date(year, month - 1, prevMonthEnd - i) });
        }
        
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
        }
        
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
        }
        
        return days;
    };

    const getBookingsForDay = (roomEmail: string, date: Date) => {
        const roomSchedule = schedules[roomEmail] || [];
        return roomSchedule.filter(item => {
            const itemStart = new Date(item.start.dateTime);
            return itemStart.toDateString() === date.toDateString();
        }).sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    };

    const calendarDays = getDaysInMonth(viewDate);

    if (error && rooms.length === 0) {
        return (
            <div className="bg-rose-500/5 border border-rose-500/10 p-20 rounded-[3rem] text-center">
                <AlertCircle className="mx-auto text-rose-500 mb-6" size={64} />
                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Sync Failure</h3>
                <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                <button onClick={fetchData} className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-xs">Retry Connection</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                    <div className="p-5 bg-blue-600 rounded-3xl border border-blue-400/30 shadow-2xl shadow-blue-600/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                        <Calendar size={36} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                            <div className="w-6 h-[2px] bg-blue-500" />
                            Unified Workspace
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            Meeting Room <span className="text-slate-500">Scheduler</span>
                        </h2>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10 w-full lg:w-auto">
                    <div className="flex items-center bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-inner">
                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white group/btn">
                            <ChevronLeft size={24} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="px-8 font-black text-sm text-white uppercase tracking-[0.2em] min-w-[200px] text-center">
                            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white group/btn">
                            <ChevronRight size={24} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    <button onClick={fetchData} className="flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50" disabled={loading}>
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? 'Updating...' : 'Sync Data'}
                    </button>
                </div>
            </div>

            {/* Warnings */}
            {(isDemo || scheduleError) && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[2rem] flex items-center gap-6 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
                        <ShieldAlert size={28} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1.5">
                            {scheduleError ? 'Calendar Connection Failure' : 'Limited Workspace Visibility'}
                        </p>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            {scheduleError ? `Access to individual room schedules was denied. Please ensure 'Calendars.Read.All' is granted.` : `Could not access live organizational metadata. Showing simulated workspace data.`}
                        </p>
                    </div>
                </div>
            )}

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                {/* Rooms Side Panel */}
                <div className="space-y-6">
                    <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl h-full flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest border-b border-slate-800 pb-4 mb-6">Select <span className="text-blue-500">Resource</span></h3>
                            <div className="space-y-3">
                                {rooms.map(room => (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedRoom(room)}
                                        className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group ${
                                            selectedRoom?.id === room.id 
                                            ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20 translate-x-1' 
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${selectedRoom?.id === room.id ? 'bg-white/20' : 'bg-slate-950 text-slate-500 group-hover:text-blue-500'}`}>
                                            <MapPin size={24} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-black text-sm uppercase tracking-tight truncate ${selectedRoom?.id === room.id ? 'text-white' : 'text-slate-300'}`}>{room.displayName}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${selectedRoom?.id === room.id ? 'text-blue-100' : 'text-slate-500'}`}>C: {room.capacity || 'N/A'} • FL {room.floorNumber || '1'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedRoom && (
                            <div className="mt-auto bg-slate-900/50 p-6 rounded-3xl border border-slate-800/50">
                                <div className="flex items-center gap-3 text-blue-500 font-bold text-[10px] uppercase tracking-widest mb-4">
                                    <Info size={14} /> Resource Intelligence
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 uppercase font-bold tracking-tighter">Status</span>
                                        <span className="text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12} /> Active</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 uppercase font-bold tracking-tighter">Utilization</span>
                                        <span className="text-white font-black">{schedules[selectedRoom.emailAddress]?.length || 0} Bookings</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-slate-950 rounded-[3rem] border border-slate-800 overflow-hidden shadow-3xl shadow-black/50 backdrop-blur-3xl flex flex-col min-h-[900px]">
                    <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-6 text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-r border-slate-800 last:border-r-0">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-slate-800/50">
                        {calendarDays.map((dayObj, idx) => {
                            const bookings = selectedRoom ? getBookingsForDay(selectedRoom.emailAddress, dayObj.date) : [];
                            const isToday = dayObj.date.toDateString() === new Date().toDateString();
                            
                            return (
                                <div key={idx} className={`min-h-[140px] p-4 group transition-all relative flex flex-col border-b border-r border-slate-800/50 hover:bg-white/[0.02] ${!dayObj.currentMonth ? 'opacity-30 bg-slate-900/10' : ''} ${isToday ? 'bg-blue-600/5 ring-1 ring-inset ring-blue-500/20' : ''}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-sm font-black tracking-tighter ${isToday ? 'text-blue-500' : dayObj.currentMonth ? 'text-slate-300' : 'text-slate-600'}`}>{dayObj.day.toString().padStart(2, '0')}</span>
                                        {bookings.length > 0 && dayObj.currentMonth && <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-800 px-2 py-0.5 rounded-full">{bookings.length} Ev</span>}
                                    </div>
                                    <div className="space-y-1.5 overflow-hidden flex-1 no-scrollbar pb-2">
                                        {bookings.map((booking, bIdx) => (
                                            <div key={bIdx} onClick={() => setSelectedEvent({ ...booking, room: selectedRoom })} className="group/item flex flex-col p-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 border border-blue-400/20 cursor-pointer shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.03] active:scale-95 translate-y-0 hover:-translate-y-0.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-none">{new Date(booking.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                                                    <Info size={10} className="text-white/40 group-hover/item:text-white transition-colors" />
                                                </div>
                                                <p className="text-[10px] font-bold text-blue-100 truncate mt-1.5 leading-none">{booking.subject || 'Internal'}</p>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                                                        <p className="text-[9px] font-black text-white/70 uppercase tracking-tighter truncate max-w-[80px]">{booking.organizer}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setSelectedEvent(null)} />
                    <div className="relative bg-[#0d1117] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="bg-blue-600 p-12 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8"><button onClick={() => setSelectedEvent(null)} className="p-4 bg-black/20 hover:bg-black/40 rounded-3xl text-white transition-all shadow-xl backdrop-blur-md active:scale-95"><X size={28} /></button></div>
                            <div className="flex items-center gap-3 text-blue-100 font-black text-[10px] uppercase tracking-[0.4em] mb-6"><div className="w-10 h-[2px] bg-blue-100" /> Intelligence Report</div>
                            <h3 className="text-5xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-10">{selectedEvent.subject}</h3>
                            <div className="flex flex-wrap gap-4">
                                <div className="px-6 py-3 bg-white/10 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/10"><Clock size={16} />{new Date(selectedEvent.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="px-6 py-3 bg-black/20 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/5"><MapPin size={16} />{selectedEvent.room?.displayName}</div>
                            </div>
                        </div>
                        <div className="p-12 space-y-12">
                            <div className="flex items-start gap-8 group">
                                <div className="w-20 h-20 rounded-[2rem] bg-slate-800 border border-slate-700 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"><Users size={36} className="text-blue-500" /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-3">Owner / Organizer</p>
                                    <p className="text-3xl font-black text-white tracking-tight">{selectedEvent.organizer}</p>
                                    <p className="text-sm text-blue-500 font-mono mt-1 opacity-70">{selectedEvent.organizerEmail}</p>
                                </div>
                            </div>
                            {(selectedEvent.description || selectedEvent.bodyPreview) && (
                                <div className="animate-in slide-in-from-left duration-700">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-6 flex items-center gap-3"><Info size={14} className="text-blue-500" /> Meeting Metadata</p>
                                    <div className="text-slate-300 text-base leading-relaxed bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 italic relative group"><div className="absolute -left-1 top-8 bottom-8 w-1 bg-blue-600 rounded-full" />"{selectedEvent.description || selectedEvent.bodyPreview}"</div>
                                </div>
                            )}
                            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                <div className="animate-in slide-in-from-bottom duration-700">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-6">Confirmed Resource Pool ({selectedEvent.attendees.length})</p>
                                    <div className="flex flex-wrap gap-2.5">{selectedEvent.attendees.map((a: any, idx: number) => (<div key={idx} className="px-4 py-2 bg-slate-800/50 text-slate-300 text-[11px] font-bold rounded-xl border border-slate-700/50 hover:bg-slate-700 transition-colors">{a.name}</div>))}</div>
                                </div>
                            )}
                        </div>
                        <div className="px-12 py-10 bg-slate-950/50 border-t border-slate-800 flex justify-end"><button onClick={() => setSelectedEvent(null)} className="px-12 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">Dismiss Report</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
