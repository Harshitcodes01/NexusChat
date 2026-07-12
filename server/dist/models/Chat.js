"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const mongoose_1 = require("mongoose");
const chatSchema = new mongoose_1.Schema({
    participants: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    ],
    isGroup: {
        type: Boolean,
        default: false,
    },
    groupName: {
        type: String,
        trim: true,
    },
    groupImage: {
        type: String,
        default: '',
    },
    admin: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
}, {
    timestamps: true,
});
exports.Chat = (0, mongoose_1.model)('Chat', chatSchema);
exports.default = exports.Chat;
