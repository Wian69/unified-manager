"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-400 flex items-center justify-center text-white text-sm">Loading Document...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

const inputCls = "border-0 border-b border-gray-400 focus:border-black outline-none w-full bg-transparent px-1 text-gray-900 print:border-gray-400";
const cbCls = "mr-2 w-4 h-4 accent-gray-800 cursor-pointer print:appearance-none print:border print:border-gray-800 print:w-3 print:h-3";

function Row({ label, value }: { label: string; value?: string }) {
    const [val, setVal] = useState(value || "");
    useEffect(() => { if (value) setVal(value); }, [value]);
    return (
        <tr className="border-b border-gray-100">
            <td className="py-2 font-semibold whitespace-nowrap pr-4 align-bottom" style={{width:"180px"}}>{label}</td>
            <td className="py-2 align-bottom"><input className={inputCls} value={val} onChange={e => setVal(e.target.value)} /></td>
        </tr>
    );
}

function AdminRow({ label }: { label: string }) {
    const [val, setVal] = useState("");
    return (
        <tr className="border-b border-gray-100">
            <td className="py-2 pr-4 align-bottom">{label}</td>
            <td className="py-2 align-bottom" style={{width:"200px"}}><input className={inputCls} value={val} onChange={e => setVal(e.target.value)} /></td>
        </tr>
    );
}

