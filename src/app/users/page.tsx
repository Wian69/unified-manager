"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, X, Save } from "lucide-react";

const InputField = ({ label, field, value, onChange, readOnly = false }: { label: string, field: string, value: string, onChange?: (val: string) => void, readOnly?: boolean }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e) => onChange && onChange(e.target.value)}
            readOnly={readOnly}
            className={`w-full bg-slate-900 border ${readOnly ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-700 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500'} rounded-lg px-4 py-2.5 outline-none transition-all`}
        />
    </div>
);

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
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
            const res = await fetch(`/api/users/${id}`);
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
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        setSaving(true);
        try {
            await fetch(`/api/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            
            // Update local state immediately for instant grouping feedback
            setUsers(prevUsers => prevUsers.map(u => 
                u.id === selectedUserId 
                    ? { ...u, ...editForm } 
                    : u
            ));
            
            setSelectedUserId(null);
            // Still background refresh to ensure sync with server
            fetchUsers();
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to save user changes.");
        } finally {
            setSaving(false);
        }
    };

    const groupedUsers = users.reduce((acc: any, user: any) => {
        const location = user.officeLocation || 'Unassigned / Remote';
        if (!acc[location]) {
            acc[location] = [];
        }
        acc[location].push(user);
        return acc;
    }, {});

    const sortedLocations = Object.keys(groupedUsers).sort((a, b) => {
        if (a === 'Unassigned / Remote') return 1;
        if (b === 'Unassigned / Remote') return -1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-500 relative">
            <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/60 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">User Management</h1>
                        <p className="text-slate-400">View and manage Entra ID accounts by office location.</p>
                    </div>
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

            {loading ? (
                <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 backdrop-blur-md">
                    <RefreshCw className="animate-spin text-purple-400 mx-auto mb-4" size={32} />
                    Loading all users and categorizing by location...
                </div>
            ) : sortedLocations.length > 0 ? (
                sortedLocations.map((location) => (
                    <div key={location} className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <h2 className="text-xl font-bold text-slate-200">{location}</h2>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-full border border-slate-700">
                                {groupedUsers[location].length} Users
                            </span>
                        </div>
                        <div className="bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden backdrop-blur-md">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950/50 text-slate-400 uppercase font-medium border-b border-slate-800/60">
                                        <tr>
                                            <th className="px-6 py-4">Display Name</th>
                                            <th className="px-6 py-4">Principal Name</th>
                                            <th className="px-6 py-4">Job Title</th>
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
                    </div>
                ))
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
                                    <RefreshCw className="animate-spin text-purple-400" size={32} />
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
                                className="w-full md:w-auto flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-8 rounded-xl transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50"
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
