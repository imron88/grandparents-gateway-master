import { Router } from 'express';
import { supabase } from '../services/supabaseClient.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = Router();

// ─── ENROLL FACE ──────────────────────────────────────────────────────────
router.post('/face/enroll', verifyJWT, auditLogger('face_enroll'), async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    const { userId } = req.user;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: 'Invalid face data. Please try again.' });
    }

    const { error } = await supabase
      .from('behavioral_profiles')
      .upsert(
        { user_id: userId, face_descriptor: faceDescriptor, last_updated: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    res.json({ enrolled: true, message: 'Your face has been saved securely.' });
  } catch (err) {
    console.error('face/enroll error:', err);
    res.status(500).json({ error: 'Could not save your face data. Please try again.' });
  }
});

// ─── GET FACE DESCRIPTOR ──────────────────────────────────────────────────
router.get('/face/descriptor', verifyJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase
      .from('behavioral_profiles')
      .select('face_descriptor')
      .eq('user_id', userId)
      .single();

    if (error || !data?.face_descriptor) {
      return res.status(404).json({ error: 'No face data found. Please enroll your face first.' });
    }

    res.json({ faceDescriptor: data.face_descriptor });
  } catch (err) {
    console.error('face/descriptor error:', err);
    res.status(500).json({ error: 'Could not retrieve face data. Please try again.' });
  }
});

export default router;
