"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ShieldCheck, HardDrive, UserCheck, Key, Settings, CreditCard, Mail, Trash2, User, Landmark, Smartphone, Laptop, Database, AlertCircle } from "lucide-react";
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
    const [userData, setUserData] = useState<any>(null);
    const [lastDay, setLastDay] = useState(new Date().toLocaleDateString());
    
    const [tasks, setTasks] = useState<Task[]>([
        // IT Administrative
        { id: 'it-1', text: 'Shared mailbox created', completed: false, category: 'IT Administrative' },
        { id: 'it-2', text: 'Email forward or shared mailbox members setup', completed: false, category: 'IT Administrative' },
        { id: 'it-3', text: 'Remove MS365 License', completed: false, category: 'IT Administrative' },
        { id: 'it-4', text: 'Remove from all groups on AD', completed: false, category: 'IT Administrative' },
        { id: 'it-5', text: 'Company data removal: (Action Required)', completed: false, category: 'IT Administrative' },
        { id: 'it-6', text: 'Clear MFA Settings', completed: false, category: 'IT Administrative' },
        
        // To be completed with the User
        { id: 'user-1', text: 'Device Login Pin obtained', completed: false, category: 'To be completed with the User' },
        { id: 'user-2', text: 'Uninstallation of Euphoria App and Office products from all personal devices', completed: false, category: 'To be completed with the User' },
        
        // Return of Company Property
        { id: 'prop-1', text: 'Return company-issued phone', completed: false, category: 'Return of Company Property' },
        { id: 'prop-2', text: 'Return company-issued laptop', completed: false, category: 'Return of Company Property' },
        { id: 'prop-3', text: 'Return any other equipment or materials', completed: false, category: 'Return of Company Property' },
        
        // Data Removal
        { id: 'data-1', text: 'Remove all company-related files, emails, and applications from personal devices', completed: false, category: 'Data Removal' },
        { id: 'data-2', text: 'Verify no company data remains on any external storage devices', completed: false, category: 'Data Removal' },
        
        // Final Checklist
        { id: 'final-1', text: 'Confirm uninstallation of Euphoria app and Office products', completed: false, category: 'Final Checklist' },
        { id: 'final-2', text: 'Confirm return of all company property', completed: false, category: 'Final Checklist' },
        { id: 'final-3', text: 'Verify data removal from personal devices', completed: false, category: 'Final Checklist' },
        { id: 'final-4', text: 'Confirm email forwarding setup', completed: false, category: 'Final Checklist' },
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
        'To be completed with the User', 
        'Return of Company Property', 
        'Data Removal', 
        'Final Checklist'
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
            {/* Header Area */}
            <div className="bg-slate-900/40 border-b border-slate-800/60 pb-12 pt-8 backdrop-blur-md sticky top-0 z-40">
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
                                <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl shadow-inner shadow-emerald-500/10 border border-emerald-500/10">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight">IT Exit <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Interview</span></h1>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Equinox Group Holdings, Inc. Protocol</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-64 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span>Completion</span>
                                <span className={progress === 100 ? "text-emerald-500" : "text-white"}>{progress}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700/50">
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out shadow-lg ${progress === 100 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Information Summary Card */}
            <div className="max-w-5xl mx-auto px-8 mt-12">
                <div className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-4 gap-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <User size={12} className="text-blue-500" /> Username
                        </p>
                        <p className="text-white font-bold text-lg leading-none">{userData?.displayName || "Loading..."}</p>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Mail size={12} className="text-blue-500" /> Email
                        </p>
                        <p className="text-white font-bold text-xs font-mono truncate">{userData?.userPrincipalName || "..."}</p>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Laptop size={12} className="text-blue-500" /> Device
                        </p>
                        <p className="text-white font-bold text-sm">Managed Endpoint</p>
                    </div>
                    <div className="space-y-1 relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Landmark size={12} className="text-blue-500" /> Last Day
                        </p>
                        <p className="text-emerald-400 font-black text-sm">{lastDay}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-5xl mx-auto px-8 pb-32 mt-16">
                <div className="grid grid-cols-1 gap-16">
                    {categories.map((cat) => (
                        <div key={cat} className="space-y-8">
                            <div className="flex items-center gap-4 px-2">
                                <div className="p-1.5 bg-slate-800 rounded-lg">
                                    {cat.includes('IT') && <Settings size={14} className="text-blue-400" />}
                                    {cat.includes('User') && <UserCheck size={14} className="text-emerald-400" />}
                                    {cat.includes('Property') && <Smartphone size={14} className="text-amber-400" />}
                                    {cat.includes('Data') && <Database size={14} className="text-rose-400" />}
                                    {cat.includes('Final') && <CheckCircle2 size={14} className="text-emerald-500" />}
                                </div>
                                <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">{cat}</h2>
                                <div className="h-px bg-slate-800 flex-grow" />
                                <span className="text-[10px] font-bold text-slate-600 italic font-mono">
                                    {tasks.filter(t => t.category === cat && t.completed).length}/{tasks.filter(t => t.category === cat).length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {tasks.filter(t => t.category === cat).map((task) => (
                                    <button 
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex items-center justify-between p-6 rounded-2xl border transition-all text-left outline-none hover:translate-x-1 group ${
                                            task.completed 
                                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-100/60 shadow-inner' 
                                                : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60 hover:shadow-xl'
                                        }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`transition-all duration-300 ${task.completed ? 'text-emerald-500 scale-110' : 'text-slate-700 group-hover:text-slate-500'}`}>
                                                {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm transition-all ${task.completed ? 'line-through decoration-emerald-500/50' : 'text-white'}`}>
                                                    {task.text}
                                                </p>
                                                {task.text.includes('Company data removal') && !task.completed && (
                                                    <div className="flex gap-4 mt-2">
                                                        <span className="text-[9px] font-bold text-slate-500 border border-slate-800 px-2 py-0.5 rounded uppercase">Yes</span>
                                                        <span className="text-[9px] font-bold text-slate-500 border border-slate-800 px-2 py-0.5 rounded uppercase">No Retrain Till Specified</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!task.completed && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                </div>
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
                    <div className="mt-20 p-12 bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-transparent rounded-[3rem] border border-emerald-500/20 text-center space-y-8 animate-in slide-in-from-bottom-10 duration-1000 shadow-3xl shadow-emerald-500/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                        <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 transform rotate-12 hover:rotate-0 transition-all duration-500 cursor-pointer">
                            <ShieldCheck size={56} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-white tracking-tight">Protocol Fully Validated</h3>
                            <p className="text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
                                All departmental steps for **{userData?.displayName || "the user"}** have been finalized. The separation of company assets and data for **Equinox Group Holdings, Inc.** is now complete.
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => router.push('/offboarding')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-emerald-600/30 w-full md:w-auto hover:-translate-y-1"
                            >
                                Submit Final Report
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border border-slate-700 w-full md:w-auto"
                            >
                                Export as PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
