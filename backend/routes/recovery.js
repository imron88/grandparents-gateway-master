import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabaseClient.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = Router();

// ─── INITIATE RECOVERY ────────────────────────────────────────────────────
router.post('/initiate', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Please provide your email address.' });

    const { data: user } = await supabase
      .from('users')
      .select('id, display_name, is_enrolled')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'We do not recognize this account.' });

    // Get verified guardians capable of recovery
    const { data: guardians } = await supabase
      .from('guardians')
      .select('id, guardian_email, guardian_name')
      .eq('senior_id', user.id)
      .eq('is_verified', true)
      .eq('can_recover_account', true);

    if (!guardians?.length) {
      return res.status(400).json({ error: 'No recovery guardians found. Please contact support.' });
    }

    // Create recovery tokens for each guardian
    const tokens = guardians.map(g => ({
      senior_id: user.id,
      guardian_id: g.id,
      token: Math.random().toString(36).substring(2, 10).toUpperCase(),
      used: false,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    }));

    await supabase.from('recovery_tokens').insert(tokens);

    // Log recovery event
    await supabase.from('audit_log').insert({
      user_id: user.id,
      event_type: 'recovery_initiated',
      metadata: { guardianCount: guardians.length },
    });

    // Mock: Show tokens in console (in production, email each guardian)
    tokens.forEach((t, i) => {
      const g = guardians[i];
      console.log(`\n🔑 RECOVERY TOKEN → ${g.guardian_email} (${g.guardian_name}): ${t.token}\n`);
    });

    res.json({
      initiated: true,
      requiredApprovals: 2,
      totalGuardians: guardians.length,
      message: `Recovery tokens sent to ${guardians.length} guardian(s). You need 2 tokens to recover.`,
    });
  } catch (err) {
    console.error('recovery/initiate error:', err);
    res.status(500).json({ error: 'Could not start recovery. Please try again.' });
  }
});

// ─── SUBMIT GUARDIAN TOKEN ────────────────────────────────────────────────
router.post('/submit-token', async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'Please provide your email and recovery token.' });

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const { data: recoveryToken, error } = await supabase
      .from('recovery_tokens')
      .update({ used: true })
      .eq('senior_id', user.id)
      .eq('token', token.toUpperCase())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .select()
      .single();

    if (error || !recoveryToken) {
      return res.status(400).json({ error: 'Invalid or expired token. Please check and try again.' });
    }

    // Count used tokens
    const { count } = await supabase
      .from('recovery_tokens')
      .select('id', { count: 'exact' })
      .eq('senior_id', user.id)
      .eq('used', true)
      .gt('expires_at', new Date().toISOString());

    res.json({ accepted: true, approvedCount: count, requiredCount: 2, readyToComplete: count >= 2 });
  } catch (err) {
    console.error('recovery/submit-token error:', err);
    res.status(500).json({ error: 'Could not validate token. Please try again.' });
  }
});

// ─── COMPLETE RECOVERY ────────────────────────────────────────────────────
router.post('/complete', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    // Verify enough tokens used
    const { count } = await supabase
      .from('recovery_tokens')
      .select('id', { count: 'exact' })
      .eq('senior_id', user.id)
      .eq('used', true)
      .gt('expires_at', new Date().toISOString());

    if (count < 2) {
      return res.status(400).json({ error: 'Not enough guardian approvals yet. Need 2 to proceed.' });
    }

    // Reset enrollment state to allow re-enrollment
    await supabase
      .from('users')
      .update({ is_enrolled: false, trust_score: 100, is_locked: false })
      .eq('id', user.id);

    // Remove old passkeys (force re-enrollment)
    await supabase.from('passkey_credentials').delete().eq('user_id', user.id);

    // Clean up tokens
    await supabase.from('recovery_tokens').delete().eq('senior_id', user.id);

    // Audit
    await supabase.from('audit_log').insert({
      user_id: user.id,
      event_type: 'recovery_complete',
      metadata: { guardianApprovals: count },
    });

    res.json({
      recovered: true,
      message: 'Account recovery approved! Please go to /enroll to set up your new security key.',
    });
  } catch (err) {
    console.error('recovery/complete error:', err);
    res.status(500).json({ error: 'Recovery failed. Please try again.' });
  }
});

export default router;
