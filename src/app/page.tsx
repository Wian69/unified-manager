"use client";

import { useEffect, useState } from "react";
import { Laptop, Users, Shield, HardDrive, RefreshCw } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import DeviceDetailsOverlay from "@/components/DeviceDetailsOverlay";

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
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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
            {/* ... (existing dashboard sections) */}

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
                            <div 
                                key={d.id} 
                                onClick={() => setSelectedDeviceId(d.id)}
                                className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border border-slate-800/50 hover:border-blue-500/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <Laptop size={20} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                                    <div>
                                        <p className="font-medium text-slate-200 group-hover:text-white transition-colors">{d.deviceName}</p>
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

            {selectedDeviceId && (
                <DeviceDetailsOverlay 
                    deviceId={selectedDeviceId} 
                    onClose={() => setSelectedDeviceId(null)} 
                />
            )}
        </div>
    );
}
