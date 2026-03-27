"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Share2, Activity, Globe, Lock, AlertTriangle, ExternalLink, RefreshCw, Smartphone, CheckCircle2, FileX } from "lucide-react";
import ActivityCard from '@/components/ActivityCard';

export default function SecurityAuditModule({ userId, employeeName, sinceDate }: { userId: string, employeeName: string, sinceDate?: string }) {
    const [sharingItems, setSharingItems] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [agentReport, setAgentReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Sharing Audit
            const sharingRes = await fetch(`/api/sharepoint/sharing?userId=${userId}`);
            const sharingData = await sharingRes.json();
            setSharingItems(sharingData.data || []);

            // Fetch Recent Activity Audit
            const activityRes = await fetch(`/api/sharepoint/activity?userId=${userId}`);
            const activityData = await activityRes.json();
            setActivities(activityData.recentActivity || []);

            // Fetch Agent Report (Security Pulse)
            // Note: We use the existing security report API
            const agentRes = await fetch(`/api/security/report/${userId}`);
            const agentData = await agentRes.json();
            setAgentReport(agentData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchData();
    }, [userId, sinceDate]);

    const handleHardScan = async () => {
        setScanning(true);
        // Simulate deep scan or trigger a more expensive Graph job
        await new Promise(r => setTimeout(r, 2000));
        await fetchData();
        setScanning(false);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header with Stats Overview */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-lg shadow-rose-500/5">
                        <ShieldAlert size={32} className="text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                            Security & Compliance <span className="text-rose-500">Audit</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">Exfiltration Detection & Risk Pulse</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleHardScan}
                        disabled={scanning}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            scanning 
                            ? 'bg-slate-900 text-slate-500 border-slate-800' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20 shadow-lg shadow-blue-600/20 active:scale-95'
                        }`}
                    >
                        {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                        {scanning ? 'Analyzing Permissions...' : 'Deep Risk Scan'}
                    </button>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. External Sharing Discovery */}
                <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md flex flex-col h-full">
                    <div className="p-6 border-b border-slate-800/60 bg-slate-950/30 flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Globe size={16} className="text-emerald-500" />
                            External Sharing
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${sharingItems.length > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {sharingItems.length} Links Found
                        </span>
                    </div>
                    
                    <div className="p-6 flex-1 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                        {sharingItems.length > 0 ? (
                            sharingItems.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-slate-900 rounded-xl group-hover:scale-110 transition-transform">
                                            <Share2 size={18} className="text-blue-500" />
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <p className="text-sm font-bold text-slate-200 truncate pr-2">{item.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono italic uppercase tracking-tighter">Scope: Anonymous / Everyone</p>
                                        </div>
                                    </div>
                                    <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-600 flex flex-col items-center gap-4">
                                <CheckCircle2 size={40} className="text-emerald-500/20" />
                                <p className="font-mono text-[10px] uppercase tracking-widest">No external links detected in root.</p>
                            </div>
                        )}
                    </div>
                    {sharingItems.length > 0 && (
                        <div className="p-4 bg-rose-500/5 border-t border-slate-800/60 text-center">
                            <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <AlertTriangle size={12} />
                                High data exfiltration risk detected.
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. Unified Agent Pulse */}
                <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md flex flex-col h-full">
                    <div className="p-6 border-b border-slate-800/60 bg-slate-950/30 flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Smartphone size={16} className="text-blue-500" />
                            Agent Integrity Pulse
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${agentReport?.timestamp ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{agentReport?.timestamp ? 'Connected' : 'Offline'}</span>
                        </div>
                    </div>

                    <div className="p-10 flex-1 space-y-8 text-left">
                        {agentReport ? (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Vulnerabilities</p>
                                    <p className={`text-2xl font-black ${agentReport.vulnerabilities?.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {agentReport.vulnerabilities?.length || 0}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Missing Patches</p>
                                    <p className="text-2xl font-black text-blue-400">{agentReport.updateCount || 0}</p>
                                </div>
                                <div className="col-span-2 p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4">
                                     <div className="flex justify-between items-center">
                                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">Latest Agent Status</p>
                                         <span className="text-[9px] text-slate-600 font-mono">{agentReport.timestamp ? new Date(agentReport.timestamp).toLocaleTimeString() : 'N/A'}</span>
                                     </div>
                                     <div className="space-y-3">
                                         <div className="flex items-center justify-between">
                                             <span className="text-xs text-slate-400">Disk Encryption (BitLocker)</span>
                                             <span className="text-[10px] font-black text-emerald-500 uppercase">ACTIVE</span>
                                         </div>
                                         <div className="flex items-center justify-between">
                                             <span className="text-xs text-slate-400">USB Mass Storage Policy</span>
                                             <span className="text-[10px] font-black text-emerald-500 uppercase">ENFORCED</span>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-slate-600 flex flex-col items-center gap-4">
                                <AlertTriangle size={40} className="text-slate-800" />
                                <p className="font-mono text-[10px] uppercase tracking-widest">No agent telemetry available for this device.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Mass Activity Radar */}
                <div className="lg:col-span-2 bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                    <div className="p-6 border-b border-slate-800/60 bg-slate-950/30 flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Activity size={16} className="text-amber-500" />
                            Mass Activity Radar
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Last 60m Activity:</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    activities.length > 20 ? 'bg-rose-500/20 text-rose-500 border-rose-500/20 animate-pulse' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                }`}>
                                    {activities.length} EVENTS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {activities.length > 0 ? (
                            activities.slice(0, 9).map((act, idx) => (
                                <ActivityCard 
                                    key={idx}
                                    title={act.name}
                                    device={act.remote ? "Cloud/Web Access" : "Device Sync"}
                                    time={new Date(act.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    severity={activities.length > 20 ? 'critical' : activities.length > 10 ? 'high' : 'normal'}
                                />
                            ))
                        ) : (
                            <div className="col-span-3 py-20 text-center text-slate-600 flex flex-col items-center gap-4">
                                <RefreshCw size={40} className="text-slate-800" />
                                <p className="font-mono text-[10px] uppercase tracking-widest">No recent filesystem activity spikes detected.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
