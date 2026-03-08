import React, { useState } from 'react';

export default function PasskeyButton({ onClick, loading = false, variant = 'signin', disabled = false }) {
    const [pressed, setPressed] = useState(false);

    const label = variant === 'signin' ? 'Tap to Sign In' : 'Set Up Security Key';
    const sublabel = variant === 'signin'
        ? 'Touch your fingerprint sensor or look at the camera'
        : 'We\'ll use your face or fingerprint — no password needed';

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Animated pulse button */}
            <div className="relative flex items-center justify-center">
                {/* Outer rings */}
                {!loading && !disabled && (
                    <>
                        <span className="ping-ring absolute inline-flex h-40 w-40 rounded-full bg-brand-500/20" />
                        <span className="ping-ring absolute inline-flex h-36 w-36 rounded-full bg-brand-500/30"
                            style={{ animationDelay: '0.5s' }} />
                    </>
                )}

                <button
                    id="passkey-btn"
                    onClick={() => { setPressed(true); onClick?.(); setTimeout(() => setPressed(false), 500); }}
                    disabled={loading || disabled}
                    className={`
            relative z-10 flex flex-col items-center justify-center
            w-44 h-44 rounded-full font-bold text-white
            transition-all duration-200 ease-out select-none
            focus:outline-none focus:ring-4 focus:ring-brand-500/50
            ${loading ? 'bg-brand-700 cursor-wait' : 'bg-gradient-to-br from-brand-500 to-brand-700 cursor-pointer'}
            ${pressed ? 'scale-90' : 'scale-100 hover:scale-105'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            shadow-2xl shadow-brand-500/40
          `}
                    style={{ boxShadow: loading ? 'none' : '0 0 40px rgba(99,102,241,0.5)' }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm font-medium">Verifying...</span>
                        </>
                    ) : (
                        <>
                            {/* Fingerprint icon */}
                            <svg className="h-12 w-12 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 6.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-2.43-6.62-2.43-9.49-.01-1.34.69-2.48 1.68-3.38 2.94-.1.14-.25.2-.32.25zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.91 1.94 2.02 1.94s2.02-.87 2.02-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.02 2.94s-3.02-1.32-3.02-2.94c0-1.07-.91-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z" />
                            </svg>
                            <span className="text-xl font-bold leading-tight text-center px-2">{label}</span>
                        </>
                    )}
                </button>
            </div>

            <p className="text-white/50 text-base text-center max-w-xs leading-relaxed">
                {sublabel}
            </p>
        </div>
    );
}
