"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, Server, Shield, Terminal, MessageSquare, Download, RefreshCw, AlertTriangle, Monitor, Package, Globe, Hash } from 'lucide-react';
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

                // Map First Available Agent automatically
                if (userDevices.length > 0) {
                    const firstSerial = userDevices[0].serialNumber || userDevices[0].hardwareInformation?.serialNumber;
                    const match = Object.values(agentData.agents || {}).find((a: any) => a.serialNumber === firstSerial) as any;
                    if (match) setSelectedAgentId(match.agentId || Object.keys(agentData.agents).find(k => agentData.agents[k].serialNumber === firstSerial));
                }

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (userId) initData();
    }, [userId]);

    // Poll for results if an agent is selected
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedAgentId) {
            const fetchResults = async () => {
                try {
                    setPolling(true);
                    const res = await fetch(`/api/agent/result?agentId=${selectedAgentId}`);
                    const data = await res.json();
                    if (data.results) setResults(data.results);
                } finally {
                    setPolling(false);
                }
            };
            fetchResults();
            interval = setInterval(fetchResults, 5000);
        }
        return () => clearInterval(interval);
    }, [selectedAgentId]);

    const queueScript = async (script: string, returnType: string) => {
        if (!selectedAgentId) return alert("Select an online agent first.");
        try {
            await fetch('/api/agent/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: selectedAgentId,
                    type: 'Run-Script',
                    payload: { script, returnType }
                })
            });
            alert(`Command queued to agent. Awaiting result...`);
        } catch (e) {
            console.error(e);
            alert("Failed to queue command.");
        }
    };

    const triggerPrograms = () => {
        queueScript(`
            Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | 
            Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | 
            Where-Object { $_.DisplayName } | 
            Sort-Object DisplayName -Unique
        `, 'Programs');
    };

    const triggerWinget = () => {
        queueScript(`winget upgrade --accept-source-agreements | Out-String`, 'WingetStatus');
    };

    const triggerMessage = () => {
        const msg = prompt("Enter message to popup on device:");
        if (!msg) return;
        queueScript(`
            Add-Type -AssemblyName PresentationFramework
            [System.Windows.MessageBox]::Show("${msg}", "IT Administrator")
        `, 'MessageResponse');
    };

    const triggerScreenshot = () => {
        queueScript(`
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bmp = New-Object System.Drawing.Bitmap $bounds.width, $bounds.height
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.size)
            $ms = New-Object System.IO.MemoryStream
            $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            [Convert]::ToBase64String($ms.ToArray())
        `, 'Screenshot');
    };

    const [customScript, setCustomScript] = useState("");

    const handleCustomScript = () => {
        if (!customScript.trim()) return;
        queueScript(customScript, 'CustomScriptResult');
    };

    if (loading) return <div className="p-20 text-center text-white">Loading Live Data Engine...</div>;
    if (error) return <div className="p-20 text-center text-rose-500">Error: {error}</div>;

    const currentAgent = selectedAgentId ? agents[selectedAgentId as any] || Object.values(agents).find((a: any) => a.agentId === selectedAgentId) || Object.entries(agents).find(([k,v]) => k === selectedAgentId)?.[1] : null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/offboarding/${userId}`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Activity className="text-emerald-500" size={28} />
                            LIVE DATA DASHBOARD
                        </h1>
                        <p className="text-slate-400 font-mono text-sm mt-1">
                            Real-time Device Telemetry & Remote Execution for <span className="text-white font-bold">{user?.displayName}</span>
                        </p>
                    </div>
                </div>
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
                                const matchedAgentEntries = Object.entries(agents).filter(([k, v]: [string, any]) => v.serialNumber === (d.serialNumber || d.hardwareInformation?.serialNumber));
                                const agentId = matchedAgentEntries.length > 0 ? matchedAgentEntries[0][0] : null;
                                return (
                                    <option key={d.id} value={agentId || ""}>
                                        {d.deviceName} ({d.hardwareInformation?.serialNumber || 'No Serial'}) {agentId ? ' - ONLINE' : ' - NO AGENT'}
                                    </option>
                                );
                            })}
                        </select>
                        <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
                            Scan
                        </button>
                    </div>
                )}
            </div>

            {/* Telemetry Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none" />
                    <Hash size={16} className="text-blue-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Public IP</p>
                    <p className="text-lg text-white font-mono">{currentAgent ? currentAgent.publicIp || "Unknown" : "---.---.---.---"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] pointer-events-none" />
                    <Globe size={16} className="text-emerald-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Service Provider</p>
                    <p className="text-lg text-white font-mono">{currentAgent ? currentAgent.isp || "Unknown" : "--------"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />
                    <Monitor size={16} className="text-indigo-500 mb-4" />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">OS Version</p>
                    <p className="text-sm text-white font-bold leading-tight line-clamp-2">{currentAgent ? currentAgent.os || "Unknown" : "--------"}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className={`w-4 h-4 rounded-full ${currentAgent ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-700'} mb-3`} />
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Heartbeat Status</p>
                    <p className={`text-sm font-bold ${currentAgent ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {currentAgent ? 'ONLINE, ACTIVE' : 'OFFLINE'}
                    </p>
                </div>
            </div>

            {/* Execution Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Custom Scripts */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <Terminal className="text-blue-500" size={20} />
                            Remote Execution
                        </h2>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                            PowerShell Context
                        </span>
                    </div>
                    <textarea 
                        value={customScript}
                        onChange={(e) => setCustomScript(e.target.value)}
                        placeholder="Write PowerShell script here..."
                        className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-blue-500 resize-none mb-4 custom-scrollbar"
                    />
                    <div className="flex gap-4">
                        <button onClick={handleCustomScript} disabled={!selectedAgentId} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                            Launch Script
                        </button>
                    </div>

                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-8 mb-2">Execution Output</h3>
                    <div className="flex-1 bg-black/50 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-64 custom-scrollbar">
                        <pre className="text-xs font-mono text-slate-300 break-all whitespace-pre-wrap">
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
                                <Download size={16} /> Request Screenshot
                            </button>
                            <button onClick={triggerMessage} disabled={!selectedAgentId} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2">
                                <MessageSquare size={16} /> Send Direct Message
                            </button>
                        </div>
                        {results['Screenshot']?.data && (
                            <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
                                <img src={`data:image/jpeg;base64,${results['Screenshot'].data}`} alt="Live Desktop" className="w-full h-auto" />
                                <p className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white font-mono opacity-50">CONFIDENTIAL / LIVE DESKTOP</p>
                            </div>
                        )}
                        {!results['Screenshot']?.data && (
                            <div className="mt-6 h-48 border border-slate-800 border-dashed rounded-xl flex items-center justify-center text-slate-600 text-xs font-mono">
                                No screenshot captured yet.
                            </div>
                        )}
                    </div>

                    {/* Pre-built Scripts (Updates & Software) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div>
                                <Package className="text-emerald-500 mb-4" size={24} />
                                <h3 className="text-sm font-bold text-white tracking-tight mb-1">Software Audit</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Fetch a complete list of installed applications via Registry.</p>
                            </div>
                            <button onClick={triggerPrograms} disabled={!selectedAgentId} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                                Run Scan
                            </button>
                            {results['Programs']?.data && (
                                <p className="text-[10px] text-emerald-400 text-center mt-3 font-mono">Scan Completed.</p>
                            )}
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                            <div>
                                <AlertTriangle className="text-rose-500 mb-4" size={24} />
                                <h3 className="text-sm font-bold text-white tracking-tight mb-1">Update Manager</h3>
                                <p className="text-[10px] text-slate-500 leading-tight">Manage Winget applications and Windows OS Updates.</p>
                            </div>
                            <div className="space-y-2 mt-4">
                                <div className="flex gap-2">
                                    <button onClick={triggerWinget} disabled={!selectedAgentId} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold rounded flex justify-center items-center">
                                        Check Winget
                                    </button>
                                    <button onClick={() => queueScript(`winget upgrade --all --silent --accept-source-agreements --accept-package-agreements | Out-String`, 'WingetInstall')} disabled={!selectedAgentId} className="flex-1 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-500 text-[9px] font-bold rounded flex justify-center items-center">
                                        Upgrade Apps
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => queueScript(`
                                        $Session = New-Object -ComObject Microsoft.Update.Session
                                        $Searcher = $Session.CreateUpdateSearcher()
                                        $Result = $Searcher.Search("IsInstalled=0 and Type='Software'")
                                        $updates = @()
                                        foreach ($update in $Result.Updates) { $updates += @{ Title = $update.Title; Description = $update.Description } }
                                        $updates | ConvertTo-Json
                                    `, 'WinUpdates')} disabled={!selectedAgentId} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold rounded flex justify-center items-center">
                                        Check OS Updates
                                    </button>
                                    <button onClick={() => queueScript(`Start-Process "usoclient.exe" -ArgumentList "StartInteractiveScan" -WindowStyle Hidden; "OS Update Scan & Installation initiated in background."`, 'WinUpdatesDeploy')} disabled={!selectedAgentId} className="flex-1 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-500 text-[9px] font-bold rounded flex justify-center items-center">
                                        Deploy OS Updates
                                    </button>
                                </div>
                            </div>
                            {results['WinUpdates']?.data && (
                                <p className="text-[10px] text-indigo-400 text-center mt-3 font-mono border-t border-slate-800 pt-2">OS Scan Done.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Tables (Conditional depending on run status) */}
            {results['Programs']?.data && Array.isArray(results['Programs'].data) && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <Package className="text-emerald-500" size={20} />
                            Installed Applications
                        </h2>
                        <span className="text-slate-400 text-sm font-mono">{results['Programs'].data.length} apps found</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl relative">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 shadow-md">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Version</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Publisher</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {results['Programs'].data.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-3 text-slate-200">{p.DisplayName}</td>
                                        <td className="px-6 py-3 text-emerald-400 font-mono text-xs">{p.DisplayVersion || '-'}</td>
                                        <td className="px-6 py-3 text-slate-500 text-xs">{p.Publisher || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {results['WingetStatus']?.data && typeof results['WingetStatus'].data === 'string' && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <AlertTriangle className="text-rose-500" size={20} />
                            Winget Upgrade Status
                        </h2>
                    </div>
                    <div className="bg-black/50 border border-slate-800 rounded-xl p-4 overflow-x-auto custom-scrollbar">
                        <pre className="text-xs font-mono text-slate-300">
                            {results['WingetStatus'].data}
                        </pre>
                    </div>
                </div>
            )}

            {results['WinUpdates']?.data && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <AlertTriangle className="text-indigo-500" size={20} />
                            Available OS Updates
                        </h2>
                    </div>
                    <div className="bg-black/50 border border-slate-800 rounded-xl p-4 overflow-x-auto custom-scrollbar">
                        <pre className="text-xs font-mono text-slate-300">
                            {typeof results['WinUpdates'].data === 'string' ? results['WinUpdates'].data : JSON.stringify(results['WinUpdates'].data, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {results['WinUpdatesDeploy']?.data && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <Activity className="text-emerald-500" size={20} />
                            OS Deployment Status
                        </h2>
                    </div>
                    <div className="bg-black/50 border border-slate-800 rounded-xl p-4 overflow-x-auto custom-scrollbar">
                        <pre className="text-xs font-mono text-slate-300">
                            {results['WinUpdatesDeploy'].data}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
