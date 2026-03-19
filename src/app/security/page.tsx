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
        if (!html) return "# No remediation steps provided by Microsoft.";
        const text = html.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        const cves = deployingRec?.cveIds?.join(', ') || 'No CVE assigned';
        return `# Remediation Script for Vulnerability: ${deployingRec?.vulnerabilityTitle || deployingRec?.title || 'Unknown'}\n# Associated CVEs: ${cves}\n# Source: Microsoft Defender for Endpoint\n\n${text}\n\n# Note: Please verify the commands above before deployment.`;
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
                    title: deployingRec.vulnerabilityTitle || deployingRec.title,
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
    const vulnerabilities = security?.vulnerabilities || [];
    const recentAlerts = security?.recentAlerts || [];

    const percentage = score ? (score.currentScore / score.maxScore) * 100 : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* ... (Header and Error Alert remain same) */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card (remains same) */}
                
                {/* Vulnerability Catalog */}
                <div className="lg:col-span-2 bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-200">Vulnerability Catalog (CVEs)</h2>
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                            {vulnerabilities.length} CVEs Tracked
                        </span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-20 bg-slate-800/20 rounded-xl animate-pulse" />
                            ))
                        ) : vulnerabilities.length > 0 ? (
                            vulnerabilities.map((v: any) => (
                                <div key={v.id} className="bg-slate-800/20 rounded-xl border border-slate-700/50 p-4 hover:border-emerald-500/30 transition-all group">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase">{v.id}</span>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                        v.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 
                                                        v.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                        v.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                        {v.severity || 'Low'}
                                                    </span>
                                                    <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                                        CVSS {v.cvssV3Score || v.cvssV2Score || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Published</p>
                                            <p className="text-xs text-slate-300 font-medium">
                                                {v.publishedDateTime ? new Date(v.publishedDateTime).toLocaleDateString() : 'Unknown'}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end text-right min-w-[120px]">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Updated</p>
                                            <p className="text-xs text-slate-300 font-medium">
                                                {v.lastModifiedDateTime ? new Date(v.lastModifiedDateTime).toLocaleDateString() : 'None'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Link to Recommendation if available */}
                                    <div className="mt-3 pt-3 border-t border-slate-700/30 flex justify-between items-center">
                                        <p className="text-[10px] text-slate-500 line-clamp-1 flex-1 pr-4">{v.description}</p>
                                        {recommendations.find((r: any) => r.associatedVulnerabilities?.some((av: any) => av.id === v.id)) && (
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1 group-hover:underline cursor-pointer">
                                                <Shield size={10} /> FIX AVAILABLE
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-dashed border-slate-700">
                                <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3 opacity-50" />
                                <p className="text-slate-500">No vulnerabilities found in catalog.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendations Section (Now labeled Remediation Plans) */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6 backdrop-blur-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-200">Recommended Remediation Plans</h2>
                    <span className="text-xs text-slate-500">Actionable Intune Deployments</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                        Array(2).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-800/20 rounded-xl animate-pulse" />
                        ))
                    ) : recommendations.length > 0 ? (
                        recommendations.slice(0, 10).map((r: any) => (
                            <div key={r.id} className="bg-slate-800/20 rounded-xl border border-slate-700/50 p-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-slate-100 truncate">{r.vulnerabilityTitle || r.title}</h3>
                                        <div className="flex gap-2 mt-1">
                                            {r.associatedVulnerabilities?.slice(0, 2).map((av: any) => (
                                                <span key={av.id} className="text-[8px] font-black text-rose-400 uppercase">{av.id}</span>
                                            ))}
                                            {r.exposedDevicesCount > 0 && (
                                                <span className="text-[8px] font-black text-emerald-500 uppercase">{r.exposedDevicesCount} Devices Impacted</span>
                                            )}
                                        </div>
                                    </div>
                                    <Rocket size={16} className="text-emerald-500 flex-shrink-0" />
                                </div>
                                <button 
                                    onClick={() => handleDeployClick(r)}
                                    className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold py-2 rounded-lg border border-emerald-600/30 transition-all"
                                >
                                    Review & Deploy to Intune
                                </button>
                            </div>
                        ))
                    ) : null}
                </div>
            </div>

            {/* Recent Alerts (remains same) */}

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
                                <p className="text-sm text-slate-400 mt-1">{deployingRec.vulnerabilityTitle || deployingRec.title}</p>
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
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Proposed Intune Script</h4>
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
