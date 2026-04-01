'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Signature, 
    Copy, 
    Code, 
    Users, 
    Check, 
    ChevronRight,
    Terminal,
    Info,
    Layout,
    AlertTriangle,
    RefreshCw,
    Search,
    Monitor,
    Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_TEMPLATE = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.5;">
    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #000;">%%DisplayName%%</p>
    <p style="margin: 0; font-size: 13px; color: #666;">%%Title%% | %%Department%%</p>
    <p style="margin: 10px 0 0 0; font-size: 13px; color: #0078d4;">%%Company%%</p>
    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
        This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed.
    </div>
</div>`;

export default function SignatureManagementPage() {
    const [html, setHtml] = useState(BASE_TEMPLATE);
    const [signatureName, setSignatureName] = useState('Corporate_Standard');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [groups, setGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [activeTab, setActiveTab] = useState<'design' | 'deploy'>('design');

    useEffect(() => {
        // Fetch groups for targeting
        setLoadingGroups(true);
        fetch('/api/users') // Using existing user list as a proxy for groups if needed, but ideally /api/groups
            .then(res => res.json())
            .then(data => {
                // In a real app, we'd fetch actual groups. For now, we'll simulate group options based on departments
                const deps = Array.from(new Set(data.users.map((u: any) => u.department).filter(Boolean)));
                setGroups(deps.map(d => ({ id: d, displayName: d + ' Department' })));
                setLoadingGroups(false);
            })
            .catch(() => setLoadingGroups(false));
    }, []);

    const filteredGroups = groups.filter(g => 
        g.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const powershellScript = useMemo(() => {
        const escapedHtml = html.replace(/'/g, "''");
        const targetCondition = selectedGroups.length > 0 
            ? `-FromMemberOf "${selectedGroups.join('","')}"`
            : '';

        return `# Run this in Exchange Online PowerShell V3
# This rule appends your branded signature to every email automatically.

$SignatureHTML = @'
${html}
'@

