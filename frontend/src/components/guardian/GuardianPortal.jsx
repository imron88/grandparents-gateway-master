import React, { useState } from 'react';
import api from '../../services/api.js';

export default function GuardianPortal({ seniorId, guardians = [], onGuardianAdded }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', canApprove: true, canRecover: true });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await api.post('/guardian/add', {
                guardianName: form.name,
                guardianEmail: form.email,
                canApproveTransactions: form.canApprove,
                canRecoverAccount: form.canRecover,
            });
            setMessage('Guardian invitation sent!');
            setForm({ name: '', email: '', canApprove: true, canRecover: true });
            setShowForm(false);
            onGuardianAdded?.();
        } catch (err) {
            setMessage(err.response?.data?.error || 'Could not add guardian. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🛡️</span> My Safety Circle
                </h3>
                <button onClick={() => setShowForm(v => !v)} className="btn-secondary text-sm px-4 min-h-[40px]" id="add-guardian-btn">
                    {showForm ? 'Cancel' : '+ Add Guardian'}
                </button>
            </div>

            {/* Existing guardians */}
            {guardians.length === 0 && (
                <div className="glass-card p-6 text-center">
                    <p className="text-4xl mb-3">👨‍👩‍👧</p>
                    <p className="text-white/60 text-base">No guardians yet. Add a trusted family member or friend.</p>
                </div>
            )}

            <div className="space-y-3">
                {guardians.map((g) => (
                    <div key={g.id} className="glass-card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-lg font-bold">
                                {g.guardian_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-white font-semibold">{g.guardian_name}</p>
                                <p className="text-white/50 text-sm">{g.guardian_email}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {g.is_verified
                                ? <span className="badge-safe">✓ Verified</span>
                                : <span className="badge-pending">⏳ Pending</span>
                            }
                            <div className="flex gap-1">
                                {g.can_approve_transactions && <span className="text-xs text-white/40">Approvals</span>}
                                {g.can_recover_account && <span className="text-xs text-white/40">Recovery</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add guardian form */}
            {showForm && (
                <form onSubmit={handleAdd} className="glass-card p-6 space-y-4">
                    <h4 className="text-white font-semibold text-lg">Add a New Guardian</h4>
                    <div>
                        <label className="label-senior">Their Full Name</label>
                        <input
                            className="input-senior"
                            placeholder="e.g., Sarah Johnson"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="label-senior">Their Email Address</label>
                        <input
                            type="email"
                            className="input-senior"
                            placeholder="sarah@example.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="label-senior">Permissions</label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form.canApprove} onChange={e => setForm(f => ({ ...f, canApprove: e.target.checked }))}
                                className="w-5 h-5 accent-brand-500" />
                            <span className="text-white/70 text-base">Can approve my transactions</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form.canRecover} onChange={e => setForm(f => ({ ...f, canRecover: e.target.checked }))}
                                className="w-5 h-5 accent-brand-500" />
                            <span className="text-white/70 text-base">Can help me recover my account</span>
                        </label>
                    </div>
                    {message && (
                        <p className={`text-sm font-medium ${message.includes('sent') ? 'text-safe-400' : 'text-danger-400'}`}>{message}</p>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full" id="guardian-submit-btn">
                        {loading ? 'Sending Invitation...' : 'Send Guardian Invitation'}
                    </button>
                </form>
            )}
        </div>
    );
}
