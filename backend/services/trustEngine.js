/**
 * Trust Engine — pure functions for calculating behavioral trust deltas.
 * Score range: 0–100 (higher = more trustworthy).
 */

const ANOMALY_THRESHOLDS = {
  clickPressureDrift: 0.3,       // 30% deviation
  scrollVelocityDrift: 0.4,
  dwellTimeDrift: 0.35,
  keystrokeIntervalDrift: 0.35,
  unusualHour: 4,                 // hours deviation from typical
  sessionDurationDrift: 0.5,
};

const ANOMALY_SCORE_IMPACT = {
  clickPressureDrift: -5,
  scrollVelocityDrift: -5,
  dwellTimeDrift: -8,
  keystrokeIntervalDrift: -8,
  unusualHour: -10,
  sessionDurationDrift: -5,
  unknownDevice: -20,
  rapidFormFill: -15,
  impossibleSpeed: -25,
};

/**
 * Calculate trust delta and anomaly flags.
 * @param {object} currentSignals - Signals from current session
 * @param {object} storedProfile  - Stored behavioral profile from DB
 * @param {object} options        - Additional context (deviceMatch, antiBot flags)
 * @returns {{ delta: number, flags: string[] }}
 */
export function calculateTrustDelta(currentSignals, storedProfile, options = {}) {
  if (!storedProfile || storedProfile.session_count < 3) {
    // Not enough baseline data — neutral
    return { delta: 0, flags: ['insufficient_baseline'] };
  }

  const flags = [];
  let delta = 0;

  // Device fingerprint check
  if (options.deviceMatch === false) {
    flags.push('unknownDevice');
    delta += ANOMALY_SCORE_IMPACT.unknownDevice;
  }

  // Anti-bot flags
  if (options.rapidFormFill) {
    flags.push('rapidFormFill');
    delta += ANOMALY_SCORE_IMPACT.rapidFormFill;
  }
  if (options.impossibleSpeed) {
    flags.push('impossibleSpeed');
    delta += ANOMALY_SCORE_IMPACT.impossibleSpeed;
  }

  // Behavioral signal comparisons
  const checks = [
    ['clickPressureDrift', currentSignals.avgClickPressure, storedProfile.avg_click_pressure],
    ['scrollVelocityDrift', currentSignals.avgScrollVelocity, storedProfile.avg_scroll_velocity],
    ['dwellTimeDrift', currentSignals.avgDwellTime, storedProfile.avg_dwell_time],
    ['keystrokeIntervalDrift', currentSignals.avgKeystrokeInterval, storedProfile.avg_keystroke_interval],
  ];

  for (const [flagName, current, stored] of checks) {
    if (stored > 0 && current != null) {
      const drift = Math.abs(current - stored) / stored;
      if (drift > ANOMALY_THRESHOLDS[flagName]) {
        flags.push(flagName);
        delta += ANOMALY_SCORE_IMPACT[flagName];
      }
    }
  }

  // Hour of day check
  const currentHour = new Date().getHours();
  const hourDiff = Math.abs(currentHour - storedProfile.typical_hour_of_day);
  if (hourDiff > ANOMALY_THRESHOLDS.unusualHour && hourDiff < 24 - ANOMALY_THRESHOLDS.unusualHour) {
    flags.push('unusualHour');
    delta += ANOMALY_SCORE_IMPACT.unusualHour;
  }

  return { delta, flags };
}

/**
 * Determine trust level label from score.
 */
export function getTrustLevel(score) {
  if (score >= 80) return 'safe';
  if (score >= 50) return 'monitoring';
  return 'alert';
}
