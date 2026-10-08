'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';

function TicketReplyForm() {
    const searchParams = useSearchParams();
    const listId = searchParams.get('listId');
    const itemId = searchParams.get('itemId');

    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!listId || !itemId) {
            setError('Missing required parameters.');
            setLoading(false);
            return;
        }

        const fetchTicket = async () => {
            try {
                const res = await fetch(`/api/forms/items?listId=${listId}&itemId=${itemId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to fetch ticket');
                
                if (data.items) {
                    const item = data.items.find((i: any) => i.id === itemId);
                    setTicket(item || null);
                } else {
                    setTicket(data);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [listId, itemId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || !ticket) return;

        setSubmitting(true);
        setError('');

        try {
            let mainCommentsField = 'Comments';
            if (ticket.fields) {
                const keys = Object.keys(ticket.fields);
                const match = keys.find(k => k.toLowerCase() === 'comments');
                if (match) mainCommentsField = match;
            }

            const existingComments = ticket.fields?.[mainCommentsField] || '';
            const d = new Date();
            const timestamp = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            
            const newCommentText = `${timestamp} User Reply:\n${comment}`;

            const res = await fetch(`/api/forms/items?listId=${listId}&itemId=${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    appendComment: newCommentText,
                    isUserReply: true
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit comment');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (error && !ticket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Ticket</h1>
                <p className="text-slate-400">{error}</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
                <CheckCircle2 className="text-green-500 mb-6" size={64} />
                <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Comment Submitted</h1>
                <p className="text-slate-400 max-w-md">
                    Thank you. Your comment has been securely appended to the ticket history and the IT Support Team has been notified.
                </p>
                <button 
                    onClick={() => window.close()}
                    className="mt-8 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors"
                >
                    Close Window
                </button>
            </div>
        );
    }

    const ticketTitle = ticket?.fields?.Title || ticket?.fields?.TicketNumber || 'Support Ticket';
    const status = ticket?.fields?.Status || 'Unknown';

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex justify-center items-start">
            <div className="w-full max-w-2xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden mt-10">
                <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Add Comment</p>
                        <span className="px-3 py-1 bg-slate-800 text-xs font-bold rounded-lg text-slate-300">
                            {status}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black uppercase">{ticketTitle}</h1>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    {status === 'Complete' ? (
                        <div className="text-center p-8 bg-slate-950/50 rounded-2xl border border-slate-800">
                            <CheckCircle2 className="text-green-500 mx-auto mb-4" size={48} />
                            <h2 className="text-xl font-bold mb-2">Ticket Resolved</h2>
                            <p className="text-slate-400 text-sm">This ticket has been marked as complete and is no longer accepting new comments.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Your Reply
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Type your comment or update here..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all min-h-[150px] resize-y"
                                    required
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={submitting || !comment.trim()}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Processing...</>
                                ) : (
                                    <><Send size={18} /> Submit Comment</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TicketReplyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        }>
            <TicketReplyForm />
        </Suspense>
    );
}
