"use client";

import { useEffect, useState } from "react";
import { Shield, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Info } from "lucide-react";

export default function SecurityPage() {
    const [security, setSecurity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedRec, setExpandedRec] = useState<string | null>(null);

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

    const score = security?.secureScore;
    const recommendations = security?.recommendations || [];
    const recentAlerts = security?.recentAlerts || [];

    const percentage = score ? Math.round((score.currentScore / score.maxScore) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Security Center</h1>
                        <p className="text-slate-400">Microsoft Defender posture and vulnerability management.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="lg:col-span-1 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-8 flex flex-col items-center justify-center backdrop-blur-md">
                    <h2 className="text-xl font-bold text-slate-200 mb-6 w-full">Microsoft Secure Score</h2>
                    {loading ? (
                        <div className="py-10 text-slate-500 flex flex-col items-center">
                            <RefreshCw size={40} className="animate-spin text-rose-500 mb-4" />
                            Calculating score...
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center">
                            <div className="text-7xl font-black text-rose-500 drop-shadow-lg leading-none">
                                {score ? Math.round(score.currentScore) : "-"}
                            </div>
                            <div className="text-slate-400 mt-2 font-medium">Out of {score?.maxScore || "-"} points</div>
                            <div className="mt-8 w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                                <div 
                                    className="bg-rose-500 h-full transition-all duration-1000" 
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-4 text-center">Your security posture is at **{percentage}%** implementation.</p>
                        </div>
                    )}
                </div>

                {/* Recommendations Card */}
                <div className="lg:col-span-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-200">Security Recommendations</h2>
                        <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
                            {recommendations.length} Gains Available
                        </span>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 bg-slate-800/20 rounded-xl animate-pulse" />
                            ))
                        ) : recommendations.length > 0 ? (
                            recommendations.filter((r: any) => r.deprecated !== true).slice(0, 15).map((r: any) => (
                                <div key={r.id} className="bg-slate-800/20 rounded-xl border border-slate-700/50 overflow-hidden">
                                    <button 
                                        onClick={() => setExpandedRec(expandedRec === r.id ? null : r.id)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-200">{r.title}</p>
                                                <p className="text-xs text-slate-500">Impact: +{r.maxScore} Max Points</p>
                                            </div>
                                        </div>
                                        {expandedRec === r.id ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                    </button>
                                    
                                    {expandedRec === r.id && (
                                        <div className="p-5 border-t border-slate-700/50 bg-slate-900/20 animate-in slide-in-from-top-2 duration-200">
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Info size={14} /> Description
                                                </h4>
                                                <p className="text-sm text-slate-300 leading-relaxed overflow-hidden" dangerouslySetInnerHTML={{ __html: r.description }} />
                                            </div>
                                            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-700/50">
                                                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Remediation Steps</h4>
                                                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: r.remediationSteps }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-dashed border-slate-700">
                                <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3 opacity-50" />
                                <p className="text-slate-500">No high-priority vulnerabilities found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md">
                <h2 className="text-xl font-bold text-slate-200 mb-6">Recent Defender Alerts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-800/20 rounded-xl animate-pulse" />
                        ))
                    ) : recentAlerts.length > 0 ? (
                        recentAlerts.map((a: any) => (
                            <div key={a.id} className={`p-4 bg-slate-800/30 rounded-xl border-l-4 ${a.severity === 'high' ? 'border-rose-500' : 'border-amber-500'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-slate-200 line-clamp-1">{a.title}</p>
                                    <span className="text-[10px] uppercase font-black text-slate-500">{a.severity}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">Status: {a.status}</p>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                    <span>{new Date(a.eventDateTime).toLocaleDateString()}</span>
                                    <a href={a.alertWebUrl} target="_blank" className="text-rose-400 hover:text-rose-300 transition-colors">VIEW IN DEFENDER</a>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-10 text-center text-slate-500 italic">
                            No active security alerts in the last 30 days.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
