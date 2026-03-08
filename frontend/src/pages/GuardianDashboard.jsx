import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext.jsx';
import ApprovalRequest from '../components/guardian/ApprovalRequest.jsx';
import api from '../services/api.js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function GuardianDashboard() {
    const { user, logout } = useAuth();
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            const { data } = await api.get('/guardian/approval/pending');
            setPending(data.pending || []);
        } catch { }
        setLoading(false);
    };

    useEffect(() => {
        fetchPending();

        // Supabase Realtime subscription
        const channel = supabase
            .channel('guardian-approvals')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'approval_requests' },
                () => fetchPending()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const handleResponse = (decision) => {
        fetchPending();
        setHistory(h => [{ decision, time: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    };

    return (
        <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <p className="text-white/50 text-base">Guardian Portal</p>
                    <h1 className="text-3xl font-extrabold text-white mt-1">
                        {user?.displayName?.split(' ')[0] || 'Guardian'} 🛡️
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Protecting your loved one</p>
                </div>
                <button onClick={logout} className="text-white/40 hover:text-danger-400 text-sm transition-colors">Sign Out</button>
            </div>

            {/* Realtime indicator */}
            <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-safe-500 animate-pulse" />
                <span className="text-white/50 text-sm">Live — updates automatically</span>
            </div>

            {/* Pending approvals */}
            <h2 className="text-xl font-bold text-white mb-4">
                Pending Decisions
                {pending.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-warn-500 text-white text-xs font-bold">
                        {pending.length}
                    </span>
                )}
            </h2>

            {loading && (
                <div className="glass-card p-8 text-center">
                    <svg className="animate-spin h-8 w-8 mx-auto text-brand-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            )}

            {!loading && pending.length === 0 && (
                <div className="glass-card p-8 text-center mb-6">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="text-white font-semibold text-lg">All clear!</p>
                    <p className="text-white/50 text-base mt-1">No pending approvals right now.</p>
                </div>
            )}

            <div className="space-y-4 mb-8">
                {pending.map(req => (
                    <ApprovalRequest key={req.id} request={req} isSeniorView={false} onResponse={handleResponse} />
                ))}
            </div>

            {/* History */}
            {history.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-white font-semibold text-base mb-3">Recent Actions</h3>
                    <div className="space-y-2">
                        {history.map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className={h.decision === 'approved' ? 'text-safe-400' : 'text-danger-400'}>
                                    {h.decision === 'approved' ? '✓ Approved' : '✗ Denied'}
                                </span>
                                <span className="text-white/40">{h.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
