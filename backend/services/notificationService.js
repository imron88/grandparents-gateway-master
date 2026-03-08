import { supabase } from './supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notify all verified guardians of a senior with an event.
 * Creates an approval_request row (which triggers Realtime).
 */
export async function notifyGuardian(seniorUserId, eventType, data = {}) {
  // Get verified guardians for this senior
  const { data: guardians, error } = await supabase
    .from('guardians')
    .select('id, guardian_email, guardian_name')
    .eq('senior_id', seniorUserId)
    .eq('is_verified', true)
    .eq('can_approve_transactions', true);

  if (error || !guardians?.length) {
    console.warn('No verified guardians found for senior:', seniorUserId);
    return [];
  }

  const requests = guardians.map((guardian) => ({
    senior_id: seniorUserId,
    guardian_id: guardian.id,
    request_type: eventType,
    status: 'pending',
    context: data,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
  }));

  const { data: created, error: insertErr } = await supabase
    .from('approval_requests')
    .insert(requests)
    .select();

  if (insertErr) {
    console.error('Failed to create approval requests:', insertErr.message);
    return [];
  }

  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: seniorUserId,
    event_type: `guardian_notified:${eventType}`,
    metadata: { guardianCount: guardians.length, data },
  });

  return created;
}

/**
 * Sends a verification email (mock — logs to console in dev).
 */
export async function sendGuardianVerificationEmail(guardianEmail, guardianName, seniorName, verificationToken) {
  const verifyUrl = `http://localhost:4000/api/guardian/verify/${verificationToken}`;

  // Mock email — in production use SendGrid/Resend
  console.log(`
📧 MOCK EMAIL → ${guardianEmail}
─────────────────────────────────────
To: ${guardianName}
Subject: ${seniorName} added you as their Safety Guardian

Hello ${guardianName},

${seniorName} has added you as their trusted Safety Guardian on Grandparent Gateway.

Click the link below to accept and verify your role:
${verifyUrl}

This link expires in 24 hours.
─────────────────────────────────────
  `);

  return { sent: true, to: guardianEmail, token: verificationToken };
}
