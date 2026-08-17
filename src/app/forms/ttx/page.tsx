"use client";

import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { useEffect, useState } from "react";

export default function TTXReportPage() {
    const { logo } = useCompanyLogo();
    const [dateStr, setDateStr] = useState("");

    useEffect(() => {
        setDateStr(new Date().toLocaleDateString());
        document.title = `Incident Response TTX Report - Wian Du Randt - ${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    }, []);

    return (
        <div className="min-h-screen py-12 flex flex-col items-center print:py-0 print:bg-white" style={{background:"#c8c8c8", fontFamily:"'Calibri','Calibri Light',sans-serif", fontSize:"11pt", color:"#111111"}}>
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none ring-1 ring-gray-400 print:ring-0" style={{padding:"40px 48px 48px 48px", fontFamily:"inherit", fontSize:"inherit"}}>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <img src={logo} alt="Company Logo" className="h-20 w-auto" />
                    <div className="text-right mt-2">
                        <h1 className="text-xl font-bold text-gray-900">Incident Response TTX Report</h1>
                    </div>
                </div>

                <div className="mb-6">
                    <p><strong>Company Name:</strong> Equinox Group</p>
                    <p><strong>Date of Exercise:</strong> {dateStr}</p>
                    <p><strong>Exercise Facilitator:</strong> Wian Du Randt, IT Support Specialist</p>
                </div>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">1. Executive Summary</h2>
                    <p className="text-justify mb-2">
                        This document serves as the formal record of the annual Incident Response Plan (IRP) test. The purpose of this exercise is to validate the effectiveness of the current IRP, ensure team members understand their roles, and identify areas for improvement in the event of a real security incident.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">2. Participants</h2>
                    <ul className="list-disc pl-5">
                        <li><strong>Wian Du Randt</strong> - IT Support Specialist / Incident Commander</li>
                        <li><strong>Amanda</strong> - HR & Administration</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">3. Scenario Tested: "Exchange Online Outbound Spam Restriction"</h2>
                    <p className="text-justify">
                        <strong>Scenario Description:</strong> Exchange Online Protection (EOP) triggers a 'User restricted from sending email' alert. Investigation reveals an internal user's account was compromised and is being used to send thousands of spam emails via Exchange Online, risking the tenant's outbound IP reputation.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">4. Exercise Log & Actions Taken</h2>
                    <p className="italic mb-2">The team walked through the Incident Response Plan to address the scenario. The following actions were simulated:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>10:00 AM (Identification):</strong> IT receives the automated alert from Exchange Online. The incident is classified as a "High Severity Security Incident" in accordance with the IRP.</li>
                        <li><strong>10:15 AM (Containment):</strong> The IT Support Specialist disables the user's account in Entra ID and revokes all active SSO sessions to instantly halt the spam campaign.</li>
                        <li><strong>10:30 AM (Eradication):</strong> The team utilizes Exchange Admin Center to run a Message Trace, identifying the scope of the outbound spam. Suspicious forwarding rules are identified and removed via PowerShell.</li>
                        <li><strong>11:00 AM (Recovery):</strong> The user's password is reset, MFA is completely re-registered, and the IT Support Specialist unblocks the user's mailbox via the Microsoft 365 Defender Restricted Entities page.</li>
                        <li><strong>11:30 AM (Communication):</strong> IT contacts the affected user to verify device security and notifies management that the incident is fully contained.</li>
                    </ul>
                </section>

                <section className="mb-10">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">5. Lessons Learned & Remediation</h2>
                    <p className="italic mb-2">What worked well, and what needs improvement based on this test?</p>
                    <ul className="list-decimal pl-5 space-y-2">
                        <li><strong>What worked well:</strong> The containment procedure (revoking sessions in Entra ID) instantly stopped the unauthorized Exchange activity.</li>
                        <li><strong>Areas for Improvement:</strong> Finding the exact portal to unblock a restricted Exchange user took longer than expected due to recent Microsoft admin center UI changes.</li>
                        <li><strong>Action Item:</strong> IT will document the exact direct URL for the Restricted Entities portal in the internal IT Wiki to speed up recovery in future incidents.</li>
                    </ul>
                </section>

                <div className="mt-12 text-center print:hidden border-t border-gray-200 pt-8">
                    <button 
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg"
                    >
                        Print to PDF
                    </button>
                    <p className="text-sm text-gray-500 mt-2">When printing, ensure "Save as PDF" is selected.</p>
                </div>
            </div>
        </div>
    );
}
