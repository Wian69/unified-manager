import { Download, FileSpreadsheet, Activity, DollarSign, Users } from 'lucide-react';
import fs from 'fs';
import path from 'path';

export default function BillingPage() {
    let billingData: any = null;
    try {
        const filePath = path.join(process.cwd(), 'public', 'reports', 'billing_data.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        billingData = JSON.parse(fileContent);
    } catch (e) {
        // Data not available yet
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Activity className="text-blue-500" /> 
                    Billing & Licensing
                </h1>
                <p className="text-slate-400">View and download consolidated monthly billing and M365 licensing reports.</p>
            </header>

            {billingData ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Total Cost Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <DollarSign className="w-24 h-24 text-blue-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Total Monthly Spend</h3>
                            <div className="text-5xl font-black text-white mb-4">
                                ${parseFloat(billingData.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div className="text-blue-400">M365: ${parseFloat(billingData.primaryCost).toLocaleString()}</div>
                                <div className="text-emerald-400">Azure: ${parseFloat(billingData.secondaryCost).toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Summary & Download Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Report Details</h3>
                                <div className="flex items-center gap-2 text-slate-300 mb-2">
                                    <Users className="w-4 h-4 text-slate-500" />
                                    <span>{billingData.assignments?.length || 0} Total License Assignments</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-4">
                                    Last Generated: {billingData.generatedAt}
                                </div>
                            </div>
                            <a 
                                href="/reports/CFO_Billing_Report.csv" 
                                download
                                className="mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
                            >
                                <Download className="w-5 h-5" />
                                Download Full CSV Report
                            </a>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-950/30">
                            <h3 className="text-lg font-bold text-white">Assigned Products by User</h3>
                        </div>
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="text-xs text-slate-500 bg-slate-950/50 uppercase sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold tracking-wider">User Principal Name</th>
                                        <th className="px-6 py-4 font-semibold tracking-wider">Assigned Product</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {billingData.assignments?.map((assignment: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4">{assignment.user}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-800 text-blue-400 py-1 px-3 rounded-full text-xs font-medium">
                                                    {assignment.product}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!billingData.assignments || billingData.assignments.length === 0) && (
                                        <tr>
                                            <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                                                No license assignments found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <FileSpreadsheet className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
                    <p className="text-slate-400">The billing report has not been generated yet this month.</p>
                </div>
            )}
        </div>
    );
}
