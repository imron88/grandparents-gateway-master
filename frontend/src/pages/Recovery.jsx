import React from 'react';
import RecoveryFlow from '../components/guardian/RecoveryFlow.jsx';

export default function Recovery() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🔑</div>
                    <h1 className="text-4xl font-extrabold text-white mb-2">Account Recovery</h1>
                    <p className="text-white/60 text-lg">Don't worry — your guardians can help you get back in.</p>
                </div>
                <RecoveryFlow />
                <div className="text-center mt-6">
                    <a href="/login" className="text-white/40 hover:text-white/60 text-sm underline transition-colors">
                        ← Back to Sign In
                    </a>
                </div>
            </div>
        </div>
    );
}
