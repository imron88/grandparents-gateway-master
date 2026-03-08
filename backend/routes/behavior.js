import { Router } from 'express';
import { supabase } from '../services/supabaseClient.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = Router();

// ─── UPDATE BEHAVIORAL PROFILE ────────────────────────────────────────────
router.post('/update', verifyJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const { signals } = req.body;

    if (!signals) return res.status(400).json({ error: 'No behavior signals provided.' });

    // Fetch current profile for weighted average
    const { data: profile } = await supabase
      .from('behavioral_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const n = (profile?.session_count || 0);
    const avg = (oldVal, newVal) => oldVal == null ? newVal : (oldVal * n + newVal) / (n + 1);

    const updates = {
      user_id: userId,
      avg_click_pressure: avg(profile?.avg_click_pressure, signals.avgClickPressure ?? 0.5),
      avg_scroll_velocity: avg(profile?.avg_scroll_velocity, signals.avgScrollVelocity ?? 0),
      avg_dwell_time: avg(profile?.avg_dwell_time, signals.avgDwellTime ?? 0),
      avg_keystroke_interval: avg(profile?.avg_keystroke_interval, signals.avgKeystrokeInterval ?? 0),
      typical_session_duration: avg(profile?.typical_session_duration, signals.sessionDuration ?? 0),
      typical_hour_of_day: new Date().getHours(),
      session_count: n + 1,
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('behavioral_profiles')
      .upsert(updates, { onConflict: 'user_id' });

    if (error) throw error;

    res.json({ updated: true, sessionCount: n + 1 });
  } catch (err) {
    console.error('behavior/update error:', err);
    res.status(500).json({ error: 'Could not update your behavior profile.' });
  }
});

// ─── GET BEHAVIORAL PROFILE ───────────────────────────────────────────────
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase
      .from('behavioral_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not load behavior profile.' });
  }
});

export default router;