New-TransportRule -Name "${signatureName}" \`
    -Enabled $true \`
    -SentToScope 'NotInOrganization' \`
    ${targetCondition} \`
    -ApplyHtmlDisclaimerText $SignatureHTML \`
    -ApplyHtmlDisclaimerFallbackAction 'Wrap' \`
    -ApplyHtmlDisclaimerLocation 'Append'`;
    }, [html, signatureName, selectedGroups]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] -m-8 bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-8 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600/10 rounded-2xl shadow-inner border border-indigo-500/20">
                            <Signature size={32} className="text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Universal Signatures</h1>
                            <p className="text-slate-400 text-sm font-medium">Server-side branding for New Outlook, Old Outlook, and Mobile.</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button 
                            onClick={() => setActiveTab('design')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'design' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Layout className="inline-block mr-2" size={14} /> Design
                        </button>
                        <button 
                            onClick={() => setActiveTab('deploy')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'deploy' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Terminal className="inline-block mr-2" size={14} /> Deploy
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Section: Context & Targeting */}
                <div className="w-80 border-r border-slate-900 bg-slate-900/50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                            <Users size={12} /> Target Audience
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search Departments..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-600 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-1">
                                {loadingGroups ? (
                                    <RefreshCw className="animate-spin text-slate-700 mx-auto" size={20} />
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setSelectedGroups([])}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${selectedGroups.length === 0 ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            Apply to All Staff
                                            {selectedGroups.length === 0 && <Check size={12} />}
                                        </button>
                                        <div className="pt-2 pb-1 text-[10px] font-black text-slate-600 uppercase tracking-widest">Or Specific Units</div>
                                        {filteredGroups.map(group => (
                                            <button
                                                key={group.id}
                                                onClick={() => {
                                                    setSelectedGroups(prev => 
                                                        prev.includes(group.id) ? prev.filter(i => i !== group.id) : [...prev, group.id]
                                                    );
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${selectedGroups.includes(group.id) ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                            >
                                                {group.displayName}
                                                {selectedGroups.includes(group.id) && <Check size={12} />}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                            <Info size={12} /> Token Guide
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['DisplayName', 'Title', 'Department', 'Company', 'PhoneNumber', 'MobileNumber'].map(token => (
                                <button 
                                    key={token}
                                    onClick={() => copyToClipboard(`%%${token}%%`)}
                                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black text-slate-400 hover:text-white hover:border-indigo-600 transition-all uppercase tracking-tighter"
                                >
                                    %%{token}%%
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Exchange will replace these tokens for every user automatically during mail flow.
                        </p>
                    </section>
                </div>

                {/* Main Editor / Deployment Section */}
                <div className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'design' ? (
                            <motion.div 
                                key="design"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                    {/* HTML Editor */}
                                    <div className="flex flex-col space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                                                <Code size={18} className="text-indigo-400" />
                                                HTML Template
                                            </div>
                                            <input 
                                                type="text" 
                                                value={signatureName}
                                                onChange={(e) => setSignatureName(e.target.value)}
                                                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest focus:outline-none focus:border-indigo-600"
                                                placeholder="Signature Name"
                                            />
                                        </div>
                                        <textarea
                                            value={html}
                                            onChange={(e) => setHtml(e.target.value)}
                                            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs text-slate-300 font-mono focus:border-indigo-600 outline-none resize-none shadow-2xl min-h-[400px]"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {/* Live Previews */}
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                                                <Monitor size={18} className="text-indigo-400" />
                                                Desktop Outlook Preview
                                            </div>
                                            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xl h-fit min-h-[200px]">
                                                <div 
                                                    dangerouslySetInnerHTML={{ 
                                                        // Preview simulation replacing tokens
                                                        __html: html.replace(/%%DisplayName%%/g, 'Sarah Jenkins')
                                                                    .replace(/%%Title%%/g, 'Senior VP Sales')
                                                                    .replace(/%%Department%%/g, 'Enterprise Division')
                                                                    .replace(/%%Company%%/g, 'Unified Global Solutions')
                                                    }} 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                                                <Smartphone size={18} className="text-indigo-400" />
                                                Mobile Outlook Preview
                                            </div>
                                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xl h-fit w-[300px] mx-auto overflow-hidden">
                                                <div className="bg-slate-100 h-4 w-20 rounded-full mb-4 animate-pulse" />
                                                <div className="bg-slate-50 p-4 rounded-xl">
                                                    <div 
                                                        className="scale-[0.85] origin-top-left"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: html.replace(/%%DisplayName%%/g, 'Sarah Jenkins')
                                                                        .replace(/%%Title%%/g, 'Senior VP Sales')
                                                                        .replace(/%%Department%%/g, 'Enterprise Division')
                                                                        .replace(/%%Company%%/g, 'Unified Global Solutions')
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="deploy"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="max-w-4xl mx-auto space-y-8"
                            >
                                <div className="p-8 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl space-y-4 shadow-2xl shadow-indigo-900/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl">
                                            <Terminal size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Deployment Script</h3>
                                            <p className="text-indigo-300 text-sm">Targeting: {selectedGroups.length === 0 ? 'Entire Organization' : `${selectedGroups.length} Selected Groups`}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="relative group">
                                        <button 
                                            onClick={() => copyToClipboard(powershellScript)}
                                            className="absolute top-4 right-4 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <pre className="bg-slate-950 p-6 rounded-2xl text-[11px] font-mono text-indigo-400 overflow-x-auto border border-slate-900 shadow-inner max-h-[500px]">
                                            {powershellScript}
                                        </pre>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-900 rounded-2xl flex gap-3 text-xs text-slate-400 leading-relaxed border border-slate-800">
                                            <CheckCircle2 size={32} className="text-emerald-500 shrink-0" />
                                            <div>
                                                <span className="text-white font-bold block mb-1">Universal Compatibility</span>
                                                Signature is added at the server, meaning it will appear on New Outlook, iPad, and iPhone automatically.
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded-2xl flex gap-3 text-xs text-slate-400 leading-relaxed border border-slate-800">
                                            <AlertTriangle size={32} className="text-amber-500 shrink-0" />
                                            <div>
                                                <span className="text-white font-bold block mb-1">Visibility Note</span>
                                                Users will not see this signature while typing, as it is appended by Exchange after the Send button is clicked.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
            `}</style>
        </div>
    );
}

// Additional missing icons
import { CheckCircle2 } from 'lucide-react';
