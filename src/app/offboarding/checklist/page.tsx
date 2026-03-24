"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white text-sm" style={{background:"#c8c8c8"}}>Loading Document...</div>}>
            <ChecklistContent />
        </Suspense>
    );
}

/* ── tiny helpers ───────────────────────────────────────────── */
const inputCls = "border-0 border-b border-gray-400 focus:border-black outline-none w-full bg-transparent px-1 text-gray-900 print:border-gray-400";

interface CheckItem { id: number; label: string; checked: boolean; }
interface Section   { id: number; title: string; items: CheckItem[]; }

let nextId = 1000;

function makeItem(label: string): CheckItem { return { id: nextId++, label, checked: false }; }

const DEFAULT_SECTIONS: Section[] = [
    {
        id: 1, title: "To be completed with the User",
        items: [
            makeItem("Ensure the Euphoria app and Office products is uninstalled from all company and personal devices."),
            makeItem("Return company-issued phone."),
            makeItem("Return company-issued laptop."),
            makeItem("Return any other equipment or materials provided by the company."),
            makeItem("Remove all company-related files, emails, and applications from personal devices."),
            makeItem("Verify no company data remains on any external storage devices used by the employee."),
            makeItem("Confirm uninstallation of Euphoria app and Office products."),
            makeItem("Confirm return of all company property."),
            makeItem("Verify data removal from personal devices."),
            makeItem("Confirm email forwarding setup."),
        ],
    },
    {
        id: 2, title: "Company Assets Returned",
        items: [
            makeItem("Laptop / Desktop"),
            makeItem("Power supply"),
            makeItem("External peripherals (mouse, keyboard, headset, adapters)"),
            makeItem("Mobile phone / SIM"),
            makeItem("Access cards / security tokens"),
            makeItem("Laptop Bag"),
            makeItem("Other: "),
        ],
    },
];

