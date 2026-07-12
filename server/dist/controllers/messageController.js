"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.editMessage = exports.getMessages = exports.sendMessage = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const Chat_1 = __importDefault(require("../models/Chat"));
const server_1 = require("../server");
// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { chatId, text, attachments, replyTo } = req.body;
        const senderId = req.user?._id;
        if (!senderId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        if (!chatId) {
            res.status(400).json({ message: 'Chat ID is required' });
            return;
        }
        if (!text && (!attachments || attachments.length === 0)) {
            res.status(400).json({ message: 'Message text or attachment is required' });
            return;
        }
        // Verify user is a participant of this chat
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        const isParticipant = chat.participants.some((p) => p.toString() === senderId.toString());
        if (!isParticipant) {
            res.status(403).json({ message: 'You are not a participant of this chat' });
            return;
        }
        const messageData = {
            sender: senderId,
            chatId,
            readBy: [senderId],
            deliveredTo: [senderId],
        };
        if (text)
            messageData.text = text;
        if (attachments && attachments.length > 0)
            messageData.attachments = attachments;
        if (replyTo)
            messageData.replyTo = replyTo;
        const message = await Message_1.default.create(messageData);
        const populatedMessage = await Message_1.default.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate('replyTo')
            .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name email avatar' },
        });
        // Update the chat's updatedAt to reorder chat list
        await Chat_1.default.findByIdAndUpdate(chatId, { updatedAt: new Date() });
        // Real-time broadcast to the chat room
        server_1.io.to(chatId.toString()).emit('receive-message', populatedMessage);
        // Send notifications to all participants in their user-specific rooms
        if (chat) {
            chat.participants.forEach((participantId) => {
                if (participantId.toString() !== senderId.toString()) {
                    server_1.io.to(participantId.toString()).emit('notification', populatedMessage);
                }
            });
        }
        res.status(201).json(populatedMessage);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to send message', error: error instanceof Error ? error.message : error });
    }
};
exports.sendMessage = sendMessage;
// @desc    Get messages for a chat (paginated)
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const senderId = req.user?._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        if (!senderId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        // Verify participant
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        const isParticipant = chat.participants.some((p) => p.toString() === senderId.toString());
        if (!isParticipant) {
            res.status(403).json({ message: 'You are not a participant of this chat' });
            return;
        }
        const total = await Message_1.default.countDocuments({ chatId });
        const messages = await Message_1.default.find({ chatId })
            .populate('sender', 'name email avatar')
            .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name email avatar' },
        })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);
        res.status(200).json({
            messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch messages', error: error instanceof Error ? error.message : error });
    }
};
exports.getMessages = getMessages;
// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private (sender only)
const editMessage = async (req, res) => {
    try {
        const messageId = req.params.id;
        const { text } = req.body;
        const senderId = req.user?._id;
        if (!senderId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        if (!text) {
            res.status(400).json({ message: 'Updated message text is required' });
            return;
        }
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        if (message.sender.toString() !== senderId.toString()) {
            res.status(403).json({ message: 'You can only edit your own messages' });
            return;
        }
        if (message.isDeleted) {
            res.status(400).json({ message: 'Cannot edit a deleted message' });
            return;
        }
        message.text = text;
        message.isEdited = true;
        await message.save();
        const updatedMessage = await Message_1.default.findById(messageId)
            .populate('sender', 'name email avatar')
            .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name email avatar' },
        });
        if (updatedMessage) {
            server_1.io.to(updatedMessage.chatId.toString()).emit('message-edited', updatedMessage);
        }
        res.status(200).json(updatedMessage);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to edit message', error: error instanceof Error ? error.message : error });
    }
};
exports.editMessage = editMessage;
// @desc    Soft-delete a message
// @route   DELETE /api/messages/:id
// @access  Private (sender only)
const deleteMessage = async (req, res) => {
    try {
        const messageId = req.params.id;
        const senderId = req.user?._id;
        if (!senderId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        if (message.sender.toString() !== senderId.toString()) {
            res.status(403).json({ message: 'You can only delete your own messages' });
            return;
        }
        message.isDeleted = true;
        message.text = '';
        message.attachments = [];
        await message.save();
        server_1.io.to(message.chatId.toString()).emit('message-deleted', { messageId, chatId: message.chatId });
        res.status(200).json({ message: 'Message deleted successfully', id: messageId });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete message', error: error instanceof Error ? error.message : error });
    }
};
exports.deleteMessage = deleteMessage;
