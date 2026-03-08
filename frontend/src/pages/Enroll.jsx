import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasskeyButton from '../components/auth/PasskeyButton.jsx';
import FaceVerification from '../components/auth/FaceVerification.jsx';
import VoiceVerification from '../components/auth/VoiceVerification.jsx';
import GuardianPortal from '../components/guardian/GuardianPortal.jsx';
import { registerPasskey } from '../services/passkeyService.js';
import api from '../services/api.js';

const STEPS = ['Info', 'Security Key', 'Face ID', 'Voice', 'Safety Circle'];

export default function Enroll() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({ name: '', email: '' });
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [faceDescriptor, setFaceDescriptor] = useState(null);

    const handleInfoNext = (e) => {
        e.preventDefault();
        if (!form.name || !form.email) return;
        setStep(1);
    };

    const handlePasskey = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await registerPasskey(form.email, form.name);
            setUserId(result.userId);
            // Store enrollment JWT so face/guardian endpoints can authenticate
            if (result.accessToken) {
                sessionStorage.setItem('accessToken', result.accessToken);
            }
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFaceEnrolled = async (descriptor) => {
        setFaceDescriptor(descriptor);
        if (userId && descriptor) {
            // No leading slash — baseURL already ends with /
            await api.post('biometrics/face/enroll', { faceDescriptor: descriptor }).catch(() => { });
        }
        setStep(3);
    };

    const handleVoice = () => setStep(4);

    const handleFinish = () => navigate('/login', { state: { enrolled: true } });

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🛡️</div>
                    <h1 className="text-4xl font-extrabold text-gradient mb-2">Grandparent<br />Gateway</h1>
                    <p className="text-white/60 text-lg">Set up your secure, password-free account</p>
                </div>

                {/* Progress steps */}
                <div className="flex items-center justify-between mb-8">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex items-center">
                            <div className={`flex flex-col items-center gap-1 w-14`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  transition-all duration-500
                  ${step > i ? 'bg-safe-500 text-white' : step === i ? 'bg-brand-500 text-white ring-4 ring-brand-500/30' : 'bg-white/10 text-white/40'}`}>
                                    {step > i ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs text-center leading-none ${step >= i ? 'text-white/70' : 'text-white/30'}`}>{s}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mb-4 transition-all ${step > i ? 'bg-safe-500' : 'bg-white/10'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <div className="glass-card p-8">
                    {/* Step 0: Info */}
                    {step === 0 && (
                        <form onSubmit={handleInfoNext} className="space-y-5">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Welcome! 👋</h2>
                                <p className="text-white/60 text-base">Let's get you set up. No password needed — ever.</p>
                            </div>
                            <div>
                                <label className="label-senior">Your Full Name</label>
                                <input className="input-senior" placeholder="e.g., Margaret Johnson"
                                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div>
                                <label className="label-senior">Your Email Address</label>
                                <input type="email" className="input-senior" placeholder="margaret@example.com"
                                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                            </div>
                            <button type="submit" className="btn-primary w-full" id="info-next-btn">Next →</button>
                        </form>
                    )}

                    {/* Step 1: Passkey */}
                    {step === 1 && (
                        <div className="space-y-6 text-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Security Key</h2>
                                <p className="text-white/60 text-base">Use your fingerprint or face — no password needed.</p>
                            </div>
                            {error && <p className="text-danger-400 text-base bg-danger-500/10 border border-danger-500/30 rounded-xl p-3">{error}</p>}
                            <PasskeyButton onClick={handlePasskey} loading={loading} variant="enroll" />
                        </div>
                    )}

                    {/* Step 2: Face */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">Add Your Face</h2>
                                <p className="text-white/60 text-base">We'll recognize you by your face for extra security.</p>
                            </div>
                            <FaceVerification
                                mode="enroll"
                                onEnrolled={handleFaceEnrolled}
                                onError={setError}
                            />
                            <button onClick={() => setStep(3)} className="text-white/40 hover:text-white/60 text-sm underline w-full text-center transition-colors">
                                Skip for now
                            </button>
                        </div>
                    )}

                    {/* Step 3: Voice */}
                    {step === 3 && (
                        <VoiceVerification onVerified={handleVoice} onSkip={handleVoice} />
                    )}

                    {/* Step 4: Guardian */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">Add Your Safety Circle</h2>
                                <p className="text-white/60 text-base">Add a trusted family member who can help if you need it.</p>
                            </div>
                            <GuardianPortal />
                            <button onClick={handleFinish} className="btn-primary w-full mt-4" id="finish-enroll-btn">
                                I'm Done — Take Me to Sign In!
                            </button>
                        </div>
                    )}
                </div>

                {/* Senior-friendly note */}
                <p className="text-center text-white/30 text-sm mt-6">
                    Need help? Call our support line: 1-800-GATEWAY
                </p>
            </div>
        </div>
    );
}
