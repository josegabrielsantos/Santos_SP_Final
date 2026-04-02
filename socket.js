import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

let io;

export function initializeSocket(httpServer) {
  const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '');

  io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_ORIGIN,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Auth middleware — verify JWT from httpOnly cookie + check ban/active status
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error('No cookie'));

      const cookies = cookie.parse(rawCookie);
      const token = cookies.jwt;
      if (!token) return next(new Error('No JWT cookie'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Reject banned or deactivated users on (re)connection
      const User = (await import('./models/user_model.js')).default;
      const user = await User.findById(decoded.userId).select('isBanned isActive').lean();
      if (!user || user.isBanned || !user.isActive) {
        return next(new Error('Account not accessible'));
      }

      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Auto-join personal notification room
    socket.join(`user:${socket.userId}`);

    socket.on('join-room', (room) => {
      if (isValidRoom(room)) {
        socket.join(room);
      }
    });

    socket.on('leave-room', (room) => {
      socket.leave(room);
    });
  });

  return io;
}

// Only allow known room patterns
function isValidRoom(room) {
  return /^(user|post|org):[a-f0-9]{24}$/.test(room) || room === 'home';
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Emit a notification event to a single user
export async function emitNotification(recipientId) {
  if (!io) return;
  try {
    const Notification = (await import('./models/notification_model.js')).default;
    const unreadCount = await Notification.countDocuments({
      recipientId,
      isRead: false,
    });
    io.to(`user:${recipientId}`).emit('notification:new', { unreadCount });
  } catch (err) {
    console.error('emitNotification error:', err.message);
  }
}

// Emit notification events to multiple users
export async function emitNotificationBulk(recipientIds) {
  if (!io) return;
  for (const id of recipientIds) {
    await emitNotification(id.toString());
  }
}

// Emit to everyone viewing a specific post
export function emitToPost(postId, event, data) {
  if (!io) return;
  io.to(`post:${postId}`).emit(event, data);
}

// Emit to everyone on the home feed
export function emitToHome(event, data) {
  if (!io) return;
  io.to('home').emit(event, data);
}

// Emit to everyone viewing a specific organization
export function emitToOrg(orgId, event, data) {
  if (!io) return;
  io.to(`org:${orgId}`).emit(event, data);
}

// Force-disconnect a user's socket connections (used on ban/deactivation)
export function disconnectUser(userId) {
  if (!io) return;
  io.to(`user:${userId}`).disconnectSockets(true);
}
