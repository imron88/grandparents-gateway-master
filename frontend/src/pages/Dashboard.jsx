import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import TrustScoreIndicator from '../components/auth/TrustScoreIndicator.jsx';
import ApprovalRequest from '../components/guardian/ApprovalRequest.jsx';
import api from '../services/api.js';

const QUICK_ACTIONS = [
    { id: 'send-money', icon: '💸', label: 'Send Money', color: 'from-blue-500 to-blue-700', needsApproval: true, minTrust: 80 },
    { id: 'pay-bill', icon: '📄', label: 'Pay a Bill', color: 'from-purple-500 to-purple-700', needsApproval: false, minTrust: 50 },
    { id: 'check-balance', icon: '💰', label: 'Check Balance', color: 'from-teal-500 to-teal-700', needsApproval: false, minTrust: 0 },
    { id: 'contact-guardian', icon: '📞', label: 'Call Guardian', color: 'from-safe-500 to-safe-600', needsApproval: false, minTrust: 0 },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, trustScore, logout } = useAuth();
    const [pendingRequest, setPendingRequest] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);

    const handleAction = async (action) => {
        if (action.needsApproval && trustScore < action.minTrust) {
            // Request guardian approval
            setLoadingAction(action.id);
            try {
                const { data } = await api.post('/guardian/approval/create', {
                    requestType: 'transaction',
                    context: { actionLabel: action.label, amount: action.id === 'send-money' ? 'TBD' : null },
                });
                setPendingRequest(data.requests?.[0]);
            } catch (err) {
                alert(err.response?.data?.error || 'Guardian notification failed.');
            } finally {
                setLoadingAction(null);
            }
        } else {
            alert(`${action.label} — feature coming soon!`);
        }
    };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
            {/* Trust score indicator */}
            <TrustScoreIndicator score={trustScore} />

            {/* Header */}
            <div className="mb-8">
                <p className="text-white/50 text-lg">{greeting()},</p>
                <h1 className="text-4xl font-extrabold text-white mt-1">
                    {user?.displayName?.split(' ')[0] || 'Friend'} 👋
                </h1>
            </div>

            {/* Trust score card */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-base font-medium">Your Security Level</p>
                    <span className={`text-sm font-bold ${trustScore >= 80 ? 'text-safe-400' : trustScore >= 50 ? 'text-warn-400' : 'text-danger-400'}`}>
                        {trustScore >= 80 ? '✓ Safe' : trustScore >= 50 ? '⚡ Monitoring' : '⚠️ Alert'}
                    </span>
                </div>
                <div className="bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                        className="h-4 rounded-full transition-all duration-1000"
                        style={{
                            width: `${trustScore}%`,
                            background: trustScore >= 80
                                ? 'linear-gradient(to right, #22c55e, #4ade80)'
                                : trustScore >= 50
                                    ? 'linear-gradient(to right, #eab308, #facc15)'
                                    : 'linear-gradient(to right, #ef4444, #f87171)',
                        }}
                    />
                </div>
                <p className="text-white/40 text-sm mt-2 text-right">{trustScore}/100</p>
            </div>

            {/* Pending approval */}
            {pendingRequest && (
                <div className="mb-6">
                    <ApprovalRequest request={pendingRequest} isSeniorView={true} />
                </div>
            )}

            {/* Quick actions */}
            <h2 className="text-xl font-bold text-white mb-4">What would you like to do?</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
                {QUICK_ACTIONS.map(action => (
                    <button
                        key={action.id}
                        id={action.id}
                        onClick={() => handleAction(action)}
                        disabled={loadingAction === action.id}
                        className={`
              relative glass-card p-5 flex flex-col items-center justify-center gap-2
              min-h-[120px] rounded-3xl cursor-pointer
              transition-all duration-200 hover:scale-105 active:scale-95
              border border-white/10 hover:border-white/20
              ${loadingAction === action.id ? 'opacity-60' : ''}
            `}
                    >
                        <span className="text-4xl">{action.icon}</span>
                        <span className="text-white font-semibold text-base text-center leading-tight">{action.label}</span>
                        {action.needsApproval && trustScore < action.minTrust && (
                            <span className="text-warn-400 text-xs">Needs guardian ✓</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Navigation links */}
            <div className="glass-card p-4 flex items-center justify-between">
                <button onClick={() => navigate('/guardian')} className="text-white/60 hover:text-white text-base transition-colors flex items-center gap-2">
                    <span>🛡️</span> My Safety Circle
                </button>
                <button onClick={logout} className="text-white/40 hover:text-danger-400 text-base transition-colors flex items-center gap-2">
                    Sign Out <span>→</span>
                </button>
            </div>
        </div>
    );
}
