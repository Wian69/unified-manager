"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserMinus, ShieldAlert, FileText, Activity, RefreshCw, Search, ArrowLeft, User, Mail, CheckCircle2, ExternalLink, ClipboardList } from "lucide-react";
import Link from "next/link";
import ActivityCard from "@/components/ActivityCard";
import SharePointDeletionsModule from "@/components/SharePointDeletionsModule";

export default function OffboardingPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
                <RefreshCw size={40} className="animate-spin text-blue-500" />
                <p className="font-mono text-sm uppercase tracking-widest">Initialising Offboarding Monitor...</p>
            </div>
        }>
            <OffboardingContent />
        </Suspense>
    );
}

function OffboardingContent() {
    const router = useRouter();
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingReport, setSendingReport] = useState(false);
    const [reportSent, setReportSent] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // Unified Monitoring State
    const [monitoredUsers, setMonitoredUsers] = useState<any[]>([]);
    const [globalSearchQuery, setGlobalSearchQuery] = useState("");
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [searchingGlobal, setSearchingGlobal] = useState(false);

    // Live Auto-Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (globalSearchQuery.length > 2) {
                handleGlobalSearch();
            } else {
                setGlobalSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [globalSearchQuery]);

    const handleGlobalSearch = async () => {
        setSearchingGlobal(true);
        try {
            const res = await fetch(`/api/users?search=${encodeURIComponent(globalSearchQuery)}`);
            const data = await res.json();
            const sorted = (data.users || []).sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));
            setGlobalSearchResults(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingGlobal(false);
        }
    };

    const saveWatchlist = async (newList: any[], shouldRefresh = false) => {
        setSyncing(true);
        // Save to LocalStorage immediately
        if (typeof window !== 'undefined') {
            localStorage.setItem('employeeWatchlist', JSON.stringify(newList));
        }
        
        try {
            const res = await fetch('/api/offboarding/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ watchlist: newList }),
                cache: 'no-store'
            });
            if (!res.ok) throw new Error("Sync failed");

            // If we just pushed local data to an empty server, re-fetch to get enriched metrics
            if (shouldRefresh) {
                setTimeout(fetchOffboardingData, 1000);
            }
        } catch (err) {
            console.error('[Watchlist] API Save failed:', err);
        } finally {
            setSyncing(false);
        }
    };

    const addToWatchlist = (user: any) => {
        if (!monitoredUsers.find(u => u.id === user.id)) {
            const newList = [...monitoredUsers, user];
            setMonitoredUsers(newList);
            saveWatchlist(newList, true); // Refresh to get metrics for the new user
        }
        // Keep results in view
    };

    const removeFromWatchlist = (userId: string) => {
        const newList = monitoredUsers.filter(u => u.id !== userId);
        setMonitoredUsers(newList);
        saveWatchlist(newList);
    };

    const fetchOffboardingData = async () => {
        setLoading(true);
        try {
            const [deviceRes, watchlistRes] = await Promise.all([
                fetch('/api/devices', { cache: 'no-store' }),
                fetch(`/api/offboarding/watchlist?t=${Date.now()}`, { cache: 'no-store' })
            ]);
            
            const deviceData = await deviceRes.json();
            const watchlistData = await watchlistRes.json();
            
            setDevices(deviceData.devices || []);

            // Handle Watchlist with extreme care to prevent data loss
            let remoteWatchlist = null;
            if (watchlistRes.ok && watchlistData && Array.isArray(watchlistData.watchlist)) {
                remoteWatchlist = watchlistData.watchlist;
            }

            let localData = null;
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('employeeWatchlist');
                if (stored) {
                    try { localData = JSON.parse(stored); } catch (e) {}
                }
            }

            let finalWatchlist = [];
            // Trust server data as primary source of truth if it was a successful request
            if (remoteWatchlist !== null) {
                if (remoteWatchlist.length === 0 && localData && localData.length > 0) {
                    console.log('[Watchlist] Force syncing local data to server...');
                    finalWatchlist = localData;
                    saveWatchlist(localData, true); // This will trigger the POST to server and a re-fetch
                } else {
                    finalWatchlist = remoteWatchlist;
                }
            } else if (localData) {
                finalWatchlist = localData;
            }

            // Alphabetical Sort
            finalWatchlist.sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));

            setMonitoredUsers(finalWatchlist);
            localStorage.setItem('employeeWatchlist', JSON.stringify(finalWatchlist));

            if (typeof window !== 'undefined' && finalWatchlist.length > 0) {
                localStorage.setItem('employeeWatchlist', JSON.stringify(finalWatchlist));
            }
        } catch (err) {
            console.error('[Watchlist] Critical Sync Error:', err);
            // On total failure, try one last time to pull from local without overwriting
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('employeeWatchlist');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));
                    setMonitoredUsers(parsed);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const triggerReport = async () => {
        setSendingReport(true);
        setReportSent(false);
        setReportError(null);
        try {
            const res = await fetch('/api/reports/daily', { method: 'POST' });
            const data = await res.json();
            
            if (res.ok) {
                setReportSent(true);
                setTimeout(() => setReportSent(false), 5000);
            } else {
                setReportError(data.message || data.error || "Report failed to send.");
            }
        } catch (err: any) {
            console.error('[Report] Trigger failed:', err);
            setReportError(err.message);
        } finally {
            setSendingReport(false);
        }
    };

    const updateWatchlistUser = (userId: string, updates: any) => {
        const newList = monitoredUsers.map(u => u.id === userId ? { ...u, ...updates } : u);
        setMonitoredUsers(newList);
        saveWatchlist(newList);
    };

    useEffect(() => {
        fetchOffboardingData();
        const interval = setInterval(fetchOffboardingData, 3000);
        return () => clearInterval(interval);
    }, []);

    const searchParams = useSearchParams();
    const directUser = searchParams.get('user');

    useEffect(() => {
        if (directUser) {
            // Logic for direct user audit (if any) could go here, 
            // but agent-based audit is removed.
        }
    }, [directUser]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Unified User Search Header */}
            <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl border border-slate-800 shadow-xl relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none rounded-3xl" />
                <div className="relative z-10 flex flex-col items-start text-left space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-3">
                            Offboarding <span className="text-blue-500">Monitor</span>
                        </h1>
                        <p className="text-slate-400 italic">Start typing to find an employee...</p>
                    </div>

                    <div className="w-full relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-xl">
                            <Search className="ml-4 text-slate-500" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search employee name..." 
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-4 text-lg font-medium placeholder:text-slate-600"
                                value={globalSearchQuery}
                                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                            />
                            {searchingGlobal && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                                </div>
                            )}
                        </div>

                        {globalSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-3xl z-50 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200 divide-y divide-slate-800">
                                {globalSearchResults.map(u => {
                                    const isMonitored = monitoredUsers.some(m => m.id === u.id);
                                    return (
                                        <div 
                                            key={u.id} 
                                            className="flex items-center justify-between p-4 hover:bg-slate-800/50 rounded-xl transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                                    {u.displayName.charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-slate-100">{u.displayName}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">{u.userPrincipalName}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {!isMonitored ? (
                                                    <button 
                                                        onClick={() => addToWatchlist(u)}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-blue-600/20"
                                                    >
                                                        Add to Watchlist
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => removeFromWatchlist(u.id)}
                                                        className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-rose-500/20"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                <div className="p-6 border-b border-slate-800/60 flex justify-between items-center bg-slate-950/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert size={20} className="text-rose-500" />
                        Employee Watchlist ({monitoredUsers.length})
                    </h2>
                    <div className="flex items-center gap-4">
                        {reportError && (
                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 animate-in fade-in slide-in-from-right-2">
                                Error: {reportError}
                            </span>
                        )}
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-lg shadow-emerald-500/20'}`} />
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{syncing ? 'Syncing...' : 'Cloud Synced'}</span>
                        </div>
                        <button 
                            onClick={triggerReport}
                            disabled={sendingReport || monitoredUsers.length === 0}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                reportSent 
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:bg-slate-800 disabled:border-slate-800 disabled:text-slate-500 disabled:shadow-none'
                            }`}
                        >
                            {sendingReport ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : reportSent ? (
                                <CheckCircle2 size={14} />
                            ) : (
                                <Mail size={14} />
                            )}
                            {reportSent ? 'Report Sent' : sendingReport ? 'Generating...' : 'Email Report'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/50 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4 text-center">Last Day</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Device Status</th>
                                <th className="px-6 py-4 text-center">Data Activity</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {monitoredUsers.length > 0 ? (
                                monitoredUsers.map(u => {
                                    // 1. Find Intune Device for this user
                                    const intuneDevice = devices.find(d => 
                                        d.userPrincipalName?.toLowerCase() === u.userPrincipalName?.toLowerCase()
                                    );

                                    const deviceName = intuneDevice?.deviceName || "No device found";
                                    const isOnline = false; // Agent is removed
                                    const compliance = intuneDevice?.complianceState || "Unknown";
                                    const status = u.status || "Offboarding in Progress";
                                    const isComplete = status === "Offboarding Complete";

                                    return (
                                        <tr 
                                            key={u.id} 
                                            className="hover:bg-blue-500/5 cursor-pointer transition-all group"
                                            onClick={() => router.push(`/offboarding/${u.id}`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">
                                                        {u.displayName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-200 group-hover:text-white transition-colors">{u.displayName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono italic">{u.userPrincipalName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <input 
                                                    type="date" 
                                                    className="bg-slate-950/50 border border-slate-800 text-xs font-bold text-white px-3 py-1.5 rounded-xl [color-scheme:dark] focus:border-blue-500/50 outline-none transition-all"
                                                    value={u.lastWorkingDay || ""}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => updateWatchlistUser(u.id, { lastWorkingDay: e.target.value })}
                                                />
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    isComplete 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-900 text-slate-500 border-slate-800`}>
                                                        {deviceName}
                                                    </div>
                                                    {intuneDevice && (
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                            compliance === 'compliant' ? 'text-emerald-500/60' : 'text-rose-500/60'
                                                        }`}>
                                                            {compliance}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-white font-bold text-xs">
                                                        {u.driveUsed ? (u.driveUsed / (1024 * 1024 * 1024)).toFixed(1) : "0.0"} GB
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 uppercase font-black uppercase tracking-tighter">Usage Detected</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {/* Policy Button */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/offboarding/policy?user=${u.id}`);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                                                        title="Equinox Group Holdings, Inc. - IT Exit interview Policy"
                                                    >
                                                        <FileText size={18} />
                                                    </button>

                                                    {/* Checklist Button */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/offboarding/checklist?user=${u.id}`);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Offboarding Checklist"
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>

                                                    {u.oneDriveUrl && (
                                                        <a 
                                                            href={u.oneDriveUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                                            title="Open OneDrive"
                                                        >
                                                            <ExternalLink size={18} />
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromWatchlist(u.id);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                    <UserMinus className="mx-auto mb-4 opacity-20" size={48} />
                                    <p className="font-mono text-xs uppercase tracking-widest text-slate-600">No employees in watchlist. Use search to add.</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
