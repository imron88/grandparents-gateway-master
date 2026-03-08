import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabaseClient.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { auditLogger } from '../middleware/auditLogger.js';
import { notifyGuardian, sendGuardianVerificationEmail } from '../services/notificationService.js';

const router = Router();

// ─── ADD GUARDIAN ─────────────────────────────────────────────────────────
router.post('/add', verifyJWT, auditLogger('guardian_add'), async (req, res) => {
  try {
    const { userId } = req.user;
    const { guardianEmail, guardianName, canApproveTransactions = true, canRecoverAccount = true } = req.body;

    if (!guardianEmail || !guardianName) {
      return res.status(400).json({ error: 'Please provide the guardian\'s name and email.' });
    }

    // Get senior info
    const { data: senior } = await supabase.from('users').select('display_name').eq('id', userId).single();

    const verificationToken = uuidv4();

    const { data, error } = await supabase
      .from('guardians')
      .upsert({
        senior_id: userId,
        guardian_email: guardianEmail,
        guardian_name: guardianName,
        verification_token: verificationToken,
        can_approve_transactions: canApproveTransactions,
        can_recover_account: canRecoverAccount,
        is_verified: false,
      }, { onConflict: 'senior_id,guardian_email' })
      .select()
      .single();

    if (error) throw error;

    // Send verification email (mock)
    await sendGuardianVerificationEmail(guardianEmail, guardianName, senior.display_name, verificationToken);

    res.json({ added: true, guardian: { id: data.id, email: guardianEmail, name: guardianName, isVerified: false } });
  } catch (err) {
    console.error('guardian/add error:', err);
    res.status(500).json({ error: 'Could not add guardian. Please try again.' });
  }
});

// ─── LIST GUARDIANS ───────────────────────────────────────────────────────
router.get('/list', verifyJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase
      .from('guardians')
      .select('id, guardian_email, guardian_name, is_verified, can_approve_transactions, can_recover_account, created_at, verified_at')
      .eq('senior_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ guardians: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your safety circle.' });
  }
});

// ─── GUARDIAN VERIFY LINK ─────────────────────────────────────────────────
router.post('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data, error } = await supabase
      .from('guardians')
      .update({ is_verified: true, verified_at: new Date().toISOString(), verification_token: null })
      .eq('verification_token', token)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Invalid or expired verification link.' });
    }

    res.json({ verified: true, message: `Thank you, ${data.guardian_name}! You are now a Safety Guardian.` });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ─── CREATE APPROVAL REQUEST ──────────────────────────────────────────────
router.post('/approval/create', verifyJWT, auditLogger('approval_request_create'), async (req, res) => {
  try {
    const { userId } = req.user;
    const { requestType, context } = req.body;

    const requests = await notifyGuardian(userId, requestType || 'transaction', context || {});

    if (!requests.length) {
      return res.status(400).json({ error: 'No verified guardians found in your safety circle.' });
    }

    res.json({ created: true, requestCount: requests.length, requests });
  } catch (err) {
    console.error('approval/create error:', err);
    res.status(500).json({ error: 'Could not send approval request.' });
  }
});

// ─── RESPOND TO APPROVAL (guardian action) ────────────────────────────────
router.post('/approval/respond', verifyJWT, auditLogger('approval_response'), async (req, res) => {
  try {
    const { requestId, response: decision } = req.body;
    if (!['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid response. Please approve or deny.' });
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    res.json({ updated: true, status: decision, request: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not record your response.' });
  }
});

// ─── PENDING APPROVALS (for guardian) ────────────────────────────────────
router.get('/approval/pending', verifyJWT, async (req, res) => {
  try {
    const { userId } = req.user;

    // Find guardians where this user is the guardian
    const { data: guardianLinks } = await supabase
      .from('guardians')
      .select('id, senior_id, users!senior_id(display_name, email)')
      .or(`guardian_email.eq.${req.user.email},guardian_id.eq.${userId}`)
      .eq('is_verified', true);

    if (!guardianLinks?.length) return res.json({ pending: [] });

    const guardianIds = guardianLinks.map(g => g.id);

    const { data: pending } = await supabase
      .from('approval_requests')
      .select(`
        id, request_type, context, created_at, expires_at, status,
        senior:users!senior_id(id, display_name, email)
      `)
      .in('guardian_id', guardianIds)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    res.json({ pending: pending || [] });
  } catch (err) {
    res.status(500).json({ error: 'Could not load pending approvals.' });
  }
});

export default router;