/* ── editable section ───────────────────────────────────────── */
function EditableSection({ sec, onChange }: { sec: Section; onChange: (s: Section) => void }) {
    const addItem = () => onChange({ ...sec, items: [...sec.items, makeItem("")] });
    const removeItem = (id: number) => onChange({ ...sec, items: sec.items.filter(i => i.id !== id) });
    const toggleItem = (id: number) => onChange({ ...sec, items: sec.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
    const editLabel  = (id: number, label: string) => onChange({ ...sec, items: sec.items.map(i => i.id === id ? { ...i, label } : i) });
    const editTitle  = (title: string) => onChange({ ...sec, title });

    return (
        <section className="mb-8">
            <h2 className="font-bold border-b border-black pb-1 mb-3">{sec.title}</h2>
            {sec.items.map(item => (
                <div key={item.id} className={`flex items-start gap-2 py-1 group ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}>
                    <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 accent-gray-800 cursor-pointer flex-shrink-0"
                        checked={item.checked}
                        onChange={() => toggleItem(item.id)}
                    />
                    <input
                        className={`flex-1 outline-none bg-transparent border-0 ${item.checked ? "line-through text-gray-400" : "text-gray-900"}`}
                        value={item.label}
                        onChange={e => editLabel(item.id, e.target.value)}
                    />
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
            <td className="py-2 pr-4 align-bottom">{label}</td>
            <td className="py-2 align-bottom" style={{width:"220px"}}><input className={inputCls} value={val} onChange={e => setVal(e.target.value)} /></td>
        </tr>
    );
}

function ExtraAdminItems() {
    const [items, setItems] = useState<{id:number; label:string; val:string}[]>([]);
    const add = () => setItems(prev => [...prev, {id: nextId++, label:"", val:""}]);
    const remove = (id:number) => setItems(prev => prev.filter(i => i.id !== id));
    const setLabel = (id:number, label:string) => setItems(prev => prev.map(i => i.id===id ? {...i,label} : i));
    const setVal   = (id:number, val:string)   => setItems(prev => prev.map(i => i.id===id ? {...i,val}   : i));
    return (
        <>
            {items.length > 0 && (
                <table className="w-full border-collapse mt-2">
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-b border-gray-100 group">
                                <td className="py-2 pr-4 align-bottom">
                                    <input className={inputCls} value={item.label} onChange={e => setLabel(item.id, e.target.value)} placeholder="Label..." />
                                </td>
                                <td className="py-2 align-bottom" style={{width:"220px"}}>
                                    <input className={inputCls} value={item.val} onChange={e => setVal(item.id, e.target.value)} />
                                </td>
                                <td className="py-2 pl-2 align-bottom">
                                    <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs print:hidden transition-opacity">✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <button onClick={add} className="mt-2 text-xs text-gray-400 hover:text-gray-800 border border-dashed border-gray-300 hover:border-gray-600 px-3 py-1 rounded transition-colors print:hidden">
                + Add item
            </button>
        </>
    );
}

const TEMPLATE_KEY = "eqn-checklist-template";

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
    const [lastDay,    setLastDay]    = useState("");
    const [devicePin,  setDevicePin]  = useState("");
    const [dataRemoval, setDataRemoval] = useState<string|null>(null);
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
            fetch(`/api/users/${userId}`)
                .then(r => r.json())
                .then(d => {
                    if (d.displayName) setUserName(d.displayName);
                    if (d.mail || d.userPrincipalName) setUserEmail(d.mail || d.userPrincipalName);
                    if (d.jobTitle)    setUserTitle(d.jobTitle);
                }).catch(() => {});
            fetch(`/api/devices`)
                .then(r => r.json())
                .then(d => {
                    if (d.devices?.length > 0) {
                        // Filter to devices belonging to this user, then pick the most recently synced
                        const userDevices = d.devices.filter((dev: any) => dev.userId === userId);
                        const sorted = (userDevices.length > 0 ? userDevices : d.devices)
                            .sort((a: any, b: any) => new Date(b.lastSyncDateTime || 0).getTime() - new Date(a.lastSyncDateTime || 0).getTime());
                        setDeviceName(sorted[0].deviceName || sorted[0].displayName || "");
                    }
                })
                .catch(() => {});
        }
    }, [userId]);

    const updateSection = (updated: Section) =>
        setSections(prev => prev.map(s => s.id === updated.id ? updated : s));

    const addSection = () =>
        setSections(prev => [...prev, { id: nextId++, title: "New Section", items: [makeItem("")] }]);

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
                        <h1 className="text-xl font-bold text-gray-900">IT Exit Interview Checklist</h1>
                    </div>
                </div>

                {/* User Information */}
                <section className="mb-8">
                    <h2 className="font-bold border-b border-black pb-1 mb-3">User Information</h2>
                    <table className="w-full border-collapse">
                        <tbody>
                            {[
                                ["Username:",  userName,  setUserName],
                                ["Job Title:", userTitle, setUserTitle],
                                ["Email:",     userEmail, setUserEmail],
                                ["Device:",    deviceName,setDeviceName],
                                ["Last Day:",  lastDay,   setLastDay],
                            ].map(([lbl, val, setter]: any) => (
                                <tr key={lbl} className="border-b border-gray-100">
                                    <td className="py-2 font-semibold pr-4 align-bottom" style={{width:"160px"}}>{lbl}</td>
                                    <td className="py-2 align-bottom"><input className={inputCls} value={val} onChange={e => setter(e.target.value)} /></td>
                                </tr>
                            ))}
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
                                <td className="py-2 flex items-center gap-4 flex-wrap">
                                    {["Yes","No","Retrain till specified"].map(opt => (
                                        <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="dataRemoval" className="accent-gray-800" value={opt} checked={dataRemoval===opt} onChange={() => setDataRemoval(opt)} />
                                            <span>{opt}</span>
                                        </label>
                                    ))}
                                </td>
                            </tr>
                            <AdminRow label="Clear MFA Settings:" />
                        </tbody>
                    </table>
                    <table className="w-full border-collapse mt-4">
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 font-semibold pr-4 align-bottom" style={{width:"160px"}}>Device Login Pin:</td>
                                <td className="py-2 align-bottom"><input className={inputCls} value={devicePin} onChange={e => setDevicePin(e.target.value)} /></td>
                            </tr>
                        </tbody>
                    </table>
                    {/* Extra IT Admin items */}
                    <ExtraAdminItems />
                </section>

                {/* Dynamic editable sections */}
                {sections.map(sec => (
                    <div key={sec.id} className="relative group/sec">
                        <button
                            onClick={() => removeSection(sec.id)}
                            className="absolute -right-6 top-0 opacity-0 group-hover/sec:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity print:hidden"
                            title="Remove section"
                        >✕</button>
                        <EditableSection sec={sec} onChange={updateSection} />
                    </div>
                ))}

                {/* Add section */}
                <button
                    onClick={addSection}
                    className="w-full mt-2 mb-8 text-xs text-gray-400 hover:text-gray-800 border border-dashed border-gray-300 hover:border-gray-600 py-2 rounded transition-colors print:hidden"
                >+ Add Section</button>

                {/* Signatures */}
                <div className="mt-8">
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
                        Return to Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
