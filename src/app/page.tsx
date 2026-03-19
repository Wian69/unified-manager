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

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [devs, usrs, sec, sp] = await Promise.all([
                fetch('/api/devices').then(r => r.json()).catch(() => ({})),
                fetch('/api/users').then(r => r.json()).catch(() => ({})),
                fetch('/api/security').then(r => r.json()).catch(() => ({})),
                fetch('/api/sharepoint').then(r => r.json()).catch(() => ({}))
            ]);
            
            setData({ devices: devs, users: usrs, security: sec, sharepoint: sp });
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
                    <p className="text-slate-400">Manage your organization's devices, identity, and security posture.</p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    {loading ? "Syncing..." : "Sync Data"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    title="Secure Score" 
                    value={loading ? "..." : (data.security?.secureScore?.currentScore ? Math.round(data.security.secureScore.currentScore) : "-")} 
                    description={loading ? "Loading..." : `${data.security?.recentAlerts?.length || 0} recent alerts`}
                    icon={<Shield size={28} />}
                />
                <DashboardCard 
                    title="SharePoint Sites" 
                    value={loading ? "..." : (data.sharepoint?.drives?.length || 0)} 
                    description={loading ? "Loading..." : "Active document drives"}
                    icon={<HardDrive size={28} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Recent Devices Table Placeholder */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-6">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Recent Devices</h2>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/50 rounded-lg"></div>)}
                        </div>
                    ) : (data.devices?.devices?.length > 0 ? (
                        <div className="space-y-4">
                            {data.devices.devices.slice(0, 5).map((d: any) => (
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

                {/* Secure Alerts Table Placeholder */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/60 p-6">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Security Alerts</h2>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800/50 rounded-lg"></div>)}
                        </div>
                    ) : (data.security?.recentAlerts?.length > 0 ? (
                        <div className="space-y-4">
                            {data.security.recentAlerts.slice(0, 5).map((a: any) => (
                                <div key={a.id} className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border-l-2 border-red-500">
                                    <div className="flex items-center gap-3">
                                        <Shield size={20} className="text-rose-400" />
                                        <div>
                                            <p className="font-medium text-sm">{a.title}</p>
                                            <p className="text-xs text-slate-500">{a.severity} Severity</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-800/20 rounded-xl">
                            <Shield size={32} className="text-emerald-500 mb-3" />
                            <p className="text-slate-300 font-medium">No active security alerts</p>
                            <p className="text-slate-500 text-sm mt-1">Your environment is secure.</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
