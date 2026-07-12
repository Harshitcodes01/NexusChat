import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chatService, userService, type ChatUser } from '../services/chatService';
import api from '../services/api';
import Modal from './Modal';
import { Loader2, Camera, UserMinus, UserPlus, LogOut, Trash2, Edit, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupInfoModal = ({ isOpen, onClose }: GroupInfoModalProps) => {
  const { user } = useAuth();
  const { activeChat, setActiveChat, fetchChats } = useChat();
  
  const [groupName, setGroupName] = useState(activeChat?.groupName || '');
  const [groupImage, setGroupImage] = useState(activeChat?.groupImage || '');
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState<ChatUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeChat) {
      setGroupName(activeChat.groupName || '');
      setGroupImage(activeChat.groupImage || '');
    }
  }, [activeChat]);

  // Search non-group users to add
  useEffect(() => {
    if (!showAddMembers) return;
    
    const searchAvailableUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await userService.searchUsers(searchQuery);
        // Filter out users who are already in the group
        const existingIds = activeChat?.participants.map(p => p._id) || [];
        const filtered = res.data.filter(u => !existingIds.includes(u._id));
        setSearchUsers(filtered);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchAvailableUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, showAddMembers, activeChat]);

  if (!activeChat) return null;

  const isAdmin = activeChat.admin.some((adminUser) => adminUser._id === user?.id);

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = res.data.url;
      setGroupImage(imageUrl);

      // Save immediately
      const updated = await chatService.updateChat(activeChat._id, { groupImage: imageUrl });
      setActiveChat(updated.data);
      await fetchChats();
      toast.success('Group icon updated successfully!');
    } catch (error) {
      console.error('Failed to upload group image:', error);
      toast.error('Failed to upload group image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!groupName.trim()) {
      toast.error('Group Name is required');
      return;
    }

    setIsSavingMeta(true);
    try {
      const updated = await chatService.updateChat(activeChat._id, { groupName });
      setActiveChat(updated.data);
      await fetchChats();
      setIsEditingMeta(false);
      toast.success('Group name updated successfully!');
    } catch (error) {
      console.error('Failed to update group metadata:', error);
      toast.error('Failed to update group details.');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    setIsActionLoading(true);
    try {
      const currentParticipantIds = activeChat.participants.map(p => p._id);
      const updated = await chatService.updateChat(activeChat._id, {
        participants: [...currentParticipantIds, targetUserId]
      });
      setActiveChat(updated.data);
      await fetchChats();
      setSearchQuery('');
      setShowAddMembers(false);
      toast.success('Member added successfully!');
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      setIsActionLoading(true);
      try {
        const currentParticipantIds = activeChat.participants.map(p => p._id);
        const updated = await chatService.updateChat(activeChat._id, {
          participants: currentParticipantIds.filter(id => id !== targetUserId)
        });
        setActiveChat(updated.data);
        await fetchChats();
        toast.success('Member removed successfully!');
      } catch (error) {
        console.error('Failed to remove member:', error);
        toast.error('Failed to remove member.');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (confirm('Are you sure you want to leave this group?')) {
      setIsActionLoading(true);
      try {
        await chatService.deleteChat(activeChat._id);
        setActiveChat(null);
        await fetchChats();
        toast.success('You have left the group.');
        onClose();
      } catch (error) {
        console.error('Failed to leave group:', error);
        toast.error('Failed to leave group.');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleDissolveGroup = async () => {
    if (confirm('Are you sure you want to DISSOLVE and delete this group entirely? This action is permanent.')) {
      setIsActionLoading(true);
      try {
        await chatService.deleteChat(activeChat._id);
        setActiveChat(null);
        await fetchChats();
        toast.success('Group dissolved successfully.');
        onClose();
      } catch (error) {
        console.error('Failed to dissolve group:', error);
        toast.error('Failed to dissolve group.');
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Details">
      <div className="space-y-6">
        {/* Header Display */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative group w-20 h-20">
            <img
              src={groupImage || `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`}
              alt="Group"
              className="w-20 h-20 rounded-2xl object-cover border border-zinc-800"
            />
            {isAdmin && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleGroupImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="w-full flex items-center justify-center gap-2">
            {isEditingMeta ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSaveMeta}
                  disabled={isSavingMeta}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  {isSavingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white truncate max-w-xs">{groupName}</h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingMeta(true)}
                    className="p-1 hover:bg-zinc-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-neutral-500">Created: {new Date(activeChat.createdAt).toLocaleDateString()}</p>
        </div>

        <hr className="border-zinc-800/60" />

        {/* Member Operations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              Participants ({activeChat.participants.length})
            </h4>
            {isAdmin && !showAddMembers && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Members
              </button>
            )}
          </div>

          {/* Add Members UI */}
          {showAddMembers && (
            <div className="space-y-2.5 p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members to add..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button
                  onClick={() => {
                    setShowAddMembers(false);
                    setSearchQuery('');
                  }}
                  className="text-xs text-neutral-400 hover:text-white cursor-pointer px-2"
                >
                  Cancel
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-zinc-900">
                {isLoadingUsers ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  </div>
                ) : searchUsers.length === 0 ? (
                  <p className="py-4 text-center text-xs text-neutral-500">No new users found</p>
                ) : (
                  searchUsers.map((item) => (
                    <div key={item._id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`}
                          alt=""
                          className="w-6.5 h-6.5 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-white truncate max-w-[150px]">
                          {item.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddMember(item._id)}
                        disabled={isActionLoading}
                        className="p-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto divide-y divide-zinc-800/40">
            {activeChat.participants.map((member) => {
              const isMemberAdmin = activeChat.admin.some((a) => a._id === member._id);
              const isCurrentUser = member._id === user?.id;

              return (
                <div key={member._id} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                      />
                      {member.status === 'online' && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-900 rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate max-w-[180px]">
                          {member.name} {isCurrentUser && '(You)'}
                        </p>
                        {isMemberAdmin && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 rounded-md">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 truncate max-w-[180px]">
                        {member.bio || 'No bio yet'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser && !isMemberAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={isActionLoading}
                      className="p-1.5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg transition-colors cursor-pointer"
                      title="Remove participant"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <hr className="border-zinc-800/60" />

        {/* Danger Zone */}
        <div className="flex gap-3">
          {isAdmin ? (
            <button
              onClick={handleDissolveGroup}
              disabled={isActionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Dissolve Group
            </button>
          ) : (
            <button
              onClick={handleLeaveGroup}
              disabled={isActionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Leave Group
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default GroupInfoModal;
