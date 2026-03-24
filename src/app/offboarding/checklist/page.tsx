"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-500 text-sm">Loading Document...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

function ChecklistContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get('user');
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userTitle, setUserTitle] = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [lastDay, setLastDay] = useState("");

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.displayName) setUserName(data.displayName);
                    if (data.mail || data.userPrincipalName) setUserEmail(data.mail || data.userPrincipalName);
                    if (data.jobTitle) setUserTitle(data.jobTitle);
                })
                .catch(() => {});
            fetch(`/api/devices?userId=${userId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.devices && data.devices.length > 0) {
                        setDeviceName(data.devices[0].deviceName || data.devices[0].displayName || "");
                    }
                })
                .catch(() => {});
        }
    }, [userId]);

    return (
        <div className="min-h-screen bg-gray-200 py-12 flex justify-center print:bg-white print:py-0" style={{fontFamily: "'Calibri', 'Calibri Light', sans-serif", fontSize: "11pt"}}>
            <div className="w-full max-w-[210mm] bg-white p-12 md:p-16 shadow-lg print:shadow-none print:p-8 min-h-[297mm] ring-1 ring-gray-300 print:ring-0" style={{fontFamily: "inherit", fontSize: "inherit"}}>

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
                    <img src="/Equinox-Logo-Transparent.png" alt="Equinox Outsourced Services" className="h-24 w-auto" />
                    <div className="text-right flex flex-col justify-end mt-4">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">IT Exit Interview Checklist</h1>
                    </div>
                </div>

                {/* User Information */}
                <section className="mb-8">
                    <h2 className="font-bold text-base mb-3 border-b border-black pb-1">User Information</h2>
                    <table className="w-full text-sm border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 font-bold w-40">Username:</td>
                                <td className="py-2 border-b border-gray-400 w-full">{userName || "\u00a0"}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 font-bold">Job Title:</td>
                                <td className="py-2 border-b border-gray-400">{userTitle || "\u00a0"}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 font-bold">Email:</td>
                                <td className="py-2 border-b border-gray-400">{userEmail || "\u00a0"}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 font-bold">Device:</td>
                                <td className="py-2 border-b border-gray-400">{deviceName || "\u00a0"}</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Last Day:</td>
                                <td className="py-2 border-b border-gray-400">{lastDay || "\u00a0"}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* IT Administrative */}
                <section className="mb-8">
                    <h2 className="font-bold text-base mb-3 border-b border-black pb-1">IT Administrative</h2>
                    <table className="w-full text-sm border-collapse">
                        <tbody>
                            {[
                                "Shared mailbox created:",
                                "Email forward or shared mailbox members:",
                                "Remove MS365 License:",
                                "Remove from all groups on AD:",
                            ].map((item) => (
                                <tr key={item} className="border-b border-gray-200">
                                    <td className="py-2 w-3/4">{item}</td>
                                    <td className="py-2 border-b border-gray-400 w-1/4">&nbsp;</td>
                                </tr>
                            ))}
                            <tr className="border-b border-gray-200">
                                <td className="py-2">Company data removal:</td>
                                <td className="py-2">☐ Yes &nbsp;&nbsp; ☐ No &nbsp;&nbsp; ☐ Retrain till specified</td>
                            </tr>
                            <tr>
                                <td className="py-2">Clear MFA Settings:</td>
                                <td className="py-2 border-b border-gray-400">&nbsp;</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* To be completed with the User */}
                <section className="mb-8">
                    <h2 className="font-bold text-base mb-3 border-b border-black pb-1">To be completed with the User</h2>
                    <table className="w-full text-sm border-collapse mb-4">
                        <tbody>
                            <tr>
                                <td className="py-2 font-bold w-40">Device Login Pin:</td>
                                <td className="py-2 border-b border-gray-400">&nbsp;</td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="font-bold mb-1">Uninstallation of Euphoria App and Office products:</p>
                    <p className="mb-4">☐ Ensure the Euphoria app and Office products is uninstalled from all company and personal devices.</p>

                    <p className="font-bold mb-1">Return of Company Property:</p>
                    <p>☐ Return company-issued phone.</p>
                    <p>☐ Return company-issued laptop.</p>
                    <p className="mb-4">☐ Return any other equipment or materials provided by the company.</p>

                    <p className="font-bold mb-1">Data Removal:</p>
                    <p>☐ Remove all company-related files, emails, and applications from personal devices.</p>
                    <p className="mb-4">☐ Verify no company data remains on any external storage devices used by the employee.</p>

                    <p className="font-bold mb-1">Final Checklist:</p>
                    <p>☐ Confirm uninstallation of Euphoria app and Office products.</p>
                    <p>☐ Confirm return of all company property.</p>
                    <p>☐ Verify data removal from personal devices.</p>
                    <p className="mb-4">☐ Confirm email forwarding setup.</p>
                </section>

                {/* Signatures */}
                <div className="mt-16 pt-8">
                    <h2 className="font-bold text-base mb-8">Formal Acknowledgment</h2>
                    <div className="grid grid-cols-2 gap-16">
                        <div>
                            <div className="border-b border-black pt-8 mb-2"></div>
                            <p className="font-bold text-sm">Equinox Group Holdings Inc. IT Support</p>
                        </div>
                        <div>
                            <div className="border-b border-black pt-8 mb-2"></div>
                            <p className="font-bold text-sm">{userName || "Employee Signature"}</p>
                        </div>
                    </div>
                </div>

                {/* Print / Back buttons */}
                <div className="mt-12 text-center print:hidden border-t border-gray-200 pt-8 flex justify-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="px-8 py-3 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors"
                    >
                        Print Checklist
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 bg-white text-gray-900 border border-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                    >
                        Return to Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
