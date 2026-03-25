import React, { useState, useEffect } from 'react';
import { ShieldAlert, Usb, Mail, RefreshCw, Calendar, Download, Search, AlertCircle, CircleCheck, Info, Camera, AlertTriangle, FileText } from "lucide-react";

interface DlpEvent {
    id: string;
    agentId: string;
    type: string;
    details: string;
    severity: string;
    timestamp: string;
}

export default function DlpModule({ userId, userDisplayName, sinceDate }: { userId: string, userDisplayName: string, sinceDate?: string }) {
    const [events, setEvents] = useState<DlpEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/offboarding/${userId}/dlp`);
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            setEvents(result.events || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchEvents();
    }, [userId, sinceDate]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'usb_inserted':
            case 'usb_removed':
            case 'usb_blocked_attempt':
            case 'usb_copy': return <Usb size={16} />;
            case 'gmail_detected':
            case 'gmail_exfiltration':
            case 'security_snapshot': return <Camera size={16} />;
            case 'discovery_result': return <Search size={16} />;
            case 'usb_blocked_attempt': return <AlertTriangle size={16} />;
            default: return <Info size={16} />;
        }
    };

    const filteredEvents = events.filter((event: DlpEvent) => 
        (event.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.type || "").toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: DlpEvent, b: DlpEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const downloadCSV = () => {
        const headers = ["Type", "Details", "Severity", "Timestamp"];
        const rows = filteredEvents.map((event: DlpEvent) => [
            `"${event.type}"`,
            `"${(event.details || '').replace(/"/g, '""')}"`,
            `"${event.severity}"`,
            `"${formatDate(event.timestamp)}"`
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `DLP_Events_${userDisplayName.replace(/\s+/g, '_')}.csv`);
        link.click();
    };
    const handleScan = async () => {
        if (!window.confirm('Trigger a remote Data Discovery Scan on this device?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/devices/${userId}/scan`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to trigger scan');
            alert('Scan command queued. Results will appear in the log within 60 seconds.');
            fetchEvents();
        } catch (err: any) {
            alert(`Scan Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-left">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                        <ShieldAlert size={24} className="text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Data Loss Prevention</h3>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">Real-time Exfiltration Monitoring</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button 
                        onClick={handleScan}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                        <Search size={14} /> {loading ? 'Scanning...' : 'Scan Device'}
                    </button>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button 
                        onClick={fetchEvents}
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <RefreshCw size={40} className="animate-spin text-rose-500" />
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Scanning for Risk Events...</p>
                </div>
            ) : error ? (
                <div className="bg-rose-500/5 border border-rose-500/10 p-12 rounded-[2rem] text-center">
                    <ShieldAlert className="mx-auto text-rose-500 mb-6" size={48} />
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">DLP Service Error</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                    <button 
                        onClick={fetchEvents}
                        className="mt-6 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-slate-800"
                    >
                        Retry Scan
                    </button>
                </div>
            ) : (
                <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <h4 className="font-bold text-slate-300 text-sm">Detected Events ({filteredEvents.length})</h4>
                            <div className="h-4 w-[1px] bg-slate-800" />
                            <div className="flex items-center gap-2">
                                <AlertCircle size={12} className="text-amber-500" />
                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none">
                                    Endpoint Intelligence Active
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter alerts..." 
                                className="bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white w-64 focus:ring-1 focus:ring-rose-500/50 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-8 py-5 border-b border-slate-800">Event Type</th>
                                    <th className="px-8 py-5 border-b border-slate-800">Activity Details</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-center">Severity</th>
                                    <th className="px-8 py-5 border-b border-slate-800 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                                {filteredEvents.map((event: DlpEvent) => (
                                    <tr key={event.id} className="hover:bg-rose-500/5 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg border ${getSeverityStyles(event.severity)}`}>
                                                    {getTypeIcon(event.type)}
                                                </div>
                                                <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                                                    {event.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {event.type === 'security_snapshot' ? (
                                                <div className="space-y-3">
                                                    <p className="text-slate-300 font-medium">{event.details.split('|')[0]}</p>
                                                    {event.details.includes('|') && (
                                                        <img 
                                                            src={event.details.split('|')[1]} 
                                                            alt="Security Snapshot"
                                                            className="rounded-lg border border-slate-800 w-full max-w-sm h-auto cursor-zoom-in hover:border-rose-500/50 transition-all shadow-lg"
                                                            onClick={() => window.open(event.details.split('|')[1])}
                                                        />
                                                    )}
                                                </div>
                                            ) : event.type === 'discovery_result' ? (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Discovery Scan Matches :</p>
                                                    {event.details.replace('Scan found files: ', '').split(', ').map((f, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400 font-mono break-all group/file hover:text-white transition-colors">
                                                            <FileText size={12} className="text-slate-600 group-hover/file:text-blue-500" />
                                                            {f}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-300 font-medium">{event.details}</p>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getSeverityStyles(event.severity)}`}>
                                                {event.severity}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-300">{formatDate(event.timestamp).split(',')[0]}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDate(event.timestamp).split(',')[1]}</div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredEvents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <CircleCheck size={32} className="mx-auto text-emerald-500/30 mb-4" />
                                            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">No exfiltration risks detected for this range.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
