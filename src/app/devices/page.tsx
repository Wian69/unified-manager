"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DeviceDetailsOverlay from "@/components/DeviceDetailsOverlay";

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    const fetchDevices = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const [intuneRes] = await Promise.all([
                fetch('/api/devices')
            ]);
            
            const intuneData = await intuneRes.json();

            if (intuneData.devices) {
                const sorted = (intuneData.devices || []).sort((a: any, b: any) => (a.deviceName || "").localeCompare(b.deviceName || ""));
                setDevices(sorted);
                setError(null);
            } else if (intuneData.error) {
                setError(intuneData.details || intuneData.error);
            }
        } catch (err: any) {
            console.error("Failed to fetch devices", err);
            setError(err.message || "An unexpected error occurred while fetching devices.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices(true);
        const interval = setInterval(() => fetchDevices(false), 3000);
        return () => clearInterval(interval);
    }, []);

    const handleDeviceClick = (id: string) => {
        setSelectedDeviceId(id);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Laptop size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Device Management</h1>
                        <p className="text-slate-400">View and manage all Intune enrolled devices.</p>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle size={10} className="text-amber-500" />
                            Note: Intune Portal changes may take 10-20 minutes to sync via Graph API.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => fetchDevices(true)}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950/50 text-slate-400 uppercase font-medium border-b border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4">Device Name</th>
                                <th className="px-6 py-4">OS</th>
                                <th className="px-6 py-4">Serial Number</th>
                                <th className="px-6 py-4">Compliance status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {error ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8">
                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm font-mono whitespace-pre-wrap">
                                            <div className="font-bold flex items-center gap-2 mb-1">
                                                <X size={14} />
                                                API Connectivity Failure
                                            </div>
                                            {error}
                                        </div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Loading devices...
                                    </td>
                                </tr>
                            ) : devices.length > 0 ? (
                                devices.map((d: any) => {
                                    return (
                                        <tr 
                                            key={d.id} 
                                            onClick={() => handleDeviceClick(d.id)}
                                            className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-200">{d.deviceName || 'Unknown'}</td>
                                            <td className="px-6 py-4">{d.operatingSystem || 'N/A'}</td>
                                             <td className="px-6 py-4 text-slate-400 font-mono">{d.serialNumber || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    (d.complianceState || "").toLowerCase() === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                    (d.complianceState || "").toLowerCase() === 'ingraceperiod' ? 'bg-amber-500/20 text-amber-400' : 
                                                    'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                    {d.complianceState || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {d.userId && (
                                                    <Link 
                                                        href={`/offboarding/${d.userId}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-600/20 transition-all active:scale-95"
                                                    >
                                                        Details
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No devices found in Intune.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Device Details Full Page Overlay */}
            {selectedDeviceId && (
                <DeviceDetailsOverlay 
                    deviceId={selectedDeviceId} 
                    onClose={() => setSelectedDeviceId(null)} 
                />
            )}

        </div>
    );
}
