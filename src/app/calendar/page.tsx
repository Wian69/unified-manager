"use client";

import { useState, useEffect } from "react";
import { Search, CalendarDays, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Clock, MapPin, Video, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function CalendarManagementPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [targetEmail, setTargetEmail] = useState("");
    const [role, setRole] = useState("read");
    
    const [isSharing, setIsSharing] = useState(false);
    const [shareComplete, setShareComplete] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [fetchingEvents, setFetchingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date, events: any[] } | null>(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length > 2) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // When the month changes and a user is selected, refetch events
    useEffect(() => {
        if (selectedUser) {
            fetchEvents(selectedUser.id, currentMonth);
        }
    }, [currentMonth, selectedUser]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            const sorted = (data.users || []).sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));
            setSearchResults(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const fetchEvents = async (userId: string, targetMonth: Date) => {
        setFetchingEvents(true);
        setEventsError(null);
        try {
            // Calculate start and end of the month view (including padding days)
            const year = targetMonth.getFullYear();
            const month = targetMonth.getMonth();
            
            // Go back to the previous Sunday for the first cell
            const firstDayOfMonth = new Date(year, month, 1);
            const startDate = new Date(year, month, 1 - firstDayOfMonth.getDay());
            
            // Go forward to the next Saturday for the last cell
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const endDate = new Date(year, month + 1, 6 - lastDayOfMonth.getDay(), 23, 59, 59);

            const res = await fetch(`/api/users/calendar/events?userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch events.");
            setEvents(data.events || []);
        } catch (err: any) {
            setEventsError(err.message);
        } finally {
            setFetchingEvents(false);
        }
    };

    const handleSelectUser = (user: any) => {
        setSelectedUser(user);
        setSearchResults([]);
        setSearchQuery("");
        setCurrentMonth(new Date()); // Reset to current month
    };

    const handleShareCalendar = async () => {
        if (!selectedUser || !targetEmail || !targetEmail.includes('@')) {
            setShareError("Please provide a valid target email address.");
            return;
        }

        setIsSharing(true);
        setShareError(null);
        setShareComplete(false);

        try {
            const res = await fetch("/api/users/calendar/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    sourceUserId: selectedUser.id, 
                    targetEmail: targetEmail,
                    role: role 
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to share calendar.");
            }

            setShareComplete(true);
        } catch (err: any) {
            setShareError(err.message);
        } finally {
            setIsSharing(false);
        }
    };

    const formatEventTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatEventDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Calendar Generation Logic
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const days = [];
        
        // Previous month padding
        for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
            const date = new Date(year, month, 0 - (firstDayOfMonth.getDay() - 1 - i));
            days.push({ date, isCurrentMonth: false });
        }
        
        // Current month days
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        
        // Next month padding
        const remainingCells = 42 - days.length; // 6 rows of 7 days
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        
        return days;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    // Check if an event happens on a specific day
    const getEventsForDay = (date: Date) => {
        return events.filter(e => {
            const eventStart = new Date(e.start.dateTime);
            const eventEnd = new Date(e.end.dateTime);
            
            // Normalize dates to midnight for comparison
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const sDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
            const eDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate()).getTime();
            
            return checkDate >= sDate && checkDate <= eDate;
        });
    };

    const today = new Date();
    const isToday = (date: Date) => {
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 mt-10 px-4 xl:px-0">
            <div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-blue-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                        <CalendarDays size={32} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Calendar Management</h1>
                        <p className="text-slate-400 mt-1 font-mono text-sm">View their monthly schedule and instantly delegate access.</p>
                    </div>
                </div>

                {!selectedUser ? (
                    <div className="space-y-4 max-w-4xl">
                        <label className="text-sm font-bold uppercase tracking-widest text-slate-500">Step 1: Search for the Calendar Owner</label>
                        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-xl focus-within:border-blue-500/50 transition-colors">
                            <Search className="ml-4 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search calendar owner by name or email..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-4 text-lg font-medium placeholder:text-slate-600 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                                </div>
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-xl">
                                {searchResults.map(u => (
                                    <div 
                                        key={u.id} 
                                        className="flex items-center justify-between p-4 hover:bg-slate-900 cursor-pointer transition-colors"
                                        onClick={() => handleSelectUser(u)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold">
                                                {u.displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200">{u.displayName}</div>
                                                <div className="text-xs text-slate-500 font-mono">{u.userPrincipalName}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-blue-500 px-3 py-1 bg-blue-500/10 rounded-lg">
                                            Manage Calendar
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* LEFT COLUMN - DELEGATION TOOL (Span 4) */}
                        <div className="lg:col-span-4 bg-slate-950/50 rounded-2xl border border-slate-800 p-8 space-y-8 h-fit">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-black text-xl border-2 border-slate-900 shadow-xl">
                                        {selectedUser.displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white leading-tight">{selectedUser.displayName}</h2>
                                        <p className="text-slate-400 font-mono text-xs truncate max-w-[150px]">{selectedUser.userPrincipalName}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setShareComplete(false);
                                        setShareError(null);
                                        setTargetEmail("");
                                        setEvents([]);
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors mt-2"
                                >
                                    Change
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-800/60 space-y-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500">Delegate Access</h3>
                                
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Target Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="Who gets access?" 
                                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                                        value={targetEmail}
                                        onChange={(e) => setTargetEmail(e.target.value)}
                                        disabled={shareComplete || isSharing}
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Permission Level</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors appearance-none"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        disabled={shareComplete || isSharing}
                                    >
                                        <option value="read">Read Only</option>
                                        <option value="write">Editor</option>
                                        <option value="delegateWithoutPrivateEventAccess">Delegate (No Private Events)</option>
                                        <option value="delegateWithPrivateEventAccess">Delegate (With Private Events)</option>
                                    </select>
                                </div>
                            </div>

                            {shareError && (
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-rose-500 font-bold text-sm">Failed</h3>
                                        <p className="text-rose-400/80 text-xs mt-1">{shareError}</p>
                                    </div>
                                </div>
                            )}

                            {shareComplete ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-emerald-500 font-bold text-sm">Access Granted!</h3>
                                        <p className="text-emerald-400/80 text-[11px] mt-1 mb-3">
                                            {targetEmail} now has {role} access.
                                        </p>
                                        <button 
                                            onClick={() => {
                                                setShareComplete(false);
                                                setTargetEmail("");
                                            }}
                                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                                        >
                                            Share Again
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleShareCalendar}
                                    disabled={isSharing || !targetEmail}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {isSharing ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={18} />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            Grant Access
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* RIGHT COLUMN - MONTHLY CALENDAR GRID (Span 8) */}
                        <div className="lg:col-span-8 bg-slate-950/50 rounded-2xl border border-slate-800 p-8 relative">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-white">
                                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={prevMonth}
                                        className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setCurrentMonth(new Date());
                                        }}
                                        className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button 
                                        onClick={nextMonth}
                                        className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Days Header */}
                            <div className="grid grid-cols-7 gap-px mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {generateCalendarDays().map((dayObj, i) => {
                                    const dayEvents = getEventsForDay(dayObj.date);
                                    const isCurrentDay = isToday(dayObj.date);
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                if (dayEvents.length > 0) {
                                                    setSelectedDayEvents({ date: dayObj.date, events: dayEvents });
                                                }
                                            }}
                                            className={`
                                                min-h-[100px] p-2 rounded-xl border transition-all relative
                                                ${dayObj.isCurrentMonth ? 'bg-slate-900/50 border-slate-800/80 hover:border-blue-500/50' : 'bg-slate-950/30 border-slate-900/50 text-slate-700'}
                                                ${isCurrentDay ? 'ring-2 ring-blue-500 border-transparent' : ''}
                                                ${dayEvents.length > 0 ? 'cursor-pointer hover:bg-slate-800' : ''}
                                            `}
                                        >
                                            <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isCurrentDay ? 'bg-blue-500 text-white' : dayObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {dayObj.date.getDate()}
                                            </div>
                                            
                                            <div className="space-y-1">
                                                {dayEvents.slice(0, 3).map((e, idx) => (
                                                    <div key={idx} className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded truncate font-medium">
                                                        {formatEventTime(e.start.dateTime)} {e.subject}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-slate-500 font-bold px-1">
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Loading Overlay */}
                            {fetchingEvents && (
                                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                                    <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-2xl">
                                        <RefreshCw className="animate-spin text-blue-500" size={20} />
                                        <span className="text-white font-bold text-sm tracking-wide">Syncing Calendar...</span>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {eventsError && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-2xl z-10">
                                    <AlertTriangle size={20} />
                                    Failed to load events. Ensure mailbox is active.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Event Details Modal */}
            {selectedDayEvents && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedDayEvents(null)}>
                    <div 
                        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white">Events for {selectedDayEvents.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                                <p className="text-blue-400 font-mono text-sm mt-1">{selectedDayEvents.events.length} Meetings</p>
                            </div>
                            <button onClick={() => setSelectedDayEvents(null)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            {selectedDayEvents.events.map((event, i) => {
                                const isTeams = event.isOnlineMeeting || (event.location?.displayName && event.location.displayName.includes("Teams"));
                                return (
                                    <div key={i} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                                        <h4 className="text-white font-bold text-base leading-tight mb-3">
                                            {event.subject || "Untitled Event"}
                                        </h4>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3 text-sm text-slate-300 font-mono">
                                                <Clock size={16} className="text-blue-500" />
                                                {formatEventTime(event.start?.dateTime)} - {formatEventTime(event.end?.dateTime)}
                                                {event.isAllDay && <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">ALL DAY</span>}
                                            </div>
                                            
                                            {isTeams ? (
                                                <div className="flex items-center gap-3 text-sm text-indigo-400 font-medium">
                                                    <Video size={16} />
                                                    Microsoft Teams Meeting
                                                </div>
                                            ) : event.location?.displayName && (
                                                <div className="flex items-center gap-3 text-sm text-slate-400">
                                                    <MapPin size={16} />
                                                    <span>{event.location.displayName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
