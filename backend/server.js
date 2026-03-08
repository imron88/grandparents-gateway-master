import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.js';
import biometricsRoutes from './routes/biometrics.js';
import behaviorRoutes from './routes/behavior.js';
import guardianRoutes from './routes/guardian.js';
import recoveryRoutes from './routes/recovery.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/biometrics', biometricsRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/guardian', guardianRoutes);
app.use('/api/recovery', recoveryRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'grandparent-gateway', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong. Please try again.',
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  Grandparent Gateway backend running on http://localhost:${PORT}`);
});

export default app;
