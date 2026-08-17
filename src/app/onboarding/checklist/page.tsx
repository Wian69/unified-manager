"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

export default function OnboardingChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white text-sm" style={{background:"#c8c8c8"}}>Loading Document...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

/* ── tiny helpers ───────────────────────────────────────────── */
const inputCls = "border-0 border-b border-gray-400 focus:border-black outline-none w-full bg-transparent px-1 text-gray-900 print:border-gray-400";
const dateInputCls = "border-0 border-b border-gray-400 focus:border-black outline-none w-32 bg-transparent px-1 text-gray-900 print:border-gray-400 text-sm";

interface CheckItem { id: number; label: string; checked: boolean; date?: string; }
interface Section   { id: number; title: string; items: CheckItem[]; hasDate?: boolean; }

let nextId = 1000;

function makeItem(label: string, date: string = ""): CheckItem { return { id: nextId++, label, checked: false, date }; }

const DEFAULT_SECTIONS: Section[] = [
    {
        id: 1, title: "Account Setup",
        items: [
            makeItem("365 password"),
            makeItem("Add user on 365 admin center"),
            makeItem("Complete Job title"),
            makeItem("Complete Department"),
            makeItem("Complete Office"),
            makeItem("Email Address"),
            makeItem("Add user permissions on Sharepoint"),
            makeItem("Enable local Admin account"),
            makeItem("Add users to Euphoria"),
            makeItem("Euphoria extention number"),
            makeItem("Add user to All user group"),
            makeItem("Add user to region group"),
        ],
    },
    {
        id: 2, title: "Enrollment",
        items: [
            makeItem("Run Hardware hash"),
            makeItem("Enroll laptop on autopilot"),
            makeItem("Laptop Pin"),
            makeItem("Make sure device is listed in intune"),
        ],
    },
    {
        id: 3, title: "Applications",
        items: [
            makeItem("Adobe"),
            makeItem("Java"),
            makeItem("Company Portal"),
            makeItem("Microsft 365"),
            makeItem("Google Chrome"),
            makeItem("Firefox"),
            makeItem("Sage"),
        ],
    },
    {
        id: 4, title: "Configuration",
        items: [
            makeItem("Outlook"),
            makeItem("Outlook signature"),
            makeItem("Email Font (Calibre)"),
            makeItem("Email size (11)"),
            makeItem("Printer - 192.168.3.41"),
            makeItem("Setup email address on printer"),
            makeItem("Sync Onedrive"),
            makeItem("Sync Company Sharepoint"),
            makeItem("Sync Intune policies"),
            makeItem("Enable System restore"),
            makeItem("Add Corporate Background for teams"),
            makeItem("Make sure keboard is correct (SA)"),
        ],
    },
    {
        id: 5, title: "Fusion CRM",
        items: [
            makeItem("Add User"),
            makeItem("User Permissions"),
        ],
    },
    {
        id: 6, title: "Completed",
        items: [
            makeItem("Name"),
            makeItem("Date"),
            makeItem("Update Asset and user list"),
        ],
    },
];

