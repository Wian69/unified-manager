"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Laptop, RefreshCw, X, AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle, Info, Activity, ChevronRight, Cpu, FileCode, Zap } from "lucide-react";
import { getComplianceInsight } from "@/lib/compliance-utils";

interface DeviceDetailsOverlayProps {
    deviceId: string;
    onClose: () => void;
}

export default function DeviceDetailsOverlay({ deviceId, onClose }: DeviceDetailsOverlayProps) {
    const [deviceData, setDeviceData] = useState<any>(null);
    const [agentReport, setAgentReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [remediating, setRemediating] = useState(false);
    const [remediationLogs, setRemediationLogs] = useState<string[]>([]);
    const [showAgentScript, setShowAgentScript] = useState(false);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/devices/${deviceId}`);
            const data = await res.json();
            setDeviceData(data);
        } catch (error) {
            console.error("Failed to fetch device details", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTelemetry = async () => {
        // Use Serial Number if available, as it's the most reliable link between Graph and Agent
        const identifier = deviceData?.device?.serialNumber || deviceId;
        if (!identifier) return;

        try {
            const res = await fetch(`/api/security/report/${identifier}`);
            const data = await res.json();
            if (data && data.timestamp) {
                setAgentReport(data);
            }
        } catch (e) {}
    };

    useEffect(() => {
        if (deviceId) {
            fetchDetails();
        }
    }, [deviceId]);

    // Fetch telemetry once device data (and serial number) is available
    useEffect(() => {
        if (deviceData?.device) {
            fetchTelemetry();
            const interval = setInterval(fetchTelemetry, 30000);
            return () => clearInterval(interval);
        }
    }, [deviceData]);

    const handleRemediate = async () => {
        setRemediating(true);
        setRemediationLogs(["Initializing Secure Communication...", "Requesting MDM Authorization..."]);
        try {
            const res = await fetch('/api/security/remediate', {
                method: 'POST',
                body: JSON.stringify({ 
                    deviceId, 
                    serialNumber: deviceData?.device?.serialNumber 
                })
            });
            const data = await res.json();
            if (data.success) {
                if (data.logs) setRemediationLogs(data.logs);
                setTimeout(() => fetchTelemetry(), 2000);
            }
        } catch (error) {
            setRemediationLogs(["Critical Error: Communication Timeout", "Please verify Intune connectivity."]);
        } finally {
            setRemediating(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return 'Unknown';
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    return (
        <div className="fixed inset-0 lg:left-64 z-50 bg-[#0b0f19] flex flex-col animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full flex flex-col min-h-full">
                <div className="flex justify-between items-center p-8 border-b border-slate-800/60 shrink-0">
                    <h2 className="text-3xl font-bold text-white">Device Details</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto w-full">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                            <RefreshCw className="animate-spin text-blue-400" size={32} />
                            Parsing Intune Data & Policies...
                        </div>
                    ) : deviceData?.device ? (
                        <div className="space-y-8 pb-10 w-full px-4">
                            {/* Overview Section */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Overview</h3>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Device Name</span>
                                        <span className="text-slate-200">{deviceData.device.deviceName || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Compliance State</span>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            (deviceData.device.complianceState || "").toLowerCase() === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 
                                            (deviceData.device.complianceState || "").toLowerCase() === 'ingraceperiod' ? 'bg-amber-500/20 text-amber-400' : 
                                            'bg-rose-500/20 text-rose-400'
                                        }`}>
                                            {deviceData.device.complianceState || 'unknown'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Primary User</span>
                                        <span className="text-blue-400">{deviceData.device.userDisplayName || 'None Assigned'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-bold uppercase text-slate-500 mb-1.5">UPN</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-300 text-sm">{deviceData.device.userPrincipalName || 'N/A'}</span>
                                            {deviceData.device.userPrincipalName && (
                                                <Link 
                                                    href={`/offboarding?user=${encodeURIComponent(deviceData.device.userPrincipalName)}`}
                                                    className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-xs font-black uppercase tracking-tight transition-all border border-blue-600/30"
                                                >
                                                    Audit Deletions
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Enrolled Date</span>
                                        <span className="text-slate-300">{deviceData.device.enrolledDateTime ? new Date(deviceData.device.enrolledDateTime).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Last Sync</span>
                                        <span className="text-slate-300">{deviceData.device.lastSyncDateTime ? new Date(deviceData.device.lastSyncDateTime).toLocaleString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Hardware Information */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Hardware & OS</h3>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm bg-slate-900/40 p-5 rounded-xl border border-slate-800/50">
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Operating System</span>
                                        <span className="text-slate-200">{deviceData.device.operatingSystem} {deviceData.device.osVersion}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Serial Number</span>
                                        <span className="text-slate-300 font-mono">{deviceData.device.serialNumber || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Manufacturer</span>
                                        <span className="text-slate-300">{deviceData.device.manufacturer || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Model</span>
                                        <span className="text-slate-300">{deviceData.device.model || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Encryption Status</span>
                                        <span className="text-slate-300">{deviceData.device.isEncrypted ? 'Encrypted' : 'Not Encrypted'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Jailbroken</span>
                                        <span className="text-slate-300">{deviceData.device.jailBroken ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Free Storage</span>
                                        <span className="text-slate-300">{formatBytes(deviceData.device.freeStorageSpaceInBytes)} / {formatBytes(deviceData.device.totalStorageSpaceInBytes)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Wi-Fi MAC Address</span>
                                        <span className="text-slate-300 font-mono">{deviceData.device.wifiMacAddress || 'N/A'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Security Operations Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                        <Cpu className="text-emerald-500" size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                                            Security Operations
                                            {agentReport?.remediationActive && (
                                                <span className="text-xs px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full animate-pulse font-black uppercase tracking-tighter">
                                                    Remediation in Progress...
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Targeted Unified Agent</p>
                                    </div>
                                </div>

                                {/* Live Telemetry Section */}
                                <div className="mb-8 p-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Live Agent Telemetry</span>
                                        </div>
                                        <span className="text-xs text-slate-600 font-mono">CHANNEL: 01-SEC-RPT</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm border-b border-slate-900 pb-3">
                                            <span className="text-slate-500">Security Pulse Status:</span>
                                            <span className={agentReport ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                                                {agentReport ? "ACTIVE / REPORTING" : "WAITING FOR AGENT..."}
                                            </span>
                                        </div>
                                        
                                        <div className="pt-2">
                                            <p className="text-xs text-slate-500 mb-3 italic">Reported Findings {agentReport?.timestamp && `(Last seen: ${new Date(agentReport.timestamp).toLocaleTimeString()})`}:</p>
                                            <div className="bg-black/40 p-4 rounded-xl border border-slate-900/50 min-h-[80px] flex flex-col justify-center">
                                                {agentReport ? (
                                                    <div className="space-y-2.5">
                                                        <p className={`text-sm flex items-center gap-3 ${agentReport.updateCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                                                            {agentReport.updateCount > 0 ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
                                                            {agentReport.updateCount} Missing Security Patches
                                                        </p>
                                                        
                                                        {agentReport.missingUpdates?.length > 0 && (
                                                            <div className="pl-6 space-y-1.5">
                                                                {agentReport.missingUpdates.map((title: string, i: number) => (
                                                                    <p key={`upd-${i}`} className="text-xs text-rose-400/80 flex items-center gap-2 break-word leading-relaxed">
                                                                         • {title}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {agentReport.vulnerabilities?.length > 0 ? (
                                                            agentReport.vulnerabilities.map((v: string, i: number) => (
                                                                <p key={`vuln-${i}`} className="text-sm text-amber-500/90 flex items-center gap-3 mt-1.5">
                                                                    <AlertTriangle size={14} />
                                                                    {v.replace(/-/g, ' ')}
                                                                </p>
                                                            ))
                                                        ) : agentReport.updateCount === 0 ? (
                                                            <p className="text-sm text-slate-400 flex items-center gap-3 mt-1.5">
                                                                <ShieldCheck size={14} className="text-emerald-500" />
                                                                Endpoint security posture is optimal.
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-slate-500 flex items-center gap-2 italic">
                                                        <Activity size={10} className="animate-pulse" />
                                                        Deploy the Unified Agent to see real-time vulnerabilities...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deployment Logs */}
                                    {(remediating || remediationLogs.length > 0) && (
                                        <div className="mt-5 p-4 bg-black/60 rounded-2xl border border-rose-500/20 font-mono text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex justify-between items-center mb-2 text-rose-400 font-black">
                                                <span className="tracking-widest">DEPLOYMENT TRACE</span>
                                                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                            </div>
                                            {remediationLogs.map((log, i) => (
                                                <div key={i} className="flex gap-3">
                                                    <span className="text-slate-600 min-w-[20px]">[{i+1}]</span>
                                                    <span className="text-slate-300">{log}</span>
                                                </div>
                                            ))}
                                            {remediating && <div className="text-rose-500/60 animate-pulse mt-2">&gt;&nbsp;Committing changes to Graph API...</div>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button 
                                        onClick={handleRemediate}
                                        disabled={remediating || agentReport?.remediationActive}
                                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl transition-all group border ${
                                            remediating || agentReport?.remediationActive
                                                ? 'bg-slate-900/40 border-slate-800 cursor-not-allowed'
                                                : 'bg-slate-900/60 hover:bg-emerald-500/10 border-slate-800 hover:border-emerald-500/30'
                                        }`}
                                    >
                                        <Zap className={`group-hover:text-emerald-400 ${remediating || agentReport?.remediationActive ? 'animate-pulse text-emerald-500' : 'text-slate-400'}`} size={32} />
                                        <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-200 uppercase tracking-tighter">
                                            {agentReport?.remediationActive ? 'Patching Endpoint...' : 'Deploy Instant Fix'}
                                        </span>
                                    </button>

                                    <button 
                                        onClick={handleRemediate}
                                        disabled={remediating || agentReport?.remediationActive}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all group border ${
                                            remediating || agentReport?.remediationActive
                                                ? 'bg-slate-900/40 border-slate-800 cursor-not-allowed'
                                                : 'bg-slate-900/60 hover:bg-blue-500/10 border-slate-800 hover:border-blue-500/30'
                                        }`}
                                    >
                                        <Activity className={`group-hover:text-blue-400 ${remediating || agentReport?.remediationActive ? 'animate-pulse text-blue-500' : 'text-slate-400'}`} size={24} />
                                        <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-200 uppercase tracking-tighter">
                                            {agentReport?.remediationActive ? 'Executing Scan...' : 'Instant Security Scan'}
                                        </span>
                                    </button>
                                </div>

                                <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-slate-700 transition-colors mb-8"
                                    onClick={() => setShowAgentScript(!showAgentScript)}>
                                    <div className="flex items-center gap-2">
                                        <FileCode size={14} className="text-slate-500 group-hover:text-amber-500 transition-colors" />
                                        <span className="text-[10px] font-bold text-slate-400">Intune One-Time Agent Script</span>
                                    </div>
                                    <ChevronRight size={14} className={`text-slate-600 transition-transform ${showAgentScript ? 'rotate-90' : ''}`} />
                                </div>

                                {showAgentScript && (
                                    <div className="mb-8 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-[11px] text-amber-500 font-bold uppercase tracking-widest">PowerShell Agent (v1.2.0)</p>
                                            <button onClick={() => { navigator.clipboard.writeText(`$LogPath = "$env:ProgramData..."\n# Unified Agent Script...`); alert("Script copied!"); }} className="text-[9px] bg-slate-800 px-2 py-1 rounded hover:bg-slate-700 text-slate-300">Copy Code</button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight mb-4 italic">Recommended: Deploy as 'Win32 App' or 'Script' in Intune for one-time diagnostic execution.</p>
                                        <pre className="text-[10px] text-slate-400 bg-black/50 p-3 rounded-lg border border-slate-900 overflow-x-auto font-mono max-h-[200px] leading-relaxed">
{`# Unified Security Agent (Diagnostic Mode)
$LogPath = "$env:ProgramData\\Microsoft\\..."
Write-Log "Scanning for critical Windows Updates..."
$SearchResult = $UpdateSearcher.Search("IsInstalled=0...")
if ($SearchResult.Updates.Count -gt 0) {
    Write-Log "VULNERABILITY DETECTED..."
}`}
                                        </pre>
                                    </div>
                                )}
                            </section>

                            {/* Applied Policies */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Active Policies</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-400 mb-2">Compliance Policies</h4>
                                        {deviceData.compliancePolicies?.length > 0 ? (
                                            <div className="space-y-3">
                                                {deviceData.compliancePolicies.map((p: any) => (
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
                                                        
                                                        {p.state !== 'compliant' && (p.errorCode || p.errorDescription) && (!p.settingStates || p.settingStates.length === 0) && (
                                                            <div className="p-4 bg-slate-900/40">
                                                                <div className="flex items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                                                                    <AlertTriangle className="text-rose-500 shrink-0" size={16} />
                                                                    <div className="flex-1">
                                                                        <p className="text-[11px] text-rose-400 font-bold mb-1">Policy Processing Error</p>
                                                                        <p className="text-[10px] text-slate-300 leading-tight mb-2">{p.errorDescription || "Intune was unable to evaluate specific settings for this policy."}</p>
                                                                        
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                                                                                <p className="text-[8px] text-slate-500 uppercase font-bold">Error Code</p>
                                                                                <p className="text-[10px] text-rose-400 font-mono">{p.errorCode || '0x00000000'}</p>
                                                                            </div>
                                                                            <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex-1">
                                                                                <p className="text-[8px] text-slate-500 uppercase font-bold">Probable Cause</p>
                                                                                <p className="text-[10px] text-slate-400">
                                                                                    {p.displayName?.includes('Default') ? 'Device is marked non-compliant by organizational defaults (e.g. no policies assigned).' : 'The device has not yet reported its security baseline to Intune.'}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="bg-blue-500/5 border border-blue-500/20 p-2 rounded-lg mt-3">
                                                                            <p className="text-[10px] text-blue-400 font-black uppercase mb-1">Recommended Fix:</p>
                                                                            <p className="text-slate-400 text-[10px] leading-tight">
                                                                                Trigger a manual sync on the device (Settings &gt; Accounts &gt; Access work or school &gt; Info &gt; Sync). If this is a 'Default Policy' error, ensure at least one custom compliance policy is assigned to the 'All Users' group.
                                                                            </p>
                                                                        </div>
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
                                        {deviceData.configurationPolicies?.length > 0 ? (
                                            <ul className="space-y-2">
                                                {deviceData.configurationPolicies.map((p: any) => (
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
    );
}
