"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, Server, Shield, Terminal, MessageSquare, Download, RefreshCw, AlertTriangle, Monitor, Package, Globe, Hash, Camera } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function LiveDataDashboard() {
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Results states
    const [results, setResults] = useState<any>({});
    const [polling, setPolling] = useState(false);
    const [activeStorage, setActiveStorage] = useState<string>("Detecting...");
    const [isPersistenceLinked, setIsPersistenceLinked] = useState<boolean | null>(null);
    const [activeNetTab, setActiveNetTab] = useState<string>("ipconfig");
    const [hostedVersion, setHostedVersion] = useState<string | null>(null);

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // Fetch User
                const userRes = await fetch(`/api/users/${userId}`);
                const userData = await userRes.json();
                if (userData.error) throw new Error(userData.error);
                setUser(userData.user);

                // Fetch Devices
                const devRes = await fetch('/api/devices');
                const devData = await devRes.json();
                const userDevices = (devData.devices || []).filter((d: any) => d.userId === userId || (d.userDisplayName && d.userDisplayName === userData.user.displayName));
                setDevices(userDevices);

                // Fetch Agents
                const agentRes = await fetch('/api/agent/list');
                const agentData = await agentRes.json();
                setAgents(agentData.agents || []);

                // Fetch Diagnostic for persistence check
                const diagRes = await fetch('/api/diag');
                const diagData = await diagRes.json();
                setIsPersistenceLinked(diagData.diagnostics?.kvConnected || diagData.diagnostics?.supabaseConnected);
                setActiveStorage(diagData.diagnostics?.activeStorage || "Unknown");

                // Also fetch the currently hosted agent version for comparison
                const updateRes = await fetch('/api/agent/update', { method: 'HEAD' });
                const v = updateRes.headers.get('X-Agent-Version');
                setHostedVersion(v);

                // Map First Available Agent automatically with fuzzy matching (Prioritizing v3.x)
                if (userDevices.length > 0) {
                    const matchedAgents = (agentData.agents || []).filter((a: any) => {
                        const agentSerial = (a.serialNumber || "").trim().toLowerCase();
                        const agentName = (a.deviceName || "").trim().toLowerCase();
                        
                        return userDevices.some((d: any) => {
                            const deviceSerial = (d.serialNumber || d.hardwareInformation?.serialNumber || "").trim().toLowerCase();
                            const deviceName = (d.deviceName || "").trim().toLowerCase();
                            return (agentSerial && deviceSerial && agentSerial === deviceSerial) || 
                                   (agentName && deviceName && agentName === deviceName);
                        });
                    }).sort((a: any, b: any) => {
                        const vA = a.version || "0.0.0";
                        const vB = b.version || "0.0.0";
                        if (vB.startsWith('3.') && !vA.startsWith('3.')) return -1;
                        if (!vB.startsWith('3.') && vA.startsWith('3.')) return 1;
                        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
                    });

                    if (matchedAgents.length > 0) {
                        const v3Agent = matchedAgents.find((a: any) => a.version?.startsWith('3'));
                        setSelectedAgentId(v3Agent ? v3Agent.id : matchedAgents[0].id);
                    }
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchAgentsOnly = async () => {
            try {
                const agentRes = await fetch('/api/agent/list');
                const agentData = await agentRes.json();
                const newAgents = agentData.agents || [];
                setAgents(newAgents);

                // AUTO-PROMOTION: If we are currently selected on a legacy agent (or none), 
                // and a v3 master appears for this device, auto-switch to it!
                if (devices.length > 0) {
                    const matchedAgents = newAgents.filter((a: any) => {
                        const agentSerial = (a.serialNumber || "").trim().toLowerCase();
                        const agentName = (a.deviceName || "").trim().toLowerCase();
                        return devices.some((d: any) => {
                            const deviceSerial = (d.serialNumber || d.hardwareInformation?.serialNumber || "").trim().toLowerCase();
                            const deviceName = (d.deviceName || "").trim().toLowerCase();
                            return (agentSerial && deviceSerial && agentSerial === deviceSerial) || 
                                   (agentName && deviceName && agentName === deviceName);
                        });
                    });

                    const bestV3 = matchedAgents.find((a: any) => a.version?.startsWith('3'));
                    if (bestV3 && (!selectedAgentId || !newAgents.find((a: any) => a.id === selectedAgentId)?.version?.startsWith('3'))) {
                        console.log("Auto-promoting to Master Agent:", bestV3.id);
                        setSelectedAgentId(bestV3.id);
                    }
                }
            } catch (e) { console.error("Polling error", e); }
        };

        if (userId) {
            initData();
            const interval = setInterval(fetchAgentsOnly, 3000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    // Poll for results if an agent is selected - NEW v3.0 Telemetry Sync
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (userId) {
            const fetchResults = async () => {
                try {
                    setPolling(true);
                    const res = await fetch(`/api/offboarding/${userId}/dlp?t=${Date.now()}`);
                    const data = await res.json();
                    if (data.events) {
                        const newResults = { ...results };
                        data.events.forEach((e: any) => {
                            if (e.type === 'COMMAND_RESULT' || e.type === 'security_snapshot' || e.type === 'discovery_result') {
                                // Map event back to UI result keys
                                if (e.details.includes('Instant Forensic Capture')) {
                                    newResults['Screenshot'] = { data: e.details.split(' | ')[1] };
                                } else if (e.type === 'discovery_result') {
                                    newResults['Programs'] = { data: e.details };
                                } else {
                                    // General output
                                    newResults['CustomScriptResult'] = { data: e.details };
                                }
                            }
                        });
                        setResults(newResults);
                    }
                } catch (e) {
                    console.error("Telemetry fetch failed", e);
                } finally {
                    setPolling(false);
                }
            };
            fetchResults();
            interval = setInterval(fetchResults, 5000);
        }
        return () => clearInterval(interval);
    }, [userId]);

    const queueCommand = async (type: string, payload: any = {}) => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/devices/${userId}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, payload })
            });
            if (!res.ok) throw new Error(await res.text());
            alert(`${type} command queued successfully!`);
        } catch (e: any) {
            alert(`Failed: ${e.message}`);
        }
    };

    const triggerPrograms = () => {
        queueCommand('SCAN_DEVICE', {});
    };

    const triggerWinget = () => {
        queueCommand('shell', { command: `winget upgrade --all --silent --accept-package-agreements --accept-source-agreements | Out-String` });
    };

    const triggerMessage = async () => {
        const msg = prompt("Enter message to popup on device:");
        if (!msg) return;
        queueCommand('Message', { text: msg });
    };

    const triggerScreenshot = () => {
        queueCommand('SCREENSHOT', {});
    };

    const [customScript, setCustomScript] = useState("");

    const handleCustomScript = () => {
        if (!customScript.trim()) return;
        queueCommand('shell', { command: customScript });
    };

    if (loading) return <div className="p-20 text-center text-white font-mono uppercase tracking-[0.2em] animate-pulse">Initializing Data Engine v3.0...</div>;
    if (error) return <div className="p-20 text-center text-rose-500 font-bold">Error: {error}</div>;

    const currentAgent = agents.find((a: any) => a.id === selectedAgentId) || null;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-left">
                        <Link href={`/offboarding/${userId}`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <Activity className="text-emerald-500" size={28} />
                                LIVE DATA DASHBOARD v3.0
                            </h1>
                            <p className="text-slate-400 font-mono text-sm mt-1">
                                Forensic Mastery & Real-time Telemetry for <span className="text-white font-bold">{user?.displayName}</span>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded ml-2">Storage: {activeStorage}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Persistence Alert */}
                {isPersistenceLinked === false && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-center justify-between gap-6 animate-pulse">
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-500 uppercase text-xs tracking-widest mb-1">Volatile Memory Mode Active</h4>
                                <p className="text-slate-400 text-sm max-w-2xl">
                                    Heartbeats are inconsistent because no database is linked. Data will vary across refreshes. 
                                    <span className="text-amber-400 font-bold ml-1">Connect Vercel KV for 100% stability.</span>
                                </p>
                            </div>
                        </div>
                        <a 
                            href="https://vercel.com/dashboard" 
                            target="_blank" 
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all"
                        >
                            Link Storage
                        </a>
                    </div>
                )}
            </div>

            {/* Device & Agent Selection Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Server size={14} className="text-blue-500" /> Endpoint Selection
                </h3>
                
                {devices.length === 0 ? (
                    <div className="p-4 bg-slate-800/50 rounded-xl text-slate-400 text-sm italic">
                        No Intune enrolled devices found for this user.
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <select 
                            className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 w-full max-w-md focus:outline-none focus:border-blue-500"
                            value={selectedAgentId || ""}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                        >
                            <option value="">Select an Agent / Device...</option>
                            {devices.map(d => {
                                let matchedAgents = agents.filter((a: any) => {
                                    const agentSerial = (a.serialNumber || "").trim().toLowerCase();
                                    const agentName = (a.deviceName || "").trim().toLowerCase();
                                    const deviceSerial = (d.serialNumber || d.hardwareInformation?.serialNumber || "").trim().toLowerCase();
                                    const deviceName = (d.deviceName || "").trim().toLowerCase();
                                    
                                    return (agentSerial && deviceSerial && agentSerial === deviceSerial) || 
                                           (agentName && deviceName && agentName === deviceName);
                                });

                                // V3-STRICT FILTER: If we have a V3 agent, hide all legacy ghosts for this device!
                                const hasV3 = matchedAgents.some(a => a.version?.startsWith('3'));
                                if (hasV3) {
                                    matchedAgents = matchedAgents.filter(a => a.version?.startsWith('3'));
                                }

                                matchedAgents.sort((a: any, b: any) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

                                if (matchedAgents.length === 0) {
                                    return (
                                        <option key={d.id} value="" disabled>
                                            Intune Reference: {d.deviceName} ({d.serialNumber || "No Serial"}) - NO REFINED MATCH
                                        </option>
                                    );
                                }
                                return matchedAgents.map((a: any) => (
                                    <option key={`${d.id}-${a.id}`} value={a.id}>
                                        {d.deviceName} ({a.localIp || a.publicIp}) {a.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'} [v{a.version || '?.?'}]
                                    </option>
                                ));
                            })}
                        </select>
                        <button onClick={() => location.reload()} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
                            Refresh
                        </button>
                    </div>
                )}
            </div>

            {/* Telemetry Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
                    <Hash size={16} className="text-blue-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Internal IPv4</p>
                    <p className="text-lg text-white font-mono">{currentAgent ? currentAgent.localIp || currentAgent.publicIp : "---.---.---.---"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] pointer-events-none" />
                    <Globe size={16} className="text-emerald-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Service Provider</p>
                    <p className="text-lg text-white font-mono">{currentAgent ? currentAgent.isp || "Unknown" : "--------"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />
                    <Monitor size={16} className="text-indigo-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">OS Version</p>
                    <p className="text-sm text-white font-bold leading-tight line-clamp-2">{currentAgent ? currentAgent.os || "Unknown" : "--------"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className={`w-4 h-4 rounded-full ${currentAgent?.status === 'online' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'} mb-3`} />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Heartbeat Status</p>
                    <p className={`text-sm font-bold flex flex-col items-center ${currentAgent?.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span>{currentAgent?.status === 'online' ? 'ONLINE, ACTIVE' : 'OFFLINE'}</span>
                        {currentAgent?.lastSeen && (
                            <span className={`text-[10px] font-mono mt-1 px-2 py-0.5 rounded-full border ${currentAgent?.status === 'online' ? 'text-emerald-400/80 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400/80 bg-rose-500/10 border-rose-500/20'}`}>
                                v{currentAgent.version || '?.?'} | Seen {Math.max(0, Math.floor((new Date().getTime() - new Date(currentAgent.lastSeen).getTime()) / 1000))}s ago
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Execution Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                
                {/* Custom Scripts */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <Terminal className="text-blue-500" size={20} />
                            Remote Master Console
                        </h2>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                            PowerShell / CMD
                        </span>
                    </div>
                    <textarea 
                        value={customScript}
                        onChange={(e) => setCustomScript(e.target.value)}
                        placeholder="Enter command (e.g. dir, get-service, etc.)..."
                        className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-blue-500 resize-none mb-4 custom-scrollbar"
                    />
                    <div className="flex gap-4">
                        <button onClick={handleCustomScript} disabled={!selectedAgentId} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                            Execute Command
                        </button>
                    </div>

                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-8 mb-2">Forensic Output</h3>
                    <div className="flex-1 bg-black/50 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-64 custom-scrollbar min-h-[100px]">
                        <pre className="text-xs font-mono text-emerald-500 whitespace-pre-wrap">
                            {results['CustomScriptResult']?.data || "Awaiting execution..."}
                        </pre>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Live Support / Screenshot */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-white flex items-center gap-2">
                                <Monitor className="text-indigo-500" size={20} />
                                Live Support
                            </h2>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={triggerScreenshot} disabled={!selectedAgentId} className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2">
                                <Camera size={16} /> Capture Screen
                            </button>
                            <button onClick={triggerMessage} disabled={!selectedAgentId} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2">
                                <MessageSquare size={16} /> Send Popup
                            </button>
                        </div>
                        {results['Screenshot']?.data && (
                            <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
                                <img src={`data:image/jpeg;base64,${results['Screenshot'].data}`} alt="Live Desktop" className="w-full h-auto" />
                                <p className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white font-mono opacity-50">CONFIDENTIAL / FORENSIC CAPTURE</p>
                            </div>
                        )}
                        {!results['Screenshot']?.data && (
                            <div className="mt-6 h-48 border border-slate-800 border-dashed rounded-xl flex items-center justify-center text-slate-600 text-[10px] font-mono uppercase tracking-widest">
                                No capture data available.
                            </div>
                        )}
                    </div>

                    {/* Pre-built Scripts (Updates & Software) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div>
                                <Package className="text-emerald-500 mb-4" size={24} />
                                <h3 className="text-sm font-bold text-white tracking-tight mb-1">Software Audit</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Fetch a complete list of installed applications.</p>
                            </div>
                            <button onClick={triggerPrograms} disabled={!selectedAgentId} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Run Scan
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div>
                                <AlertTriangle className="text-rose-500 mb-4" size={24} />
                                <h3 className="text-sm font-bold text-white tracking-tight mb-1">Maintenance</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Manage software packages and winget upgrades.</p>
                            </div>
                            <button onClick={triggerWinget} disabled={!selectedAgentId} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Winget Check
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Server size={16} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Master Version</p>
                                <p className="text-xs font-mono text-white">v{hostedVersion || '---'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => queueCommand('Restart')} 
                            disabled={!selectedAgentId}
                            className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-500/20 transition-all"
                        >
                            Force Restart
                        </button>
                    </div>
                </div>
            </div>

            {/* Remote Agent Log Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl mb-8">
                <h2 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                    <Terminal className="text-emerald-500" size={20} />
                    System Management Log
                </h2>
                <div className="bg-black/50 border border-slate-800 rounded-xl p-6 overflow-x-auto custom-scrollbar min-h-[100px] text-left">
                    <pre className="w-full text-xs font-mono text-emerald-400/90 leading-relaxed whitespace-pre">
                        {currentAgent?.lastLog || (
                            <span className="text-slate-600 italic">No system log stream available for this session.</span>
                        )}
                    </pre>
                </div>
            </div>
            
            {/* Legacy Warning Section */}
            {currentAgent && !currentAgent.version?.startsWith('3') && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 animate-pulse text-left">
                     <div className="p-4 bg-rose-500/20 text-rose-500 rounded-2xl">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-rose-500 uppercase tracking-widest mb-2">Legacy Agent Detected (v{currentAgent.version})</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                            This device is running an outdated agent. Remote shell and screenshot capabilities are restricted or inconsistent. 
                            You must run the **v3.0.7 Master Script** manually on this device to hook it into the new forensics engine.
                        </p>
                    </div>
                    <button 
                        onClick={() => alert("Please copy the v3.0.7 script from the implementation guide and run as Administrator on the test device.")}
                        className="px-8 py-3 bg-rose-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-all whitespace-nowrap"
                    >
                        How to Upgrade
                    </button>
                </div>
            )}
        </div>
    );
}
