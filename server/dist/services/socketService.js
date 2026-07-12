"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const Message_1 = __importDefault(require("../models/Message"));
const initializeSocket = (io) => {
    // Authentication middleware for Socket.IO connection
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }
            // Handle Bearer token format if present
            const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const decoded = (0, jwt_1.verifyToken)(actualToken);
            const user = await User_1.default.findById(decoded.id).select('name email avatar status');
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }
            // Attach user info to socket
            socket.data.user = user;
            socket.data.userId = user._id.toString();
            next();
        }
        catch (err) {
            console.error('Socket auth error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const userId = socket.data.userId;
        const userName = socket.data.user.name;
        console.log(`[Socket] User connected: ${userName} (${userId})`);
        // 1. Join user-specific room for private events/notifications
        socket.join(userId);
        // Update status to online in Database
        try {
            await User_1.default.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
            socket.broadcast.emit('user-online', userId);
        }
        catch (err) {
            console.error('Failed to update online status for user:', userId, err);
        }
        // 2. Chat rooms
        socket.on('join-chat', (chatId) => {
            socket.join(chatId);
            console.log(`[Socket] Socket ${socket.id} joined chat room: ${chatId}`);
        });
        socket.on('leave-chat', (chatId) => {
            socket.leave(chatId);
            console.log(`[Socket] Socket ${socket.id} left chat room: ${chatId}`);
        });
        // 3. Typing states
        socket.on('typing', (data) => {
            socket.to(data.chatId).emit('typing', { chatId: data.chatId, userId, userName });
        });
        socket.on('stop-typing', (data) => {
            socket.to(data.chatId).emit('stop-typing', { chatId: data.chatId, userId });
        });
        // 4. Read receipts
        socket.on('message-read', async (data) => {
            try {
                const { chatId, messageId } = data;
                // Add user to readBy array in Database
                await Message_1.default.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }, { new: true });
                // Broadcast read receipt event to others in the chat
                socket.to(chatId).emit('message-read', { chatId, messageId, userId });
            }
            catch (err) {
                console.error('Failed to process message-read event:', err);
            }
        });
        // 5. Disconnection
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${userName} (${userId})`);
            // Check if user has other active socket connections before marking offline
            const userSockets = await io.in(userId).fetchSockets();
            if (userSockets.length === 0) {
                try {
                    const lastSeenDate = new Date();
                    await User_1.default.findByIdAndUpdate(userId, { status: 'offline', lastSeen: lastSeenDate });
                    // Broadcast user-offline event
                    socket.broadcast.emit('user-offline', { userId, lastSeen: lastSeenDate });
                }
                catch (err) {
                    console.error('Failed to update offline status for user:', userId, err);
                }
            }
        });
    });
};
exports.initializeSocket = initializeSocket;
