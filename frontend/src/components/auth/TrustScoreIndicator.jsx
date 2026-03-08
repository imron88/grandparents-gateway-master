import React, { useState } from 'react';
import { getTrustColor, getTrustMessage, getTrustLevel } from '../../services/trustScoreService.js';

export default function TrustScoreIndicator({ score = 100 }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const colors = getTrustColor(score);
    const level = getTrustLevel(score);
    const message = getTrustMessage(score);

    const shields = { safe: '🛡️', monitoring: '⚠️', alert: '🚨' };
    const labels = { safe: 'Safe', monitoring: 'Monitoring', alert: 'Alert' };

    return (
        <div className="fixed bottom-6 right-6 z-50" id="trust-score-indicator">
            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-16 right-0 glass-card p-4 w-56 animate-fade-in">
                    <p className="text-white/60 text-xs mb-1">Your security level</p>
                    <p className="text-white font-semibold text-sm mb-2">{message}</p>
                    <div className="bg-white/10 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{
                                width: `${score}%`,
                                background: level === 'safe' ? '#22c55e' : level === 'monitoring' ? '#eab308' : '#ef4444',
                                boxShadow: `0 0 8px ${level === 'safe' ? '#22c55e' : level === 'monitoring' ? '#eab308' : '#ef4444'}`,
                            }}
                        />
                    </div>
                    <p className="text-white/40 text-xs mt-1 text-right">{score}/100</p>
                </div>
            )}

            {/* Shield button */}
            <button
                onClick={() => setShowTooltip(v => !v)}
                onBlur={() => setTimeout(() => setShowTooltip(false), 200)}
                className={`
          flex items-center gap-2 px-4 py-2.5 rounded-2xl
          border backdrop-blur-xl transition-all duration-300
          hover:scale-105 active:scale-95 cursor-pointer
          shadow-lg ${colors.bg} ${colors.border}
        `}
                style={{ boxShadow: colors.glow }}
                aria-label={`Security level: ${labels[level]}`}
            >
                <span className="text-xl">{shields[level]}</span>
                <div className="flex flex-col items-start">
                    <span className={`text-xs font-semibold ${colors.text}`}>{labels[level]}</span>
                    <span className="text-white/40 text-xs">{score}%</span>
                </div>
            </button>
        </div>
    );
}
