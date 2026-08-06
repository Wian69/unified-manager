'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, FileSignature, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function AgreementContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    
    const [isAgreed, setIsAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!token) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Invalid Access Link</h2>
                <p className="text-slate-400">The link you followed is missing a security token or has expired.</p>
            </div>
        );
    }

    if (successUrl) {
        return (
            <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Agreement Digitally Signed</h2>
                    <p className="text-slate-400 mb-6">
                        Thank you. Your agreement has been recorded in our audit log.
                        You have now been officially granted access to the secure folder.
                    </p>
                    <a 
                        href={successUrl} 
                        className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        Access Secure Folder Now
                    </a>
                </div>
            </div>
        );
    }

    const handleAgree = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/sharepoint/agree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setError(data.error || 'Failed to process agreement.');
            } else {
                setSuccessUrl(data.redirectUrl);
            }
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <ShieldAlert className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Terms of Use Agreement</h1>
                    <p className="text-slate-400">Equinox Group Holdings - Secure Document Access</p>
                </div>
            </div>

            <div className="prose prose-invert prose-slate max-w-none mb-8 text-sm">
                <p>
                    You have been invited to access secure and confidential documents belonging to <strong>Equinox Group Holdings</strong>.
                    Before you may access these files, you must read and agree to the following Terms of Use.
                </p>
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl my-6 text-slate-300 h-64 overflow-y-auto custom-scrollbar">
                    <h3 className="text-lg font-bold text-white mb-4">1. Confidentiality</h3>
                    <p className="mb-4">
                        All documents, data, and information accessible through this portal are strictly confidential and remain the sole property of Equinox Group Holdings. You agree not to disclose, share, distribute, or reproduce any materials without explicit written consent.
                    </p>
                    <h3 className="text-lg font-bold text-white mb-4">2. Access & Usage</h3>
                    <p className="mb-4">
                        Your access is granted for specific business purposes only. You agree to use this system responsibly and to not attempt to bypass any security protocols. Access may be revoked at any time without prior notice.
                    </p>
                    <h3 className="text-lg font-bold text-white mb-4">3. Audit Logging</h3>
                    <p className="mb-4">
                        By clicking "I Agree", you acknowledge that your IP address, timestamp, and identity will be permanently recorded in our system's audit log as a legally binding electronic signature indicating your acceptance of these terms.
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center mt-1">
                        <input 
                            type="checkbox" 
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                            className="peer w-5 h-5 appearance-none border-2 border-slate-500 rounded bg-slate-900 checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer"
                        />
                        <CheckCircle2 className="w-4 h-4 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <span className="text-white font-medium group-hover:text-blue-400 transition-colors">I accept the Terms of Use and Non-Disclosure Agreement.</span>
                        <p className="text-xs text-slate-400 mt-1">
                            This action constitutes my legally binding electronic signature.
                        </p>
                    </div>
                </label>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleAgree}
                        disabled={!isAgreed || isSubmitting}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing Signature...
                            </>
                        ) : (
                            <>
                                <FileSignature className="w-5 h-5" />
                                I Agree & Electronically Sign
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AgreePage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400"></div>
                <Suspense fallback={<div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />Loading...</div>}>
                    <AgreementContent />
                </Suspense>
            </div>
        </div>
    );
}
