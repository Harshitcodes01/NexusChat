import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { chatService, type Chat, type Message } from '../services/chatService';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  typingUsers: Record<string, { userId: string; userName: string }[]>;
  setActiveChat: (chat: Chat | null) => void;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  updateChatInList: (chat: Chat) => void;
  sendTypingStatus: (isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; userName: string }[]>>({});

  const fetchChats = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      const res = await chatService.getChats();
      setChats(res.data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await chatService.getMessages(chatId);
      setMessages(res.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((updated: Message) => {
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) =>
      m._id === messageId ? { ...m, isDeleted: true, text: '', attachments: [] } : m
    ));
  }, []);

  const updateChatInList = useCallback((updated: Chat) => {
    setChats((prev) => {
      const existing = prev.find((c) => c._id === updated._id);
      if (existing) {
        return prev.map((c) => (c._id === updated._id ? updated : c));
      }
      return [updated, ...prev];
    });
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!socket || !activeChat) return;
    if (isTyping) {
      socket.emit('typing', { chatId: activeChat._id });
    } else {
      socket.emit('stop-typing', { chatId: activeChat._id });
    }
  }, [socket, activeChat]);

  // Join/leave active chat rooms and update read status
  useEffect(() => {
    if (!socket || !activeChat) return;

    socket.emit('join-chat', activeChat._id);

    // Mark existing unread messages in the active chat as read
    messages.forEach((msg) => {
      if (
        user &&
        msg.sender._id !== user.id &&
        !msg.readBy.includes(user.id)
      ) {
        socket.emit('message-read', { chatId: activeChat._id, messageId: msg._id });
      }
    });

    return () => {
      socket.emit('leave-chat', activeChat._id);
    };
  }, [socket, activeChat, messages, user]);

  // Listen to incoming socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (message: Message) => {
      const isCurrentChat = activeChat && message.chatId === activeChat._id;

      if (isCurrentChat) {
        addMessage(message);
        if (user) {
          socket.emit('message-read', { chatId: message.chatId, messageId: message._id });
        }
      } else {
        // If message is not from active chat, show toast
        toast((t) => (
          <div
            onClick={() => {
              const chatObj = chats.find((c) => c._id === message.chatId);
              if (chatObj) {
                setActiveChat(chatObj);
              }
              toast.dismiss(t.id);
            }}
            className="flex items-start gap-3 cursor-pointer p-1"
          >
            <img
              src={message.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.sender.name}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-slate-700 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{message.sender.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {message.text || (message.attachments.length > 0 ? 'Shared a file' : '')}
              </p>
            </div>
          </div>
        ), {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: '16px',
            padding: '12px',
          },
        });
      }

      // Re-fetch chat list to update last message preview and sorting
      fetchChats();
    });

    socket.on('message-edited', (updated: Message) => {
      updateMessage(updated);
    });

    socket.on('message-deleted', (data: { messageId: string }) => {
      removeMessage(data.messageId);
    });

    socket.on('message-read', (data: { chatId: string; messageId: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, readBy: Array.from(new Set([...m.readBy, data.userId])) }
            : m
        )
      );
    });

    socket.on('typing', (data: { chatId: string; userId: string; userName: string }) => {
      setTypingUsers((prev) => {
        const list = prev[data.chatId] || [];
        if (list.some((u) => u.userId === data.userId)) return prev;
        return {
          ...prev,
          [data.chatId]: [...list, { userId: data.userId, userName: data.userName }],
        };
      });
    });

    socket.on('stop-typing', (data: { chatId: string; userId: string }) => {
      setTypingUsers((prev) => {
        const list = prev[data.chatId] || [];
        return {
          ...prev,
          [data.chatId]: list.filter((u) => u.userId !== data.userId),
        };
      });
    });

    socket.on('user-online', (onlineUserId: string) => {
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === onlineUserId ? { ...p, status: 'online' } : p
          ),
        }))
      );
    });

    socket.on('user-offline', (data: { userId: string; lastSeen: string }) => {
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === data.userId ? { ...p, status: 'offline', lastSeen: data.lastSeen } : p
          ),
        }))
      );
    });

    return () => {
      socket.off('receive-message');
      socket.off('message-edited');
      socket.off('message-deleted');
      socket.off('message-read');
      socket.off('typing');
      socket.off('stop-typing');
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, [socket, activeChat, chats, fetchChats, addMessage, updateMessage, removeMessage, user]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        isLoadingChats,
        isLoadingMessages,
        typingUsers,
        setActiveChat,
        fetchChats,
        fetchMessages,
        addMessage,
        updateMessage,
        removeMessage,
        updateChatInList,
        sendTypingStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
