const fs = require("fs");
const content = `"use client";

import { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Login failed");
            
            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic">
                        <span className="text-blue-500">Eqn</span> Manager
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm uppercase tracking-widest font-bold">Admin Authentication</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14} /> Email Address</label>
                        <input 
                            required
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                            placeholder="admin@eqncs.com"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={14} /> Password</label>
                        <input 
                            required
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                            placeholder="password"
                        />
                    </div>

                    <button 
                        disabled={loading}
                        type="submit"
                        className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Authenticating..." : (
                            <>Sign In <ArrowRight size={16} /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}`;
fs.writeFileSync("src/app/login/page.tsx", content, "utf8");
console.log("Written!");

