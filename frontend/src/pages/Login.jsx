import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasskeyButton from '../components/auth/PasskeyButton.jsx';
import FaceVerification from '../components/auth/FaceVerification.jsx';
import { authenticatePasskey } from '../services/passkeyService.js';
import api from '../services/api.js';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [step, setStep] = useState('email'); // email | passkey | face | done
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userData, setUserData] = useState(null);
    const [storedDescriptor, setStoredDescriptor] = useState(null);

    const handleEmailNext = (e) => {
        e.preventDefault();
        if (!email) return;
        setStep('passkey');
    };

    const handlePasskey = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await authenticatePasskey(email);
            setUserData(result);

            // Try to get face descriptor for verification
            try {
                const { data } = await api.get('biometrics/face/descriptor');
                setStoredDescriptor(data.faceDescriptor);
                setStep('face');
            } catch {
                // No face enrolled — skip to dashboard
                finalizaLogin(result);
            }
        } catch (err) {
            setError(err.message || 'Sign in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const finalizaLogin = (result) => {
        login({
            user: result.user,
            trustScore: result.trustScore,
            accessToken: result.accessToken,
        });
        navigate('/dashboard');
    };

    const handleFaceVerified = () => finalizaLogin(userData);
    const skipFace = () => finalizaLogin(userData);

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="text-7xl mb-4 animate-float">🛡️</div>
                    <h1 className="text-4xl font-extrabold text-gradient mb-2">Welcome Back</h1>
                    <p className="text-white/50 text-lg">Your gateway to secure, simple sign-in</p>
                </div>

                <div className="glass-card p-8">
                    {step === 'email' && (
                        <form onSubmit={handleEmailNext} className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">Who are you?</h2>
                                <p className="text-white/50 text-base">Enter your email, then use your fingerprint or face.</p>
                            </div>
                            <div>
                                <label className="label-senior">Your Email</label>
                                <input
                                    type="email"
                                    id="login-email"
                                    className="input-senior"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full" id="email-next-btn">Continue →</button>
                            <p className="text-center text-white/40 text-sm">
                                New here?{' '}
                                <a href="/enroll" className="text-brand-400 hover:text-brand-300 underline transition-colors">
                                    Set up your account
                                </a>
                            </p>
                        </form>
                    )}

                    {step === 'passkey' && (
                        <div className="space-y-6 text-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Tap to Sign In</h2>
                                <p className="text-white/50 text-base">Use the fingerprint sensor or look at your camera.</p>
                            </div>
                            {error && (
                                <div className="bg-danger-500/10 border border-danger-500/30 rounded-2xl p-4">
                                    <p className="text-danger-400 text-base font-medium">😔 {error}</p>
                                </div>
                            )}
                            <PasskeyButton onClick={handlePasskey} loading={loading} variant="signin" />
                            <button onClick={() => setStep('email')} className="text-white/40 hover:text-white/60 text-sm underline transition-colors">
                                ← Use a different account
                            </button>
                        </div>
                    )}

                    {step === 'face' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">One More Step 👁️</h2>
                                <p className="text-white/50 text-base">Please blink slowly to confirm it's really you.</p>
                            </div>
                            <FaceVerification
                                mode="verify"
                                storedDescriptor={storedDescriptor}
                                onVerified={handleFaceVerified}
                                onError={setError}
                            />
                            <button onClick={skipFace} className="text-white/40 hover:text-white/60 text-sm underline w-full text-center transition-colors">
                                Skip face verification
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-center mt-6 space-y-2">
                    <a href="/recovery" className="text-white/40 hover:text-white/60 text-base underline transition-colors block">
                        🔑 Lost your device? Start account recovery
                    </a>
                </div>
            </div>
        </div>
    );
}
