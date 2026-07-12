import { useState, useEffect, useRef } from 'react';
import { chatService, userService, type ChatUser } from '../services/chatService';
import api from '../services/api';
import Modal from './Modal';
import { useChat } from '../context/ChatContext';
import { Loader2, Search, Users, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const { fetchChats, setActiveChat } = useChat();
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search users on search query changes
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await userService.searchUsers(search);
        setUsers(res.data);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      if (isOpen) {
        fetchAvailableUsers();
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setGroupImage(res.data.url);
      toast.success('Group icon uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload group icon:', error);
      toast.error('Failed to upload group icon.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Group Name is required');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    setIsCreating(true);
    try {
      const res = await chatService.createChat(selectedUserIds, true, groupName);
      
      // If groupImage was set, let's update group image via updateChat
      if (groupImage) {
        await chatService.updateChat(res.data._id, { groupImage });
      }

      await fetchChats();
      // Select newly created chat
      setActiveChat(res.data);
      toast.success(`Group "${groupName}" created successfully!`);
      
      // Reset state
      setGroupName('');
      setGroupImage('');
      setSelectedUserIds([]);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group chat.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group Chat">
      <form onSubmit={handleCreate} className="space-y-5">
        {/* Group Icon & Name */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center cursor-pointer overflow-hidden group flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {groupImage ? (
              <img src={groupImage} alt="Group Icon" className="w-full h-full object-cover" />
            ) : isUploading ? (
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" />
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Nerd Headquarters"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Member Search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Select Participants ({selectedUserIds.length} selected)
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* User list */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl divide-y divide-zinc-900 max-h-48 overflow-y-auto">
          {isLoadingUsers ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">No users found</p>
          ) : (
            users.map((item) => (
              <label
                key={item._id}
                className="flex items-center justify-between p-3 hover:bg-zinc-900/50 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`}
                    alt={item.name}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{item.email}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(item._id)}
                  onChange={() => toggleUserSelection(item._id)}
                  className="rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-950 h-4.5 w-4.5"
                />
              </label>
            ))
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isCreating || isUploading || selectedUserIds.length === 0 || !groupName.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          Create Group
        </button>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