/* ── editable section ───────────────────────────────────────── */
function EditableSection({ sec, onChange }: { sec: Section; onChange: (s: Section) => void }) {
    const addItem = () => onChange({ ...sec, items: [...sec.items, makeItem("")] });
    const removeItem = (id: number) => onChange({ ...sec, items: sec.items.filter(i => i.id !== id) });
    const toggleItem = (id: number) => onChange({ ...sec, items: sec.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
    const editLabel  = (id: number, label: string) => onChange({ ...sec, items: sec.items.map(i => i.id === id ? { ...i, label } : i) });
    const editDate   = (id: number, date: string) => onChange({ ...sec, items: sec.items.map(i => i.id === id ? { ...i, date } : i) });

    return (
        <section className="mb-8">
            <h2 className="font-bold border-b border-black pb-1 mb-3 flex justify-between">
                <span>{sec.title}</span>
                {sec.hasDate && <span className="text-sm font-normal text-gray-600 w-32 text-center">Date</span>}
            </h2>
            {sec.items.map(item => (
                <div key={item.id} className={`flex items-center gap-2 py-1.5 group ${item.checked ? "text-gray-500" : "text-gray-900"}`}>
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-gray-800 cursor-pointer flex-shrink-0"
                        checked={item.checked}
                        onChange={() => toggleItem(item.id)}
                    />
                    <input
                        className={`flex-1 outline-none bg-transparent border-0 ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}
                        value={item.label}
                        onChange={e => editLabel(item.id, e.target.value)}
                        placeholder="Item description..."
                    />
                    {sec.hasDate && (
                        <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            className={dateInputCls}
                            value={item.date || ""}
                            onChange={e => editDate(item.id, e.target.value)}
                        />
                    )}
                    <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1 transition-opacity print:hidden"
                        title="Remove item"
                    >✕</button>
                </div>
            ))}
            <button
                onClick={addItem}
                className="mt-2 text-xs text-gray-400 hover:text-gray-800 border border-dashed border-gray-300 hover:border-gray-600 px-3 py-1 rounded transition-colors print:hidden"
            >+ Add item</button>
        </section>
    );
}

/* ── admin row ──────────────────────────────────────────────── */
function AdminRow({ label }: { label: string }) {
    const [val, setVal] = useState("");
    return (
        <tr className="border-b border-gray-100">
            <td className="py-2 pr-4 align-bottom w-1/2">{label}</td>
            <td className="py-2 align-bottom w-1/2"><input className={inputCls} value={val} onChange={e => setVal(e.target.value)} /></td>
        </tr>
    );
}

const TEMPLATE_KEY = "eqn-onboarding-checklist-template";

/* ── main component ─────────────────────────────────────────── */
function ChecklistContent() {
    const searchParams = useSearchParams();
    const { logo } = useCompanyLogo();
    const router = useRouter();
    const userId = searchParams.get('user');

    const [userName,   setUserName]   = useState("");
    const [userEmail,  setUserEmail]  = useState("");
    const [userTitle,  setUserTitle]  = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [setupDate,  setSetupDate]  = useState("");
    const [startDate,  setStartDate]  = useState("");
    const [deviceReg,  setDeviceReg]  = useState("");
    const [saved, setSaved] = useState(false);

    // Load template from localStorage (falls back to defaults)
    const loadTemplate = (): Section[] => {
        try {
            const raw = localStorage.getItem(TEMPLATE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return DEFAULT_SECTIONS;
    };

    const [sections, setSections] = useState<Section[]>(loadTemplate);

    useEffect(() => {
        if (userId) {
            // Fetch User Details from Graph
            fetch(`/api/users/${userId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.displayName) setUserName(d.displayName);
                    if (d.mail || d.userPrincipalName) setUserEmail(d.mail || d.userPrincipalName);
                    if (d.jobTitle)    setUserTitle(d.jobTitle);
                    if (d.createdDateTime) {
                        setStartDate(new Date(d.createdDateTime).toLocaleDateString());
                    }
                }).catch(() => {});

            // Fetch Device Details
            fetch(`/api/devices`)
                .then(r => r.json())
                .then(d => {
                    if (d.devices?.length > 0) {
                        const userDevices = d.devices.filter((dev: any) => dev.userId === userId || (dev.userPrincipalName && dev.userPrincipalName.toLowerCase() === userEmail.toLowerCase()));
                        const sorted = (userDevices.length > 0 ? userDevices : d.devices)
                            .sort((a: any, b: any) => new Date(a.enrolledDateTime || 0).getTime() - new Date(b.enrolledDateTime || 0).getTime());
                        
                        if (sorted.length > 0) {
                            setDeviceName(sorted[0].deviceName || sorted[0].displayName || "");
                            if (sorted[0].enrolledDateTime) {
                                setDeviceReg(new Date(sorted[0].enrolledDateTime).toLocaleDateString());
                            }
                        }
                    }
                })
                .catch(() => {});
        }
    }, [userId, userEmail]);

    const updateSection = (updated: Section) =>
        setSections(prev => prev.map(s => s.id === updated.id ? updated : s));

    const addSection = (hasDate: boolean = false) =>
        setSections(prev => [...prev, { id: nextId++, title: "New Section", hasDate, items: [makeItem("")] }]);

    const removeSection = (id: number) =>
        setSections(prev => prev.filter(s => s.id !== id));

    const saveTemplate = () => {
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(sections));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const resetTemplate = () => {
        localStorage.removeItem(TEMPLATE_KEY);
        setSections(DEFAULT_SECTIONS);
    };

    return (
        <div className="min-h-screen py-12 flex flex-col items-center print:py-0 print:bg-white" style={{background:"#c8c8c8", fontFamily:"'Calibri','Calibri Light',sans-serif", fontSize:"11pt", color:"#111111"}}>
            <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none ring-1 ring-gray-400 print:ring-0" style={{padding:"40px 48px 48px 48px", fontFamily:"inherit", fontSize:"inherit"}}>

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                    <img src={logo} alt="Company Logo" className="h-20 w-auto" />
                    <div className="text-right mt-2">
                        <h1 className="text-xl font-bold text-gray-900 uppercase">IT Onboarding Checklist</h1>
                    </div>
                </div>

                {/* User Information */}
                <section className="mb-8 break-inside-avoid">
                    <h2 className="font-bold border-b border-black pb-1 mb-3">User Information</h2>
                    <table className="w-full border-collapse">
                        <tbody>
                            {[
                                ["Employee Name:",  userName,  setUserName],
                                ["Job Title:", userTitle, setUserTitle],
                                ["Email Address:",     userEmail, setUserEmail],
                                ["Setup Date:",  setupDate,   setSetupDate],
                                ["Start Date:",  startDate,   setStartDate],
                                ["Assigned Device:",    deviceName,setDeviceName],
                                ["Intune Enrollment Date:",  deviceReg,   setDeviceReg],
                            ].map(([lbl, val, setter]: any) => (
                                <tr key={lbl} className="border-b border-gray-100">
                                    <td className="py-2 font-semibold pr-4 align-bottom w-1/3">{lbl}</td>
                                    <td className="py-2 align-bottom w-2/3"><input className={inputCls} value={val} onChange={e => setter(e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Dynamic editable sections */}
                {sections.map(sec => (
                    <div key={sec.id} className="relative group/sec break-inside-avoid">
                        <button
                            onClick={() => removeSection(sec.id)}
                            className="absolute -right-6 top-0 opacity-0 group-hover/sec:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity print:hidden"
                            title="Remove section"
                        >✕</button>
                        <EditableSection sec={sec} onChange={updateSection} />
                    </div>
                ))}

                {/* Add section */}
                <div className="flex gap-2 print:hidden mb-8">
                    <button
                        onClick={() => addSection(false)}
                        className="flex-1 mt-2 text-xs text-gray-400 hover:text-gray-800 border border-dashed border-gray-300 hover:border-gray-600 py-2 rounded transition-colors"
                    >+ Add Section</button>
                    <button
                        onClick={() => addSection(true)}
                        className="flex-1 mt-2 text-xs text-gray-400 hover:text-gray-800 border border-dashed border-gray-300 hover:border-gray-600 py-2 rounded transition-colors"
                    >+ Add Section (With Dates)</button>
                </div>

                <div className="mt-12 text-center print:hidden border-t border-gray-200 pt-8 flex flex-wrap justify-center gap-3">
                    <button onClick={saveTemplate} className={`px-8 py-3 text-white text-sm font-bold uppercase tracking-wider transition-colors ${saved ? 'bg-green-700' : 'bg-blue-700 hover:bg-blue-900'}`}>
                        {saved ? '✓ Template Saved' : 'Save as Template'}
                    </button>
                    <button onClick={resetTemplate} className="px-8 py-3 bg-white text-gray-700 border border-gray-400 text-sm font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors">
                        Reset to Default
                    </button>
                    <button onClick={() => window.print()} className="px-8 py-3 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors">
                        Print Checklist
                    </button>
                    <button onClick={() => router.back()} className="px-8 py-3 bg-white text-gray-900 border border-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors">
                        Return
                    </button>
                </div>
            </div>
        </div>
    );
}
