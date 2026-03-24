"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ShieldCheck, HardDrive, UserCheck, Key, Settings, CreditCard, Mail, Trash2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";

interface Task {
    id: string;
    text: string;
    completed: boolean;
    category: string;
}

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs tracking-widest uppercase">Initialising Checklist Engine...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

function ChecklistContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("Employee");
    
    const [tasks, setTasks] = useState<Task[]>([
        // IT Infrastructure
        { id: 'it-1', text: 'Revoke Microsoft 365 License', completed: false, category: 'IT Support' },
        { id: 'it-2', text: 'Disable Azure AD Account', completed: false, category: 'IT Support' },
        { id: 'it-3', text: 'Revoke VPN Access Certificates', completed: false, category: 'IT Support' },
        { id: 'it-4', text: 'Wipe Corporate Mobile Device (Remote)', completed: false, category: 'IT Support' },
        
        // Security
        { id: 'sec-1', text: 'Reclaim Office Access Card', completed: false, category: 'Security' },
        { id: 'sec-2', text: 'Collect Hardware MFA Tokens (YubiKey)', completed: false, category: 'Security' },
        { id: 'sec-3', text: 'Update Internal Door Codes', completed: false, category: 'Security' },
        
        // HR & Finance
        { id: 'hr-1', text: 'Cancel Corporate Credit Card', completed: false, category: 'HR & Finance' },
        { id: 'hr-2', text: 'Process Final Salary & Commissions', completed: false, category: 'HR & Finance' },
        { id: 'hr-3', text: 'Lodge P45 / Tax Forms', completed: false, category: 'HR & Finance' },
    ]);

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.user?.displayName) setUserName(data.user.displayName);
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
    const categories = Array.from(new Set(tasks.map(t => t.category)));

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header Area */}
            <div className="bg-slate-900/40 border-b border-slate-800/60 pb-12 pt-8">
                <div className="max-w-5xl mx-auto px-8">
                    <button 
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Watchlist
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner shadow-emerald-500/10">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight">Offboarding <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Checklist</span></h1>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Target: {userName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-64 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span>Overall Progress</span>
                                <span className={progress === 100 ? "text-emerald-500" : "text-white"}>{progress}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out shadow-lg ${progress === 100 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-8 py-12">
                <div className="grid grid-cols-1 gap-16">
                    {categories.map((cat) => (
                        <div key={cat} className="space-y-6">
                            <div className="flex items-center gap-4 px-2">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{cat}</h2>
                                <div className="h-px bg-slate-800 flex-grow" />
                                <span className="text-[10px] font-bold text-slate-600 italic">
                                    {tasks.filter(t => t.category === cat && t.completed).length}/{tasks.filter(t => t.category === cat).length} Complete
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {tasks.filter(t => t.category === cat).map((task) => (
                                    <button 
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex items-center justify-between p-6 rounded-2xl border transition-all text-left group ${
                                            task.completed 
                                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-100/60' 
                                                : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`transition-all duration-300 ${task.completed ? 'text-emerald-500 scale-110' : 'text-slate-700 group-hover:text-slate-500'}`}>
                                                {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                            </div>
                                            <div>
                                                <p className={`font-bold transition-all ${task.completed ? 'line-through decoration-emerald-500/50' : 'text-white'}`}>
                                                    {task.text}
                                                </p>
                                                <div className="flex gap-4 mt-1">
                                                    {task.id.startsWith('it') && <Settings size={12} className="text-slate-600" />}
                                                    {task.id.startsWith('sec') && <Key size={12} className="text-slate-600" />}
                                                    {task.id.startsWith('hr') && <CreditCard size={12} className="text-slate-600" />}
                                                </div>
                                            </div>
                                        </div>
                                        {task.completed && (
                                            <div className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-500 animate-in fade-in zoom-in-95">
                                                Finalised
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Final Submission Card */}
                {progress === 100 && (
                    <div className="mt-20 p-10 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl border border-emerald-500/20 text-center space-y-6 animate-in slide-in-from-bottom-5 duration-700 shadow-2xl shadow-emerald-500/5">
                        <div className="w-20 h-20 bg-emerald-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 transform rotate-6 hover:rotate-0 transition-transform cursor-pointer">
                            <ShieldCheck size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white">Offboarding Complete</h3>
                            <p className="text-slate-400 font-medium max-w-md mx-auto">
                                All protocol steps have been validated for {userName}. Access has been revoked and assets have been marked for recovery.
                            </p>
                        </div>
                        <button 
                            onClick={() => router.push('/offboarding')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                        >
                            Log Separation Event
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
