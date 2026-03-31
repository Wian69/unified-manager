'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Zap, 
    Save, 
    Loader2, 
    ExternalLink, 
    AlertCircle, 
    CheckCircle2, 
    Code2, 
    History,
    Play,
    Square,
    Activity
} from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FlowDetails {
    id: string;
    name: string;
    properties: {
        displayName: string;
        state: 'Started' | 'Stopped';
        definition: any;
        createdTime: string;
        lastModifiedTime: string;
    }
}

export default function FlowDetailsPage({ params }: { params: Promise<{ flowId: string }> }) {
    const { flowId } = use(params);
    const [flow, setFlow] = useState<FlowDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [jsonValue, setJsonValue] = useState('');

    useEffect(() => {
        const fetchFlow = async () => {
            try {
                const res = await fetch(`/api/flows/${flowId}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setFlow(data);
                setJsonValue(JSON.stringify(data.properties.definition, null, 4));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFlow();
    }, [flowId]);

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        try {
            const parsedJson = JSON.parse(jsonValue);
            const res = await fetch(`/api/flows/${flowId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ properties: { definition: parsedJson } })
            });

            if (!res.ok) throw new Error('Save failed');
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err: any) {
            setSaveStatus('error');
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleState = async () => {
        if (!flow) return;
        const newState = flow.properties.state === 'Started' ? 'Stopped' : 'Started';
        try {
            const res = await fetch(`/api/flows/${flowId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            });
            if (!res.ok) throw new Error('Failed to toggle flow');
            setFlow(prev => prev ? { ...prev, properties: { ...prev.properties, state: newState as any } } : null);
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;
    if (error || !flow) return <div className="p-8 text-red-500 bg-red-500/10 rounded-2xl border border-red-500/20 max-w-xl mx-auto mt-12 flex items-center gap-3"><AlertCircle size={20} /> {error || 'Flow not found'}</div>;

    const isStarted = flow.properties.state === 'Started';

    return (
        <div className="p-8 space-y-8 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                    <Link href="/flows" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Flows
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl shadow-xl",
                            isStarted ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
                        )}>
                            <Zap size={24} fill={isStarted ? "currentColor" : "none"} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase">
                            {flow.properties.displayName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleState}
                        className={cn(
                            "px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all transform active:scale-95",
                            isStarted ? "bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white" : "bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white"
                        )}
                    >
                        {isStarted ? <Square size={16} /> : <Play size={16} />}
                        {isStarted ? 'Stop Flow' : 'Start Flow'}
                    </button>

                    <a 
                        href={`https://make.powerautomate.com/environments/Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d/flows/${flowId}/details`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all"
                    >
                        <ExternalLink size={16} /> Open Designer
                    </a>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Code2 size={16} className="text-blue-500" /> Flow Definition (JSON)
                            </h3>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className={cn(
                                    "px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all",
                                    saveStatus === 'success' ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-500"
                                )}
                            >
                                {saving ? <Loader2 className="animate-spin" size={14} /> : 
                                 saveStatus === 'success' ? <CheckCircle2 size={14} /> : 
                                 <Save size={14} />}
                                {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Changes'}
                            </button>
                        </div>
                        <div className="p-0 bg-slate-950">
                            <textarea 
                                className="w-full h-[600px] p-6 bg-transparent text-slate-300 font-mono text-sm focus:outline-none custom-scrollbar"
                                value={jsonValue}
                                onChange={(e) => setJsonValue(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" /> Flow Info
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-950 rounded-2xl flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</span>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    isStarted ? "bg-green-600/10 text-green-500" : "bg-amber-600/10 text-amber-500"
                                )}>
                                    {flow.properties.state}
                                </span>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Environment ID</span>
                                <p className="text-xs text-white truncate">Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d</p>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Created</span>
                                <p className="text-xs text-white">{new Date(flow.properties.createdTime).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-slate-950 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Last Modified</span>
                                <p className="text-xs text-white">{new Date(flow.properties.lastModifiedTime).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-2 text-blue-500">
                            <AlertCircle size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Editing Definition</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Updating the JSON definition directly will modify the flow's logic. 
                            If your flow is complex, it is recommended to use the 
                            <span className="text-blue-400 font-bold"> Open Designer </span> 
                            button to edit visually in the Microsoft Power Automate portal.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
}
