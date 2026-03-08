import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabaseClient.js';
import {
  genRegistrationOptions,
  verifyRegistration,
  genAuthenticationOptions,
  verifyAuthentication,
} from '../services/webauthn.js';
import { calculateTrustDelta } from '../services/trustEngine.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = Router();

// In-memory challenge store (use Redis in production)
const challengeStore = new Map();

// ─── REGISTRATION OPTIONS ────────────────────────────────────────────────
router.post('/register/options', auditLogger('passkey_register_options'), async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Please provide your name and email address.' });
    }

    // Upsert user
    let { data: user, error } = await supabase
      .from('users')
      .upsert({ email, display_name: name, role: 'senior' }, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;

    // Get existing credentials (to exclude)
    const { data: existingCreds } = await supabase
      .from('passkey_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    const options = await genRegistrationOptions(user, existingCreds || []);

    // Store challenge
    challengeStore.set(`reg:${user.id}`, {
      challenge: options.challenge,
      userId: user.id,
      expiresAt: Date.now() + 60000,
    });

    res.json({ options, userId: user.id });
  } catch (err) {
    console.error('register/options error:', err);
    res.status(500).json({ error: 'Could not set up your security key. Please try again.' });
  }
});

// ─── REGISTRATION VERIFY ─────────────────────────────────────────────────
router.post('/register/verify', auditLogger('passkey_register_complete'), async (req, res) => {
  try {
    const { userId, response } = req.body;

    const stored = challengeStore.get(`reg:${userId}`);
    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'Your registration session expired. Please start again.' });
    }

    const verification = await verifyRegistration(response, stored.challenge);
    if (!verification.verified) {
      return res.status(400).json({ error: 'We could not verify your security key. Please try again.' });
    }

    // SimpleWebAuthn v9 returns flat registrationInfo (no nested credential object)
    const { registrationInfo } = verification;
    const {
      credentialID,        // Uint8Array
      credentialPublicKey, // Uint8Array
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    // Convert Uint8Array credentialID to base64url string for storage
    const credentialIdStr = Buffer.from(credentialID).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Store credential
    const { error } = await supabase.from('passkey_credentials').insert({
      user_id: userId,
      credential_id: credentialIdStr,
      public_key: Buffer.from(credentialPublicKey).toString('base64'),
      counter: counter,
      device_type: credentialDeviceType,  // 'singleDevice' | 'multiDevice'
      backed_up: credentialBackedUp,
      transports: response.response?.transports || [],
    });

    if (error) throw error;

    // Mark user enrolled
    await supabase.from('users').update({ is_enrolled: true }).eq('id', userId);

    challengeStore.delete(`reg:${userId}`);

    // Create behavioral profile
    await supabase.from('behavioral_profiles').upsert({ user_id: userId }, { onConflict: 'user_id' });

    // Fetch user details
    const { data: user } = await supabase
      .from('users')
      .select('id, email, display_name, role')
      .eq('id', userId)
      .single();

    // Issue enrollment JWT so subsequent steps (face, guardian) can authenticate
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, trustScore: 50 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      verified: true,
      accessToken,
      message: 'Your security key has been set up successfully!',
    });
  } catch (err) {
    console.error('register/verify error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── LOGIN OPTIONS ────────────────────────────────────────────────────────
router.post('/login/options', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Please provide your email address.' });

    const { data: user } = await supabase
      .from('users')
      .select('id, display_name, email, is_enrolled')
      .eq('email', email)
      .single();

    if (!user || !user.is_enrolled) {
      return res.status(404).json({ error: 'We do not recognize this account. Have you enrolled yet?' });
    }

    const { data: creds } = await supabase
      .from('passkey_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    const options = await genAuthenticationOptions(creds || []);

    challengeStore.set(`auth:${user.id}`, {
      challenge: options.challenge,
      userId: user.id,
      expiresAt: Date.now() + 60000,
    });

    res.json({ options, userId: user.id, displayName: user.display_name });
  } catch (err) {
    console.error('login/options error:', err);
    res.status(500).json({ error: 'Could not prepare sign-in. Please try again.' });
  }
});

// ─── LOGIN VERIFY ─────────────────────────────────────────────────────────
router.post('/login/verify', auditLogger('passkey_login'), async (req, res) => {
  try {
    const { userId, response, deviceFingerprint, behaviorSignals } = req.body;

    const stored = challengeStore.get(`auth:${userId}`);
    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: 'Your sign-in session expired. Please try again.' });
    }

    // Look up credential by response.id — credential IDs are globally unique
    let { data: cred } = await supabase
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', response.id)
      .single();

    // Fallback: if not found directly, search all user creds for a fuzzy match
    // (handles minor base64url padding differences)
    if (!cred) {
      const { data: userCreds } = await supabase
        .from('passkey_credentials')
        .select('*')
        .eq('user_id', userId);

      cred = userCreds?.find(c =>
        c.credential_id === response.id ||
        c.credential_id.replace(/=+$/, '') === response.id.replace(/=+$/, '')
      ) || null;
    }

    if (!cred) {
      return res.status(404).json({ error: 'Security key not found. Please enroll again.' });
    }

    const verification = await verifyAuthentication(response, stored.challenge, cred);
    if (!verification.verified) {
      return res.status(401).json({ error: 'We did not recognize you. Please try again.' });
    }

    // Update counter
    await supabase
      .from('passkey_credentials')
      .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq('id', cred.id);

    // Get user + behavioral profile
    const { data: user } = await supabase
      .from('users')
      .select('id, email, display_name, role, trust_score, is_locked')
      .eq('id', userId)
      .single();

    if (user.is_locked) {
      return res.status(403).json({ error: 'Your account is protected. Please contact your guardian.' });
    }

    const { data: profile } = await supabase
      .from('behavioral_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Calculate trust delta
    const { delta, flags } = calculateTrustDelta(
      behaviorSignals || {},
      profile,
      { deviceMatch: deviceFingerprint === profile?.last_device }
    );

    const newTrustScore = Math.max(0, Math.min(100, user.trust_score + delta));
    await supabase.from('users').update({ trust_score: newTrustScore, last_login_at: new Date().toISOString() }).eq('id', userId);

    challengeStore.delete(`auth:${userId}`);

    // Issue JWT
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, trustScore: newTrustScore, deviceFingerprint },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
      trustScore: newTrustScore,
      anomalyFlags: flags,
      trustScoreDelta: delta,
    });
  } catch (err) {
    console.error('login/verify error:', err);
    res.status(500).json({ error: 'Sign-in failed. Please try again.' });
  }
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Please sign in again.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token.' });

    const { data: user } = await supabase
      .from('users')
      .select('id, email, role, trust_score')
      .eq('id', payload.userId)
      .single();

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, trustScore: user.trust_score },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch {
    res.clearCookie('refreshToken');
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'You have been signed out safely.' });
});

export default router;
