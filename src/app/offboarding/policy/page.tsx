"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function PolicyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500 font-sans text-sm">Loading Document...</div>}>
            <PolicyContent />
        </Suspense>
    );
}

function PolicyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("________________________");
    const [lastDay, setLastDay] = useState(new Date().toLocaleDateString());

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.user?.displayName) setUserName(data.user.displayName);
                })
                .catch(() => {});
        }
    }, [userId]);

    return (
        <div className="min-h-screen bg-gray-200 py-12 flex justify-center text-black font-sans print:bg-white print:py-0">
            {/* Strict Document Container */}
            <div className="w-full max-w-[210mm] bg-white p-12 md:p-16 shadow-lg print:shadow-none print:p-0 min-h-[297mm] ring-1 ring-gray-300 print:ring-0">
                
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <img src="/Equinox-Logo-Transparent.png" alt="Equinox Outsourced Services" className="h-20 w-auto" />
                    <div className="text-right flex flex-col justify-end mt-4">
                        <h1 className="text-xl font-bold uppercase tracking-tight text-gray-800">IT Exit Interview Policy</h1>
                        <p className="text-xs text-gray-500 mt-1 uppercase">Ref ID: OFF-{userId?.substring(0,8).toUpperCase() || "GEN-01"}</p>
                    </div>
                </div>

                {/* Cover Details */}
                <div className="space-y-4 mb-10 text-sm border border-gray-300 p-6">
                    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-600">Effective Date:</span>
                        <span>{lastDay}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-600">Subject Personnel:</span>
                        <span className="font-semibold">{userName}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] gap-4">
                        <span className="font-bold text-gray-600">Issued By:</span>
                        <span>Equinox Group Holdings Inc. IT support</span>
                    </div>
                </div>

                {/* Core Policy Body */}
                <div className="space-y-8 text-[11pt] leading-relaxed text-gray-900">
                    <section>
                        <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-200 pb-1">1. Purpose</h2>
                        <p>The purpose of this policy is to ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-200 pb-1">2. Scope</h2>
                        <p>This policy applies to all employees who are exiting Equinox Group Holdings, Inc.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-4 uppercase border-b border-gray-200 pb-1">3. Procedure</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold mb-2">3.1 Uninstallation of Euphoria App and Office products</h3>
                                <p className="pl-4 border-l-2 border-gray-300">
                                    The Equinox Group Holdings Inc. IT support will ensure that the Euphoria app, Outlook, Teams & OneDrive is uninstalled from all company and personal devices used by the departing employee.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">3.2 Return of Company Property</h3>
                                <p className="mb-2 pl-4 border-l-2 border-gray-300">The departing employee must return all company property, including but not limited to:</p>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>Company-issued phone</li>
                                    <li>Laptop</li>
                                    <li>Any other equipment or materials provided by the company</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">3.3 Data Removal</h3>
                                <p className="mb-2 pl-4 border-l-2 border-gray-300">The Equinox Group Holdings Inc. IT support will take all necessary steps to remove company data from non-company property. This includes:</p>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>Ensuring that all company-related files, emails, and applications are deleted</li>
                                    <li>Verifying no data remains on external storage devices used by the employee</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">3.4 Email Forwarding</h3>
                                <p className="pl-4 border-l-2 border-gray-300">
                                    The Equinox Group Holdings Inc. IT support will set up necessary email forwarding to ensure that any important communications are redirected to the appropriate personnel.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">3.5 Final Checklist</h3>
                                <p className="mb-2 pl-4 border-l-2 border-gray-300">The Equinox Group Holdings Inc. IT support will provide the departing employee with a final checklist to ensure all steps are completed. This checklist will include:</p>
                                <ul className="list-disc pl-10 space-y-1 mb-8">
                                    <li>Confirm uninstallation of Euphoria app and Office products</li>
                                    <li>Confirm return of all company property</li>
                                    <li>Verify data removal from personal devices</li>
                                    <li>Confirm email forwarding setup</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Signatures Section */}
                <div className="mt-20 pt-16 border-t-2 border-black">
                    <h2 className="text-lg font-bold mb-8 uppercase text-center">Formal Acknowledgment</h2>
                    <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <div className="border-b border-black"></div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">Employee Signature</p>
                                <p className="text-xs text-gray-500 mt-1">Date: ________________________</p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="border-b border-black"></div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">Equinox Group Holdings Inc. IT support</p>
                                <p className="text-xs text-gray-500 mt-1">Date: ________________________</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-20 text-center print:hidden border-t border-gray-200 pt-8">
                    <button 
                        onClick={() => window.print()}
                        className="px-8 py-3 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors"
                    >
                        Print Official Policy
                    </button>
                    <button 
                        onClick={() => router.back()}
                        className="ml-4 px-8 py-3 bg-white text-gray-900 border border-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                    >
                        Return to Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
