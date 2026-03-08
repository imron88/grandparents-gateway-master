/**
 * Checks trust score from JWT.
 * Below 20: reject with soft-lock response.
 */
export const trustCheck = (req, res, next) => {
  const trustScore = req.user?.trustScore ?? 100;

  if (trustScore < 20) {
    return res.status(403).json({
      error: 'Your account security level is too low to proceed. Please contact your guardian for help.',
      code: 'TRUST_TOO_LOW',
      trustScore,
    });
  }

  next();
};
