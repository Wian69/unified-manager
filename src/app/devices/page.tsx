"use client";

import { useEffect, useState } from "react";
import { Laptop, RefreshCw, X } from "lucide-react";

export default function DevicesPage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [selectedDeviceData, setSelectedDeviceData] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const [intuneRes, agentRes] = await Promise.all([
                fetch('/api/devices'),
                fetch('/api/agent/list')
            ]);
            
            const intuneData = await intuneRes.json();
            const agentData = await agentRes.json();

            if (intuneData.devices) setDevices(intuneData.devices);
            if (agentData.agents) setAgents(agentData.agents);
        } catch (error) {
            console.error("Failed to fetch devices", error);
        } finally {
            setLoading(false);
        }
    };

    const getAgentForDevice = (serial: string) => {
        return agents.find(a => a.serialNumber === serial);
    };

    const sendCommand = async (agentId: string, type: string, payload: any = {}) => {
        try {
            const res = await fetch('/api/agent/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, type, payload })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Command ${type} queued successfully!`);
            }
        } catch (error) {
            console.error("Failed to send command", error);
            alert("Failed to queue command.");
        }
    };

    useEffect(() => {
        fetchDevices();
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
                                <th className="px-6 py-4">Enterprise Agent</th>
                                <th className="px-6 py-4">Compliance status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Loading devices...
                                    </td>
                                </tr>
                            ) : devices.length > 0 ? (
                                devices.map((d: any) => {
                                    const agent = getAgentForDevice(d.serialNumber);
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
                                                {agent ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            Live Agent
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">{agent.publicIp}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-[11px]">No Agent</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.complianceState === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {d.complianceState || 'unknown'}
                                                </span>
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
                                <div className="space-y-8 pb-10 max-w-5xl mx-auto">
                                    {/* Agent Status Card (NEW) */}
                                    {getAgentForDevice(selectedDeviceData.device.serialNumber) && (
                                        <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-8">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                                    <h3 className="text-xl font-bold text-emerald-400">Enterprise Agent Active</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">Agent Version</span>
                                                    <span className="text-slate-300 font-mono text-xs">{getAgentForDevice(selectedDeviceData.device.serialNumber)?.version}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Public Network</span>
                                                    <div className="text-slate-200 font-medium">{getAgentForDevice(selectedDeviceData.device.serialNumber)?.publicIp}</div>
                                                    <div className="text-[10px] text-slate-500">{getAgentForDevice(selectedDeviceData.device.serialNumber)?.isp}</div>
                                                </div>
                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Local Network</span>
                                                    <div className="text-slate-200 font-medium">{getAgentForDevice(selectedDeviceData.device.serialNumber)?.localIp}</div>
                                                </div>
                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Last Heartbeat</span>
                                                    <div className="text-slate-200 font-medium">{new Date(getAgentForDevice(selectedDeviceData.device.serialNumber)?.lastSeen).toLocaleTimeString()}</div>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-800/60 pt-6">
                                                <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest">Remote Commands</h4>
                                                <div className="flex flex-wrap gap-3">
                                                    <button 
                                                        onClick={() => {
                                                            const msg = prompt("Enter message to send to device:");
                                                            if (msg) sendCommand(getAgentForDevice(selectedDeviceData.device.serialNumber).id, 'Message', { text: msg });
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"
                                                    >
                                                        Send Message
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to RESTART this device?")) {
                                                                sendCommand(getAgentForDevice(selectedDeviceData.device.serialNumber).id, 'Restart');
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-sm font-bold transition-all"
                                                    >
                                                        Restart Device
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const newName = prompt("Enter new computer name:");
                                                            if (newName) sendCommand(getAgentForDevice(selectedDeviceData.device.serialNumber).id, 'Rename', { newName });
                                                        }}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold transition-all"
                                                    >
                                                        Rename Device
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}

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
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedDeviceData.device.complianceState === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {selectedDeviceData.device.complianceState || 'unknown'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Primary User</span>
                                                <span className="text-blue-400">{selectedDeviceData.device.userDisplayName || 'None Assigned'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">UPN</span>
                                                <span className="text-slate-300">{selectedDeviceData.device.userPrincipalName || 'N/A'}</span>
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
                                                    <ul className="space-y-2">
                                                        {selectedDeviceData.compliancePolicies.map((p: any) => (
                                                            <li key={p.id} className="bg-slate-800/30 p-3 rounded-lg flex justify-between items-center border border-slate-700/50">
                                                                <span className="text-slate-200 text-sm font-medium">{p.displayName || p.id}</span>
                                                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md ${p.state === 'compliant' ? 'bg-emerald-500/20 text-emerald-400' : p.state === 'notCompliant' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'}`}>
                                                                    {p.state}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
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
