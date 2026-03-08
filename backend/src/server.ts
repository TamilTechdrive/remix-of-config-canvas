import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { testConnection } from './database/connection.js';
import { requestLogger, errorHandler } from './middleware/auth.middleware.js';
import { attachFingerprint, trackSuspiciousActivity, securityHeaders } from './middleware/security.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import configRoutes from './routes/config.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();

// ===== SECURITY: HELMET =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ===== CORS =====
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint', 'X-Encryption-Key', 'X-CSRF-Token'],
  maxAge: 86400,
}));

// ===== BODY PARSING =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ===== SESSION =====
app.use(session({
  secret: env.SESSION_SECRET,
  name: '__configflow_sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: env.SESSION_MAX_AGE_MS,
    domain: env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
  },
}));

// ===== CSRF PROTECTION =====
const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: '__configflow_csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

// ===== RATE LIMITING =====
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many authentication attempts' },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Wait 1 minute.' },
});

app.use(globalLimiter);

// ===== CUSTOM MIDDLEWARE =====
app.use(securityHeaders);
app.use(attachFingerprint);
app.use(trackSuspiciousActivity);
app.use(requestLogger);

// ===== CSRF TOKEN ENDPOINT =====
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
});

// ===== ROUTES =====
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/configurations', doubleCsrfProtection, configRoutes);
app.use('/api/audit', auditRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', async (_req, res) => {
  const dbOk = await testConnection();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
    version: '1.0.0',
  });
});

// ===== ERROR HANDLER =====
app.use(errorHandler);

// ===== START =====
app.listen(env.PORT, () => {
  logger.info(`🔒 ConfigFlow API running on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`📦 Database: ${env.DB_CLIENT}`);
  testConnection();
});

export default app;
