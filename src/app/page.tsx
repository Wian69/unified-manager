"use client";

import { useEffect, useState } from "react";
import { Laptop, Users, Shield, HardDrive, RefreshCw } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        devices: null,
        users: null,
        security: null,
        sharepoint: null,
        updates: null
    });
    const [remediating, setRemediating] = useState(false);
    const [remediationMsg, setRemediationMsg] = useState<string | null>(null);
    const [remediationStatus, setRemediationStatus] = useState<any>(null);

    const fetchDashboardData = async () => {
        // Only set loading if we don't have data yet
        if (!data.devices) setLoading(true);
        
        try {
            // Using a shorter timeout for the dashboard sync to keep it responsive
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const [devs, usrs, sec, sp, upd] = await Promise.all([
                fetch('/api/devices').then(r => r.json()).catch(() => ({})),
                fetch('/api/users').then(r => r.json()).catch(() => ({})),
                fetch('/api/security/vulnerabilities').then(r => r.json()).catch(() => ({})),
                fetch('/api/sharepoint').then(r => r.json()).catch(() => ({})),
                fetch('/api/security/check-updates').then(r => r.json()).catch(() => ({}))
            ]);
            
            clearTimeout(timeoutId);

            setData((prev: any) => ({ 
                ...prev,
                devices: devs || prev.devices, 
                users: usrs || prev.users, 
                security: sec || prev.security, 
                sharepoint: sp || prev.sharepoint,
                updates: upd || prev.updates 
            }));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRemediationStatus = async () => {
        try {
            const res = await fetch('/api/security/remediation-status');
            const status = await res.json();
            setRemediationStatus(status);
        } catch (e) {}
    };

    const handleRemediate = async () => {
        if (!confirm("This will push a remediation script and force a sync on ALL devices. Proceed?")) return;
        setRemediating(true);
        setRemediationMsg(null);
        setRemediationStatus(null);
        try {
            const res = await fetch('/api/security/remediate', { method: 'POST' });
            const result = await res.json();
            if (res.ok) {
                setRemediationMsg("Remediation Pulse Sent Successfully!");
                // Allow button to be clickable again after 2 seconds, but keep progress bar
                setTimeout(() => {
                    setRemediating(false);
                    fetchDashboardData();
                }, 2000);
            } else {
                setRemediationMsg(`Error: ${result.error}`);
                setRemediating(false);
            }
        } catch (error: any) {
            setRemediationMsg(`Failed: ${error.message}`);
            setRemediating(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchRemediationStatus();
    }, []);

    useEffect(() => {
        let interval: any;
        // Keep polling if we are currently clicking remediate OR if there is an active/recent status on the server
        if (remediating || (remediationStatus && remediationStatus.percent < 100)) {
            interval = setInterval(fetchRemediationStatus, 5000);
        }
        return () => clearInterval(interval);
    }, [remediating, remediationStatus?.percent]);

    const activeRing = data.updates?.rings?.find((r: any) => r.displayName?.includes('Update'))?.displayName || "Windows 11 Updates";
    
    // Calculate estimated fixes
    const baseVulns = data.security?.metrics?.totalVulns || 303;
    const resolvedEstimate = remediationStatus?.summary?.success ? Math.round((remediationStatus.summary.success / (data.devices?.devices?.length || 1)) * baseVulns) : 
                             (remediationStatus?.percent > 0 ? Math.round((remediationStatus.percent / 100) * baseVulns) : 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
                    <p className="text-slate-400">Manage your organization's devices, identity, and security posture.</p>
                </div>
                <div className="flex items-center gap-4">
                    {data.security?.timestamp && (
                        <span className="text-[10px] text-slate-500 font-mono uppercase">Last Sync: {new Date(data.security.timestamp).toLocaleTimeString()}</span>
                    )}
                    <button 
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        {loading ? "Syncing..." : "Sync Data"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard 
                    title="Total Devices" 
                    value={loading ? "..." : (data.devices?.devices?.length || 0)} 
                    description={loading ? "Loading..." : `${data.devices?.activeCount || 0} compliant`}
                    icon={<Laptop size={28} />}
                />
                <DashboardCard 
                    title="Entra ID Users" 
                    value={loading ? "..." : (data.users?.users?.length || 0)} 
                    description={loading ? "Loading..." : `${data.users?.activeUsers || 0} active accounts`}
                    icon={<Users size={28} />}
                />
                <DashboardCard 
                    title="SharePoint Sites" 
                    value={loading ? "..." : (data.sharepoint?.drives?.length || 0)} 
                    description={loading ? "Loading..." : "Active document drives"}
                    icon={<HardDrive size={28} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-8 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Shield size={24} className="text-emerald-500" />
                                    Security Posture
                                </h2>
                                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                    Active Policy: 
                                    <span className="text-blue-400 font-bold px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 text-[10px]">
                                        {loading ? "Detecting..." : (data.updates?.rings?.length > 0 ? activeRing : "None Detected")}
                                    </span>
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black text-emerald-500">{loading ? "..." : (data.security?.exposureScore ?? 0)}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Exposure Score</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-emerald-500 font-black text-xl">{loading ? "..." : (data.security?.metrics?.totalVulns ?? 0)}</div>
                                <div className="text-[9px] text-slate-500 uppercase font-bold">Total Vulns</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-rose-500 font-black text-xl">{loading ? "..." : (data.security?.metrics?.critical ?? 0)}</div>
                                <div className="text-[9px] text-slate-500 uppercase font-bold">Critical</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-amber-500 font-black text-xl">{loading ? "..." : (data.security?.metrics?.high ?? 0)}</div>
                                <div className="text-[9px] text-slate-500 uppercase font-bold">High Sever.</div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <div className="text-blue-500 font-black text-xl">{loading ? "..." : (data.security?.metrics?.nonCompliant ?? 0)}</div>
                                <div className="text-[9px] text-slate-500 uppercase font-bold">Non-Compliant</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden group shadow-2xl shadow-emerald-950/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all"></div>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                            <RefreshCw size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">One-Touch Updates</h3>
                            <p className="text-slate-400 text-xs leading-relaxed mt-2 font-medium">
                                Pushing remediation forces a global Intune sync and triggers immediate Windows Update scans.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 relative z-10">
                        <button 
                            onClick={handleRemediate}
                            disabled={remediating}
                            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase tracking-tighter transition-all shadow-xl active:scale-95 ${
                                remediating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                            }`}
                        >
                            {remediating ? <RefreshCw size={20} className="animate-spin" /> : <Shield size={20} />}
                            {remediating ? "Deploying..." : "Remediate All"}
                        </button>
                        
                        {remediationMsg && (
                            <div className="text-center text-[10px] font-black italic text-emerald-400 animate-pulse">
                                {remediationMsg}
                            </div>
                        )}

                        {(remediating || (remediationStatus && remediationStatus.percent >= 0)) && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 animate-in slide-in-from-bottom-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] text-slate-500 uppercase font-black">Progress</span>
                                    <span className="text-xs font-black text-emerald-400">{remediationStatus?.percent || 0}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                        style={{ width: `${remediationStatus?.percent || 0}%` }}
                                    ></div>
                                </div>
                                <div className="mt-3 flex justify-between items-center text-[9px]">
                                    <span className="text-slate-400 font-bold">{remediationStatus?.summary?.success || 0} Fixed</span>
                                    <span className="text-slate-500 italic">Target: {baseVulns}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-6">
                <h2 className="text-xl font-bold text-slate-200 mb-4 uppercase tracking-tight flex items-center gap-2">
                    <Laptop size={20} className="text-blue-500" />
                    Recent Activity
                </h2>
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/50 rounded-lg"></div>)}
                    </div>
                ) : (data.devices?.devices?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.devices.devices.slice(0, 10).map((d: any) => (
                            <div key={d.id} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 hover:border-blue-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <Laptop size={20} className="text-slate-400" />
                                    <div>
                                        <p className="font-medium text-slate-200">{d.deviceName}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{d.operatingSystem}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${d.complianceState === 'compliant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {d.complianceState}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm italic">No active devices detected in Intune.</p>
                ))}
            </div>
        </div>
    );
}
