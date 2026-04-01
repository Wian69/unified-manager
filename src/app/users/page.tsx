"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, X, Save, ChevronDown, ChevronRight, Clock, Mail, Calendar as CalendarIcon, Globe } from "lucide-react";

/**
 * Formats an ISO date string into a compact relative time string.
 */
const formatRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Never';
        
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays}d ago`;
        
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths}mo ago`;
        
        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears}y ago`;
    } catch (e) {
        return 'Never';
    }
};

const getStatusColor = (availability: string | undefined) => {
    switch (availability) {
        case 'Available': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
        case 'Busy':
        case 'DoNotDisturb': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
        case 'Away':
        case 'BeRightBack': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
        case 'Offline':
        default: return 'bg-slate-600';
    }
};



const InputField = ({ label, field, value, onChange, readOnly = false }: { label: string, field: string, value: string, onChange?: (val: string) => void, readOnly?: boolean }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e) => onChange && onChange(e.target.value)}
            readOnly={readOnly}
            className={`w-full bg-slate-900 border ${readOnly ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-700 text-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600'} rounded-lg px-4 py-2.5 outline-none transition-all`}
        />
    </div>
);

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [signInFilter, setSignInFilter] = useState('all');

    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    const [mailboxLoading, setMailboxLoading] = useState(false);
    const [mailboxSettings, setMailboxSettings] = useState<any>(null);
    const [mailboxSaving, setMailboxSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUserClick = async (id: string) => {
        setSelectedUserId(id);
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/users/${id}?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            setSelectedUser(data);
            setEditForm({
                displayName: data.displayName || '',
                givenName: data.givenName || '',
                surname: data.surname || '',
                jobTitle: data.jobTitle || '',
                companyName: data.companyName || '',
                department: data.department || '',
                officeLocation: data.officeLocation || '',
                streetAddress: data.streetAddress || '',
                city: data.city || '',
                state: data.state || '',
                postalCode: data.postalCode || '',
                country: data.country || '',
                mobilePhone: data.mobilePhone || '',
                businessPhones: data.businessPhones && data.businessPhones.length > 0 ? data.businessPhones[0] : ''
            });
        } catch (error) {
            console.error("Failed to fetch user details", error);
        } finally {
            setLoadingDetails(false);
        }

        // Fetch Mailbox Settings
        setMailboxLoading(true);
        try {
            const res = await fetch(`/api/users/${id}/mailbox?t=${Date.now()}`);
            const data = await res.json();
            if (!data.error) {
                setMailboxSettings(data);
            }
        } catch (error) {
            console.error("Failed to fetch mailbox settings", error);
        } finally {
            setMailboxLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        setSaving(true);
        const diff: any = {};
        Object.keys(editForm).forEach(key => {
            let currentValue = selectedUser[key];
            let newValue = editForm[key];
            
            // Normalize businessPhones for comparison (array vs string)
            if (key === 'businessPhones') {
                currentValue = (selectedUser.businessPhones && selectedUser.businessPhones.length > 0) ? selectedUser.businessPhones[0] : '';
            }
            
            if (newValue !== currentValue) {
                diff[key] = newValue;
            }
        });

        try {
            // 1. Profile Update (Entra ID)
            if (Object.keys(diff).length > 0) {
                const res = await fetch(`/api/users/${selectedUserId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(diff),
                });
                if (!res.ok) throw new Error("Graph API Sync failed for profile changes.");
            }

            // 2. Mailbox Update (OOO)
            if (mailboxSettings && mailboxSettings.automaticRepliesSetting) {
                const mailRes = await fetch(`/api/users/${selectedUserId}/mailbox`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        automaticRepliesSetting: mailboxSettings.automaticRepliesSetting
                    }),
                });
                if (!mailRes.ok) throw new Error("Mailbox Sync failed for OOO changes.");
            }
            
            // Update local state immediately for instant grouping feedback
            setUsers(prevUsers => prevUsers.map(u => 
                u.id === selectedUserId 
                    ? { ...u, ...editForm, officeLocation: editForm.officeLocation?.trim() } 
                    : u
            ));
            
            setSelectedUserId(null);
            
            // Delay background refresh to let Graph consistency catch up
            setTimeout(() => fetchUsers(), 3000);
            
            alert("Profile and Out of Office settings saved successfully!");
        } catch (error: any) {
            console.error("Failed to update user", error);
            alert("Error saving: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    // removed handleSaveMailbox as it's merged into handleSave

    const filteredUsers = users.filter(user => {
        if (signInFilter === 'all') return true;
        
        const lastSignIn = user.signInActivity?.lastSignInDateTime;
        if (!lastSignIn) return true; // Include "Never" in all inactivity filters

        const date = new Date(lastSignIn);
        const diffInDays = (new Date().getTime() - date.getTime()) / (1000 * 3600 * 24);
        
        if (signInFilter === '30') return diffInDays > 30;
        if (signInFilter === '60') return diffInDays > 60;
        if (signInFilter === '90') return diffInDays > 90;
        if (signInFilter === 'never') return !lastSignIn; // This line is technically redundant because of !lastSignIn check above, but logically specific
        
        return true;
    }).filter(user => {
        // Double check for "Never" specific filter
        if (signInFilter === 'never') return !user.signInActivity?.lastSignInDateTime;
        return true;
    });

    const groupedUsers = filteredUsers.reduce((acc: any, user: any) => {

        let location;

        // Priority 1: Disabled Users (always grouped together)
        if (user.accountEnabled === false) {
            location = 'Disabled Users';
        } 
        // Priority 2: Partner domain users
        else if (user.userPrincipalName?.toLowerCase().endsWith('@partner.eqncs.com')) {
            location = 'Eastern Region Sub Contractors';
        }
        // Priority 3: Regular grouping by Office Location
        else {
            let rawLocation = (user.officeLocation || '').trim();
            location = rawLocation ? (rawLocation.charAt(0).toUpperCase() + rawLocation.slice(1)) : 'Unassigned / Remote';
        }

        if (!acc[location]) {
            acc[location] = [];
        }
        acc[location].push(user);
        acc[location].sort((a: any, b: any) => (a.displayName || "").localeCompare(b.displayName || ""));
        return acc;
    }, {});

    const sortedLocations = Object.keys(groupedUsers).sort((a, b) => {
        if (a === 'Disabled Users') return 1;
        if (b === 'Disabled Users') return -1;
        if (a === 'Unassigned / Remote') return 1;
        if (b === 'Unassigned / Remote') return -1;
        return a.localeCompare(b);
    });

    const toggleLocation = (location: string) => {
        setCollapsedLocations(prev => {
            const next = new Set(prev);
            if (next.has(location)) {
                next.delete(location);
            } else {
                next.add(location);
            }
            return next;
        });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 relative">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 text-blue-600 rounded-xl">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">User Management</h1>
                        <p className="text-slate-400">View and manage Entra ID accounts by office location.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setCollapsedLocations(new Set(collapsedLocations.size === sortedLocations.length ? [] : sortedLocations))}
                        className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
                    >
                        {collapsedLocations.size === sortedLocations.length ? 'Expand All' : 'Collapse All'}
                    </button>

                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 ml-4">
                        <Clock size={14} className="text-slate-400" />
                        <select 
                            value={signInFilter}
                            onChange={(e) => setSignInFilter(e.target.value)}
                            className="bg-transparent text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-slate-900">All Activity</option>
                            <option value="30" className="bg-slate-900">Inactive &gt; 30 Days</option>
                            <option value="60" className="bg-slate-900">Inactive &gt; 60 Days</option>
                            <option value="90" className="bg-slate-900">Inactive &gt; 90 Days</option>
                            <option value="never" className="bg-slate-900">Never Signed In</option>
                        </select>
                    </div>

                    <button 
                        onClick={fetchUsers}
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 backdrop-blur-md">
                    <RefreshCw className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
                    Loading all users and categorizing by location...
                </div>
            ) : sortedLocations.length > 0 ? (
                sortedLocations.map((location) => {
                    const isCollapsed = collapsedLocations.has(location);
                    return (
                        <div key={location} className="space-y-4">
                            <button 
                                onClick={() => toggleLocation(location)}
                                className="flex items-center gap-3 px-2 w-full text-left group transition-all"
                            >
                                <div className="text-slate-500 group-hover:text-white transition-colors">
                                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                </div>
                                <h2 className="text-xl font-bold text-slate-200">{location}</h2>
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">
                                    {groupedUsers[location].length} Users
                                </span>
                                <div className="h-px bg-slate-800/60 flex-1 ml-4" />
                            </button>
                            
                            {!isCollapsed && (
                                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-slate-950/50 text-slate-400 uppercase font-medium border-b border-slate-800/60">
                                                <tr>
                                                    <th className="px-6 py-4">Display Name</th>
                                                    <th className="px-6 py-4">Principal Name</th>
                                                    <th className="px-6 py-4">Job Title</th>
                                                    <th className="px-6 py-4">Office</th>
                                                    <th className="px-6 py-4 text-center">Last Signed In</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {groupedUsers[location].map((u: any) => (
                                                    <tr 
                                                        key={u.id} 
                                                        onClick={() => handleUserClick(u.id)}
                                                        className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4 font-medium text-slate-200">{u.displayName || 'Unknown'}</td>
                                                        <td className="px-6 py-4 text-slate-400">{u.userPrincipalName || 'N/A'}</td>
                                                        <td className="px-6 py-4">{u.jobTitle || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-slate-400 italic">{u.officeLocation || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(u.presence?.availability)}`} title={u.presence?.availability || 'Offline'} />
                                                                    <span className={u.signInActivity?.lastSignInDateTime ? "text-slate-200 font-medium" : "text-slate-500 italic"}>
                                                                        {formatRelativeTime(u.signInActivity?.lastSignInDateTime)}
                                                                    </span>
                                                                </div>
                                                                {u.presence?.availability && (
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                                                        {u.presence.availability.replace(/([A-Z])/g, ' $1').trim()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.accountEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {u.accountEnabled ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 backdrop-blur-md">
                    No users found.
                </div>
            )}

            {selectedUserId && (
                <div className="fixed inset-0 lg:left-64 z-50 bg-[#0b0f19] flex flex-col animate-in fade-in duration-300 overflow-y-auto">
                    <div className="w-full flex flex-col min-h-full">
                        <div className="flex justify-between items-center p-8 border-b border-slate-800/60 shrink-0">
                            <h2 className="text-3xl font-bold text-white">Edit User Profile</h2>
                            <button onClick={() => setSelectedUserId(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto w-full">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                                    <RefreshCw className="animate-spin text-blue-600" size={32} />
                                    Loading advanced Entra ID details...
                                </div>
                            ) : selectedUser ? (
                                <div className="space-y-8 pb-10">
                                    {/* Identity Section */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Identity</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Display Name" field="displayName" value={editForm.displayName} onChange={(v) => setEditForm({...editForm, displayName: v})} />
                                            <InputField label="First Name" field="givenName" value={editForm.givenName} onChange={(v) => setEditForm({...editForm, givenName: v})} />
                                            <InputField label="Last Name" field="surname" value={editForm.surname} onChange={(v) => setEditForm({...editForm, surname: v})} />
                                            <InputField label="User Principal Name" field="userPrincipalName" value={selectedUser?.userPrincipalName} readOnly />
                                            <InputField label="Object ID" field="id" value={selectedUser?.id} readOnly />
                                            <InputField label="User Type" field="userType" value={selectedUser?.userType} readOnly />
                                            <InputField label="Created Date Time" field="createdDateTime" value={selectedUser?.createdDateTime} readOnly />
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-slate-400 uppercase">Live Presence Status</label>
                                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 rounded-lg px-4 py-2.5">
                                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedUser?.presence?.availability)}`} />
                                                    <span className="text-white font-medium">{selectedUser?.presence?.availability || 'Offline'}</span>
                                                    {selectedUser?.presence?.activity && (
                                                        <span className="text-slate-500 text-xs">- {selectedUser.presence.activity.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <InputField label="Last Sign In" field="lastSignIn" value={selectedUser?.signInActivity?.lastSignInDateTime ? `${selectedUser.signInActivity.lastSignInDateTime} (${formatRelativeTime(selectedUser.signInActivity.lastSignInDateTime)})` : 'Never'} readOnly />
                                            <InputField label="Mail Nickname" field="mailNickname" value={selectedUser?.mailNickname} readOnly />
                                        </div>
                                    </section>

                                    {/* Job Information Section */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Job Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Job Title" field="jobTitle" value={editForm.jobTitle} onChange={(v) => setEditForm({...editForm, jobTitle: v})} />
                                            <InputField label="Company Name" field="companyName" value={editForm.companyName} onChange={(v) => setEditForm({...editForm, companyName: v})} />
                                            <InputField label="Department" field="department" value={editForm.department} onChange={(v) => setEditForm({...editForm, department: v})} />
                                            <InputField label="Office Location" field="officeLocation" value={editForm.officeLocation} onChange={(v) => setEditForm({...editForm, officeLocation: v})} />
                                            <InputField label="Employee Type" field="employeeType" value={selectedUser?.employeeType} readOnly />
                                            <InputField label="Employee Hire Date" field="employeeHireDate" value={selectedUser?.employeeHireDate} readOnly />
                                        </div>
                                    </section>

                                    {/* Contact Information Section */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Contact Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Mobile Phone" field="mobilePhone" value={editForm.mobilePhone} onChange={(v) => setEditForm({...editForm, mobilePhone: v})} />
                                            <InputField label="Business Phone" field="businessPhones" value={editForm.businessPhones} onChange={(v) => setEditForm({...editForm, businessPhones: v})} />
                                            <div className="col-span-full">
                                                <InputField label="Street Address" field="streetAddress" value={editForm.streetAddress} onChange={(v) => setEditForm({...editForm, streetAddress: v})} />
                                            </div>
                                            <InputField label="City" field="city" value={editForm.city} onChange={(v) => setEditForm({...editForm, city: v})} />
                                            <InputField label="State or Province" field="state" value={editForm.state} onChange={(v) => setEditForm({...editForm, state: v})} />
                                            <InputField label="ZIP / Postal Code" field="postalCode" value={editForm.postalCode} onChange={(v) => setEditForm({...editForm, postalCode: v})} />
                                            <InputField label="Country or Region" field="country" value={editForm.country} onChange={(v) => setEditForm({...editForm, country: v})} />
                                            <div className="col-span-full">
                                                <InputField label="Email" field="mail" value={selectedUser?.mail} readOnly />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : null}
                        </div>

                        <div className="p-8 border-t border-slate-800/60 mt-auto shrink-0 flex justify-end">
                            <button 
                                onClick={handleSave}
                                disabled={saving || loadingDetails}
                                className="w-full md:w-auto flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                {saving ? "Syncing to Entra ID..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
