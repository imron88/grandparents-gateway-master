import React, { useState, useEffect, useRef } from 'react';

const PASSPHRASES = [
    'My family keeps me safe',
    'I trust this device',
    'Hello from Grandparent Gateway',
    'Safety is my priority today',
];

export default function VoiceVerification({ onVerified, onSkip }) {
    const [phrase] = useState(PASSPHRASES[Math.floor(Math.random() * PASSPHRASES.length)]);
    const [status, setStatus] = useState('idle'); // idle | listening | analyzing | success | error
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [bars, setBars] = useState(Array(20).fill(2));
    const recognitionRef = useRef(null);
    const animRef = useRef(null);

    // Animate microphone bars
    useEffect(() => {
        if (status === 'listening') {
            animRef.current = setInterval(() => {
                setBars(Array(20).fill(0).map(() => Math.random() * 40 + 4));
            }, 80);
        } else {
            clearInterval(animRef.current);
            setBars(Array(20).fill(2));
        }
        return () => clearInterval(animRef.current);
    }, [status]);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('error');
            return;
        }

        const recog = new SpeechRecognition();
        recog.lang = 'en-US';
        recog.continuous = false;
        recog.interimResults = true;
        recognitionRef.current = recog;

        recog.onstart = () => setStatus('listening');
        recog.onresult = (e) => {
            const result = e.results[e.results.length - 1];
            setTranscript(result[0].transcript);
        };
        recog.onend = () => {
            setStatus('analyzing');
            simulateVoiceAnalysis();
        };
        recog.onerror = () => {
            setStatus('error');
        };

        recog.start();
    };

    // Simulate speaker verification confidence score
    const simulateVoiceAnalysis = () => {
        let sim = 0;
        const target = 75 + Math.random() * 20; // 75–95%
        const timer = setInterval(() => {
            sim += 3;
            setConfidence(Math.min(sim, target));
            if (sim >= target) {
                clearInterval(timer);
                setStatus('success');
                setTimeout(() => onVerified?.(target), 1000);
            }
        }, 50);
    };

    return (
        <div className="flex flex-col items-center gap-6 text-center">
            <div className="step-pill">🎤 Voice Verification (Optional)</div>

            {/* Passphrase display */}
            <div className="glass-card p-6 max-w-sm">
                <p className="text-sm text-white/50 mb-2">Please read aloud:</p>
                <p className="text-2xl font-bold text-white leading-snug">"{phrase}"</p>
            </div>

            {/* Microphone visualizer */}
            <div className="flex items-end gap-1 h-16">
                {bars.map((h, i) => (
                    <div
                        key={i}
                        className="w-2 rounded-full transition-all duration-75"
                        style={{
                            height: `${h}px`,
                            background: status === 'listening'
                                ? `hsl(${240 + i * 5}, 70%, 60%)`
                                : status === 'success' ? '#22c55e' : 'rgba(255,255,255,0.2)',
                        }}
                    />
                ))}
            </div>

            {/* Transcript */}
            {transcript && (
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 max-w-sm">
                    <p className="text-white/70 text-sm italic">"{transcript}"</p>
                </div>
            )}

            {/* Confidence meter */}
            {(status === 'analyzing' || status === 'success') && (
                <div className="w-72">
                    <div className="flex justify-between text-sm text-white/60 mb-2">
                        <span>Voice Match</span>
                        <span className="font-bold text-white">{Math.round(confidence)}%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-3">
                        <div
                            className="h-3 rounded-full transition-all duration-100"
                            style={{
                                width: `${confidence}%`,
                                background: confidence >= 70
                                    ? 'linear-gradient(to right, #22c55e, #4ade80)'
                                    : 'linear-gradient(to right, #f59e0b, #fbbf24)',
                            }}
                        />
                    </div>
                    {status === 'success' && (
                        <p className="text-safe-400 text-sm mt-2 font-medium">Voice verified ✓</p>
                    )}
                </div>
            )}

            {/* Status message */}
            <p className="text-white/60 text-lg">
                {status === 'idle' && 'Press the button and read the phrase above'}
                {status === 'listening' && '🎤 Listening... speak clearly'}
                {status === 'analyzing' && 'Analyzing your voice...'}
                {status === 'success' && 'Great! Your voice has been verified.'}
                {status === 'error' && 'Microphone is not available. You can skip this step.'}
            </p>

            {/* Buttons */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                {status === 'idle' && (
                    <button onClick={startListening} className="btn-primary w-full" id="voice-start-btn">
                        🎤&nbsp; Start Speaking
                    </button>
                )}
                {status === 'error' && (
                    <button onClick={startListening} className="btn-secondary w-full">Try Again</button>
                )}
                {status !== 'success' && (
                    <button onClick={onSkip} className="text-white/40 hover:text-white/70 text-sm underline transition-colors">
                        Skip voice verification
                    </button>
                )}
            </div>
        </div>
    );
}
