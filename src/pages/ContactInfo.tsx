import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { subscribeToRelationship, removeFriend, blockUser, unblockUser } from '../services/relationshipService';
import { applyCanonicalToUser } from '../services/relationshipResolver';
import { subscribeToUserChats, muteChat, unmuteChat, isMutedForUser } from '../services/chatService';
import type { ChatMetadata } from '../types/chat';

const formatTime = (timestamp?: any) => {
  if (!timestamp) return '';
  let ms = timestamp;
  if (typeof timestamp.toMillis === 'function') {
    ms = timestamp.toMillis();
  } else if (typeof timestamp.seconds === 'number') {
    ms = timestamp.seconds * 1000;
  }
  const date = new Date(ms);
  // Example: 06:31 PM
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp?: any) => {
  if (!timestamp) return '';
  let ms = timestamp;
  if (typeof timestamp.toMillis === 'function') {
    ms = timestamp.toMillis();
  } else if (typeof timestamp.seconds === 'number') {
    ms = timestamp.seconds * 1000;
  }
  const date = new Date(ms);
  return date.toLocaleDateString();
};

export const ContactInfo: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();
  
  const targetUser = location.state?.targetUser;

  const [peerStateLabel, setPeerStateLabel] = useState<string | null>(null);
  const [sharedGroups, setSharedGroups] = useState<ChatMetadata[]>([]);
  const [directChat, setDirectChat] = useState<ChatMetadata | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Bottom Sheet & Modals
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; prompt: string; action: () => Promise<void> } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect if no user provided
  useEffect(() => {
    if (!targetUser) {
      navigate('/chat');
    }
  }, [targetUser, navigate]);

  // Listen to Relationship
  useEffect(() => {
    if (!currentUser || !targetUser) return;
    const unsubscribe = subscribeToRelationship(currentUser.uid, targetUser.uid, (canonicalState, rawDoc) => {
      const dummyUser = { ...targetUser };
      applyCanonicalToUser(dummyUser, canonicalState, currentUser.uid, rawDoc?.initiatedBy || '');
      setPeerStateLabel(dummyUser.stateLabel || null);
    });
    return () => unsubscribe();
  }, [currentUser, targetUser]);

  // Load Shared Groups
  useEffect(() => {
    if (!currentUser || !targetUser) return;
    setLoadingGroups(true);
    setGroupsError(null);

    const unsubscribe = subscribeToUserChats(currentUser.uid, (chats) => {
      try {
        const shared = chats.filter(chat => chat.isGroup === true && chat.participants && chat.participants[targetUser.uid] === true);
        const direct = chats.find(chat => chat.isGroup === false && chat.participants && chat.participants[targetUser.uid] === true) || null;
        setSharedGroups(shared);
        setDirectChat(direct);
        setLoadingGroups(false);
      } catch (err: any) {
        setGroupsError(err.message);
        setLoadingGroups(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, targetUser]);

  if (!targetUser || !currentUser) {
    return null; // Will navigate away
  }

  // Derived UI State
  let chipColor = '';
  let chipText = '';
  let manageEnabled = false;

  if (peerStateLabel === 'FRIEND') {
    chipText = 'FRIEND';
    chipColor = 'bg-[#1a4031] text-[#22c55e]';
    manageEnabled = true;
  } else if (peerStateLabel === 'REQUEST SENT' || peerStateLabel === 'REQUEST RECEIVED') {
    chipText = 'REQUEST PENDING';
    chipColor = 'bg-[#3b2d1d] text-[#f59e0b]';
    manageEnabled = false;
  } else if (peerStateLabel === 'BLOCKED') {
    chipText = 'BLOCKED';
    chipColor = 'bg-[#401a1a] text-[#ef4444]';
    manageEnabled = true; // Allowed to unblock
  } else if (peerStateLabel === 'BLOCKED YOU') {
    chipText = 'BLOCKED';
    chipColor = 'bg-[#401a1a] text-[#ef4444]';
    manageEnabled = false;
  } else {
    // NOT FRIENDS
    chipText = '';
    manageEnabled = false;
  }

  // Mutations
  const executeMutation = async () => {
    if (!confirmConfig) return;
    setActionLoading(true);
    try {
      await confirmConfig.action();
      setConfirmConfig(null);
      setShowManageSheet(false);
    } catch (err) {
      console.error('Mutation error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = () => {
    setConfirmConfig({
      title: 'Confirm',
      prompt: 'Remove friend?',
      action: async () => {
        await removeFriend(currentUser.uid, targetUser.uid);
      }
    });
  };

  const handleBlockUser = () => {
    setConfirmConfig({
      title: 'Confirm',
      prompt: 'Block this user?',
      action: async () => {
        await blockUser(currentUser.uid, targetUser.uid);
      }
    });
  };

  const handleUnblockUser = () => {
    setConfirmConfig({
      title: 'Confirm',
      prompt: 'Unblock user?',
      action: async () => {
        await unblockUser(currentUser.uid, targetUser.uid);
      }
    });
  };

  const isMuted = directChat ? isMutedForUser(directChat, currentUser?.uid || '') : false;

  const handleToggleMute = async () => {
    if (!directChat || !currentUser) return;
    setActionLoading(true);
    try {
      if (isMuted) {
        await unmuteChat(directChat.chatId, currentUser.uid, false);
      } else {
        await muteChat(directChat.chatId, currentUser.uid, false);
      }
    } catch (err) {
      console.error('Failed to toggle mute', err);
    } finally {
      setActionLoading(false);
    }
  };

  const listPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#121212] border-r border-slate-800/50 shadow-inner">
       <div 
         onClick={() => navigate('/chat')}
         className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
       >
         <MessageSquare className="w-8 h-8 text-slate-500" />
       </div>
       <h3 className="text-[20px] font-light text-slate-300 tracking-wide mb-2">Return to Chats</h3>
       <p className="text-[13px] text-slate-500">Click to go back to your chat list.</p>
    </div>
  );

  const detailPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* App Bar */}
      <div className="flex items-center px-4 py-3 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-5 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={26} />
        </button>
        <h1 className="text-[20px] font-bold text-white leading-tight">Contact info</h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] p-5 custom-scrollbar">
        
        {/* Contact Information Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden mb-4 border-2 border-slate-700">
            {targetUser.profileImage ? (
              <img src={targetUser.profileImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-12 h-12 text-slate-400" />
            )}
          </div>
          <h2 className="text-[24px] font-bold text-white mb-1">
            {targetUser.displayName || targetUser.username}
          </h2>
          {targetUser.displayName && targetUser.username && (
             <span className="text-[16px] text-slate-300 mb-1">@{targetUser.username}</span>
          )}
          <span className="text-[15px] text-slate-400">{targetUser.email || 'Email unavailable'}</span>
          <span className="text-[15px] text-slate-400 mt-1">
             {targetUser.status === 'online' ? 'Online' : (targetUser.lastSeen ? `Last seen ${formatDate(targetUser.lastSeen)} at ${formatTime(targetUser.lastSeen)}` : 'Last seen unavailable')}
          </span>
        </div>

        {/* Relationship Badge */}
        {chipText && (
          <div className="flex justify-center mb-6">
            <span className={`inline-block px-3 py-1 font-bold text-[12px] tracking-wide rounded-md ${chipColor}`}>
              {chipText}
            </span>
          </div>
        )}

        {/* Manage Friendship Button */}
        <button 
          onClick={() => setShowManageSheet(true)}
          disabled={!manageEnabled}
          className={`w-full font-bold text-[14px] py-3.5 rounded-lg transition-colors mb-8 shadow-sm tracking-wide ${
            manageEnabled 
              ? 'bg-[#22c55e] text-white hover:bg-[#16a34a]' 
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/30'
          }`}
        >
          MANAGE FRIENDSHIP
        </button>

        {/* Shared Groups Section */}
        <div className="flex flex-col gap-3">
          <h3 className="text-white font-bold text-[16px] mb-1">Shared groups ({sharedGroups.length})</h3>
          
          {loadingGroups ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#22c55e]" />
            </div>
          ) : groupsError ? (
            <div className="text-sm text-red-400 py-4 text-center">{groupsError}</div>
          ) : sharedGroups.length === 0 ? (
            <div className="text-slate-500 text-center py-6 text-[14px]">No shared groups with this contact yet</div>
          ) : (
            sharedGroups.map(group => (
              <div 
                key={group.chatId}
                onClick={() => navigate('/group-settings', { state: { activeChat: group } })}
                className="w-full bg-[#1a222c] rounded-2xl p-4 flex flex-col border border-slate-700/50 shadow-sm cursor-pointer hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-white font-bold text-[16px] mb-1">{group.chatName || 'Unnamed Group'}</span>
                <span className="text-slate-400 text-[14px]">
                  {group.lastMessage || 'No messages'} • {group.lastMessageTimestamp ? formatTime(group.lastMessageTimestamp) : 'New'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manage Friendship Bottom Sheet */}
      {showManageSheet && manageEnabled && (
        <>
          <div className="absolute inset-0 bg-black/60 z-20" onClick={() => setShowManageSheet(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-[#1e293b] rounded-t-2xl z-30 flex flex-col p-2 animate-slide-up shadow-2xl border-t border-slate-700">
            <div className="flex justify-center py-2 mb-2">
              <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
            </div>
            
            {peerStateLabel === 'FRIEND' && (
              <>
                <button onClick={handleRemoveFriend} className="w-full text-left px-5 py-4 text-white text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
                  Remove Friend
                </button>
                <button onClick={handleBlockUser} className="w-full text-left px-5 py-4 text-red-400 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
                  Block User
                </button>
                <button onClick={() => {}} className="w-full text-left px-5 py-4 text-slate-300 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
                  Report User (Placeholder)
                </button>
                <button onClick={handleToggleMute} disabled={actionLoading || !directChat} className="w-full text-left px-5 py-4 text-slate-300 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
                  {isMuted ? 'Unmute User' : 'Mute User'}
                </button>
              </>
            )}

            {peerStateLabel === 'BLOCKED' && (
              <>
                <button onClick={handleUnblockUser} className="w-full text-left px-5 py-4 text-[#22c55e] text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
                  Unblock User
                </button>
                <button onClick={() => {}} className="w-full text-left px-5 py-4 text-slate-300 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
                  Report User (Placeholder)
                </button>
                <button onClick={handleToggleMute} disabled={actionLoading || !directChat} className="w-full text-left px-5 py-4 text-slate-300 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
                  {isMuted ? 'Unmute User' : 'Mute User'}
                </button>
              </>
            )}
            <div className="h-4"></div>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmConfig && (
        <div className="absolute inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-700 animate-fade-in">
            <h3 className="text-white text-xl font-bold mb-2">{confirmConfig.title}</h3>
            <p className="text-slate-300 mb-8">{confirmConfig.prompt}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmConfig(null)}
                disabled={actionLoading}
                className="px-5 py-2.5 text-slate-300 font-medium hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeMutation}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-[#22c55e] text-white font-medium hover:bg-[#16a34a] rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="chats"
      mobileView="detail"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
