import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { useCall } from '../context/CallContext';
import { chatService, userService, type ChatUser, type Message } from '../services/chatService';
import api from '../services/api';
import ProfileModal from '../components/ProfileModal';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupInfoModal from '../components/GroupInfoModal';
import EmojiPicker from 'emoji-picker-react';
import {
  MessageCircle,
  Search,
  Plus,
  LogOut,
  Settings,
  Sun,
  Moon,
  Send,
  Paperclip,
  Smile,
  Info,
  CornerUpLeft,
  X,
  Edit,
  Trash2,
  FileText,
  Video,
  Phone,
  Camera,
  Music,
  Image as ImageIcon,
  Check,
  CheckCheck,
  ArrowLeft,
  Loader2,
  Download,
  Users,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const {
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
    sendTypingStatus,
  } = useChat();

  const { initiateCall, callState } = useCall();

  // Discord Rail Tab Selection ('direct' = DM, 'group' = Group Chats)
  const [sidebarTab, setSidebarTab] = useState<'direct' | 'group'>('direct');

  // Modal Open states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Search states
  const [search, setSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<ChatUser[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Discover People states
  const [discoverUsers, setDiscoverUsers] = useState<ChatUser[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);

  // Input states
  const [newMessageText, setNewMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // File attachments state
  const [attachment, setAttachment] = useState<{ url: string; type: 'image' | 'video' | 'audio' | 'document'; name: string } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Reply / Edit states
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat list on mount
  useEffect(() => {
    fetchChats();
    // Load discover users list
    const fetchDiscover = async () => {
      setIsLoadingDiscover(true);
      try {
        const res = await userService.searchUsers('');
        setDiscoverUsers(res.data);
      } catch (error) {
        console.error('Failed to load discover users:', error);
      } finally {
        setIsLoadingDiscover(false);
      }
    };
    fetchDiscover();
  }, [fetchChats]);

  // Load messages whenever active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
      setReplyToMessage(null);
      setEditingMessage(null);
      setNewMessageText('');
      setAttachment(null);
    }
  }, [activeChat, fetchMessages]);

  // Scroll messages stream to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Global search for user querying
  useEffect(() => {
    if (!search.trim()) {
      setGlobalSearchResults([]);
      return;
    }

    const searchGlobalUsers = async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await userService.searchUsers(search);
        setGlobalSearchResults(res.data);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchGlobalUsers();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Handle typing state broadcasts
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  // Upload message attachment
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAttachment(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAttachment(res.data);
      toast.success(`Attached "${file.name}"`);
    } catch (error) {
      console.error('Failed to upload file attachment:', error);
      toast.error('File upload failed.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Send or Edit message submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachment && !isUploadingAttachment) return;
    if (!activeChat) return;

    try {
      if (editingMessage) {
        // Edit mode
        const res = await chatService.editMessage(editingMessage._id, newMessageText);
        updateMessage(res.data);
        setEditingMessage(null);
        setNewMessageText('');
        toast.success('Message updated');
      } else {
        // Create mode
        const res = await chatService.sendMessage({
          chatId: activeChat._id,
          text: newMessageText,
          attachments: attachment ? [attachment] : [],
          replyTo: replyToMessage?._id,
        });
        
        addMessage(res.data);
        setNewMessageText('');
        setAttachment(null);
        setReplyToMessage(null);
        
        // Reset typing
        if (isTyping) {
          setIsTyping(false);
          sendTypingStatus(false);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to submit message:', error);
      toast.error('Failed to send message.');
    }
  };

  // Trigger Edit Mode on message
  const handleStartEdit = (msg: Message) => {
    setEditingMessage(msg);
    setNewMessageText(msg.text || '');
    setReplyToMessage(null);
  };

  // Trigger Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('Delete this message?')) {
      try {
        await chatService.deleteMessage(messageId);
        removeMessage(messageId);
        toast.success('Message deleted');
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast.error('Failed to delete message.');
      }
    }
  };

  // Start direct chat from global user list
  const handleStartDirectChat = async (targetUserId: string) => {
    try {
      const res = await chatService.createChat([targetUserId]);
      setActiveChat(res.data);
      setSearch('');
      fetchChats();
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to open chat.');
    }
  };

  // Helper variables
  const activeChatTyping = activeChat ? (typingUsers[activeChat._id] || []) : [];
  const activeRecipient = activeChat?.isGroup
    ? null
    : activeChat?.participants.find((p) => p._id !== user?.id);

  // Filter list of chats based on current category tab and search query
  const filteredChats = chats.filter((c) => {
    if (sidebarTab === 'direct' && c.isGroup) return false;
    if (sidebarTab === 'group' && !c.isGroup) return false;

    if (c.isGroup) {
      return c.groupName?.toLowerCase().includes(search.toLowerCase());
    }
    const otherParticipant = c.participants.find((p) => p._id !== user?.id);
    return otherParticipant?.name.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate suggested directory people (exclude users with existing DMs)
  const activeDmRecipientIds = chats
    .filter((c) => !c.isGroup)
    .map((c) => c.participants.find((p) => p._id !== user?.id)?._id)
    .filter(Boolean);

  const suggestedUsers = discoverUsers.filter((u) => !activeDmRecipientIds.includes(u._id));

  return (
    <div className="min-h-screen bg-[#07070a] transition-theme flex items-center justify-center p-0 md:p-4 text-neutral-100 relative overflow-hidden">
      
      {/* Mesh Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Orb Ambient Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full h-full md:max-w-6xl md:h-[90vh] glass-card md:rounded-[36px] shadow-2xl flex overflow-hidden relative z-10">
        
        {/* ================= COLUMN 1: LEFT RAIL (DISCORD SERVER RAIL) ================= */}
        {/* Hides on mobile when a chat is open to maximize messaging screen estate */}
        <div className={`w-16 md:w-20 bg-zinc-950 dark:bg-zinc-950 light:bg-zinc-100 border-r border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 flex flex-col items-center py-4 justify-between flex-shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Workspace navigation buttons */}
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Discord Logo / Brand Item */}
            <div className="relative group flex items-center justify-center w-12 h-12 rounded-3xl hover:rounded-2xl bg-zinc-900/60 dark:bg-zinc-900/60 light:bg-white text-emerald-400 border border-zinc-850 dark:border-zinc-850 light:border-zinc-200 transition-all duration-300 mb-2 cursor-pointer shadow-md">
              <MessageCircle className="w-6 h-6 animate-pulse" />
            </div>

            <hr className="w-8 border-zinc-850 dark:border-zinc-850 light:border-zinc-200 mb-2" />

            {/* Direct Messages Tab */}
            <div className="relative group w-full flex justify-center">
              {sidebarTab === 'direct' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
              )}
              <button
                onClick={() => setSidebarTab('direct')}
                className={`w-12 h-12 rounded-3xl hover:rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  sidebarTab === 'direct'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-zinc-900/40 dark:bg-zinc-900/40 light:bg-zinc-200/50 hover:bg-emerald-600 hover:text-white text-neutral-400'
                }`}
                title="Direct Messages"
              >
                <UserCheck className="w-5 h-5" />
              </button>
            </div>

            {/* Group Chats Tab */}
            <div className="relative group w-full flex justify-center">
              {sidebarTab === 'group' && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
              )}
              <button
                onClick={() => setSidebarTab('group')}
                className={`w-12 h-12 rounded-3xl hover:rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  sidebarTab === 'group'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-zinc-900/40 dark:bg-zinc-900/40 light:bg-zinc-200/50 hover:bg-emerald-600 hover:text-white text-neutral-400'
                }`}
                title="Group Chats"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action settings panel */}
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl hover:bg-zinc-900/60 dark:hover:bg-zinc-900/60 light:hover:bg-zinc-200/60 flex items-center justify-center text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 transition-all duration-200 cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Settings trigger */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-10 h-10 rounded-xl hover:bg-zinc-900/60 dark:hover:bg-zinc-900/60 light:hover:bg-zinc-200/60 flex items-center justify-center text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 transition-all duration-200 cursor-pointer"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Logout trigger */}
            <button
              onClick={logout}
              className="w-10 h-10 rounded-xl hover:bg-red-500/10 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-all duration-200 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <hr className="w-8 border-zinc-850 dark:border-zinc-850 light:border-zinc-200" />

            {/* User Profile avatar */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="relative cursor-pointer group w-10 h-10"
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border border-zinc-850 dark:border-zinc-850 light:border-zinc-200 group-hover:border-emerald-500 transition-all duration-200"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-900 rounded-full" />
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: MIDDLE PANEL (DISCORD CHANNEL LIST) ================= */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Workspace Tab Header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 bg-zinc-900/10 dark:bg-zinc-900/10 light:bg-zinc-50/50">
            <h2 className="text-base font-bold text-white dark:text-white light:text-zinc-800">
              {sidebarTab === 'direct' ? 'Direct Messages' : 'Group Chats'}
            </h2>
            {sidebarTab === 'group' && (
              <button
                onClick={() => setIsCreateGroupOpen(true)}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                title="Create Group"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="p-4 border-b border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats or find users..."
                className="w-full bg-zinc-950 dark:bg-zinc-950 light:bg-zinc-100 border border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-100 dark:text-neutral-100 light:text-neutral-800 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Chat List Category stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/40 dark:divide-zinc-850/40 light:divide-zinc-100">
            {isLoadingChats ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : search.trim() ? (
              /* Search results */
              <div className="space-y-4 p-2">
                {/* Active Chats match */}
                {filteredChats.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2">Active Chats</h4>
                    {filteredChats.map((c) => {
                      const chatName = c.isGroup
                        ? c.groupName
                        : c.participants.find((p) => p._id !== user?.id)?.name;
                      const image = c.isGroup
                        ? c.groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${c.groupName}`
                        : c.participants.find((p) => p._id !== user?.id)?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chatName}`;
                      const isOnline = !c.isGroup && c.participants.some((p) => p._id !== user?.id && p.status === 'online');

                      return (
                        <div
                          key={c._id}
                          onClick={() => {
                            setActiveChat(c);
                            setSearch('');
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/30 dark:hover:bg-zinc-800/30 light:hover:bg-zinc-50 cursor-pointer ${activeChat?._id === c._id ? 'bg-zinc-800/40 dark:bg-zinc-800/40 light:bg-zinc-100' : ''}`}
                        >
                          <div className="relative">
                            <img src={image} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                            {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-900 rounded-full" />}
                          </div>
                          <span className="text-sm font-medium text-white dark:text-white light:text-zinc-800">{chatName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Global search */}
                {sidebarTab === 'direct' && (
                  <div>
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2">Global Users</h4>
                    {isSearchingGlobal ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                      </div>
                    ) : globalSearchResults.length === 0 ? (
                      <p className="text-xs text-neutral-500 px-3">No other verified users found</p>
                    ) : (
                      globalSearchResults.map((u) => (
                        <div
                          key={u._id}
                          onClick={() => handleStartDirectChat(u._id)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/30 dark:hover:bg-zinc-800/30 light:hover:bg-zinc-50 cursor-pointer"
                        >
                          <div className="relative">
                            <img
                              src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                            />
                            {u.status === 'online' && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-900 rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white dark:text-white light:text-zinc-800 truncate">{u.name}</p>
                            <p className="text-xs text-neutral-500 truncate">
                              {u.email || u.phoneNumber}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Default active conversations lists & Suggested directory directory contacts */
              <div className="flex flex-col flex-1 divide-y divide-zinc-850/40 dark:divide-zinc-850/40 light:divide-zinc-100">
                {/* Active chats */}
                {filteredChats.map((c) => {
                  const otherUser = c.participants.find((p) => p._id !== user?.id);
                  const chatName = c.isGroup ? c.groupName : otherUser?.name;
                  const image = c.isGroup
                    ? c.groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${c.groupName}`
                    : otherUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chatName}`;
                  
                  const isOnline = !c.isGroup && otherUser?.status === 'online';
                  
                  const lastTyped = typingUsers[c._id] || [];
                  const typingPreview = lastTyped.length > 0;

                  return (
                    <div
                      key={c._id}
                      onClick={() => setActiveChat(c)}
                      className={`flex items-center gap-3 p-4 hover:bg-zinc-800/20 dark:hover:bg-zinc-800/20 light:hover:bg-zinc-50/50 cursor-pointer transition-colors ${activeChat?._id === c._id ? 'bg-zinc-800/30 dark:bg-zinc-800/30 light:bg-zinc-100' : ''}`}
                    >
                      <div className="relative flex-shrink-0">
                        <img src={image} alt="" className="w-12 h-12 rounded-2xl object-cover border border-zinc-800/60 dark:border-zinc-800/60 light:border-zinc-200" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-zinc-900 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-white dark:text-white light:text-zinc-800 truncate">{chatName}</h3>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          {typingPreview ? (
                            <p className="text-xs text-amber-500 italic font-medium truncate">
                              Typing...
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-400 truncate">
                              {c.isGroup ? 'Group Chat' : (otherUser?.bio || 'Active Chat')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Suggested global directory contacts (only in DM sidebar view when search query is empty) */}
                {sidebarTab === 'direct' && (
                  <div className="p-3 border-t border-zinc-850/40 dark:border-zinc-850/40 light:border-zinc-100">
                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-3 mt-2 flex items-center gap-1.5 select-none">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Discover People
                    </h4>
                    {isLoadingDiscover ? (
                      <div className="p-4 flex justify-center">
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                      </div>
                    ) : suggestedUsers.length === 0 ? (
                      <p className="text-xs text-neutral-500 px-3 italic py-2">All active users are in your DMs list</p>
                    ) : (
                      suggestedUsers.map((u) => (
                        <div
                          key={u._id}
                          onClick={() => handleStartDirectChat(u._id)}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800/20 dark:hover:bg-zinc-800/20 light:hover:bg-zinc-50 cursor-pointer transition-colors"
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                              alt=""
                              className="w-10 h-10 rounded-2xl object-cover border border-zinc-850/60 dark:border-zinc-850/60 light:border-zinc-200"
                            />
                            {u.status === 'online' && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-900 rounded-full" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white dark:text-white light:text-zinc-800 truncate">{u.name}</p>
                            <p className="text-xs text-neutral-500 truncate">{u.bio || 'Available to chat'}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: RIGHT PANEL (WHATSAPP SIMPLICITY TIMELINE) ================= */}
        <div className={`flex-1 flex flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 flex items-center justify-between bg-zinc-900/10 dark:bg-zinc-900/10 light:bg-zinc-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="p-1 md:hidden hover:bg-zinc-800 dark:hover:bg-zinc-800 light:hover:bg-zinc-100 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <img
                    src={
                      activeChat.isGroup
                        ? activeChat.groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${activeChat.groupName}`
                        : activeRecipient?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${activeRecipient?.name}`
                    }
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border border-zinc-850/60"
                  />

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white dark:text-white light:text-zinc-800 truncate">
                      {activeChat.isGroup ? activeChat.groupName : activeRecipient?.name}
                    </h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-400 light:text-neutral-500 truncate">
                      {activeChat.isGroup ? (
                        `${activeChat.participants.length} members`
                      ) : activeRecipient?.status === 'online' ? (
                        'Online'
                      ) : (
                        activeRecipient?.lastSeen ? `Last seen ${new Date(activeRecipient.lastSeen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : 'Offline'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!activeChat.isGroup && activeRecipient && (
                    <>
                      <button
                        onClick={() => initiateCall(activeRecipient._id, activeRecipient.name, activeRecipient.avatar || '', 'audio')}
                        disabled={callState !== 'idle'}
                        className="p-2 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/60 light:hover:bg-zinc-100 rounded-xl text-neutral-400 hover:text-emerald-400 disabled:opacity-40 transition-colors cursor-pointer"
                        title="Voice Call"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => initiateCall(activeRecipient._id, activeRecipient.name, activeRecipient.avatar || '', 'video')}
                        disabled={callState !== 'idle'}
                        className="p-2 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/60 light:hover:bg-zinc-100 rounded-xl text-neutral-400 hover:text-emerald-400 disabled:opacity-40 transition-colors cursor-pointer"
                        title="Video Call"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {activeChat.isGroup ? (
                    <button
                      onClick={() => setIsGroupInfoOpen(true)}
                      className="p-2 hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 light:hover:bg-zinc-100 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Group Info"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        toast('No other details available');
                      }}
                      className="p-2 hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 light:hover:bg-zinc-100 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Chat Info"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages timeline (WhatsApp simplicity style) */}
              <div 
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/40 relative"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)`,
                  backgroundSize: '20px 20px',
                }}
              >
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-sm">
                    <MessageCircle className="w-8 h-8 text-neutral-600 mb-2" />
                    Send a message to start chatting
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.sender._id === user?.id;
                    const nameLabel = !isSelf && activeChat.isGroup ? msg.sender.name : '';

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group/msg relative`}
                      >
                        {nameLabel && (
                          <span className="text-[10px] text-neutral-500 ml-3 mb-0.5">{nameLabel}</span>
                        )}

                        <div className={`flex items-end gap-2 max-w-[80%] ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Chat Avatar */}
                          {!isSelf && (
                            <img
                              src={msg.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender.name}`}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover border border-zinc-800/60 hidden sm:block flex-shrink-0"
                            />
                          )}

                          {/* Message bubble content */}
                          <div
                            className={`rounded-2xl px-4 py-3 relative border shadow-md transition-all duration-200 hover:shadow-lg ${
                              isSelf
                                ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-500/40 rounded-br-none'
                                : 'bg-zinc-900/60 backdrop-blur-md text-neutral-100 border-zinc-800/80 rounded-bl-none'
                            }`}
                          >
                            {/* Reply block header */}
                            {msg.replyTo && (
                              <div className={`text-xs border-l-2 p-1.5 rounded mb-2 flex flex-col ${isSelf ? 'border-white/50 bg-white/10' : 'border-teal-400 bg-zinc-900/40 dark:bg-zinc-900/40 light:bg-zinc-200/50'}`}>
                                <span className="font-semibold text-[10px]">
                                  {msg.replyTo.sender._id === user?.id ? 'You' : msg.replyTo.sender.name}
                                </span>
                                <span className="truncate max-w-[200px]">
                                  {msg.replyTo.text || 'File Attachment'}
                                </span>
                              </div>
                            )}

                            {/* Attachments rendering */}
                            {msg.attachments && msg.attachments.map((att, index) => {
                              if (att.type === 'image') {
                                return (
                                  <img
                                    key={index}
                                    src={att.url}
                                    alt={att.name || 'Image'}
                                    className="max-w-full rounded-lg mb-2 object-cover border border-zinc-700 max-h-60 cursor-pointer"
                                    onClick={() => window.open(att.url, '_blank')}
                                  />
                                );
                              } else if (att.type === 'video') {
                                return (
                                  <video
                                    key={index}
                                    src={att.url}
                                    controls
                                    className="max-w-full rounded-lg mb-2 border border-zinc-700 max-h-60"
                                  />
                                );
                              } else if (att.type === 'audio') {
                                return (
                                  <audio
                                    key={index}
                                    src={att.url}
                                    controls
                                    className="w-full max-w-[240px] mb-2"
                                  />
                                );
                              } else {
                                return (
                                  <a
                                    key={index}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-zinc-950/40 hover:bg-zinc-950/60 border border-zinc-800 rounded-xl mb-2 text-teal-400 hover:text-teal-300 transition-colors"
                                  >
                                    <FileText className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-[10px] font-medium truncate flex-1">{att.name || 'document'}</span>
                                    <Download className="w-3.5 h-3.5 flex-shrink-0" />
                                  </a>
                                );
                              }
                            })}

                            {/* Message text */}
                            {!msg.isDeleted ? (
                              <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                {msg.text}
                              </p>
                            ) : (
                              <p className="text-xs italic text-neutral-500">This message was deleted</p>
                            )}

                            {/* Bottom row: Edited + Time + Checkmarks */}
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] opacity-70">
                              {msg.isEdited && !msg.isDeleted && <span>edited</span>}
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              
                              {/* WhatsApp double checkmarks */}
                              {isSelf && !msg.isDeleted && (
                                activeChat.isGroup ? (
                                  msg.readBy.filter(id => id !== user?.id).length > 0 ? (
                                    <CheckCheck className="w-3 h-3 text-teal-400" />
                                  ) : (
                                    <Check className="w-3 h-3 text-neutral-400" />
                                  )
                                ) : (
                                  activeRecipient && msg.readBy.includes(activeRecipient._id) ? (
                                    <CheckCheck className="w-3 h-3 text-teal-400" />
                                  ) : (
                                    <Check className="w-3 h-3 text-neutral-400" />
                                  )
                                )
                              )}
                            </div>
                          </div>

                          {/* Hover Action menu */}
                          {!msg.isDeleted && (
                            <div className={`flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                              <button
                                onClick={() => setReplyToMessage(msg)}
                                className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-800 light:hover:bg-zinc-100 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                title="Reply"
                              >
                                <CornerUpLeft className="w-3.5 h-3.5" />
                              </button>
                              {isSelf && (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(msg)}
                                    className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-800 light:hover:bg-zinc-100 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    className="p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing bounce alerts */}
              {activeChatTyping.length > 0 && (
                <div className="flex items-center gap-1.5 px-6 py-1.5 text-xs text-amber-500 italic bg-zinc-900/10 dark:bg-zinc-900/10 light:bg-zinc-50/10">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="ml-1 font-medium">
                    {activeChatTyping.map((u) => u.userName).join(', ')} {activeChatTyping.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}

              {/* Reply Preview indicator */}
              {replyToMessage && (
                <div className="px-6 py-2 bg-emerald-600/10 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-teal-400">
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span className="truncate max-w-lg">
                      Replying to <strong>{replyToMessage.sender.name}</strong>: {replyToMessage.text || 'attachment'}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-emerald-600/20 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Edit Preview banner */}
              {editingMessage && (
                <div className="px-6 py-2 bg-emerald-600/10 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editing message...</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setNewMessageText('');
                    }}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-emerald-600/20 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Attachment Preview thumbnail */}
              {attachment && (
                <div className="px-6 py-2 bg-emerald-600/10 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-teal-400 min-w-0">
                    {attachment.type === 'image' && <ImageIcon className="w-4 h-4 flex-shrink-0" />}
                    {attachment.type === 'video' && <Video className="w-4 h-4 flex-shrink-0" />}
                    {attachment.type === 'audio' && <Music className="w-4 h-4 flex-shrink-0" />}
                    {attachment.type === 'document' && <FileText className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate font-semibold">{attachment.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="p-1 text-neutral-400 hover:text-white hover:bg-emerald-600/20 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* WhatsApp-style Input box */}
              <div className="p-4 border-t border-zinc-850/80 dark:border-zinc-850/80 light:border-zinc-200 relative bg-zinc-900/10 dark:bg-zinc-900/10 light:bg-zinc-50/50">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-18 left-4 z-40 shadow-2xl">
                    <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm -z-10 rounded-xl" />
                    <EmojiPicker
                      theme={theme === 'dark' ? 'dark' as any : 'light' as any}
                      onEmojiClick={(emojiData) => {
                        setNewMessageText((prev) => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/60 light:hover:bg-zinc-150 rounded-xl text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="p-2.5 hover:bg-zinc-800/60 dark:hover:bg-zinc-800/60 light:hover:bg-zinc-150 rounded-xl text-neutral-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    value={newMessageText}
                    onChange={handleInputChange}
                    placeholder={editingMessage ? 'Edit your message...' : 'Write a message...'}
                    className="flex-1 bg-zinc-950 dark:bg-zinc-950 light:bg-zinc-100 border border-zinc-850 dark:border-zinc-850 light:border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-neutral-100 dark:text-neutral-100 light:text-neutral-800 focus:outline-none focus:border-emerald-500 transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!newMessageText.trim() && !attachment && !isUploadingAttachment}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Selected default state screen (Home screen) */
            <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto bg-zinc-950/10 dark:bg-zinc-950/10 light:bg-zinc-50/10 justify-center">
              <div className="max-w-xl mx-auto w-full space-y-8">
                
                {/* Welcome Card & Profile Avatar display */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  
                  {/* Large Profile Picture with Hover Cam overlay */}
                  <div 
                    onClick={() => setIsProfileOpen(true)}
                    className="relative w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 border-zinc-800 hover:border-emerald-500 transition-all shadow-md group-hover:scale-105"
                    title="Upload Profile Picture"
                  >
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Welcome, {user?.name || 'User'}! 👋
                    </h3>
                    <p className="text-xs text-neutral-400 font-medium">
                      {user?.email || user?.phoneNumber || 'Verified Account'}
                    </p>
                    <p className="text-xs text-emerald-400 italic font-medium truncate max-w-xs mt-1">
                      "{user?.bio || 'Tap avatar to edit your bio status...'}"
                    </p>
                  </div>

                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Upload Avatar
                  </button>
                </div>

                {/* Metrics overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/25 border border-zinc-850/60 rounded-2xl p-4 text-center">
                    <span className="text-2xl font-black text-white">{chats.length}</span>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Active Workspaces</p>
                  </div>
                  <div className="bg-zinc-900/25 border border-zinc-850/60 rounded-2xl p-4 text-center">
                    <span className="text-2xl font-black text-emerald-400">{discoverUsers.length}</span>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Available Peers</p>
                  </div>
                </div>

                {/* Main dynamic instruction summary */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Quick Shortcuts</h4>
                  
                  <div className="grid gap-3">
                    <div 
                      onClick={() => {
                        const searchInput = document.querySelector('input[placeholder="Search chats or find users..."]') as HTMLInputElement;
                        if (searchInput) searchInput.focus();
                      }}
                      className="flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-850/50 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-neutral-200">Start a Conversation</p>
                        <p className="text-xs text-neutral-500">Query users in the sidebar search tab to initiate a direct message.</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="flex items-center gap-4 p-4 bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-850/50 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-neutral-200">Create Group Workspace</p>
                        <p className="text-xs text-neutral-500">Set up a multi-user group chat room for project teams or classes.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <GroupInfoModal isOpen={isGroupInfoOpen} onClose={() => setIsGroupInfoOpen(false)} />
    </div>
  );
};

export default DashboardPage;
