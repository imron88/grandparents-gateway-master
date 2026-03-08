import React, { useState } from 'react';
import api from '../../services/api.js';

export default function RecoveryFlow({ isGuardianView = false }) {
    const [step, setStep] = useState(1); // 1=email, 2=tokens
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [status, setStatus] = useState(null); // null | loading | success | error
    const [message, setMessage] = useState('');
    const [approvedCount, setApprovedCount] = useState(0);
    const [readyToComplete, setReadyToComplete] = useState(false);

    const initiateRecovery = async () => {
        setStatus('loading');
        try {
            const { data } = await api.post('/recovery/initiate', { email });
            setMessage(data.message);
            setStep(2);
            setStatus(null);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Could not start recovery.');
            setStatus('error');
        }
    };

    const submitToken = async () => {
        setStatus('loading');
        try {
            const { data } = await api.post('/recovery/submit-token', { email, token });
            setApprovedCount(data.approvedCount);
            setReadyToComplete(data.readyToComplete);
            setToken('');
            setStatus(null);
            setMessage(`Token accepted! ${data.approvedCount} of 2 guardians approved.`);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Invalid token. Please check and try again.');
            setStatus('error');
        }
    };

    const completeRecovery = async () => {
        setStatus('loading');
        try {
            const { data } = await api.post('/recovery/complete', { email });
            setMessage(data.message);
            setStep(3);
            setStatus('success');
        } catch (err) {
            setMessage(err.response?.data?.error || 'Recovery failed.');
            setStatus('error');
        }
    };

    return (
        <div className="space-y-6 max-w-md mx-auto">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-3">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step >= s ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/40'}`}>
                            {s}
                        </div>
                        {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-brand-500' : 'bg-white/10'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Enter email */}
            {step === 1 && (
                <div className="glass-card p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-5xl mb-3">🔑</p>
                        <h3 className="text-white text-xl font-bold">Account Recovery</h3>
                        <p className="text-white/60 text-base mt-2">
                            We'll send your guardians a one-time code.<br />
                            You need 2 guardians to approve.
                        </p>
                    </div>
                    <div>
                        <label className="label-senior">Your Email Address</label>
                        <input
                            type="email"
                            className="input-senior"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={initiateRecovery}
                        disabled={!email || status === 'loading'}
                        className="btn-primary w-full"
                        id="recovery-initiate-btn"
                    >
                        {status === 'loading' ? 'Sending codes...' : 'Send Recovery Codes to Guardians'}
                    </button>
                    {message && <p className="text-danger-400 text-sm text-center">{message}</p>}
                </div>
            )}

            {/* Step 2: Enter guardian tokens */}
            {step === 2 && (
                <div className="glass-card p-6 space-y-4">
                    <div className="text-center">
                        <p className="text-5xl mb-3">📬</p>
                        <h3 className="text-white text-xl font-bold">Enter Guardian Codes</h3>
                        <p className="text-white/60 text-base mt-2">
                            Ask each guardian to share their code with you.
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-4">
                        {[1, 2].map(n => (
                            <div key={n} className={`flex-1 h-2 rounded-full ${approvedCount >= n ? 'bg-safe-500' : 'bg-white/10'}`} />
                        ))}
                    </div>
                    <p className="text-white/60 text-sm text-center">{approvedCount} of 2 guardians approved</p>

                    <div>
                        <label className="label-senior">Guardian Code</label>
                        <input
                            className="input-senior uppercase tracking-widest text-center"
                            placeholder="ABCD1234"
                            maxLength={8}
                            value={token}
                            onChange={e => setToken(e.target.value.toUpperCase())}
                        />
                    </div>

                    <button
                        onClick={submitToken}
                        disabled={token.length < 6 || status === 'loading'}
                        className="btn-primary w-full"
                        id="recovery-token-btn"
                    >
                        {status === 'loading' ? 'Checking...' : 'Submit Code'}
                    </button>

                    {readyToComplete && (
                        <button onClick={completeRecovery} className="btn-safe w-full" id="recovery-complete-btn">
                            ✓ Complete Recovery
                        </button>
                    )}

                    {message && (
                        <p className={`text-sm text-center ${message.includes('accepted') ? 'text-safe-400' : 'text-danger-400'}`}>
                            {message}
                        </p>
                    )}
                </div>
            )}

            {/* Step 3: Complete */}
            {step === 3 && (
                <div className="glass-card p-8 text-center space-y-4">
                    <p className="text-6xl animate-bounce">🎉</p>
                    <h3 className="text-white text-2xl font-bold">Recovery Complete!</h3>
                    <p className="text-white/70 text-base leading-relaxed">{message}</p>
                    <a href="/enroll" className="btn-primary inline-flex">
                        Set Up New Security Key
                    </a>
                </div>
            )}
        </div>
    );
}
