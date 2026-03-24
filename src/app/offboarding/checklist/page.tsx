"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ShieldCheck, HardDrive, UserCheck, Key, Settings, CreditCard, Mail, Trash2, User, Landmark, Smartphone, Laptop, Database, AlertCircle, Printer } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

interface Task {
    id: string;
    text: string;
    completed: boolean;
    category: string;
}

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs tracking-widest uppercase text-white animate-pulse">Initialising Protocol Monitor...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

function ChecklistContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userData, setUserData] = useState<any>(null);
    const [lastDay, setLastDay] = useState(new Date().toLocaleDateString());
    
    const [tasks, setTasks] = useState<Task[]>([
        // IT Administrative
        { id: 'it-1', text: 'Shared mailbox created', completed: false, category: 'IT Administrative' },
        { id: 'it-2', text: 'Email forward or shared mailbox members setup', completed: false, category: 'IT Administrative' },
        { id: 'it-3', text: 'Remove MS365 License', completed: false, category: 'IT Administrative' },
        { id: 'it-4', text: 'Remove from all groups on AD', completed: false, category: 'IT Administrative' },
        { id: 'it-5', text: 'Company data removal verification', completed: false, category: 'IT Administrative' },
        { id: 'it-6', text: 'Clear MFA Settings', completed: false, category: 'IT Administrative' },
        
        // To be completed with the User
        { id: 'user-1', text: 'Device Login Pin obtained', completed: false, category: 'Internal User Coordination' },
        { id: 'user-2', text: 'Uninstallation of Euphoria App and Office products from all personal devices', completed: false, category: 'Internal User Coordination' },
        
        // Return of Company Property
        { id: 'prop-1', text: 'Return company-issued phone', completed: false, category: 'Asset Recovery' },
        { id: 'prop-2', text: 'Return company-issued laptop', completed: false, category: 'Asset Recovery' },
        { id: 'prop-3', text: 'Return any other equipment or materials', completed: false, category: 'Asset Recovery' },
        
        // Data Removal
        { id: 'data-1', text: 'Remove all company-related files, emails, and applications from personal devices', completed: false, category: 'Data & Privacy Security' },
        { id: 'data-2', text: 'Verify no company data remains on any external storage devices', completed: false, category: 'Data & Privacy Security' },
        
        // Final Checklist
        { id: 'final-1', text: 'Confirm uninstallation of Euphoria app and Office products', completed: false, category: 'Final Compliance Audit' },
        { id: 'final-2', text: 'Confirm return of all company property', completed: false, category: 'Final Compliance Audit' },
        { id: 'final-3', text: 'Verify data removal from personal devices', completed: false, category: 'Final Compliance Audit' },
        { id: 'final-4', text: 'Confirm email forwarding setup', completed: false, category: 'Final Compliance Audit' },
    ]);

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.user) setUserData(data.user);
                })
                .catch(() => {});

            // Load saved state from localStorage
            const saved = localStorage.getItem(`checklist-${userId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setTasks(parsed);
                } catch (e) {}
            }
        }
    }, [userId]);

    const toggleTask = (id: string) => {
        const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        setTasks(newTasks);
        if (userId) {
            localStorage.setItem(`checklist-${userId}`, JSON.stringify(newTasks));
        }
    };

    const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
    const categories = [
        'IT Administrative', 
        'Internal User Coordination', 
        'Asset Recovery', 
        'Data & Privacy Security', 
        'Final Compliance Audit'
    ];

    return (
        <div className="min-h-screen bg-[#0b0f19] text-slate-200 selection:bg-blue-500/30 pb-32">
            {/* Header Area - STRETCHED FULL WIDTH */}
            <div className="bg-[#0b0f19]/80 border-b border-white/5 pb-12 pt-8 backdrop-blur-xl sticky top-0 z-40 px-12 print:pb-4 print:pt-4 print:px-8 w-full max-w-none print:max-w-[800px] print:mx-auto">
                <div className="w-full">
                    <button 
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest group print:hidden"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Monitor
                    </button>
                    
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 print:gap-4">
                            <div className="flex items-center gap-6">
                                <img src="/Equinox-Logo-Transparent.png" alt="Equinox Outsourced Services" className="h-20 w-auto drop-shadow-md" />
                            <div className="h-12 w-px bg-white/10 mx-2 print:hidden" />
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-widest leading-none uppercase italic">IT EXIT <span className="text-blue-600 italic">INTERVIEW</span></h1>
                                <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] mt-2 opacity-60">Compliance & Asset Protocol</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-12 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 grow xl:max-w-3xl">
                             <div className="grow w-full space-y-3">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Protocol Completion</span>
                                    <span className={progress === 100 ? "text-emerald-500" : "text-white"}>{progress}%</span>
                                </div>
                                <div className="h-3 bg-slate-900 rounded-full overflow-hidden shadow-inner border border-white/5">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out shadow-lg ${progress === 100 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                             </div>
                             <button 
                                onClick={() => window.print()}
                                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex flex-row items-center justify-center gap-2 whitespace-nowrap print:hidden"
                             >
                                <Printer size={16} />
                                Print Protocol
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Profile Overview - FULL WIDTH GRID */}
            <div className="w-full px-12 mt-16 print:mt-8 print:px-8 max-w-none print:max-w-[800px] print:mx-auto">
                <div className="bg-[#0b0f19] border border-white/5 rounded-[2.5rem] p-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-12 relative overflow-hidden group shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
                    
                    <div className="space-y-3 relative z-10 border-l border-blue-500 pl-6 h-full flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 opacity-50">
                             NAME
                        </p>
                        <p className="text-white font-black text-2xl leading-none uppercase tracking-tight">{userData?.displayName || "Initialising..."}</p>
                    </div>

                    <div className="space-y-3 relative z-10 border-l border-slate-800 pl-6 h-full flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 opacity-50">
                             PRINCIPAL IDENTIFIER
                        </p>
                        <p className="text-white font-black text-xs font-mono truncate tracking-widest">{userData?.userPrincipalName || "..."}</p>
                    </div>

                    <div className="space-y-3 relative z-10 border-l border-slate-800 pl-6 h-full flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 opacity-50">
                             ASSET CONTEXT
                        </p>
                        <div className="flex items-center gap-2">
                            <Laptop size={14} className="text-blue-500" />
                            <p className="text-white font-black text-sm uppercase italic">Managed Intune Endpoint</p>
                        </div>
                    </div>

                    <div className="space-y-3 relative z-10 border-l border-slate-800 pl-6 h-full flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 opacity-50">
                             EFFECTIVE DATE
                        </p>
                        <p className="text-emerald-500 font-black text-2xl leading-none">{lastDay}</p>
                    </div>
                </div>
            </div>

            {/* Task Management Grid - WIDER & DENSE */}
            <div className="w-full px-12 pb-32 mt-20 max-w-none print:px-8 print:max-w-[800px] print:mx-auto print:mt-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
                    {categories.map((cat) => (
                        <div key={cat} className="space-y-10 group">
                            <div className="flex items-center gap-6 px-4">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-blue-400 group-hover:scale-110 transition-transform">
                                    {cat.includes('IT') && <Settings size={20} />}
                                    {cat.includes('Coordination') && <UserCheck size={20} className="text-emerald-400" />}
                                    {cat.includes('Recovery') && <Smartphone size={20} className="text-amber-400" />}
                                    {cat.includes('Security') && <Database size={20} className="text-rose-400" />}
                                    {cat.includes('Audit') && <ShieldCheck size={20} className="text-emerald-500" />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{cat}</h2>
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mt-2">Functional Domain</p>
                                </div>
                                <div className="h-px bg-white/5 flex-grow mx-4 opacity-50" />
                                <span className="text-xs font-black text-slate-500 font-mono tracking-widest">
                                    {tasks.filter(t => t.category === cat && t.completed).length} / {tasks.filter(t => t.category === cat).length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {tasks.filter(t => t.category === cat).map((task) => (
                                    <button 
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex items-center justify-between p-8 rounded-[2rem] border transition-all text-left outline-none hover:translate-x-3 duration-500 shadow-xl ${
                                            task.completed 
                                                ? 'bg-emerald-500/[0.02] border-emerald-500/20 text-slate-500 shadow-none' 
                                                : 'bg-white/[0.02] border-white/5 hover:border-blue-500/30 hover:bg-white/[0.04] shadow-black/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className={`transition-all duration-700 ${task.completed ? 'text-emerald-500 rotate-0 scale-125' : 'text-slate-800 group-hover:text-slate-400 rotate-90 group-hover:rotate-0'}`}>
                                                {task.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`font-black uppercase tracking-widest text-xs transition-all ${task.completed ? 'line-through text-slate-600' : 'text-white'}`}>
                                                    {task.text}
                                                </p>
                                                {!task.completed && (
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-tight">Requirement Pending Verification</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {task.completed ? (
                                             <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/10">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Audit Passed</span>
                                             </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                                                <ArrowLeft size={16} className="rotate-180 text-blue-500" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Final Protocol Certification Card */}
                {progress === 100 && (
                    <div className="mt-40 p-24 bg-gradient-to-br from-blue-600/10 via-slate-900 to-transparent rounded-[4rem] border border-blue-500/20 text-center space-y-12 animate-in fade-in zoom-in slide-in-from-bottom-20 duration-1000 shadow-[0_0_100px_rgba(37,99,235,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-50" />
                        <div className="w-28 h-28 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/40 relative z-10">
                            <ShieldCheck size={64} />
                        </div>
                        <div className="space-y-6 relative z-10">
                            <h3 className="text-5xl font-black text-white tracking-widest uppercase italic leading-none">Status: <span className="text-blue-500">Separated</span></h3>
                            <p className="text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed text-lg tracking-tight">
                                All departmental protocols for **{userData?.displayName || "Identity Under Review"}** have been finalized. Full separation of digital and physical assets for Equinox Group Holdings, Inc. is certified.
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
                            <button 
                                onClick={() => router.push('/offboarding')}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-20 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-95 shadow-2xl shadow-blue-600/30 hover:-translate-y-2 duration-500"
                            >
                                Finalize Record
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="bg-white/5 hover:bg-white/10 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm transition-all active:scale-95 border border-white/10 shadow-xl backdrop-blur-xl"
                            >
                                Export Audit PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
