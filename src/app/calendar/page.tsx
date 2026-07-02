"use client";

import { useState, useEffect } from "react";
import { Search, CalendarDays, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Clock, MapPin, Video } from "lucide-react";

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

    const [events, setEvents] = useState<any[]>([]);
    const [fetchingEvents, setFetchingEvents] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

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

    const fetchEvents = async (userId: string) => {
        setFetchingEvents(true);
        setEventsError(null);
        try {
            const res = await fetch(`/api/users/calendar/events?userId=${userId}`);
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
        fetchEvents(user.id);
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

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 mt-10 px-4 xl:px-0">
            <div className="bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-blue-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                        <CalendarDays size={32} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Calendar Management</h1>
                        <p className="text-slate-400 mt-1 font-mono text-sm">View upcoming events and instantly delegate access.</p>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* LEFT COLUMN - DELEGATION TOOL */}
                        <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-8 space-y-8 h-fit">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-black text-2xl border-2 border-slate-900 shadow-xl">
                                        {selectedUser.displayName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">{selectedUser.displayName}</h2>
                                        <p className="text-slate-400 font-mono text-sm">{selectedUser.userPrincipalName}</p>
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
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                >
                                    Change User
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-800/60 space-y-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500">Calendar Delegation</h3>
                                
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Target Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="Who gets access?" 
                                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 outline-none transition-colors"
                                        value={targetEmail}
                                        onChange={(e) => setTargetEmail(e.target.value)}
                                        disabled={shareComplete || isSharing}
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Permission Level</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors appearance-none"
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
                                        <h3 className="text-rose-500 font-bold text-sm">Delegation Failed</h3>
                                        <p className="text-rose-400/80 text-xs mt-1">{shareError}</p>
                                    </div>
                                </div>
                            )}

                            {shareComplete ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-4">
                                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={24} />
                                    <div>
                                        <h3 className="text-emerald-500 font-bold text-sm">Access Granted!</h3>
                                        <p className="text-emerald-400/80 text-xs mt-1 mb-3">
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
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSharing ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            Grant Access
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* RIGHT COLUMN - CALENDAR VIEWER */}
                        <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-8 flex flex-col h-[600px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500">Upcoming 7 Days</h3>
                                <button 
                                    onClick={() => fetchEvents(selectedUser.id)} 
                                    disabled={fetchingEvents}
                                    className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <RefreshCw size={16} className={fetchingEvents ? "animate-spin" : ""} />
                                </button>
                            </div>

                            {fetchingEvents && events.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                    <RefreshCw className="animate-spin text-blue-500/50" size={32} />
                                    <p className="text-sm font-mono uppercase">Fetching Calendar...</p>
                                </div>
                            ) : eventsError ? (
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col items-center justify-center h-full gap-3 text-center">
                                    <AlertTriangle className="text-rose-500" size={32} />
                                    <p className="text-rose-400/80 text-sm">Failed to read calendar.<br/>The user may not have an active mailbox.</p>
                                </div>
                            ) : events.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                    <CalendarDays className="text-slate-700" size={48} />
                                    <p className="text-sm font-medium">No upcoming events for the next 7 days.</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                    {events.map((event, i) => {
                                        const isTeams = event.isOnlineMeeting || (event.location?.displayName && event.location.displayName.includes("Teams"));
                                        return (
                                            <div key={i} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                                <h4 className="text-white font-bold text-sm leading-tight mb-2 truncate" title={event.subject || "No Title"}>
                                                    {event.subject || "Untitled Event"}
                                                </h4>
                                                
                                                <div className="flex flex-col gap-1.5 mt-3">
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                                        <Clock size={14} className="text-blue-500" />
                                                        {formatEventDate(event.start?.dateTime)} &bull; {formatEventTime(event.start?.dateTime)} - {formatEventTime(event.end?.dateTime)}
                                                        {event.isAllDay && <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] ml-1">ALL DAY</span>}
                                                    </div>
                                                    
                                                    {isTeams ? (
                                                        <div className="flex items-center gap-2 text-xs text-indigo-400">
                                                            <Video size={14} />
                                                            Teams Meeting
                                                        </div>
                                                    ) : event.location?.displayName && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <MapPin size={14} />
                                                            <span className="truncate max-w-[200px]">{event.location.displayName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
