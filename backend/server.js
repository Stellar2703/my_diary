import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

// Import configuration
import connectDB from './config/database.js';
import logger from './config/logger.js';
import { initializeSocket } from './config/socket.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { globalErrorHandler, notFoundHandler } from './utils/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import followRoutes from './routes/followRoutes.js';
import reactionRoutes from './routes/reactionRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import departmentEnhancementsRoutes from './routes/departmentEnhancementsRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time notifications
const io = initializeSocket(server);
app.set('io', io);

// ====== SECURITY MIDDLEWARE ======
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Allow images from various sources
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ====== LOGGING MIDDLEWARE ======
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));
app.use(requestLogger);

// ====== BODY PARSING MIDDLEWARE ======
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====== STATIC FILES ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    // Set cache control for better performance
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    // Allow cross-origin for images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Set content type based on file extension
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } else if (path.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    } else if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (path.endsWith('.mp3')) {
      res.set('Content-Type', 'audio/mpeg');
    } else if (path.endsWith('.wav')) {
      res.set('Content-Type', 'audio/wav');
    }
  }
}));

// ====== RATE LIMITING ======
app.use('/api/', generalLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api', commentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/departments/enhancements', departmentEnhancementsRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/analytics', analyticsRoutes);

// ====== HEALTH CHECK ======
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'my diary API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ====== ROOT ENDPOINT ======
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to my diary API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      posts: '/api/posts',
      departments: '/api/departments',
      comments: '/api',
      user: '/api/user',
      realtime: 'WebSocket at /'
    }
  });
});

// ====== ERROR HANDLING ======
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ====== START SERVER ======
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info('🚀 my diary API Server Started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      apiUrl: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/api/health`,
      webSocketEnabled: true,
      redisEnabled: true,
      rateLimitingEnabled: true
    });
  });
}).catch((err) => {
  logger.error('❌ Failed to start server:', { error: err.message });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
