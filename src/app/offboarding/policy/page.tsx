"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

export default function PolicyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500 font-sans text-sm">Loading Document...</div>}>
            <PolicyContent />
        </Suspense>
    );
}

function PolicyContent() {
    const searchParams = useSearchParams();
    const { logo } = useCompanyLogo();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("________________________");
    const [userTitle, setUserTitle] = useState("________________________");
    const [lastDay, setLastDay] = useState(new Date().toLocaleDateString());

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.displayName) setUserName(data.displayName);
                    if (data.jobTitle) setUserTitle(data.jobTitle);
                })
                .catch(() => {});
        }
    }, [userId]);

    return (
        <div className="min-h-screen bg-gray-400 py-12 flex justify-center print:bg-white print:py-0" style={{fontFamily: "'Calibri', 'Calibri Light', sans-serif", fontSize: "11pt", color: "#111111"}}>
            {/* Strict Document Container */}
            <div className="w-full max-w-[210mm] bg-white p-12 md:p-16 shadow-lg print:shadow-none print:p-8 min-h-[297mm] ring-1 ring-gray-300 print:ring-0" style={{fontFamily: "inherit", fontSize: "inherit"}}>
                
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
                    <img src={logo} alt="Company Logo" className="h-24 w-auto drop-shadow-sm" />
                    <div className="text-right flex flex-col justify-end mt-4">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">IT Offboarding Policy</h1>
                    </div>
                </div>

                {/* Cover Details */}
                <div className="space-y-1 text-sm border border-black p-6 mb-12">
                    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-gray-300 pb-3">
                        <span className="font-bold text-gray-900">Policy Owner:</span>
                        <span>Group IT Support Specialist</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-gray-300 pb-3">
                        <span className="font-bold text-gray-900">Effective Date:</span>
                        <span>{lastDay}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] gap-4 border-b border-gray-300 pb-3">
                        <span className="font-bold text-gray-900">Subject Personnel:</span>
                        <span className="font-semibold">{userName}</span>
                    </div>
                    <div className="grid grid-cols-[150px_1fr] gap-4">
                        <span className="font-bold text-gray-900">Job Title:</span>
                        <span>{userTitle}</span>
                    </div>
                </div>

                {/* Core Policy Body */}
                <div className="space-y-8 text-[11pt] leading-relaxed text-gray-900">
                    <section>
                        <h2 className="text-lg font-bold mb-2">Purpose</h2>
                        <p>To ensure a smooth transition for employees leaving the company, safeguard company assets, and maintain data security.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-2">Scope</h2>
                        <p>This policy applies to all employees who are exiting Equinox Group Holdings, Inc.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-6">Procedure</h2>
                        
                        <div className="space-y-8">
                            <div>
                                <h3 className="font-bold mb-2">Uninstallation of Euphoria App and Office products:</h3>
                                <p>
                                    The Equinox Group Holdings Inc. IT support will ensure that the Euphoria app, Outlook, Teams & OneDrive is uninstalled from all company and personal devices used by the departing employee.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">Return of Company Property</h3>
                                <p className="mb-2">The departing employee must return all company property, including but not limited to:</p>
                                <ul className="list-disc pl-10 space-y-2">
                                    <li>Company-issued phone</li>
                                    <li>Laptop</li>
                                    <li>Any other equipment or materials provided by the company</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">Data Removal</h3>
                                <p className="mb-2">The Equinox Group Holdings Inc. IT support will take all necessary steps to remove company data from non company property. This includes:</p>
                                <ul className="list-disc pl-10 space-y-2">
                                    <li>Ensuring that all company-related files, emails, and applications are deleted</li>
                                    <li>Verifying no data remains on external storage devices used by the employee</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">Email Forwarding</h3>
                                <p>
                                    The Equinox Group Holdings Inc. IT support will set up necessary email forwarding to ensure that any important communications are redirected to the appropriate personnel.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold mb-2">Final Checklist</h3>
                                <p className="mb-2">The Equinox Group Holdings Inc. IT support will provide the departing employee with a final checklist to ensure all steps are completed. This checklist will include:</p>
                                <ul className="list-disc pl-10 space-y-2">
                                    <li>Confirm uninstallation of Euphoria app and Office products</li>
                                    <li>Confirm return of all company property</li>
                                    <li>Verify data removal from personal devices</li>
                                    <li>Confirm email forwarding setup</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Data Retention Section */}
                <div className="space-y-8 text-[11pt] leading-relaxed text-gray-900 mt-10 pt-10 border-t border-gray-300">
                    <hr className="border-black mb-4" />
                    <section>
                        <h2 className="text-lg font-bold mb-4">Data & System Access After Offboarding</h2>
                        
                        <div className="space-y-8">
                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">1. Email (Outlook / Microsoft 365 Mailbox)</h3>
                                <p className="font-bold mb-1">What happens:</p>
                                <ul className="list-disc pl-10 space-y-1 mb-2">
                                    <li>Your mailbox will be disabled on your last working day.</li>
                                    <li>Your manager or designated successor will receive full access for business continuity.</li>
                                    <li>Auto reply and forwarding (if applicable) will be configured according to company policy.</li>
                                    <li>Your mailbox will be retained for 12 months according to Equinox Group Holdings, Inc.'s retention policies.</li>
                                </ul>
                                <p className="italic">You will no longer have access after offboarding is completed.</p>
                            </div>

                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">2. OneDrive Files</h3>
                                <p className="font-bold mb-1">What happens:</p>
                                <ul className="list-disc pl-10 space-y-1 mb-2">
                                    <li>Ownership of your OneDrive files will be transferred to your manager.</li>
                                    <li>Your manager will have access for 7 days to review and relocate required business related files.</li>
                                    <li>After the retention period, your OneDrive and its contents will be deleted following company policy.</li>
                                </ul>
                                <p className="italic">Personal files may be exported only after IT review and formal approval.</p>
                            </div>

                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">3. Teams Chats & Teams Files</h3>
                                <p className="font-bold mb-1">Teams Chats:</p>
                                <ul className="list-disc pl-10 space-y-1 mb-2">
                                    <li>Private Teams chats remain stored according to compliance and retention rules.</li>
                                    <li>No one receives direct access to your private chat history unless legally required.</li>
                                </ul>
                                <p className="font-bold mb-1">Teams Files:</p>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>Files in Teams channels remain accessible to the team.</li>
                                    <li>Files shared in private chats follow OneDrive transfer rules.</li>
                                </ul>
                            </div>

                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">4. SharePoint & Network Drives</h3>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>All SharePoint documents remain part of their respective sites.</li>
                                    <li>Access permissions will be updated to remove you from shared folders, groups, and sites.</li>
                                </ul>
                            </div>

                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">5. Applications & SaaS Platforms</h3>
                                <p className="mb-1">For any third party systems (e.g., MS365, Euphoria, Payspace, Fusion):</p>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>Your access will be fully removed.</li>
                                    <li>Active tasks or projects may be reassigned to your department.</li>
                                    <li>All content created remains the intellectual property of Equinox Group Holdings, Inc.</li>
                                </ul>
                            </div>

                            <div>
                                <hr className="border-gray-400 mb-4" />
                                <h3 className="font-bold mb-2">6. Personal Data on Company Devices</h3>
                                <p className="mb-1">If you stored personal files on company equipment:</p>
                                <ul className="list-disc pl-10 space-y-1">
                                    <li>You may request a Personal Data Review before your last day.</li>
                                    <li>IT will help identify items that may be transferred, while ensuring no corporate data is removed.</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Signatures Section */}
                <div className="mt-20 pt-16">
                    <h2 className="text-xl font-bold mb-12">Formal Acknowledgment</h2>
                    <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-6">
                            <div className="border-b border-black pt-4"></div>
                            <p className="font-bold text-sm text-gray-900">Equinox Group Holdings Inc. IT Support</p>
                        </div>
                        <div className="space-y-6">
                            <div className="border-b border-black pt-4"></div>
                            <p className="font-bold text-sm text-gray-900">{userName === "________________________" ? "Employee Signature" : userName}</p>
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
