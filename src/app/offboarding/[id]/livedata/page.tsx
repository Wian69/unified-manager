"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity } from 'lucide-react';
import { useParams } from 'next/navigation';
import DlpModule from '@/components/DlpModule';

export default function LiveDataDashboard() {
    const params = useParams();
    const userId = params.id as string;
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`/api/users/${userId}`);
                const data = await res.json();
                setUser(data.user);
            } catch (e) {
                console.error("Failed to fetch user", e);
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchUser();
    }, [userId]);

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="animate-pulse text-slate-500 font-mono text-xs uppercase tracking-widest">
                Initializing Forensic Console...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/offboarding/${userId}`} className="p-2 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 transition-colors border border-slate-800">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <Activity className="text-rose-500" size={28} />
                                LIVE FORENSIC CONSOLE
                            </h1>
                            <p className="text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest">
                                Real-time Endpoint Orchestration for <span className="text-slate-300 font-bold">{user?.displayName || userId}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* New Refined DlpModule */}
                <DlpModule 
                    userId={userId} 
                    userDisplayName={user?.displayName || "Target User"} 
                />
            </div>
        </div>
    );
}
