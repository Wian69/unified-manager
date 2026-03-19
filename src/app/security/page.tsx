"use client";

import { useEffect, useState } from "react";
import { Shield, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Info, Rocket, Search, Loader2 } from "lucide-react";

export default function SecurityPage() {
    const [security, setSecurity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRec, setExpandedRec] = useState<string | null>(null);

    // Remediation Deployment State
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [deployingRec, setDeployingRec] = useState<any>(null);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [deploying, setDeploying] = useState(false);
    const [groupSearch, setGroupSearch] = useState("");

    const fetchSecurity = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/security');
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.details || data.error || "Failed to fetch security data");
            } else {
                setSecurity(data);
            }
        } catch (error: any) {
            console.error("Failed to fetch security", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurity();
    }, []);

    const fetchGroups = async () => {
        if (availableGroups.length > 0) return;
        setLoadingGroups(true);
        try {
            const res = await fetch('/api/groups');
            const data = await res.json();
            setAvailableGroups(data.groups || []);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        } finally {
            setLoadingGroups(false);
        }
    };

    const extractScript = (html: string) => {
        const text = html.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        return `# Remediation Script for Secure Score\n# Source: Microsoft recommendation\n\n${text}\n\n# Note: Please verify the commands above before deployment.`;
    };

    const handleDeployClick = (rec: any) => {
        setDeployingRec(rec);
        setIsDeployModalOpen(true);
        fetchGroups();
    };

    const handleConfirmDeploy = async () => {
        if (selectedGroups.length === 0) {
            alert("Please select at least one group to target.");
            return;
        }

        setDeploying(true);
        try {
            const res = await fetch('/api/security/remediate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    controlId: deployingRec.id,
                    title: deployingRec.title,
                    scriptContent: extractScript(deployingRec.remediationSteps),
                    groupIds: selectedGroups
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(`Successfully deployed! ${data.message}`);
                setIsDeployModalOpen(false);
                setSelectedGroups([]);
            } else {
                alert(`Deployment failed: ${data.error || data.details}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setDeploying(false);
        }
    };

    const filteredGroups = availableGroups.filter(g => 
        g.displayName?.toLowerCase().includes(groupSearch.toLowerCase())
    );

    const score = security?.secureScore;
    const recommendations = security?.recommendations || [];
    const recentAlerts = security?.recentAlerts || [];

    const percentage = score ? Math.round((score.currentScore / score.maxScore) * 100) : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
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

            {/* Error Alert */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/50 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-rose-500 text-white rounded-xl shadow-lg">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-rose-100 font-bold text-lg">Permission or Data Error</h3>
                        <p className="text-rose-200/70 text-sm mt-1">
                            {error.includes("403") || error.includes("Forbidden") || error.includes("AccessDenied")
                                ? "Your Azure App Registration is missing the required permissions to view security data. Please add the following 'Application Permissions' in Azure AD and Grant Admin Consent."
                                : error}
                        </p>
                        {(error.includes("403") || error.includes("Forbidden") || error.includes("AccessDenied")) && (
                            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black">
                                <span className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-md border border-rose-500/30">SecureScore.Read.All</span>
                                <span className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-md border border-rose-500/30">SecurityEvents.Read.All</span>
                                <span className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-md border border-rose-500/30">DeviceManagementConfiguration.ReadWrite.All</span>
                            </div>
                        )}
                    </div>
                    <a 
                        href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                        target="_blank"
                        className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                    >
                        Go to Azure Portal
                    </a>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="lg:col-span-1 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-8 flex flex-col items-center justify-center backdrop-blur-md">
                    <h2 className="text-xl font-bold text-slate-200 mb-6 w-full text-left">Microsoft Secure Score</h2>
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
                                            <div className="flex flex-col gap-4">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Info size={14} /> Description
                                                    </h4>
                                                    <p className="text-sm text-slate-300 leading-relaxed overflow-hidden" dangerouslySetInnerHTML={{ __html: r.description }} />
                                                </div>
                                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-700/50">
                                                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Remediation Steps</h4>
                                                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: r.remediationSteps }} />
                                                </div>
                                                <button 
                                                    onClick={() => handleDeployClick(r)}
                                                    className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                                >
                                                    <Rocket size={18} />
                                                    Deploy remediation to Intune
                                                </button>
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
                <h2 className="text-xl font-bold text-slate-200 mb-6 font-bold">Recent Defender Alerts</h2>
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

            {/* Deployment Modal */}
            {isDeployModalOpen && deployingRec && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-white">Deploy Remediation</h3>
                                <p className="text-sm text-slate-400 mt-1">{deployingRec.title}</p>
                            </div>
                            <button 
                                onClick={() => setIsDeployModalOpen(false)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <ChevronRight size={24} className="rotate-90" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                            {/* Script Preview */}
                            <div>
                                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-3">Proposed Intune Script</h4>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                    {extractScript(deployingRec.remediationSteps)}
                                </div>
                            </div>

                            {/* Group Selection */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest leading-none">Target Entra ID Groups</h4>
                                    <span className="text-[10px] font-bold text-slate-500 leading-none">{selectedGroups.length} Selected</span>
                                </div>
                                
                                <div className="relative mb-4">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search groups..." 
                                        value={groupSearch}
                                        onChange={(e) => setGroupSearch(e.target.value)}
                                        className="w-full bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-rose-500 transition-all text-sm outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {loadingGroups ? (
                                        <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-500">
                                            <Loader2 className="animate-spin mb-2" size={24} />
                                            Fetching groups...
                                        </div>
                                    ) : filteredGroups.length > 0 ? (
                                        filteredGroups.map(g => (
                                            <label 
                                                key={g.id} 
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    selectedGroups.includes(g.id) 
                                                    ? 'bg-rose-500/10 border-rose-500' 
                                                    : 'bg-slate-800/20 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    className="mt-1 accent-rose-500"
                                                    checked={selectedGroups.includes(g.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGroups([...selectedGroups, g.id]);
                                                        } else {
                                                            setSelectedGroups(selectedGroups.filter(id => id !== g.id));
                                                        }
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-200 truncate">{g.displayName}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{g.description || "Security Group"}</p>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="col-span-full text-center py-4 text-slate-500 text-xs">No groups found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-4">
                            <button 
                                onClick={() => setIsDeployModalOpen(false)}
                                className="flex-1 py-3 text-slate-400 font-bold hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmDeploy}
                                disabled={deploying || selectedGroups.length === 0}
                                className="flex-[2] bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {deploying ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Deploying...
                                    </>
                                ) : (
                                    <>
                                        <Rocket size={18} />
                                        Confirm Deployment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
