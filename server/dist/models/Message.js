"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const attachmentSchema = new mongoose_1.Schema({
    url: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document'],
        required: true,
    },
    name: {
        type: String,
    },
}, { _id: false });
const messageSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true,
    },
    text: {
        type: String,
        trim: true,
    },
    attachments: [attachmentSchema],
    replyTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    readBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    deliveredTo: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    isEdited: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Index to retrieve chat history quickly in chronological order
messageSchema.index({ chatId: 1, createdAt: 1 });
exports.Message = (0, mongoose_1.model)('Message', messageSchema);
exports.default = exports.Message;
