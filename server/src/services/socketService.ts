import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import User from '../models/User';
import Message from '../models/Message';

export const initializeSocket = (io: Server) => {
  // Authentication middleware for Socket.IO connection
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Handle Bearer token format if present
      const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const decoded = verifyToken(actualToken);
      
      const user = await User.findById(decoded.id).select('name email avatar status');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user info to socket
      socket.data.user = user;
      socket.data.userId = user._id.toString();
      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.user.name;
    console.log(`[Socket] User connected: ${userName} (${userId})`);

    // 1. Join user-specific room for private events/notifications
    socket.join(userId);

    // Update status to online in Database
    try {
      await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
      socket.broadcast.emit('user-online', userId);
    } catch (err) {
      console.error('Failed to update online status for user:', userId, err);
    }

    // 2. Chat rooms
    socket.on('join-chat', (chatId: string) => {
      socket.join(chatId);
      console.log(`[Socket] Socket ${socket.id} joined chat room: ${chatId}`);
    });

    socket.on('leave-chat', (chatId: string) => {
      socket.leave(chatId);
      console.log(`[Socket] Socket ${socket.id} left chat room: ${chatId}`);
    });

    // 3. Typing states
    socket.on('typing', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('typing', { chatId: data.chatId, userId, userName });
    });

    socket.on('stop-typing', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('stop-typing', { chatId: data.chatId, userId });
    });

    // 4. Read receipts
    socket.on('message-read', async (data: { chatId: string; messageId: string }) => {
      try {
        const { chatId, messageId } = data;
        
        // Add user to readBy array in Database
        await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { readBy: userId } },
          { new: true }
        );

        // Broadcast read receipt event to others in the chat
        socket.to(chatId).emit('message-read', { chatId, messageId, userId });
      } catch (err) {
        console.error('Failed to process message-read event:', err);
      }
    });

    // 5. Call Signaling
    socket.on('call-user', (data: { to: string; offer: any; type: 'audio' | 'video'; fromUser: any }) => {
      socket.to(data.to).emit('incoming-call', {
        from: userId,
        offer: data.offer,
        type: data.type,
        fromUser: data.fromUser,
      });
    });

    socket.on('answer-call', (data: { to: string; answer: any }) => {
      socket.to(data.to).emit('call-answered', {
        from: userId,
        answer: data.answer,
      });
    });

    socket.on('ice-candidate', (data: { to: string; candidate: any }) => {
      socket.to(data.to).emit('ice-candidate', {
        from: userId,
        candidate: data.candidate,
      });
    });

    socket.on('reject-call', (data: { to: string }) => {
      socket.to(data.to).emit('call-rejected', {
        from: userId,
      });
    });

    socket.on('end-call', (data: { to: string }) => {
      socket.to(data.to).emit('call-ended', {
        from: userId,
      });
    });

    // 6. Disconnection
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${userName} (${userId})`);
      
      // Check if user has other active socket connections before marking offline
      const userSockets = await io.in(userId).fetchSockets();
      if (userSockets.length === 0) {
        try {
          const lastSeenDate = new Date();
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: lastSeenDate });
          
          // Broadcast user-offline event
          socket.broadcast.emit('user-offline', { userId, lastSeen: lastSeenDate });
        } catch (err) {
          console.error('Failed to update offline status for user:', userId, err);
        }
      }
    });
  });
};
