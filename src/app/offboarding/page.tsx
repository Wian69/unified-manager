"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UserMinus, ShieldAlert, FileText, Activity, RefreshCw, Search, ArrowLeft, User, Mail, CheckCircle2, ExternalLink } from "lucide-react";
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
    const [agents, setAgents] = useState<any[]>([]);
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
            const [agentRes, deviceRes, watchlistRes] = await Promise.all([
                fetch('/api/agent/list', { cache: 'no-store' }),
                fetch('/api/devices', { cache: 'no-store' }),
                fetch(`/api/offboarding/watchlist?t=${Date.now()}`, { cache: 'no-store' })
            ]);
            
            const agentData = await agentRes.json();
            const deviceData = await deviceRes.json();
            const watchlistData = await watchlistRes.json();
            
            setAgents(agentData.agents || []);
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

    useEffect(() => {
        fetchOffboardingData();
        const interval = setInterval(fetchOffboardingData, 3000);
        return () => clearInterval(interval);
    }, []);

    const searchParams = useSearchParams();
    const directUser = searchParams.get('user');

    useEffect(() => {
        if (directUser && agents.length > 0) {
            // Find the agent with this UPN or just audit the UPN directly
            // This logic is now removed as the audit section is gone.
            // Keeping the useEffect for now, but it will be empty.
        }
    }, [directUser, agents.length]);

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
                                <th className="px-6 py-4">Exit Date & Comments</th>
                                <th className="px-4 py-4 text-center">Device Status</th>
                                <th className="px-4 py-4 text-center">Data Activity</th>
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

                                    // 2. Find UEA Agent matching the serial number or same UPN or Device Name (FUZZY)
                                    const agent = agents.find(a => {
                                        const agentSerial = (a.serialNumber || "").trim().toLowerCase();
                                        const agentName = (a.deviceName || "").trim().toLowerCase();
                                        const intuneSerial = (intuneDevice?.serialNumber || "").trim().toLowerCase();
                                        const intuneName = (intuneDevice?.deviceName || "").trim().toLowerCase();
                                        
                                        return (agentSerial && intuneSerial && agentSerial === intuneSerial) ||
                                               (agentName && intuneName && agentName === intuneName) ||
                                               (a.userPrincipalName?.toLowerCase() === u.userPrincipalName?.toLowerCase());
                                    });

                                    const deviceName = intuneDevice?.deviceName || agent?.deviceName || "No device found";
                                    const isOnline = agent?.status === 'online';
                                    const compliance = intuneDevice?.complianceState || "Unknown";

                                    const updateField = (field: string, val: string) => {
                                        const newList = monitoredUsers.map(m => m.id === u.id ? { ...m, [field]: val } : m);
                                        setMonitoredUsers(newList);
                                        // Use a debounced or separate save button? No, let's just save for now
                                        saveWatchlist(newList);
                                    };

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
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">Last Day:</span>
                                                        <input 
                                                            type="date" 
                                                            value={u.lastDay || ""} 
                                                            onChange={(e) => updateField('lastDay', e.target.value)}
                                                            className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase">Comments:</span>
                                                        <textarea 
                                                            placeholder="What to do..."
                                                            value={u.exitComments || ""}
                                                            onChange={(e) => updateField('exitComments', e.target.value)}
                                                            className="w-full bg-slate-950/50 border border-slate-800/60 rounded-lg p-2 text-[10px] text-slate-300 outline-none focus:border-blue-500/50 placeholder:text-slate-700 resize-none h-12"
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
                                                    }`}>
                                                        {isOnline && <Activity size={10} className="animate-pulse" />}
                                                        <span className="truncate max-w-[80px]">{deviceName}</span>
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
                                            <td className="px-4 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-white font-bold text-xs">
                                                        {u.driveUsed ? (u.driveUsed / (1024 * 1024 * 1024)).toFixed(1) : "0.0"} GB
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Usage</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => {
                                                            const printWindow = window.open('', '_blank');
                                                            if (printWindow) {
                                                                printWindow.document.write(`
                                                                    <html>
                                                                        <head>
                                                                            <title>Master Offboarding - ${u.displayName}</title>
                                                                            <style>
                                                                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                                                                                body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.4; font-size: 12px; }
                                                                                .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                                                                                .title { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; margin: 0; }
                                                                                .subtitle { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                                                                                .section { margin-bottom: 15px; page-break-inside: avoid; }
                                                                                .section-header { background: #f8fafc; padding: 6px 10px; border-left: 3px solid #3b82f6; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
                                                                                .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px 20px; }
                                                                                .field { margin-bottom: 5px; }
                                                                                .label { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 1px; }
                                                                                .value { font-size: 13px; font-weight: 500; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 1px; min-height: 18px; }
                                                                                .checklist { list-style: none; padding: 0; margin: 0; }
                                                                                .check-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 5px; }
                                                                                .box { width: 12px; height: 12px; border: 1.5px solid #cbd5e1; border-radius: 2px; shrink-0; margin-top: 2px; }
                                                                                .check-text { font-size: 11px; font-weight: 500; color: #334155; }
                                                                                .check-sub { font-size: 9px; color: #64748b; display: block; }
                                                                                .pin-box { background: #f1f5f9; border: 1px dashed #cbd5e1; padding: 8px 12px; border-radius: 6px; margin-top: 5px; display: flex; align-items: center; gap: 10px; }
                                                                                .signatures { margin-top: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
                                                                                .sig-box { border-top: 1px solid #0f172a; padding-top: 8px; }
                                                                                .sig-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 10px; }
                                                                                .sig-grid { display: grid; grid-template-cols: 60px 1fr; gap: 5px; font-size: 10px; }
                                                                                .sig-field { color: #94a3b8; font-weight: 600; }
                                                                                .footer { position: fixed; bottom: 30px; left: 40px; right: 40px; border-top: 1px solid #f1f5f9; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; font-weight: 600; }
                                                                                @media print { .no-print { display: none; } }
                                                                            </style>
                                                                        </head>
                                                                        <body>
                                                                            <div class="header">
                                                                                <div>
                                                                                    <div class="subtitle">Equinox Group Holdings, Inc.</div>
                                                                                    <h1 class="title">Master Offboarding Record</h1>
                                                                                </div>
                                                                                <div style="text-align: right;">
                                                                                    <div style="font-size: 10px; font-weight: 800; color: #ef4444; margin-bottom: 2px;">CONFIDENTIAL / AUDIT DATA</div>
                                                                                    <div style="font-size: 9px; color: #64748b;">Effective: 07 MARCH 2025</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="section">
                                                                                <div class="section-header">1. PERSONNEL & TRANSITION DATA</div>
                                                                                <div class="grid">
                                                                                    <div class="field"><span class="label">Full Legal Name</span><div class="value">${u.displayName}</div></div>
                                                                                    <div class="field"><span class="label">Job Title</span><div class="value">${u.jobTitle || "Not Set"}</div></div>
                                                                                    <div class="field"><span class="label">Principal Identity</span><div class="value">${u.userPrincipalName}</div></div>
                                                                                    <div class="field"><span class="label">Last Day of Service</span><div class="value">${u.lastDay || "Not Set"}</div></div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="section">
                                                                                <div class="section-header">2. IT EXIT POLICY CHECKLIST (INTERNAL SOP)</div>
                                                                                <div class="checklist">
                                                                                    <div class="check-item"><div class="box"></div><div><span class="check-text">Application Removal (Euphoria, Outlook, Teams, OneDrive)</span><span class="check-sub">Uninstalled from all company and personal devices.</span></div></div>
                                                                                    <div class="check-item"><div class="box"></div><div><span class="check-text">Hardware Recovery (Phone, Laptop, Peripherals)</span><span class="check-sub">All company-issued equipment received and inspected.</span></div></div>
                                                                                    <div class="check-item"><div class="box"></div><div><span class="check-text">Data Sanitization & Personal Review</span><span class="check-sub">Personal devices verified clean of Equinox corporate data.</span></div></div>
                                                                                    <div class="check-item"><div class="box"></div><div><span class="check-text">Email Management & Forwarding</span><span class="check-sub">Auto-replies set and critical comms redirected.</span></div></div>
                                                                                </div>
                                                                                <div class="pin-box">
                                                                                    <span class="label" style="margin: 0; min-width: 140px;">LAPTOP PIN / PASSWORD:</span>
                                                                                    <div class="value" style="flex: 1; border: none; font-family: monospace; font-size: 16px; letter-spacing: 2px;">____________________</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="section">
                                                                                <div class="section-header">3. ACCESS REVOCATION & SECURITY AUDIT (VANTA)</div>
                                                                                <div class="checklist" style="display: grid; grid-template-cols: 1fr 1fr; gap: 5px 20px;">
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">Entra ID Status: DISABLED</span></div>
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">MFA/Security Device Purge</span></div>
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">Admin Role Revocation</span></div>
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">SaaS Access (VPN, CRM, Slack)</span></div>
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">30-Day Audit Log Review</span></div>
                                                                                    <div class="check-item"><div class="box"></div><span class="check-text">Distribution List Cleanup</span></div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="section">
                                                                                <div class="section-header">4. EXIT COMMENTS & SPECIAL INSTRUCTIONS</div>
                                                                                <div class="value" style="white-space: pre-wrap; min-height: 60px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">${u.exitComments || "N/A"}</div>
                                                                            </div>

                                                                            <div class="section">
                                                                                <div class="section-header">5. LEGAL & INTELLECTUAL PROPERTY ACKNOWLEDGEMENT</div>
                                                                                <p style="font-size: 10px; color: #64748b; margin: 0; text-align: justify;">
                                                                                    The employee acknowledges that all files, emails, and data created during employment remain the exclusive Intellectual Property (IP) of Equinox Group Holdings, Inc. and that all post-exit confidentiality obligations (NDA) remain in full effect.
                                                                                </p>
                                                                            </div>

                                                                            <div class="signatures">
                                                                                <div class="sig-box">
                                                                                    <div class="sig-label">Departing Employee</div>
                                                                                    <div class="sig-grid">
                                                                                        <span class="sig-field">Name:</span><span>${u.displayName}</span>
                                                                                        <span class="sig-field">Signature:</span><span>____________________</span>
                                                                                        <span class="sig-field">Date:</span><span>____________________</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="sig-box">
                                                                                    <div class="sig-label">Group IT Support Specialist</div>
                                                                                    <div class="sig-grid">
                                                                                        <span class="sig-field">Name:</span><span>____________________</span>
                                                                                        <span class="sig-field">Signature:</span><span>____________________</span>
                                                                                        <span class="sig-field">Date:</span><span>____________________</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="footer">
                                                                                <span>WWW.EQNCS.COM</span>
                                                                                <span>ENQUIRIES@EQNCS.COM</span>
                                                                                <span>VERSION 2.1 - COMPLIANCE AUDIT READY</span>
                                                                            </div>

                                                                            <div class="no-print" style="margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                                                                <button onclick="window.print()" style="padding: 10px 30px; background: #0f172a; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Generate Official Form</button>
                                                                            </div>
                                                                        </body>
                                                                        </html>
                                                                `);
                                                                printWindow.document.close();
                                                            }
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Print Exit Interview"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    {u.oneDriveUrl && (
                                                        <a 
                                                            href={u.oneDriveUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                                            title="Open OneDrive"
                                                        >
                                                            <ExternalLink size={18} />
                                                        </a>
                                                    )}
                                                    <button 
                                                        onClick={() => removeFromWatchlist(u.id)}
                                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                        title="Remove from Watchlist"
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-500">
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
