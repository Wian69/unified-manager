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
    Smartphone,
    Save
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
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [activeTab, setActiveTab] = useState<'design' | 'deploy'>('design');
    const [saving, setSaving] = useState(false);

    // Load saved signature design
    useEffect(() => {
        fetch('/api/signatures')
            .then(res => res.json())
            .then(data => {
                if (data.html) setHtml(data.html);
                if (data.name) setSignatureName(data.name);
                if (data.selectedUserIds) setSelectedUserIds(data.selectedUserIds);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        setLoadingUsers(true);
        fetch('/api/users?onlyLicensed=true')
            .then(res => res.json())
            .then(data => {
                if (data.users) setUsers(data.users);
                setLoadingUsers(false);
            })
            .catch(() => setLoadingUsers(false));
    }, []);

    const filteredUsers = users.filter(u => 
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.userPrincipalName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const powershellScript = useMemo(() => {
        const escapedHtml = html.replace(/'/g, "''");
        
        // Convert selected IDs to their UPNs (Email addresses) for the PowerShell -From parameter
        const selectedUpns = selectedUserIds.map(id => {
            const user = users.find(u => u.id === id);
            return user ? user.userPrincipalName : null;
        }).filter(Boolean);

        const targetCondition = selectedUpns.length > 0 
            ? `-From "${selectedUpns.join('","')}"`
            : null;

        if (!targetCondition) return `# ⚠️ STOP: PLEASE SELECT USERS IN THE TARGET AUDIENCE TAB FIRST.
# This ensures the signature only applies to specific staff members.`;

        return `# Run this in Exchange Online PowerShell V3
# This script deploys your Universal Signature to both the SENT email (Server-Side) 
# and the COMPOSE window (Client-Side - so users see it while typing).

$SignatureHTML = @'
${html}
'@

$targetUsers = @("${selectedUpns.join('","')}")

Write-Host "--- DEPLOYING UNIVERSAL SIGNATURES ---" -ForegroundColor Yellow

foreach ($user in $targetUsers) {
    Write-Host "Updating Client-Side Signature for: $user (Visible while typing)" -ForegroundColor Cyan
    # This sets the signature for Outlook Web and New Outlook immédiatement.
    Set-MailboxMessageConfiguration -Identity $user \`
        -SignatureHtml $SignatureHTML \`
        -AutoAddSignature $true \`
        -AutoAddSignatureOnReply $true \`
        -DefaultTextFormat 'Html'
}

Write-Host "Updating Server-Side Branding (Rule: ${signatureName})" -ForegroundColor Yellow
Remove-TransportRule -Identity "${signatureName}" -Confirm:$false -ErrorAction SilentlyContinue

New-TransportRule -Name "${signatureName}" \`
    -Enabled $true \`
    -Priority 0 \`
    ${targetCondition} \`
    -ApplyHtmlDisclaimerText $SignatureHTML \`
    -ApplyHtmlDisclaimerFallbackAction 'Wrap' \`
    -ApplyHtmlDisclaimerLocation 'Append' \`
    -StopRuleProcessing $false

Write-Host "Deployment Complete. Users may need to restart Outlook to see the change in the compose window." -ForegroundColor Green`;
    }, [html, signatureName, selectedUserIds, users]);

    const saveSignature = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html,
                    name: signatureName,
                    selectedUserIds
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Signature design saved successfully!');
            } else {
                alert(`Failed to save: ${data.error}\n\nDetails: ${typeof data.details === 'object' ? JSON.stringify(data.details, null, 2) : data.details}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving signature.');
        } finally {
            setSaving(false);
        }
    };

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
                    
                    <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button 
                            onClick={saveSignature}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 disabled:opacity-30 border border-emerald-500/20 mr-2"
                        >
                            {saving ? <RefreshCw className="animate-spin inline-block mr-2" size={14} /> : <Save className="inline-block mr-2" size={14} />}
                            Save Design
                        </button>
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
                                {loadingUsers ? (
                                    <RefreshCw className="animate-spin text-slate-700 mx-auto" size={20} />
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setSelectedUserIds([])}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${selectedUserIds.length === 0 ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            Apply to All Staff
                                            {selectedUserIds.length === 0 && <Check size={12} />}
                                        </button>
                                        <div className="pt-2 pb-1 text-[10px] font-black text-slate-600 uppercase tracking-widest">Or Specific Staff</div>
                                        {filteredUsers.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    setSelectedUserIds(prev => 
                                                        prev.includes(user.id) ? prev.filter(i => i !== user.id) : [...prev, user.id]
                                                    );
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${selectedUserIds.includes(user.id) ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                            >
                                                {user.displayName}
                                                {selectedUserIds.includes(user.id) && <Check size={12} />}
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
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const pasteBox = document.createElement('div');
                                                        pasteBox.contentEditable = 'true';
                                                        pasteBox.style.position = 'fixed';
                                                        pasteBox.style.opacity = '0';
                                                        document.body.appendChild(pasteBox);
                                                        pasteBox.focus();
                                                        
                                                        // Wait for paste
                                                        setTimeout(() => {
                                                            if (pasteBox.innerHTML) {
                                                                setHtml(pasteBox.innerHTML);
                                                                alert('Signature imported from clipboard!');
                                                            }
                                                            document.body.removeChild(pasteBox);
                                                        }, 100);
                                                    }}
                                                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-indigo-400 uppercase tracking-widest rounded-lg border border-slate-700 transition-all active:scale-95"
                                                >
                                                    Import from Clipboard
                                                </button>
                                                <input 
                                                    type="text" 
                                                    value={signatureName}
                                                    onChange={(e) => setSignatureName(e.target.value)}
                                                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest focus:outline-none focus:border-indigo-600"
                                                    placeholder="Signature Name"
                                                />
                                            </div>
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
                                                Mobile Preview (iPhone/iPad)
                                            </div>
                                            <div className="relative mx-auto w-[280px] h-[500px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-slate-700">
                                                {/* Notch */}
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
                                                
                                                {/* Screen Content */}
                                                <div className="absolute inset-0 bg-white overflow-y-auto custom-scrollbar pt-12 pb-8 px-4">
                                                    {/* Email Header Simulation */}
                                                    <div className="border-b border-slate-100 pb-4 mb-6 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <div className="h-3 w-24 bg-slate-100 rounded-full" />
                                                            <div className="h-3 w-12 bg-slate-50 rounded-full" />
                                                        </div>
                                                        <div className="h-4 w-40 bg-slate-100 rounded-full" />
                                                    </div>

                                                    {/* The Signature */}
                                                    <div className="w-full break-words">
                                                        <div 
                                                            className="text-[12px] leading-normal origin-top-left"
                                                            dangerouslySetInnerHTML={{ 
                                                                __html: html.replace(/%%DisplayName%%/g, 'Sarah Jenkins')
                                                                            .replace(/%%Title%%/g, 'Senior VP Sales')
                                                                            .replace(/%%Department%%/g, 'Enterprise Division')
                                                                            .replace(/%%Company%%/g, 'Unified Global Solutions')
                                                            }} 
                                                        />
                                                    </div>

                                                    {/* Keyboard Bottom Simulation */}
                                                    <div className="mt-12 h-20 w-full bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                                                        <div className="h-1 w-20 bg-slate-200 rounded-full" />
                                                    </div>
                                                </div>

                                                {/* Home Indicator */}
                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-200 rounded-full z-20" />
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
                                            <p className="text-indigo-300 text-sm">Targeting: {selectedUserIds.length === 0 ? 'Entire Organization' : `${selectedUserIds.length} Selected Users`}</p>
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
                                        <div className="p-6 bg-slate-900 rounded-3xl space-y-4 border border-slate-800">
                                            <div className="flex items-center gap-3 text-indigo-400 font-bold text-sm">
                                                <Info size={18} /> Why don't I see my signature?
                                            </div>
                                            <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
                                                <p><span className="text-white font-bold">1. It is Server-Side:</span> You will NOT see the signature while typing. It is added by Microsoft AFTER you click Send.</p>
                                                <p><span className="text-white font-bold">2. Check your Inbox:</span> Send an email to an external address (like Gmail) or yourself and check the received message.</p>
                                                <p><span className="text-white font-bold">3. Rule Propagation:</span> It can take up to 30-60 minutes for a new Exchange rule to activate across all Microsoft servers.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 bg-slate-900 rounded-3xl space-y-4 border border-slate-800">
                                            <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                                                <CheckCircle2 size={18} /> Verified Features
                                            </div>
                                            <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
                                                <p>✓ Works on <span className="text-white underline">iPhone/iPad</span> native mail app.</p>
                                                <p>✓ Works on <span className="text-white underline">Old & New Outlook</span> desktop.</p>
                                                <p>✓ Pulls data (Name, Job Title) <span className="text-white underline">Automatically</span> from Entra ID.</p>
                                                <p>✓ Agentless: No software needed on user devices.</p>
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
