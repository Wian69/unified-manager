'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Play, Square, Loader2, ArrowRight, ExternalLink, Activity, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Flow {
    id: string;
    name: string;
    properties: {
        displayName: string;
        state: 'Started' | 'Stopped';
        createdTime: string;
        lastModifiedTime: string;
    }
}

export default function FlowsPage() {
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFlows = async () => {
            try {
                const res = await fetch('/api/flows');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setFlows(data.flows);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFlows();
    }, []);

    const toggleFlow = async (flowId: string, currentState: string) => {
        const newState = currentState === 'Started' ? 'Stopped' : 'Started';
        try {
            const res = await fetch(`/api/flows/${flowId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: newState })
            });
            if (!res.ok) throw new Error('Failed to toggle flow');
            
            setFlows(prev => prev.map(f => f.id.includes(flowId) ? { ...f, properties: { ...f.properties, state: newState as any } } : f));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black text-white tracking-tight uppercase flex items-center gap-4"
                >
                    <Zap className="text-blue-500" size={36} fill="currentColor" /> Cloud <span className="text-blue-600 italic">Flows</span>
                </motion.h1>
                <p className="text-slate-400 text-lg max-w-2xl">
                    Manage and monitor your Power Automate automation workflows. 
                    Toggle states, inspect definitions, and jump directly to the designer.
                </p>
            </header>

            {error && (
                <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-3xl text-red-500 flex items-center gap-3">
                    <Activity size={20} />
                    <p className="font-bold uppercase tracking-tight text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {flows.map((flow, idx) => {
                    const flowId = flow.id.split('/').pop() || '';
                    const isStarted = flow.properties.state === 'Started';

                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={flow.id}
                            className="group bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/50 transition-all duration-500 flex items-center justify-between shadow-xl"
                        >
                            <div className="flex items-center gap-6">
                                <div className={cn(
                                    "p-4 rounded-2xl transition-all duration-500",
                                    isStarted ? "bg-blue-600/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white" : "bg-slate-800 text-slate-500"
                                )}>
                                    <Zap size={24} fill={isStarted ? "currentColor" : "none"} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                        {flow.properties.displayName}
                                    </h3>
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <span className="flex items-center gap-1">
                                            Modified: {new Date(flow.properties.lastModifiedTime).toLocaleDateString()}
                                        </span>
                                        <span className={cn(
                                            "flex items-center gap-1",
                                            isStarted ? "text-green-500" : "text-amber-500"
                                        )}>
                                            {flow.properties.state}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => toggleFlow(flowId, flow.properties.state)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                                        isStarted ? "bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white" : "bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white"
                                    )}
                                >
                                    {isStarted ? <Square size={14} /> : <Play size={14} />}
                                    {isStarted ? 'Stop' : 'Start'}
                                </button>

                                <Link href={`/flows/${flowId}`}>
                                    <button className="p-2 bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all">
                                        <ArrowRight size={18} />
                                    </button>
                                </Link>

                                <a 
                                    href={`https://make.powerautomate.com/environments/Default-5d57c9a9-b1b5-4cd2-be8c-14b00490163d/flows/${flowId}/details`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-all"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            </div>
                        </motion.div>
                    );
                })}

                {flows.length === 0 && !error && (
                    <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl space-y-4">
                        <Zap size={40} className="text-slate-700 mx-auto" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No cloud flows found in this environment</p>
                    </div>
                )}
            </div>
        </div>
    );
}
