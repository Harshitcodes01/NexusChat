"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChat = exports.updateChat = exports.getChats = exports.createChat = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const mongoose_1 = require("mongoose");
// @desc    Create or fetch direct chat, or create a group chat
// @route   POST /api/chats
// @access  Private
const createChat = async (req, res) => {
    try {
        const { participants, isGroup, groupName, groupImage } = req.body;
        const currentUserId = req.user?._id;
        if (!currentUserId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            res.status(400).json({ message: 'Participants are required and must be an array' });
            return;
        }
        // Direct (1-to-1) Chat
        if (!isGroup) {
            const recipientId = participants[0];
            // Prevent creating a chat with yourself
            if (recipientId === currentUserId.toString()) {
                res.status(400).json({ message: 'You cannot create a chat with yourself' });
                return;
            }
            // Check if direct chat already exists
            const existingChat = await Chat_1.default.findOne({
                isGroup: false,
                participants: { $all: [currentUserId, new mongoose_1.Types.ObjectId(recipientId)] },
            }).populate('participants', 'name email avatar bio status lastSeen');
            if (existingChat) {
                res.status(200).json(existingChat);
                return;
            }
            // Create new direct chat
            const newChat = await Chat_1.default.create({
                participants: [currentUserId, new mongoose_1.Types.ObjectId(recipientId)],
                isGroup: false,
            });
            const populatedChat = await Chat_1.default.findById(newChat._id).populate('participants', 'name email avatar bio status lastSeen');
            res.status(201).json(populatedChat);
            return;
        }
        // Group Chat
        if (!groupName) {
            res.status(400).json({ message: 'Group name is required for group chats' });
            return;
        }
        // Include the creator in group participants and set as admin
        const uniqueParticipants = Array.from(new Set([...participants.map((id) => id.toString()), currentUserId.toString()])).map((id) => new mongoose_1.Types.ObjectId(id));
        const newGroup = await Chat_1.default.create({
            participants: uniqueParticipants,
            isGroup: true,
            groupName,
            groupImage: groupImage || '',
            admin: [currentUserId],
        });
        const populatedGroup = await Chat_1.default.findById(newGroup._id)
            .populate('participants', 'name email avatar bio status lastSeen')
            .populate('admin', 'name email avatar bio status lastSeen');
        res.status(201).json(populatedGroup);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create chat', error: error instanceof Error ? error.message : error });
    }
};
exports.createChat = createChat;
// @desc    Get all chats for authenticated user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
    try {
        const currentUserId = req.user?._id;
        if (!currentUserId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        // Find all chats where current user is a participant
        const chats = await Chat_1.default.find({
            participants: { $in: [currentUserId] },
        })
            .populate('participants', 'name email avatar bio status lastSeen')
            .populate('admin', 'name email avatar bio status lastSeen')
            .sort({ updatedAt: -1 });
        res.status(200).json(chats);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve chats', error: error instanceof Error ? error.message : error });
    }
};
exports.getChats = getChats;
// @desc    Update group metadata or participants
// @route   PUT /api/chats/:id
// @access  Private (Admins only for member modification/renaming)
const updateChat = async (req, res) => {
    try {
        const chatId = req.params.id;
        const { groupName, groupImage, participants } = req.body;
        const currentUserId = req.user?._id;
        if (!currentUserId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        if (!chat.isGroup) {
            res.status(400).json({ message: 'You can only update group chats' });
            return;
        }
        // Verify if current user is an admin of the group
        const isAdmin = chat.admin.some((adminId) => adminId.toString() === currentUserId.toString());
        if (!isAdmin) {
            res.status(403).json({ message: 'Only group admins can update group details' });
            return;
        }
        const updates = {};
        if (groupName)
            updates.groupName = groupName;
        if (groupImage !== undefined)
            updates.groupImage = groupImage;
        if (participants && Array.isArray(participants)) {
            // Force admin to always be a participant
            const uniqueParticipants = Array.from(new Set([...participants.map((id) => id.toString()), currentUserId.toString()])).map((id) => new mongoose_1.Types.ObjectId(id));
            updates.participants = uniqueParticipants;
        }
        const updatedChat = await Chat_1.default.findByIdAndUpdate(chatId, { $set: updates }, { new: true })
            .populate('participants', 'name email avatar bio status lastSeen')
            .populate('admin', 'name email avatar bio status lastSeen');
        res.status(200).json(updatedChat);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update group details', error: error instanceof Error ? error.message : error });
    }
};
exports.updateChat = updateChat;
// @desc    Delete group chat or leave a group
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChat = async (req, res) => {
    try {
        const chatId = req.params.id;
        const currentUserId = req.user?._id;
        if (!currentUserId) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        const chat = await Chat_1.default.findById(chatId);
        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }
        // If it's a direct 1-to-1 chat, delete it entirely (or clear participants)
        if (!chat.isGroup) {
            await Chat_1.default.findByIdAndDelete(chatId);
            res.status(200).json({ message: 'Chat deleted successfully' });
            return;
        }
        // If it's a group chat, verify if admin is deleting it, or user is just leaving
        const isAdmin = chat.admin.some((adminId) => adminId.toString() === currentUserId.toString());
        if (isAdmin) {
            // Admins delete the entire group
            await Chat_1.default.findByIdAndDelete(chatId);
            res.status(200).json({ message: 'Group chat dissolved and deleted successfully' });
        }
        else {
            // Non-admins just leave the group
            chat.participants = chat.participants.filter((partId) => partId.toString() !== currentUserId.toString());
            await chat.save();
            res.status(200).json({ message: 'You have left the group chat' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete chat', error: error instanceof Error ? error.message : error });
    }
};
exports.deleteChat = deleteChat;
