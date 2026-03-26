"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, RefreshCw, X, AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle, Info } from "lucide-react";
import { getComplianceInsight } from "@/lib/compliance-utils";

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeStorage, setActiveStorage] = useState<string>("Detecting...");
    const [isPersistenceLinked, setIsPersistenceLinked] = useState<boolean | null>(null);

    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [selectedDeviceData, setSelectedDeviceData] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

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

    // Forensic command functions removed.

    useEffect(() => {
        fetchDevices(true);
        const interval = setInterval(() => fetchDevices(false), 3000);
        return () => clearInterval(interval);
    }, []);

    const handleDeviceClick = async (id: string) => {
        setSelectedDeviceId(id);
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/devices/${id}`);
            const data = await res.json();
            setSelectedDeviceData(data);
        } catch (error) {
            console.error("Failed to fetch device details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return 'Unknown';
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
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
                <div className="fixed inset-0 lg:left-64 z-50 bg-[#0b0f19] flex flex-col animate-in fade-in duration-300 overflow-y-auto">
                    <div className="w-full flex flex-col min-h-full">
                        <div className="flex justify-between items-center p-8 border-b border-slate-800/60 shrink-0">
                            <h2 className="text-3xl font-bold text-white">Device Details</h2>
                            <button onClick={() => setSelectedDeviceId(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto w-full">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                                    <RefreshCw className="animate-spin text-blue-400" size={32} />
                                    Parsing Intune Data & Policies...
                                </div>
                            ) : selectedDeviceData?.device ? (
                                <div className="space-y-8 pb-10 w-full px-4">
            {/* Overview Section */}
            <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Overview</h3>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Device Name</span>
                                                <span className="text-slate-200">{selectedDeviceData.device.deviceName || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Compliance State</span>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    (selectedDeviceData.device.complianceState || "").toLowerCase() === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 
                                                    (selectedDeviceData.device.complianceState || "").toLowerCase() === 'ingraceperiod' ? 'bg-amber-500/20 text-amber-400' : 
                                                    'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                    {selectedDeviceData.device.complianceState || 'unknown'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Primary User</span>
                                                <span className="text-blue-400">{selectedDeviceData.device.userDisplayName || 'None Assigned'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">UPN</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-300">{selectedDeviceData.device.userPrincipalName || 'N/A'}</span>
                                                    {selectedDeviceData.device.userPrincipalName && (
                                                        <Link 
                                                            href={`/offboarding?user=${encodeURIComponent(selectedDeviceData.device.userPrincipalName)}`}
                                                            className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-[9px] font-black uppercase tracking-tighter transition-all border border-blue-600/30"
                                                        >
                                                            Audit Deletions
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Enrolled Date</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.enrolledDateTime ? new Date(selectedDeviceData.device.enrolledDateTime).toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Last Sync</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.lastSyncDateTime ? new Date(selectedDeviceData.device.lastSyncDateTime).toLocaleString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Hardware Information */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Hardware & OS</h3>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm bg-slate-900/40 p-5 rounded-xl border border-slate-800/50">
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Operating System</span>
                                                <span className="text-slate-200">{selectedDeviceData.device.operatingSystem} {selectedDeviceData.device.osVersion}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Serial Number</span>
                                                <span className="text-slate-300 font-mono">{selectedDeviceData.device.serialNumber || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Manufacturer</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.manufacturer || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Model</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.model || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Encryption Status</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.isEncrypted ? 'Encrypted' : 'Not Encrypted'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Jailbroken</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.jailBroken ? 'Yes' : 'No'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Free Storage</span>
                                                <span className="text-slate-300">{formatBytes(selectedDeviceData.device.freeStorageSpaceInBytes)} / {formatBytes(selectedDeviceData.device.totalStorageSpaceInBytes)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Wi-Fi MAC Address</span>
                                                <span className="text-slate-300 font-mono">{selectedDeviceData.device.wifiMacAddress || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Applied Policies */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Active Policies</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Compliance Policies</h4>
                                                {selectedDeviceData.compliancePolicies?.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedDeviceData.compliancePolicies.map((p: any) => (
                                                            <div key={p.id} className="bg-slate-800/20 rounded-xl border border-slate-700/50 overflow-hidden">
                                                                <div className="p-4 flex justify-between items-center border-b border-slate-700/30">
                                                                    <div className="flex items-center gap-3">
                                                                        {p.state === 'compliant' ? <ShieldCheck className="text-emerald-500" size={18} /> : <ShieldAlert className="text-rose-500" size={18} />}
                                                                        <span className="text-slate-200 text-sm font-bold">{p.displayName || "Compliance Policy"}</span>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-black rounded ${p.state === 'compliant' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                                        {p.state}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Granular Setting states - ONLY show failures to reduce noise */}
                                                                {p.state !== 'compliant' && (!p.settingStates || p.settingStates.length === 0) && (
                                                                    <div className="p-4 bg-slate-900/40">
                                                                        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                                                            <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                                                                            <div>
                                                                                <p className="text-[11px] text-amber-400 font-bold mb-1">Diagnostic Data Pending Sync</p>
                                                                                <p className="text-[10px] text-slate-400 leading-tight">Specific setting-level failures are still being synchronized from the device. This usually resolves after the next successful device sync.</p>
                                                                                <p className="text-[10px] text-slate-500 mt-2 italic">Ref: Intune Admin Center &gt; Devices &gt; Monitor &gt; Compliance status</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {p.settingStates?.filter((s: any) => s.state !== 'compliant' && s.state !== 'notApplicable').length > 0 && (
                                                                    <div className="p-4 bg-slate-900/40 space-y-4">
                                                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 italic">Non-Compliant Settings Detected:</p>
                                                                        {p.settingStates.filter((s: any) => s.state !== 'compliant' && s.state !== 'notApplicable').map((s: any, idx: number) => {
                                                                            const insight = getComplianceInsight(s.settingName);
                                                                            return (
                                                                                <div key={idx} className="border-l-2 border-rose-500/50 pl-4 py-1">
                                                                                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
                                                                                        <Info size={12} />
                                                                                        {s.settingName}
                                                                                    </div>
                                                                                    <p className="text-slate-300 text-xs mb-2 leading-relaxed">
                                                                                        <span className="text-slate-500 font-medium">Issue:</span> {insight.reason}
                                                                                    </p>
                                                                                    <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded-lg">
                                                                                        <p className="text-[10px] text-blue-400 font-black uppercase mb-1">How to Fix:</p>
                                                                                        <p className="text-slate-400 text-[11px] leading-tight">{insight.remediation}</p>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {p.state === 'compliant' && (
                                                                    <div className="px-4 py-2 bg-emerald-500/5 flex items-center gap-2 text-[10px] text-emerald-500/70 font-medium">
                                                                        <CheckCircle size={10} />
                                                                        All security rules in this policy are meeting requirements.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No compliance policies found.</p>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Configuration Policies</h4>
                                                {selectedDeviceData.configurationPolicies?.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {selectedDeviceData.configurationPolicies.map((p: any) => (
                                                            <li key={p.id} className="bg-slate-800/30 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                                <span className="text-slate-200 text-sm font-medium">{p.displayName || p.id}</span>
                                                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${p.state === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : p.state === 'notCompliant' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'}`}>
                                                                    {p.state}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No configuration policies found.</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="text-center text-rose-400 mt-10">
                                    Failed to load device details from Intune.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
