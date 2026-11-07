import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let ioInstance = null;

/**
 * Initialize Socket.IO with HTTP server instance.
 * Attaches JWT handshake authentication and farmer private room join logic.
 */
export const initSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:5000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Handshake Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication failed: Missing authorization token'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      logger.warn(`[Socket.IO] Handshake authentication rejected: ${err.message}`);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    const farmerId = String(socket.user?.id || socket.user?._id || '');
    if (!farmerId) {
      socket.disconnect(true);
      return;
    }

    const roomName = `farmer:${farmerId}`;
    socket.join(roomName);
    logger.info(
      `[Socket.IO] User connected: ${socket.user.name || socket.user.email || farmerId} (Socket ID: ${socket.id}, Room: ${roomName})`
    );

    // Consultation Workspace Room Handlers
    socket.on('consultation:join', ({ consultationId }) => {
      if (!consultationId) return;
      const cRoom = `consultation:${String(consultationId)}`;
      socket.join(cRoom);
      logger.info(`[Socket.IO] ${socket.user.name || farmerId} joined consultation room: ${cRoom}`);
      socket.emit('consultation:joined', { consultationId });
    });

    socket.on('consultation:leave', ({ consultationId }) => {
      if (!consultationId) return;
      const cRoom = `consultation:${String(consultationId)}`;
      socket.leave(cRoom);
      logger.info(`[Socket.IO] ${socket.user.name || farmerId} left consultation room: ${cRoom}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(
        `[Socket.IO] User disconnected: ${socket.user.name || farmerId} (Reason: ${reason})`
      );
    });
  });

  ioInstance = io;
  return ioInstance;
};

/**
 * Retrieve the active Socket.IO instance.
 */
export const getIO = () => {
  return ioInstance;
};

/**
 * Send real-time notification to a specific farmer's room.
 * @param {string|mongoose.Types.ObjectId} farmerId
 * @param {object} notification
 */
export const sendNotificationToFarmer = (farmerId, notification) => {
  if (!ioInstance) return false;
  const fid = String(farmerId);
  const roomName = `farmer:${fid}`;
  ioInstance.to(roomName).emit('notification:new', notification);
  return true;
};

/**
 * Send real-time unread count update to a specific farmer's room.
 * @param {string|mongoose.Types.ObjectId} farmerId
 * @param {number} count
 */
export const sendUnreadCountToFarmer = (farmerId, count) => {
  if (!ioInstance) return false;
  const fid = String(farmerId);
  const roomName = `farmer:${fid}`;
  ioInstance.to(roomName).emit('notification:unreadCount', { unreadCount: count });
  return true;
};

/**
 * Broadcast new chat message to a consultation room.
 * @param {string|mongoose.Types.ObjectId} consultationId
 * @param {object} message
 */
export const sendConsultationMessage = (consultationId, message) => {
  if (!ioInstance) return false;
  const cid = String(consultationId);
  ioInstance.to(`consultation:${cid}`).emit('consultation:message', message);
  return true;
};

/**
 * Broadcast status or recommendation update to a consultation room.
 * @param {string|mongoose.Types.ObjectId} consultationId
 * @param {object} consultation
 */
export const sendConsultationUpdate = (consultationId, consultation) => {
  if (!ioInstance) return false;
  const cid = String(consultationId);
  ioInstance.to(`consultation:${cid}`).emit('consultation:update', consultation);
  return true;
};

/**
 * Teardown helper for unit and integration testing.
 */
export const closeSocket = async () => {
  if (ioInstance) {
    await ioInstance.close();
    ioInstance = null;
  }
};
