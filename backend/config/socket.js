import { Server } from 'socket.io';
import logger from '../config/logger.js';
import { redisCache } from '../config/redis.js';
import jwt from 'jsonwebtoken';

const onlineUsers = new Map();

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware: authenticate socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.id || decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      logger.error('Socket authentication error:', { error: err.message });
      next(new Error('Authentication error'));
    }
  });

  // Handle connection
  io.on('connection', (socket) => {
    logger.info('User connected:', { userId: socket.userId, socketId: socket.id });

    // Track online users
    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, []);
    }
    onlineUsers.get(socket.userId).push(socket.id);

    // Broadcast user came online
    io.emit('user_online', {
      userId: socket.userId,
      username: socket.username,
      onlineCount: onlineUsers.size
    });

    // Notify that user is online
    socket.broadcast.emit('user_status_changed', {
      userId: socket.userId,
      status: 'online'
    });

    // Handle real-time notification
    socket.on('send_notification', async (data) => {
      try {
        const { recipientId, type, content, actorId, actorUsername } = data;

        logger.info('Sending real-time notification:', {
          recipientId,
          type,
          actorId
        });

        // Cache notification for offline users
        const cacheKey = `notification:${recipientId}`;
        const notifications = await redisCache.get(cacheKey) || [];
        notifications.push({
          type,
          content,
          actorId,
          actorUsername,
          timestamp: new Date()
        });
        await redisCache.set(cacheKey, notifications, 86400); // 24 hours

        // Send to connected user
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets && recipientSockets.length > 0) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit('notification', {
              type,
              content,
              actorId,
              actorUsername,
              timestamp: new Date()
            });
          });
        }

        socket.emit('notification_sent', { success: true });
      } catch (error) {
        logger.error('Notification send error:', { error: error.message });
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle typing indicator
    socket.on('start_typing', (data) => {
      const { conversationId } = data;
      socket.broadcast.emit('user_typing', {
        conversationId,
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.broadcast.emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle real-time message
    socket.on('send_message', (data) => {
      const { conversationId, message, recipientId } = data;
      logger.info('Real-time message:', {
        conversationId,
        senderId: socket.userId,
        recipientId
      });

      io.emit('message_received', {
        conversationId,
        senderId: socket.userId,
        senderUsername: socket.username,
        message,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('User disconnected:', { userId: socket.userId });

      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        const index = userSockets.indexOf(socket.id);
        if (index > -1) {
          userSockets.splice(index, 1);
        }
        if (userSockets.length === 0) {
          onlineUsers.delete(socket.userId);
          io.emit('user_offline', {
            userId: socket.userId,
            onlineCount: onlineUsers.size
          });
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        userId: socket.userId,
        error: error.message
      });
    });
  });

  return io;
}

export default initializeSocket;
