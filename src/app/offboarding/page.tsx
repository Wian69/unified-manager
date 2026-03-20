"use client";

import { useEffect, useState } from "react";
import { UserMinus, ShieldAlert, FileText, Activity, RefreshCw } from "lucide-react";

export default function OffboardingPage() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOffboardingAgents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/list');
            const data = await res.json();
            // In a real app, we'd filter by an 'offboarding' flag. 
            // For this demo, we'll show all agents but highlight those with "high activity".
            setAgents(data.agents || []);
        } catch (error) {
            console.error("Failed to fetch offboarding data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffboardingAgents();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-rose-500/5 p-8 rounded-3xl border border-rose-500/20 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl shadow-lg shadow-rose-500/10">
                        <UserMinus size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Offboarding Monitor</h1>
                        <p className="text-slate-400 font-medium">Tracking sensitive data movement for departing employees.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                        <span className="text-[10px] text-rose-500 uppercase font-black block mb-1 tracking-widest">Active Watchlist</span>
                        <span className="text-2xl font-bold text-white">{agents.length} Devices</span>
                    </div>
                    <button 
                        onClick={fetchOffboardingAgents}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Watchlist Table */}
                <div className="lg:col-span-2 bg-slate-900/40 rounded-3xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                    <div className="p-6 border-b border-slate-800/60 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ShieldAlert size={20} className="text-rose-500" />
                            Employee Watchlist
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-950/50 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-800/60">
                                <tr>
                                    <th className="px-6 py-4">Employee / Device</th>
                                    <th className="px-6 py-4">Last Location (ISP)</th>
                                    <th className="px-6 py-4">Data Activity</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {loading ? (
                                    <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Analyzing agent telemetry...</td></tr>
                                ) : agents.length > 0 ? (
                                    agents.map(a => (
                                        <tr key={a.id} className="hover:bg-rose-500/5 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-200">{a.deviceName}</div>
                                                <div className="text-[10px] text-slate-500 font-mono uppercase">{a.serialNumber}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-slate-300">{a.publicIp}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">{a.isp}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-rose-400 font-bold">
                                                    <Activity size={14} className="animate-pulse" />
                                                    High Density
                                                </div>
                                                <div className="text-[10px] text-slate-500 uppercase">File Movement Detected</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-rose-500/30">
                                                    Monitored
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No employees currently in offboarding state.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-6">
                    <div className="bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <FileText size={20} className="text-blue-400" />
                            Recent File Alerts
                        </h3>
                        <div className="space-y-4">
                            <ActivityCard 
                                title="Mass File Archive (ZIP)" 
                                device="CEO-LAPTOP" 
                                time="2 mins ago" 
                                severity="critical" 
                            />
                            <ActivityCard 
                                title="USB Data Transfer" 
                                device="DEV-WS-01" 
                                time="15 mins ago" 
                                severity="high" 
                            />
                            <ActivityCard 
                                title="Browser Upload (Dropbox)" 
                                device="HR-MAC-02" 
                                time="1 hour ago" 
                                severity="medium" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityCard({ title, device, time, severity }: { title: string, device: string, time: string, severity: string }) {
    return (
        <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 
                    severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                    {severity}
                </span>
                <span className="text-[10px] text-slate-500">{time}</span>
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">{title}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{device}</p>
        </div>
    );
}
