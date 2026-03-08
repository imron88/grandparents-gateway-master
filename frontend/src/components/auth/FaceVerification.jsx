import React, { useRef, useEffect, useState, useCallback } from 'react';
import { loadFaceModels, enrollFace, verifyFace } from '../../services/faceService.js';

export default function FaceVerification({ mode = 'verify', storedDescriptor = null, onEnrolled, onVerified, onError }) {
    const videoRef = useRef(null);
    const [status, setStatus] = useState('loading'); // loading | ready | capturing | success | error
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Loading face detection...');
    const [blinkPrompt, setBlinkPrompt] = useState(false);

    const startCamera = useCallback(async () => {
        // Step 1: Try to load face models (requires WebGL)
        try {
            await loadFaceModels();
        } catch (modelErr) {
            // WebGL not supported — face detection unavailable
            setStatus('unsupported');
            setMessage('Face detection is not supported on this device. You can skip this step.');
            // Auto-skip after 3 seconds
            setTimeout(() => onEnrolled?.(null), 3000);
            return;
        }

        // Step 2: Try to access the camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStatus('ready');
            setMessage(mode === 'enroll'
                ? 'Center your face in the oval, then click Capture'
                : 'Please blink slowly to confirm you\'re present');
        } catch (err) {
            setStatus('error');
            setMessage('Camera access denied. Please allow camera access and try again.');
            onError?.('Camera access denied');
        }
    }, [mode, onError, onEnrolled]);


    useEffect(() => {
        startCamera();
        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
        };
    }, [startCamera]);

    const handleCapture = async () => {
        if (status !== 'ready') return;
        setStatus('capturing');

        try {
            if (mode === 'enroll') {
                setMessage('Please hold still — capturing 5 samples...');
                setBlinkPrompt(false);

                const descriptor = await enrollFace(videoRef.current, (curr, total) => {
                    setProgress(Math.round((curr / total) * 100));
                    setMessage(`Captured ${curr} of ${total} samples...`);
                });

                setStatus('success');
                setMessage('Your face has been saved!');
                onEnrolled?.(descriptor);
            } else {
                setBlinkPrompt(true);
                setMessage('Please blink slowly...');

                await new Promise(r => setTimeout(r, 1500));
                const result = await verifyFace(videoRef.current, storedDescriptor);

                setBlinkPrompt(false);
                if (result.match) {
                    setStatus('success');
                    setMessage('Face recognized! ✓');
                    onVerified?.(result);
                } else {
                    setStatus('error');
                    setMessage('We didn\'t recognize you. Please try again or contact your guardian.');
                    onError?.('Face not recognized');
                }
            }
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Something went wrong. Please try again.');
            onError?.(err.message);
        }
    };

    const isSuccess = status === 'success';
    const isError = status === 'error';
    const isUnsupported = status === 'unsupported';

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Unsupported — WebGL not available */}
            {isUnsupported && (
                <div className="glass-card p-6 text-center space-y-3 w-80">
                    <p className="text-4xl">📵</p>
                    <p className="text-white font-semibold text-base">{message}</p>
                    <p className="text-white/40 text-sm">Automatically skipping in a moment...</p>
                    <button onClick={() => onEnrolled?.(null)} className="btn-secondary w-full text-sm">
                        Skip Now
                    </button>
                </div>
            )}

            {/* Camera preview */}
            {!isUnsupported && (
                <div className="relative w-80 h-64 rounded-3xl overflow-hidden bg-gray-900 border-2 border-white/10">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover scale-x-[-1]"
                        muted
                        playsInline
                    />

                    {/* Face oval overlay */}
                    {(status === 'ready' || status === 'capturing') && (
                        <div className="face-oval" style={{
                            borderColor: isSuccess ? '#22c55e' : '#6366f1',
                            boxShadow: blinkPrompt ? '0 0 30px rgba(99,102,241,0.8), inset 0 0 30px rgba(99,102,241,0.2)' : undefined,
                        }} />
                    )}

                    {/* Success overlay */}
                    {isSuccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-safe-500/20 backdrop-blur-sm">
                            <div className="text-6xl animate-bounce">✓</div>
                        </div>
                    )}

                    {/* Error overlay */}
                    {isError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-danger-500/20 backdrop-blur-sm">
                            <div className="text-6xl">⚠</div>
                        </div>
                    )}
                </div>
            )}

            {/* Progress bar (enrollment) */}
            {mode === 'enroll' && status === 'capturing' && (
                <div className="w-80 bg-white/10 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-brand-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Status message */}
            <p className="text-white/80 text-lg text-center max-w-xs leading-relaxed font-medium">
                {message}
            </p>

            {/* Action button */}
            {(status === 'ready' || status === 'error') && (
                <button
                    id="face-capture-btn"
                    onClick={status === 'error' ? () => { setStatus('ready'); setMessage(mode === 'enroll' ? 'Try again — center your face in the oval' : 'Please blink slowly when ready'); } : handleCapture}
                    className="btn-primary min-w-[200px]"
                >
                    {status === 'error' ? 'Try Again' : (mode === 'enroll' ? 'Capture My Face' : 'I\'m Ready')}
                </button>
            )}

            {status === 'capturing' && (
                <div className="flex items-center gap-3 text-brand-300">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-base">Please hold still...</span>
                </div>
            )}
        </div>
    );
}
