import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  avatar: string;
  bio: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  otpCode?: string;
  otpExpires?: Date;
  comparePassword: (password: string) => Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChat extends Document {
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  admin: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name?: string;
}

export interface IMessage extends Document {
  sender: Types.ObjectId;
  chatId: Types.ObjectId;
  text?: string;
  attachments: IAttachment[];
  replyTo?: Types.ObjectId;
  readBy: Types.ObjectId[];
  deliveredTo: Types.ObjectId[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  message: string;
  type: 'message' | 'mention' | 'group_invite';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
