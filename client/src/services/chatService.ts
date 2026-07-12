import api from './api';

export interface ChatUser {
  _id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  avatar: string;
  bio: string;
  status: string;
  lastSeen: string;
}

export interface Chat {
  _id: string;
  participants: ChatUser[];
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  admin: ChatUser[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name?: string;
}

export interface Message {
  _id: string;
  sender: ChatUser;
  chatId: string;
  text?: string;
  attachments: Attachment[];
  replyTo?: Message | null;
  readBy: string[];
  deliveredTo: string[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const chatService = {
  getChats: () => api.get<Chat[]>('/chats'),

  createChat: (participants: string[], isGroup?: boolean, groupName?: string) =>
    api.post<Chat>('/chats', { participants, isGroup, groupName }),

  updateChat: (chatId: string, data: { groupName?: string; groupImage?: string; participants?: string[] }) =>
    api.put<Chat>(`/chats/${chatId}`, data),

  deleteChat: (chatId: string) =>
    api.delete(`/chats/${chatId}`),

  getMessages: (chatId: string, page = 1, limit = 50) =>
    api.get<PaginatedMessages>(`/messages/${chatId}`, { params: { page, limit } }),

  sendMessage: (data: { chatId: string; text?: string; attachments?: Attachment[]; replyTo?: string }) =>
    api.post<Message>('/messages', data),

  editMessage: (messageId: string, text: string) =>
    api.put<Message>(`/messages/${messageId}`, { text }),

  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),
};

export const userService = {
  searchUsers: (search: string) =>
    api.get<ChatUser[]>('/users', { params: { search } }),

  updateProfile: (data: { name?: string; bio?: string; avatar?: string }) =>
    api.put('/users/profile', data),
};
