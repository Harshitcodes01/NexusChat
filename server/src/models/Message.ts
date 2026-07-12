import { Schema, model } from 'mongoose';
import { IMessage } from './types';

const attachmentSchema = new Schema(
  {
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
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

// Index to retrieve chat history quickly in chronological order
messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
export default Message;
