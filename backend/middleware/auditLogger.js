import { supabase } from '../services/supabaseClient.js';

/**
 * Factory that returns an Express middleware.
 * Usage: router.post('/route', auditLogger('event_type'), handler)
 */
export const auditLogger = (eventType) => async (req, res, next) => {
  // Store the original json method
  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    // Only log on successful responses
    if (res.statusCode < 400) {
      try {
        const userId = req.user?.userId || req.body?.userId || null;
        const deviceFingerprint = req.body?.deviceFingerprint ||
          req.headers['x-device-fingerprint'] || null;

        await supabase.from('audit_log').insert({
          user_id: userId,
          event_type: eventType,
          ip_address: req.ip || req.connection?.remoteAddress,
          device_fingerprint: deviceFingerprint,
          trust_score_delta: data?.trustScoreDelta || 0,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        });
      } catch (logErr) {
        console.warn('Audit log failed (non-fatal):', logErr.message);
      }
    }
    return originalJson(data);
  };

  next();
};
