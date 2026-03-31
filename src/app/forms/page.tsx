'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, ArrowRight, Loader2, PlusCircle, HelpCircle } from 'lucide-react';

interface Form {
    id: string;
    name: string;
    description: string;
}

export default function FormsPage() {
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/forms/lists')
            .then(res => res.json())
            .then(data => {
                setForms(data.forms);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            <header className="space-y-4">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black text-white tracking-tight uppercase"
                >
                    Forms & <span className="text-blue-600 italic">Flows</span>
                </motion.h1>
                <div className="flex items-center gap-2 text-slate-400">
                    <p className="max-w-2xl text-lg">
                        Centralized management for your Power Automate triggered forms. 
                        View submissions, edit requests, and trigger downstream automation.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {forms.map((form, index) => (
                    <Link key={form.id} href={`/forms/${form.id}`}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative p-8 bg-slate-900 border border-slate-800 rounded-3xl hover:border-blue-500/50 transition-all duration-500 overflow-hidden cursor-pointer shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ClipboardList size={80} />
                            </div>
                            
                            <div className="relative z-10 space-y-6">
                                <div className="p-3 bg-blue-600/10 w-fit rounded-2xl group-hover:bg-blue-600 transition-all duration-500">
                                    <ClipboardList size={24} className="text-blue-500 group-hover:text-white" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                        {form.name}
                                    </h2>
                                    <p className="text-slate-400 leading-relaxed font-medium">
                                        {form.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-blue-500 font-black text-xs uppercase tracking-widest pt-4 group-hover:gap-4 transition-all">
                                    View Submissions <ArrowRight size={14} />
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}

                {/* Coming Soon / Help Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="group border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-slate-700 transition-all cursor-help"
                >
                    <div className="p-3 bg-slate-800 rounded-full">
                        <PlusCircle size={24} className="text-slate-500" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-400">Need more forms?</h3>
                        <p className="text-sm text-slate-500 max-w-[200px]">Link more SharePoint lists to centralize your entire workflow.</p>
                    </div>
                </motion.div>
            </div>

            <section className="bg-slate-950/50 border border-slate-800 rounded-3xl p-8 mt-12">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-600/20 p-2 rounded-lg">
                        <HelpCircle size={20} className="text-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">How it works</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            These lists are directly connected to your SharePoint environment. When you edit a record here, 
                            the change is written back to the source list in real-time. This ensures your existing Power Automate 
                            flows stay active and process the updated data accordingly.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
