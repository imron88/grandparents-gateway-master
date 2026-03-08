import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from './api.js';

/**
 * Register a new passkey for the user.
 */
export async function registerPasskey(email, name) {
  // 1. Get registration options from backend
  const { data } = await api.post('/auth/register/options', { email, name });
  const { options, userId } = data;

  // 2. Browser prompts for passkey
  let attResp;
  try {
    attResp = await startRegistration(options);
  } catch (err) {
    if (err.name === 'InvalidStateError') {
      throw new Error('A security key is already registered for this device.');
    }
    throw new Error('You cancelled the security key setup. Please try again.');
  }

  // 3. Verify on backend
  const { data: result } = await api.post('/auth/register/verify', {
    userId,
    response: attResp,
  });

  return { ...result, userId };
}

/**
 * Authenticate with passkey.
 */
export async function authenticatePasskey(email, behaviorSignals = {}) {
  // 1. Get challenge from backend
  const { data } = await api.post('/auth/login/options', { email });
  const { options, userId, displayName } = data;

  // 2. Browser prompts biometric
  let assertResp;
  try {
    assertResp = await startAuthentication(options);
  } catch (err) {
    throw new Error('We did not recognize you. Please try again.');
  }

  // 3. Verify on backend
  const deviceFingerprint = getDeviceFingerprint();
  const { data: result } = await api.post('/auth/login/verify', {
    userId,
    response: assertResp,
    deviceFingerprint,
    behaviorSignals,
  });

  // 4. Store access token in memory
  if (result.accessToken) {
    sessionStorage.setItem('accessToken', result.accessToken);
  }

  return { ...result, displayName };
}

/**
 * Simple device fingerprint from browser characteristics.
 */
function getDeviceFingerprint() {
  const nav = navigator;
  const fp = [
    nav.userAgent,
    nav.language,
    nav.platform,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency,
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) - hash) + fp.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
