"use client";

import React, { useRef, useState } from 'react';
import { Upload, RotateCcw, Image as ImageIcon, Check } from 'lucide-react';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';

export default function SettingsPage() {
    const { logo, setLogo, resetLogo, isDefault } = useCompanyLogo();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setIsSaving(true);
            setLogo(dataUrl);
            setTimeout(() => setIsSaving(false), 1500);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-12">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <ImageIcon className="text-blue-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Global Branding</h1>
                        <p className="text-slate-400">Manage company assets used across the platform</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left: Info */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white">Company Logo</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Upload your company logo to update the letterhead on all official documents, including Offboarding Policies and Checklists.
                        </p>
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-500">
                            <strong>Recommended:</strong><br />
                            Transparent PNG, at least 400px wide.
                        </div>
                    </div>

                    {/* Right: Upload Card */}
                    <div className="md:col-span-2">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-8">
                                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-950/50 group hover:border-blue-500/50 transition-colors">
                                    <div className="relative mb-6">
                                        <div className="w-48 h-48 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/10">
                                            <img src={logo} alt="Current Logo" className="max-w-full max-h-full object-contain p-4" />
                                        </div>
                                        {isSaving && (
                                            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center rounded-xl border border-blue-500/50">
                                                <Check className="text-blue-400 animate-bounce" size={48} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                        >
                                            <Upload size={18} />
                                            Upload Logo
                                        </button>
                                        
                                        {!isDefault && (
                                            <button 
                                                onClick={resetLogo}
                                                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700"
                                            >
                                                <RotateCcw size={18} />
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                </div>
                            </div>
                            
                            <div className="px-8 py-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-xs text-slate-500">
                                    Status: {isDefault ? 'Using default Equinox logo' : 'Using custom company logo'}
                                </span>
                                {isSaving && <span className="text-xs text-blue-400 font-bold animate-pulse">Saving to LocalStorage...</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
