"use client";

import { useEffect, useState } from "react";
import { Shield, RefreshCw } from "lucide-react";

export default function SecurityPage() {
    const [security, setSecurity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchSecurity = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/security');
            const data = await res.json();
            setSecurity(data);
        } catch (error) {
            console.error("Failed to fetch security", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurity();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Security Center</h1>
                        <p className="text-slate-400">Microsoft Defender alerts and posture.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchSecurity}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Secure Score</h2>
                    {loading ? (
                        <p className="text-slate-500">Loading score...</p>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-6xl font-black text-rose-400 mb-2">
                                {security?.secureScore?.currentScore ? Math.round(security.secureScore.currentScore) : "-"}
                            </div>
                            <p className="text-slate-400">Current Score</p>
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-slate-200 mb-4">Active Alerts</h2>
                    {loading ? (
                        <p className="text-slate-500">Loading alerts...</p>
                    ) : security?.recentAlerts?.length > 0 ? (
                        <div className="space-y-4">
                            {security.recentAlerts.map((a: any) => (
                                <div key={a.id} className="p-4 bg-slate-800/30 rounded-xl border-l-4 border-rose-500">
                                    <p className="font-medium text-slate-200">{a.title}</p>
                                    <p className="text-sm text-slate-500 mt-1">{a.severity} Severity</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 py-8 text-center">No active alerts found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