function CheckItem({ label }: { label: string }) {
    const [checked, setChecked] = useState(false);
    return (
        <label className={`flex items-start gap-2 py-1 cursor-pointer select-none ${checked ? "line-through text-gray-400" : "text-gray-900"}`}>
            <input type="checkbox" className={cbCls} checked={checked} onChange={e => setChecked(e.target.checked)} />
            <span>{label}</span>
        </label>
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
    const [dataRemoval, setDataRemoval] = useState<string | null>(null);
    const [devicePin, setDevicePin] = useState("");
    const [otherAsset, setOtherAsset] = useState("");
    const [lastDay, setLastDay] = useState("");

    useEffect(() => {
        if (userId) {
            fetch(`/api/users/${userId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.displayName) setUserName(d.displayName);
                    if (d.mail || d.userPrincipalName) setUserEmail(d.mail || d.userPrincipalName);
                    if (d.jobTitle) setUserTitle(d.jobTitle);
                })
                .catch(() => {});
            fetch(`/api/devices?userId=${userId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.devices?.length > 0) setDeviceName(d.devices[0].deviceName || d.devices[0].displayName || "");
                })
                .catch(() => {});
        }
    }, [userId]);

    return (
        <div className="min-h-screen py-12 flex flex-col items-center print:py-0 print:bg-white" style={{background:"#c8c8c8", fontFamily:"'Calibri','Calibri Light',sans-serif", fontSize:"11pt", color:"#111111"}}>
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none print:p-8 ring-1 ring-gray-400 print:ring-0" style={{padding:"40px 48px 48px 48px", fontFamily:"inherit", fontSize:"inherit"}}>

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <img src="/Equinox-Logo-Transparent.png" alt="Equinox Outsourced Services" className="h-20 w-auto" />
                    <div className="text-right mt-2">
                        <h1 className="text-xl font-bold text-gray-900">IT Exit Interview Checklist</h1>
                    </div>
                </div>

                {/* User Information */}
                <section className="mb-8">
                    <h2 className="font-bold border-b border-black pb-1 mb-3">User Information</h2>
                    <table className="w-full border-collapse">
                        <tbody>
                            <Row label="Username:" value={userName} />
                            <Row label="Job Title:" value={userTitle} />
                            <Row label="Email:" value={userEmail} />
                            <Row label="Device:" value={deviceName} />
                            <Row label="Last Day:" value={lastDay} />
                        </tbody>
                    </table>
                </section>

                {/* IT Administrative */}
                <section className="mb-8">
                    <h2 className="font-bold border-b border-black pb-1 mb-3">IT Administrative</h2>
                    <table className="w-full border-collapse">
                        <tbody>
                            <AdminRow label="Shared mailbox created:" />
                            <AdminRow label="Email forward or shared mailbox members:" />
                            <AdminRow label="Remove MS365 License:" />
                            <AdminRow label="Remove from all groups on AD:" />
                            <tr className="border-b border-gray-100">
                                <td className="py-2 pr-4 align-middle">Company data removal:</td>
                                <td className="py-2 flex items-center gap-4">
                                    {["Yes","No","Retrain till specified"].map(opt => (
                                        <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="dataRemoval" className="accent-gray-800 cursor-pointer" value={opt} checked={dataRemoval===opt} onChange={() => setDataRemoval(opt)} />
                                            <span>{opt}</span>
                                        </label>
                                    ))}
                                </td>
                            </tr>
                            <AdminRow label="Clear MFA Settings:" />
                        </tbody>
                    </table>
                </section>

                {/* To be completed with the User */}
                <section className="mb-8">
                    <h2 className="font-bold border-b border-black pb-1 mb-3">To be completed with the User</h2>
                    <table className="w-full border-collapse mb-4">
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 font-semibold pr-4 align-bottom" style={{width:"180px"}}>Device Login Pin:</td>
                                <td className="py-2 align-bottom"><input className={inputCls} value={devicePin} onChange={e => setDevicePin(e.target.value)} /></td>
                            </tr>
                        </tbody>
                    </table>

                    <p className="font-bold mb-2">Uninstallation of Euphoria App and Office products:</p>
                    <CheckItem label="Ensure the Euphoria app and Office products is uninstalled from all company and personal devices." />

                    <p className="font-bold mt-4 mb-2">Return of Company Property:</p>
                    <CheckItem label="Return company-issued phone." />
                    <CheckItem label="Return company-issued laptop." />
                    <CheckItem label="Return any other equipment or materials provided by the company." />

                    <p className="font-bold mt-4 mb-2">Data Removal:</p>
                    <CheckItem label="Remove all company-related files, emails, and applications from personal devices." />
                    <CheckItem label="Verify no company data remains on any external storage devices used by the employee." />

                    <p className="font-bold mt-4 mb-2">Final Checklist:</p>
                    <CheckItem label="Confirm uninstallation of Euphoria app and Office products." />
                    <CheckItem label="Confirm return of all company property." />
                    <CheckItem label="Verify data removal from personal devices." />
                    <CheckItem label="Confirm email forwarding setup." />
                </section>

                {/* Company Assets Returned */}
                <section className="mb-8">
                    <h2 className="font-bold border-b border-black pb-1 mb-2">Company Assets Returned</h2>
                    <p className="mb-3 text-gray-900">The following company issued IT assets have been returned by the employee:</p>
                    <CheckItem label="Laptop / Desktop" />
                    <CheckItem label="Power supply" />
                    <CheckItem label="External peripherals (mouse, keyboard, headset, adapters)" />
                    <CheckItem label="Mobile phone / SIM" />
                    <CheckItem label="Access cards / security tokens" />
                    <CheckItem label="Laptop Bag" />
                    <div className="flex items-center gap-2 mt-1">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className={cbCls} />
                            <span>Other:</span>
                        </label>
                        <input className={`${inputCls} flex-1`} value={otherAsset} onChange={e => setOtherAsset(e.target.value)} />
                    </div>
                </section>

                {/* Signatures */}
                <div className="mt-16">
                    <h2 className="font-bold mb-8">Formal Acknowledgment</h2>
                    <div className="grid grid-cols-2 gap-16">
                        <div>
                            <div className="border-b border-black pt-10 mb-2"></div>
                            <p className="font-bold text-sm">Equinox Group Holdings Inc. IT Support</p>
                        </div>
                        <div>
                            <div className="border-b border-black pt-10 mb-2"></div>
                            <p className="font-bold text-sm">{userName || "Employee Signature"}</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mt-12 text-center print:hidden border-t border-gray-200 pt-8 flex justify-center gap-4">
                    <button onClick={() => window.print()} className="px-8 py-3 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors">
                        Print Checklist
                    </button>
                    <button onClick={() => router.back()} className="px-8 py-3 bg-white text-gray-900 border border-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors">
                        Return to Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
