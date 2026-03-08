import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';

export default function ApprovalRequest({ request, isSeniorView = false, onResponse }) {
    const [loading, setLoading] = useState(false);
    const [decided, setDecided] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!request?.expires_at) return;
        const update = () => {
            const diff = new Date(request.expires_at) - Date.now();
            setTimeLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [request]);

    const handleResponse = async (decision) => {
        setLoading(true);
        try {
            await api.post('/guardian/approval/respond', { requestId: request.id, response: decision });
            setDecided(true);
            onResponse?.(decision);
        } catch {
            alert('Could not record your response. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const typeLabels = {
        transaction: { icon: '💳', label: 'Transaction Approval', desc: 'Your senior wants to send money' },
        login_anomaly: { icon: '⚠️', label: 'Unusual Login', desc: 'Login from an unfamiliar device' },
        recovery: { icon: '🔑', label: 'Account Recovery', desc: 'Account recovery was initiated' },
        device_change: { icon: '📱', label: 'New Device', desc: 'Signing in from a new device' },
    };

    const info = typeLabels[request?.request_type] || { icon: '🔔', label: 'Approval Needed', desc: '' };

    if (decided) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-white font-semibold text-lg">Response recorded</p>
                <p className="text-white/50 text-sm mt-1">Thank you for keeping your loved one safe.</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 space-y-4 border border-warn-500/30" style={{ boxShadow: '0 0 30px rgba(234, 179, 8, 0.15)' }}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{info.icon}</span>
                    <div>
                        <p className="text-white font-bold text-lg">{info.label}</p>
                        {request?.senior && (
                            <p className="text-white/60 text-sm">from {request.senior.display_name}</p>
                        )}
                    </div>
                </div>
                {timeLeft !== null && (
                    <div className={`text-sm font-bold tabular-nums ${timeLeft < 60 ? 'text-danger-400' : 'text-warn-400'}`}>
                        ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>
                )}
            </div>

            {/* Context */}
            {request?.context && Object.keys(request.context).length > 0 && (
                <div className="bg-white/5 rounded-xl p-3 space-y-1">
                    {request.context.amount && (
                        <p className="text-white/80 text-base"><span className="text-white/40">Amount:</span>{' '}<span className="font-bold">${request.context.amount}</span></p>
                    )}
                    {request.context.description && (
                        <p className="text-white/80 text-base"><span className="text-white/40">For:</span>{' '}{request.context.description}</p>
                    )}
                </div>
            )}

            {!isSeniorView ? (
                <div className="flex gap-3">
                    <button
                        id="approve-btn"
                        onClick={() => handleResponse('approved')}
                        disabled={loading || timeLeft === 0}
                        className="btn-safe flex-1"
                    >
                        ✓ Approve
                    </button>
                    <button
                        id="deny-btn"
                        onClick={() => handleResponse('denied')}
                        disabled={loading || timeLeft === 0}
                        className="btn-danger flex-1"
                    >
                        ✗ Deny
                    </button>
                </div>
            ) : (
                <div className="text-center py-3">
                    <div className="flex items-center justify-center gap-2 text-warn-400">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-base font-medium">Waiting for guardian's decision...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
