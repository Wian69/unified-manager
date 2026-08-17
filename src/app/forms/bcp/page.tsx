"use client";

import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { useEffect, useState } from "react";

export default function BCPReportPage() {
    const { logo } = useCompanyLogo();
    const [dateStr, setDateStr] = useState("");

    useEffect(() => {
        setDateStr(new Date().toLocaleDateString());
        document.title = `BCP-DR Test Report - Wian Du Randt - ${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    }, []);

    return (
        <div className="min-h-screen py-12 flex flex-col items-center print:py-0 print:bg-white" style={{background:"#c8c8c8", fontFamily:"'Calibri','Calibri Light',sans-serif", fontSize:"11pt", color:"#111111"}}>
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none ring-1 ring-gray-400 print:ring-0" style={{padding:"40px 48px 48px 48px", fontFamily:"inherit", fontSize:"inherit"}}>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <img src={logo} alt="Company Logo" className="h-20 w-auto" />
                    <div className="text-right mt-2">
                        <h1 className="text-xl font-bold text-gray-900">BCP / DR Test Report</h1>
                        <p className="text-sm text-gray-600 font-bold uppercase tracking-widest mt-1">Business Continuity & Disaster Recovery</p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <p><strong>Company Name:</strong> Equinox Group</p>
                        <p><strong>Date of Exercise:</strong> {dateStr}</p>
                    </div>
                    <div>
                        <p><strong>Exercise Facilitator:</strong> Wian Du Randt, IT Support Specialist</p>
                        <p><strong>Test Type:</strong> Tabletop & Communication Simulation</p>
                    </div>
                </div>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">1. Executive Summary</h2>
                    <p className="text-justify mb-2">
                        This document serves as the formal record of the annual Business Continuity and Disaster Recovery (BCP/DR) test. The objective is to validate that critical business operations can successfully failover and continue operating during a severe localized disruption, and that out-of-band communication channels function effectively.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">2. Attendance Noted</h2>
                    <ul className="list-disc pl-5">
                        <li><strong>Wian Du Randt</strong> - IT Support Specialist / Recovery Coordinator</li>
                        <li><strong>Amanda</strong> - HR & Administration</li>
                        <li><strong>Key Department Heads</strong> - (Simulated Notification)</li>
                    </ul>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">3. Scenario Tested: "Primary Office Network Compromise / Power Failure"</h2>
                    <p className="text-justify">
                        <strong>Scenario Description:</strong> A severe localized power failure and ISP outage renders the primary corporate office completely inaccessible. Staff on-site lose access to Wi-Fi and corporate network infrastructure. The goal is to verify that staff can switch to remote work and access critical files via cloud infrastructure (Microsoft 365/SharePoint), and that emergency communication channels work when standard corporate email is inaccessible.
                    </p>
                </section>

                <section className="mb-6">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">4. Exercise Log & Actions Taken</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>09:00 AM (Incident Trigger):</strong> IT confirms the total loss of office connectivity. The Disaster Recovery protocol is formally initiated.</li>
                        <li><strong>09:15 AM (Communication Channels Tested):</strong> IT Support Specialist utilizes the <strong>Emergency WhatsApp Group</strong> and SMS broadcast to notify staff of the outage, instructing them to relocate to home offices. <em>(Communication channel test successful).</em></li>
                        <li><strong>10:00 AM (Failover Validation):</strong> Staff verify they can successfully connect to Microsoft 365, SharePoint, and Teams using home Wi-Fi or 4G mobile hotspots.</li>
                        <li><strong>10:30 AM (Data Integrity Check):</strong> IT validates that no data was lost during the sudden outage, as all critical files are actively syncing to cloud SharePoint storage.</li>
                        <li><strong>11:30 AM (Stand Down):</strong> Simulated power is restored. Staff are notified via Teams that the office will be operational by the following morning.</li>
                    </ul>
                </section>

                <section className="mb-10">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">5. Findings Documented & Remediation</h2>
                    <p className="italic mb-2">Based on the simulation, the following findings were recorded:</p>
                    <ul className="list-decimal pl-5 space-y-2">
                        <li><strong>What worked well:</strong> The heavy reliance on Microsoft 365 cloud infrastructure meant that the loss of the physical office had zero impact on data availability.</li>
                        <li><strong>Communication Findings:</strong> The Emergency WhatsApp channel successfully reached 100% of participants within 5 minutes.</li>
                        <li><strong>Areas for Improvement:</strong> A few users experienced confusion on how to properly authenticate to Entra ID from a brand new IP address (home network) due to Conditional Access MFA prompts.</li>
                        <li><strong>Action Item:</strong> IT will distribute a 1-page guide on expected MFA behavior when working remotely or from a hotspot.</li>
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
