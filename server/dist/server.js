"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const socketService_1 = require("./services/socketService");
const errorHandler_1 = require("./middleware/errorHandler");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const io = new socket_io_1.Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
    },
});
exports.io = io;
(0, socketService_1.initializeSocket)(io);
// Global middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: FRONTEND_URL, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/', (_req, res) => {
    res.json({ message: 'NexusChat Server API is running' });
});
// API routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/chats', chatRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
// Static uploads folder serving
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Error handling
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// Connect to DB and start the server
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
