"use client";

import { useEffect, useState } from "react";
import { Laptop, RefreshCw } from "lucide-react";

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/devices');
            const data = await res.json();
            if (data.devices) {
                setDevices(data.devices);
            }
        } catch (error) {
            console.error("Failed to fetch devices", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Laptop size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Device Management</h1>
                        <p className="text-slate-400">View and manage all Intune enrolled devices.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchDevices}
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
                                <th className="px-6 py-4">Last Sync</th>
                                <th className="px-6 py-4">Compliance status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Loading devices...
                                    </td>
                                </tr>
                            ) : devices.length > 0 ? (
                                devices.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">{d.deviceName || 'Unknown'}</td>
                                        <td className="px-6 py-4">{d.operatingSystem || 'N/A'}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono">{d.serialNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {d.lastSyncDateTime ? new Date(d.lastSyncDateTime).toLocaleString() : 'Never'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.complianceState === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {d.complianceState || 'unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No devices found in Intune.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
