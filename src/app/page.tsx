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
        sharepoint: null
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

            setData(prev => ({ 
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
            if (status.status === 'completed' || (status.summary?.total > 0 && (status.summary?.success + status.summary?.error) === status.summary?.total)) {
                // We don't stop remediating immediately because we want to show the 100% bar
            }
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
    }, []);

    useEffect(() => {
        let interval: any;
        if (remediating || remediationStatus?.percent > 0) {
            fetchRemediationStatus();
            interval = setInterval(fetchRemediationStatus, 5000);
        }
        return () => clearInterval(interval);
    }, [remediating, remediationStatus?.percent]);

    const activeRing = data.updates?.rings?.find((r: any) => r.displayName?.includes('Update'))?.displayName || "Search Results Found";
    
    // Calculate estimated fixes
    const baseVulns = data.security?.metrics?.totalVulns || 303;
    const resolvedEstimate = remediationStatus?.summary?.success ? Math.round((remediationStatus.summary.success / (data.devices?.devices?.length || 1)) * baseVulns) : 0;

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
                <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-8 flex flex-col justify-between">
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

                        <div className="grid grid-cols-4 gap-4 mb-8">
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

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleRemediate}
                                disabled={remediating || loading}
                                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase tracking-tighter transition-all shadow-xl active:scale-95 ${
                                    remediating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                }`}
                            >
                                {remediating ? <RefreshCw size={20} className="animate-spin" /> : <Shield size={20} />}
                                {remediating ? "Deploying Pulse..." : "Remediate All Devices"}
                            </button>
                            {remediationMsg && (
                                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-emerald-400 animate-in fade-in slide-in-from-left-2 italic">
                                    {remediationMsg}
                                </div>
                            )}
                            {remediating && (
                                <button 
                                    onClick={() => setRemediating(false)}
                                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold transition-all"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>

                        {(remediating || remediationStatus) && (
                            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Global Remediation Progress</div>
                                        <div className="text-white font-bold">{remediationStatus?.scriptName || "Initializing Pulse..."}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-emerald-400">{remediationStatus?.percent || 0}%</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-bold">Devices Responded</div>
                                    </div>
                                </div>
                                <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${remediationStatus?.percent || 0}%` }}
                                    ></div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 mt-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Vulnerabilities Resolved</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-black text-white">{resolvedEstimate}</span>
                                            <span className="text-[10px] text-slate-400 tracking-tight">of {baseVulns} Fixed</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Success Rate</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-black text-emerald-500">{remediationStatus?.summary?.success || 0}</span>
                                            <span className="text-[10px] text-slate-400">({remediationStatus?.summary?.total || 0} targeted)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-md rounded-2xl border border-blue-500/20 p-8 flex flex-col justify-center text-center">
                    <div className="p-4 bg-blue-500/20 rounded-2xl w-fit mx-auto mb-6 text-blue-400">
                        <RefreshCw size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">One-Touch Updates</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        Pushing remediation forces a global Intune sync. Devices will prioritize Windows Update and security patches immediately.
                    </p>
                </div>
            </div>

                <div className="lg:col-span-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-6">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Recent Devices</h2>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/50 rounded-lg"></div>)}
                        </div>
                    ) : (data.devices?.devices?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.devices.devices.slice(0, 10).map((d: any) => (
                                <div key={d.id} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Laptop size={20} className="text-slate-400" />
                                        <div>
                                            <p className="font-medium">{d.deviceName}</p>
                                            <p className="text-xs text-slate-500">{d.operatingSystem}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.complianceState === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {d.complianceState}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No devices found. Check Intune enrollment.</p>
                    ))}
                </div>
        </div>
    );
}
