"use client";

import React, { useEffect, useState } from "react";
import { 
    ShieldAlert, 
    ShieldCheck, 
    Globe, 
    Smartphone, 
    AlertCircle, 
    CheckCircle2, 
    ArrowRight, 
    RefreshCw, 
    X,
    Clock,
    User,
    Lock,
    Zap,
    ChevronDown,
    ChevronUp
} from "lucide-react";

export default function AccessAuditModule() {
    const [auditData, setAuditData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fixingId, setFixingId] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const fetchAudit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/security/audit/recent-failures');
            const data = await res.json();
            if (data.failures) {
                setAuditData(data.failures);
                setError(null);
            } else {
                setError(data.error || "Failed to fetch audit logs");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudit();
    }, []);

    const handleFix = async (failure: any) => {
        const blockingPolicy = failure.appliedPolicies.find((p: any) => p.result === 'failure' || p.result === 'notApplied' || p.result === 'reportOnlyFailure');
        if (!blockingPolicy) {
            alert("No specific blocking policy identified for this failure.");
            return;
        }

        if (!confirm(`Are you sure you want to apply a fix to the policy: "${blockingPolicy.displayName}"? This will exclude Intune Enrollment apps to allow user onboarding.`)) {
            return;
        }

        setFixingId(failure.id);
        try {
            const res = await fetch('/api/security/remediate/ca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policyId: blockingPolicy.id,
                    action: 'exclude-enrollment'
                })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Successfully updated policy exclusions!");
                fetchAudit();
            } else {
                alert("Failed to apply fix: " + (result.details || result.error));
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setFixingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                        <Lock size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Sign-in & Policy Audit</h2>
                        <p className="text-slate-400">Monitoring failed access attempts and Conditional Access blocks in real-time.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchAudit}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-all border border-slate-700 active:scale-95"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh Logs
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading && auditData.length === 0 ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-800/20 rounded-2xl animate-pulse border border-slate-800/50" />
                    ))
                ) : auditData.length > 0 ? (
                    auditData.map((f) => (
                        <div 
                            key={f.id} 
                            className={`group relative overflow-hidden bg-slate-900/40 rounded-2xl border transition-all duration-300 ${
                                expandedRow === f.id ? 'border-rose-500/50 ring-1 ring-rose-500/20' : 'border-slate-800/60 hover:border-slate-700'
                            }`}
                        >
                            {/* Top row */}
                            <div 
                                className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                                onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                                    <div className={`p-2 rounded-full ${f.conditionalAccessStatus === 'failure' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-100">{f.user}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">ID: {f.id.split('-')[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Globe size={12} className="text-slate-500" />
                                            <span className="text-xs text-slate-400">{f.location}</span>
                                            <span className="text-slate-700">•</span>
                                            <Clock size={12} className="text-slate-500" />
                                            <span className="text-xs text-slate-400">{new Date(f.time).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="hidden md:block">
                                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Application</p>
                                        <p className="text-sm text-slate-300 font-medium">{f.app}</p>
                                    </div>
                                    <div className="hidden lg:block text-right">
                                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Error Code</p>
                                        <p className="text-sm font-mono text-rose-400 font-bold">{f.errorCode}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {expandedRow === f.id ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedRow === f.id && (
                                <div className="px-5 pb-5 pt-0 border-t border-slate-800/60 animate-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        {/* Failure Diagnostics */}
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Diagnostic Trace</h4>
                                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 space-y-3">
                                                    <div className="flex gap-3">
                                                        <AlertCircle className="text-rose-500 shrink-0" size={16} />
                                                        <p className="text-sm text-slate-300 leading-relaxed">
                                                            <span className="font-bold text-rose-400">Failure Reason:</span> {f.failureReason}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-3 pt-2 border-t border-slate-900">
                                                        <Smartphone className="text-blue-400 shrink-0" size={16} />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400">Device Context:</p>
                                                            <p className="text-[11px] text-slate-500 mt-1">
                                                                {f.deviceDetail?.operatingSystem} • {f.deviceDetail?.browser}
                                                                <br />
                                                                <span className={f.deviceDetail?.isCompliant ? "text-emerald-500" : "text-rose-500"}>
                                                                    {f.deviceDetail?.isCompliant ? "✓ Compliant" : "✗ Non-Compliant"}
                                                                </span> • {f.deviceDetail?.isManaged ? "Managed" : "Unmanaged"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Policy Breakdown & Fix */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Applied Policies</h4>
                                            <div className="space-y-2">
                                                {f.appliedPolicies.length > 0 ? (
                                                    f.appliedPolicies.map((p: any, i: number) => {
                                                        const isFailure = p.result === 'failure' || p.result === 'notApplied';
                                                        return (
                                                            <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${
                                                                isFailure ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-800/20 border-slate-800/50'
                                                            }`}>
                                                                <div className="flex items-center gap-3">
                                                                    {isFailure ? <ShieldAlert size={14} className="text-rose-500" /> : <ShieldCheck size={14} className="text-emerald-500" />}
                                                                    <span className={`text-xs font-bold ${isFailure ? 'text-slate-200' : 'text-slate-400'}`}>{p.displayName}</span>
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                                                                    isFailure ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                                                                }`}>
                                                                    {p.result}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                                                        <AlertCircle className="text-amber-500 shrink-0" size={14} />
                                                        <p className="text-[11px] text-slate-400">No standard policies applied. This failure may be caused by <span className="text-amber-400 font-bold">Security Defaults</span> or a Microsoft-managed baseline.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fix Action */}
                                            {(f.appliedPolicies.some((p: any) => p.result === 'failure' || p.result === 'notApplied') || f.errorCode === 50097) && (
                                                <div className="space-y-3">
                                                    <button 
                                                        onClick={() => handleFix(f)}
                                                        disabled={fixingId === f.id}
                                                        className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 py-3 rounded-xl border border-emerald-600/30 transition-all font-bold text-xs uppercase tracking-widest active:scale-95 disabled:opacity-50"
                                                    >
                                                        {fixingId === f.id ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                                                        {f.appliedPolicies.length > 0 ? "Apply Policy Exclusion Fix" : "Apply Universal Enrollment Fix"}
                                                    </button>
                                                    
                                                    {f.appliedPolicies.length === 0 && (
                                                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex gap-3">
                                                            <Info className="text-blue-400 shrink-0" size={14} />
                                                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                                                No specific policy was reported. Applying the "Universal Fix" will scan all your policies and add enrollment exclusions to any that might be blocking this device join.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-500/30 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">No access failures detected</h3>
                        <p className="text-slate-500 mt-1">Conditional Access appears to be functioning optimally across all regions.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
