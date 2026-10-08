"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Send, CheckCircle2, AlertCircle, Building2, User, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupportPortalPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        region: "",
        department: "",
        issue: ""
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ ticketNumber: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch("/api/support/ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to submit ticket");
            
            setSuccess({ ticketNumber: data.ticketNumber });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 border border-slate-800 p-12 rounded-3xl max-w-lg w-full text-center space-y-6 shadow-2xl"
                >
                    <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Ticket Logged</h2>
                    <p className="text-slate-400 leading-relaxed">
                        Thank you. Your IT Support request has been successfully submitted. Our team will review it shortly.
                    </p>
                    <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Your Ticket Number</p>
                        <p className="text-2xl font-black text-blue-400">{success.ticketNumber}</p>
                    </div>
                    <button 
                        onClick={() => { setSuccess(null); setFormData({ name: "", email: "", region: "", department: "", issue: "" }); }}
                        className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-colors uppercase tracking-widest text-xs"
                    >
                        Submit Another Ticket
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020817] py-12 px-4 flex justify-center items-start">
            <div className="max-w-3xl w-full space-y-8">
                
                <div className="text-center space-y-4 mb-12">
                    <div className="w-20 h-20 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                        <Ticket size={40} className="-rotate-3" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">IT Technical Request</h1>
                    <p className="text-slate-400 max-w-xl mx-auto">Please fill in the details below to log a support ticket. Our IT team will assist you as soon as possible.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Name & Surname</label>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14} /> Email Address</label>
                            <input 
                                required
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                placeholder="john.doe@eqncs.com"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} /> Region</label>
                            <select
                                required
                                value={formData.region}
                                onChange={e => setFormData({ ...formData, region: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none font-medium cursor-pointer"
                            >
                                <option value="" disabled>Select a Region</option>
                                <option value="Southern Region">Southern Region</option>
                                <option value="Northern Region">Northern Region</option>
                                <option value="Western Region">Western Region</option>
                                <option value="Eastern Region">Eastern Region</option>
                                <option value="HQ">HQ / Head Office</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={14} /> Department</label>
                            <input 
                                required
                                type="text"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                placeholder="e.g. IT, Legal, CoSec..."
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} /> Technical Issue Details</label>
                        <textarea 
                            required
                            rows={6}
                            value={formData.issue}
                            onChange={e => setFormData({ ...formData, issue: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium resize-y"
                            placeholder="Please describe the issue you are experiencing in detail..."
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                            disabled={loading}
                            type="submit"
                            className={cn(
                                "w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm py-5 rounded-xl transition-all shadow-xl shadow-blue-900/20",
                                loading ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"
                            )}
                        >
                            {loading ? "Submitting..." : (
                                <>
                                    <Send size={18} /> Submit Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
