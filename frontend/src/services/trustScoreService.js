export function calculateTrustDelta(currentSignals, storedProfile) {
  if (!storedProfile || storedProfile.session_count < 3) {
    return { delta: 0, flags: ['insufficient_baseline'] };
  }

  const flags = [];
  let delta = 0;

  if (currentSignals.flags?.rapidFormFill) { flags.push('rapidFormFill'); delta -= 15; }
  if (currentSignals.flags?.impossibleSpeed) { flags.push('impossibleSpeed'); delta -= 25; }

  const drift = (cur, stored, threshold, flag, impact) => {
    if (stored > 0 && cur != null) {
      if (Math.abs(cur - stored) / stored > threshold) {
        flags.push(flag); delta += impact;
      }
    }
  };

  drift(currentSignals.avgClickPressure, storedProfile.avg_click_pressure, 0.3, 'clickPressureDrift', -5);
  drift(currentSignals.avgScrollVelocity, storedProfile.avg_scroll_velocity, 0.4, 'scrollVelocityDrift', -5);
  drift(currentSignals.avgDwellTime, storedProfile.avg_dwell_time, 0.35, 'dwellTimeDrift', -8);
  drift(currentSignals.avgKeystrokeInterval, storedProfile.avg_keystroke_interval, 0.35, 'keystrokeIntervalDrift', -8);

  return { delta, flags };
}

export function getTrustLevel(score) {
  if (score >= 80) return 'safe';
  if (score >= 50) return 'monitoring';
  return 'alert';
}

export function getTrustColor(score) {
  if (score >= 80) return { text: 'text-safe-400', bg: 'bg-safe-500/20', border: 'border-safe-500/30', glow: '0 0 20px rgba(34, 197, 94, 0.4)' };
  if (score >= 50) return { text: 'text-warn-400', bg: 'bg-warn-500/20', border: 'border-warn-500/30', glow: '0 0 20px rgba(234, 179, 8, 0.4)' };
  return { text: 'text-danger-400', bg: 'bg-danger-500/20', border: 'border-danger-500/30', glow: '0 0 20px rgba(239, 68, 68, 0.4)' };
}

export function getTrustMessage(score) {
  if (score >= 80) return 'Your account is secure';
  if (score >= 50) return 'We\'re monitoring your account';
  return 'Security alert — contact your guardian';
}
