import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';

import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User as UserIcon, Loader2, AlertCircle, MessageSquare, Users, Search, Mail, ArrowLeft, X, VolumeX, MoreVertical } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { subscribeToUserChats, archiveChat, unarchiveChat, isArchivedForUser, isMutedForUser, ensureDirectChat } from '../services/chatService';
import type { ChatMetadata } from '../types/chat';
import type { UserProfile } from '../types/user';
import type { Message } from '../types/message';
import { forwardMessage, unpinMessage } from '../services/messageService';
import { resolveOtherParticipant } from '../services/participantResolver';
import { ConversationEngine } from '../components/chat/ConversationEngine';
import { 
  subscribeToRelationship, 
  getRelationshipState, 
  getFriends
} from '../services/relationshipService';
import { applyCanonicalToUser } from '../services/relationshipResolver';
import { DesktopLayout } from '../components/layout/DesktopLayout';

const formatTime = (timestamp?: any) => {
  if (!timestamp) return '';
  let ms = timestamp;
  if (typeof timestamp.toMillis === 'function') {
    ms = timestamp.toMillis();
  } else if (typeof timestamp.seconds === 'number') {
    ms = timestamp.seconds * 1000;
  }
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const Chat: React.FC = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  

  
  
  

  // Chats State
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);

  const [activeChat, setActiveChat] = useState<ChatMetadata | null>(null);

  // Relationship State
  const [activePeerStateLabel, setActivePeerStateLabel] = useState<string | null>(null);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  // Context Menu State
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number, y: number, chat: ChatMetadata } | null>(null);

  // Forwarding State
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Pinned State
  const [pinnedMessageId, setPinnedMessageId] = useState<string>('');
  const [pinnedMessageText, setPinnedMessageText] = useState<string>('');

  // Friend Picker State
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);


  // Listen to User Chats
  useEffect(() => {
    if (!currentUser) return;
    setLoadingChats(true);
    setChatsError(null);

    const unsubscribe = subscribeToUserChats(currentUser.uid, async (userChats) => {
      try {
        const chatsWithParticipants = await Promise.all(
          userChats
            .filter(chat => chat.isGroup === false) // FILTER BOUNDARY
            .map(async (chat) => {
            if (!chat.isGroup) {
              const participant = await resolveOtherParticipant(chat, currentUser.uid);
              if (participant) {
                return { ...chat, resolvedParticipant: participant };
              }
            }
            return chat;
          })
        );
        setChats(chatsWithParticipants);
        setLoadingChats(false);
      } catch (err: any) {
        setChatsError(err.message);
        setLoadingChats(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle Navigation State
  useEffect(() => {
    if (location.state?.openChatId && chats.length > 0) {
      const chatToOpen = chats.find(c => c.chatId === location.state.openChatId);
      if (chatToOpen && (!activeChat || activeChat.chatId !== chatToOpen.chatId)) {
        setActiveChat(chatToOpen);
      }
    }
  }, [location.state, chats, activeChat]);

  // Background Delivery Listener Manager
  const deliveryListenersRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!currentUser) return;

    const activeChatIds = new Set<string>();
    chats.forEach(chat => {
      if (chat.chatId) activeChatIds.add(chat.chatId);
    });

    const currentListeners = deliveryListenersRef.current;

    // Remove unused listeners
    Object.keys(currentListeners).forEach(chatId => {
      if (!activeChatIds.has(chatId)) {
        currentListeners[chatId]();
        delete currentListeners[chatId];
      }
    });

    // Attach new listeners
    activeChatIds.forEach(chatId => {
      if (!currentListeners[chatId]) {
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshots) => {
          if (snapshots.empty) return;

          const batch = writeBatch(db);
          let hasUpdates = false;

          snapshots.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const senderId = data.senderId;
              const status = data.status;
              
              const isIncoming = senderId && senderId !== currentUser.uid;
              if (isIncoming && status === 'sent') {
                batch.update(change.doc.ref, { status: 'delivered' });
                hasUpdates = true;
              }
            }
          });

          if (hasUpdates) {
            batch.commit().catch(err => console.error('Delivered update failed:', err));
          }
        });

        currentListeners[chatId] = unsubscribe;
      }
    });

    // Cleanup all listeners on unmount
    return () => {
      Object.values(currentListeners).forEach(unsub => unsub());
      deliveryListenersRef.current = {};
    };
  }, [chats, currentUser]);

  // Listen to Relationship State for Active Chat
  useEffect(() => {
    if (!currentUser || !activeChat || activeChat.isGroup || !activeChat.resolvedParticipant) {
      setActivePeerStateLabel(null);
      return;
    }

    const peerUid = activeChat.resolvedParticipant.uid;
    const unsubscribe = subscribeToRelationship(currentUser.uid, peerUid, (canonicalState, rawDoc) => {
      // Create a dummy user object to apply states
      const dummyUser = { ...activeChat.resolvedParticipant! };
      applyCanonicalToUser(dummyUser, canonicalState, currentUser.uid, rawDoc?.initiatedBy || '');
      setActivePeerStateLabel(dummyUser.stateLabel || null);
    });

    return () => unsubscribe();
  }, [currentUser, activeChat?.chatId]);

  // Listen to Pinned Message for Active Chat
  useEffect(() => {
    if (!activeChat) {
      setPinnedMessageId('');
      setPinnedMessageText('');
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, 'chats', activeChat.chatId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPinnedMessageId(data.pinnedMessageId || '');
        setPinnedMessageText(data.pinnedMessageText || '');
      }
    });

    return () => unsubscribe();
  }, [activeChat?.chatId]);

  const handleForwardMessage = async (targetChat: ChatMetadata) => {
    if (!currentUser || !forwardingMessage) return;
    
    if (!targetChat.isGroup) {
      let peerUid = '';
      if (targetChat.participants) {
        peerUid = Object.keys(targetChat.participants).find(uid => uid !== currentUser.uid) || '';
      }
      if (!peerUid) {
        alert("Invalid target chat");
        return;
      }
      
      const state = await getRelationshipState(currentUser.uid, peerUid);
      if (state !== 'FRIEND') {
        alert("Cannot Forward Restricted Friend Chat");
        return;
      }
    }
    
    try {
      await forwardMessage(forwardingMessage, targetChat.chatId, currentUser.uid, targetChat.isGroup || false);
      setForwardingMessage(null);
      setForwardSearchQuery('');
      alert("Forwarded");
    } catch (err) {
      console.error("Forward failed", err);
      alert("Forward failed");
    }
  };

  const handleChatClick = (chat: ChatMetadata) => {
    setActiveChat(chat);
  };

  const handleHeaderClick = () => {
    if (activeChat?.isGroup) {
      navigate('/group-settings', { state: { activeChat } });
    } else if (activeChat?.resolvedParticipant) {
      navigate('/contact-info', { state: { targetUser: activeChat.resolvedParticipant } });
    }
  };

  const handleOpenFriendPicker = async () => {
    if (!currentUser) return;
    setIsFriendPickerOpen(true);
    setLoadingFriends(true);
    try {
      const friends = await getFriends(currentUser.uid);
      setFriendsList(friends);
    } catch (err) {
      console.error('Failed to load friends', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSelectFriend = async (friend: UserProfile) => {
    if (!currentUser) return;
    setIsFriendPickerOpen(false);
    try {
      const chatId = await ensureDirectChat(currentUser.uid, friend.uid);
      const existingChat = chats.find(c => c.chatId === chatId);
      if (existingChat) {
        setActiveChat(existingChat);
      } else {
        setActiveChat({
          chatId,
          isGroup: false,
          participants: {
            [currentUser.uid]: true,
            [friend.uid]: true
          },
          resolvedParticipant: friend
        });
      }
    } catch (err) {
      console.error('Failed to create/open chat', err);
    }
  };


  // --- Phase 6C: Restriction Logic ---
  const isRestricted = !activeChat?.isGroup && activePeerStateLabel && activePeerStateLabel !== 'FRIEND';
  let restrictionTitle = '';
  let restrictionSubtitle = '';

  if (isRestricted) {
    if (activePeerStateLabel === 'BLOCKED YOU') {
      restrictionTitle = 'You were blocked by this user';
      restrictionSubtitle = 'Messaging is disabled in this chat.';
    } else if (activePeerStateLabel === 'BLOCKED') {
      restrictionTitle = 'You blocked this user';
      restrictionSubtitle = 'You can read chat history but cannot send messages.';
    } else if (activePeerStateLabel === 'NOT FRIENDS') {
      restrictionTitle = 'You are no longer friends';
      restrictionSubtitle = 'Send friend request again to continue chatting.';
    } else if (activePeerStateLabel === 'REQUEST SENT') {
      restrictionTitle = 'Friend request pending';
      restrictionSubtitle = 'Waiting for the user to accept your request.';
    } else if (activePeerStateLabel === 'REQUEST RECEIVED') {
      restrictionTitle = 'Friend request received';
      restrictionSubtitle = 'Accept the friend request to start chatting.';
    } else {
      restrictionTitle = 'You are no longer friends';
      restrictionSubtitle = 'Send friend request again to continue chatting.';
    }
  }



  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#111b21]">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 bg-[#202c33] shrink-0 border-b border-slate-800/50 shadow-sm">
        <h1 className="text-[22px] font-bold text-[#e9edef] tracking-wide">VChat</h1>
      </div>

      {/* Search Bar */}
      <div className="px-3 lg:px-4 py-2 lg:py-3 bg-[#111b21] flex items-center gap-2 shrink-0 border-b border-slate-800/50">
        <div className="flex-1 bg-[#202c33] rounded-full px-4 py-2 flex items-center shadow-sm relative">
          <Search size={20} className="text-[#8696a0] mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search or start a new chat"
            className="bg-transparent border-none outline-none text-[#e9edef] text-[15px] placeholder-[#8696a0] w-full"
          />
        </div>
      </div>

      {/* Chat List Content */}
      <div className="flex-1 overflow-y-auto bg-[#111b21] custom-scrollbar pb-24 lg:pb-0">
        {loadingChats ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#22c55e]" />
          </div>
        ) : chatsError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4 opacity-50" />
            <p className="text-sm text-slate-400">{chatsError}</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="h-full bg-[#111b21]"></div>
        ) : (
          <div className="flex flex-col py-1">
            {chats.map((chat) => {
              const isSelected = activeChat?.chatId === chat.chatId;
              return (
              <div 
                key={chat.chatId} 
                onClick={() => handleChatClick(chat)}
                className={`px-3 py-3 mx-2 my-0.5 rounded-xl transition-all flex items-center gap-3.5 cursor-pointer relative group ${
                  isSelected 
                    ? 'bg-[#2a3942]' 
                    : 'hover:bg-[#202c33]'
                }`}
              >
                {/* Avatar */}
                <div className="w-[52px] h-[52px] rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {chat.isGroup ? (
                    <Users className="w-6 h-6 text-slate-400" />
                  ) : chat.resolvedParticipant?.profileImage ? (
                    <img src={chat.resolvedParticipant.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex flex-col flex-grow min-w-0 pr-1">
                  {/* Top Row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center min-w-0 mr-2">
                      <h3 className="text-[16px] font-bold text-[#e9edef] truncate">
                        {chat.chatName || (chat.isGroup ? 'Unnamed Group' : (chat.resolvedParticipant?.username || 'Direct Message'))}
                      </h3>
                      {!chat.isGroup && chat.resolvedParticipant?.isOnline && (
                        <div className="w-2 h-2 bg-[#22c55e] rounded-full shrink-0 ml-1.5" />
                      )}
                    </div>
                    <span className="text-[11px] text-[#8696a0] shrink-0 whitespace-nowrap">
                      {chat.lastMessageTimestamp ? formatTime(chat.lastMessageTimestamp) : 'New'}
                    </span>
                  </div>
                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      {isMutedForUser(chat, currentUser?.uid || '') && <VolumeX size={14} className="text-slate-500 shrink-0" />}
                      <p className={`text-[13px] text-[#8696a0] truncate ${isMutedForUser(chat, currentUser?.uid || '') ? 'opacity-80' : ''}`}>
                        {isArchivedForUser(chat, currentUser?.uid || '') && (!isSelected || !isPeerTyping) ? '[Archived] ' : ''}
                        {chat.lastMessage ? chat.lastMessage : 'No messages'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {chatContextMenu && (
        <div 
          className="fixed z-50 bg-[#233138] rounded shadow-lg py-2 min-w-[160px] text-[14px] text-[#d1d7db]"
          style={{ top: chatContextMenu.y, left: chatContextMenu.x }}
        >
          <div 
            className="px-4 py-2 hover:bg-[#182229] cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation();
              const chat = chatContextMenu.chat;
              const archived = isArchivedForUser(chat, currentUser!.uid);
              if (archived) {
                await unarchiveChat(chat.chatId, currentUser!.uid, false);
              } else {
                await archiveChat(chat.chatId, currentUser!.uid, false);
              }
              setChatContextMenu(null);
            }}
          >
            {isArchivedForUser(chatContextMenu.chat, currentUser?.uid || '') ? 'Unarchive' : 'Archive'}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={handleOpenFriendPicker}
        className="absolute bottom-[104px] right-6 w-14 h-14 bg-[#22c55e] rounded-full flex items-center justify-center shadow-lg hover:bg-[#16a34a] transition-colors z-20"
      >
        <Mail size={24} className="text-[#121212]" />
      </button>

      {/* Bottom Navigation & Footer (Mobile Only) */}
      <div className="shrink-0 bg-[#121212] flex flex-col z-10 border-t border-slate-800/50 lg:hidden">
        <div className="flex justify-center pt-2 pb-0.5">
          <span className="text-[11px] text-slate-500">from Vishvarajsinh</span>
        </div>
        <div className="flex items-center justify-around pb-3 pt-2">
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <MessageSquare size={26} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e] font-medium">Chats</span>
          </div>
          <div onClick={() => window.location.href = '/groups'} className="flex flex-col items-center gap-1 cursor-pointer">
            <Users size={26} className="text-[#22c55e]" />
          </div>
          <div onClick={() => window.location.href = '/search'} className="flex flex-col items-center gap-1 cursor-pointer">
            <Search size={26} className="text-[#22c55e]" />
          </div>
          <div onClick={() => window.location.href = '/profile'} className="flex flex-col items-center gap-1 cursor-pointer">
            <UserIcon size={26} className="text-[#22c55e]" />
          </div>
        </div>
      </div>
    </div>
  );

  const detailPanel = activeChat ? (
    <div className="flex flex-col h-full w-full bg-[#0b141a]">
      {/* Conversation Header */}
      <div className="px-4 lg:px-6 py-2.5 bg-[#202c33] flex items-center gap-4 z-10 shrink-0 shadow-sm border-b border-slate-800/50">
        <button 
          onClick={() => setActiveChat(null)}
          className="text-[#aebac1] hover:text-[#e9edef] transition-colors lg:hidden"
        >
          <ArrowLeft size={24} />
        </button>
        <div onClick={handleHeaderClick} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
          {activeChat.isGroup ? (
            <Users className="w-6 h-6 text-slate-400" />
          ) : activeChat.resolvedParticipant?.profileImage ? (
            <img src={activeChat.resolvedParticipant.profileImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-6 h-6 text-slate-400" />
          )}
        </div>
        <div onClick={handleHeaderClick} className="flex flex-col cursor-pointer flex-grow">
          <h2 className="text-[16px] font-medium text-[#e9edef] leading-tight">
            {activeChat.chatName || (activeChat.isGroup ? 'Unnamed Group' : (activeChat.resolvedParticipant?.username || 'Direct Message'))}
          </h2>
            <span className="text-[13px] text-[#8696a0] font-normal leading-snug mt-0.5">
              {!activeChat.isGroup ? (isPeerTyping ? <span className="text-[#22c55e] italic font-medium">Typing...</span> : 'Online') : `${Object.keys(activeChat.participants || {}).length} members`}
            </span>
        </div>

        {/* Right side icons */}
        <div className="ml-auto flex items-center gap-5 lg:gap-6 text-[#aebac1]">
          <Search size={20} className="cursor-pointer hover:text-[#e9edef]" />
          <MoreVertical size={20} className="cursor-pointer hover:text-[#e9edef]" />
        </div>
      </div>

      {/* Search in chat (Mobile Fallback) */}
      <div className="px-3 pb-3 pt-1 bg-[#202c33] shrink-0 border-b border-slate-800/50 shadow-sm lg:hidden">
        <div className="bg-[#2a3942] rounded-[1.3rem] px-4 py-2 flex items-center border border-slate-700/50">
          <input
            type="text"
            placeholder="Search in chat"
            className="bg-transparent border-none outline-none text-[#d1d7db] text-[15px] placeholder-[#8696a0] w-full"
          />
        </div>
      </div>

      {/* Message Engine */}
      <ConversationEngine 
        activeChat={activeChat} 
        currentUser={currentUser}
        onTypingChange={setIsPeerTyping}
        onForwardRequest={setForwardingMessage}
        pinnedMessageId={pinnedMessageId}
        pinnedMessageText={pinnedMessageText}
        onUnpin={() => unpinMessage(activeChat.chatId)}
        restrictionBanner={
          isRestricted ? (
            <div className="p-4 border-t border-[#202c33] bg-[#111b21] flex flex-col items-center justify-center text-center shrink-0">
              <h3 className="text-[#e9edef] font-medium text-sm">{restrictionTitle}</h3>
              <p className="text-[#8696a0] text-xs mt-1">{restrictionSubtitle}</p>
            </div>
          ) : undefined
        }
        highlightMessageId={location.state?.scrollToMessageId}
      />
    </div>
  ) : (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#222e35] border-l border-[#313d45]">
       <div className="w-[320px] max-w-full flex flex-col items-center text-center px-4">
         <MessageSquare className="w-[120px] h-[120px] text-[#41525d] mb-8" strokeWidth={1} />
         <h3 className="text-[32px] font-light text-[#e9edef] tracking-wide mb-4 leading-tight">VChat for Desktop</h3>
         <p className="text-[14px] text-[#8696a0] leading-relaxed">
           Send and receive messages without keeping your phone online.<br/>
           Enjoy seamless messaging on your computer.
         </p>
       </div>
    </div>
  );

  return (
    <>
      <DesktopLayout
        activeTab="chats"
        mobileView={activeChat ? 'detail' : 'list'}
        listPanel={listPanel}
        detailPanel={detailPanel}
      />
      {forwardingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-slate-700/50">
              <h3 className="text-[#e9edef] font-medium text-[16px]">Forward to</h3>
              <button onClick={() => setForwardingMessage(null)} className="text-[#8696a0] hover:text-[#d1d7db]">
                <X size={20} />
              </button>
            </div>
            <div className="p-3 bg-[#202c33]">
              <div className="bg-[#2a3942] rounded-lg px-3 py-2 flex items-center border border-slate-700/50">
                <input
                  type="text"
                  placeholder="Search chat"
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#d1d7db] text-[15px] placeholder-[#8696a0] w-full"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[320px] bg-[#111b21] custom-scrollbar">
              {chats.filter(c => {
                 if (c.chatId === activeChat?.chatId) return false;
                 if (!c.participants || !c.participants[currentUser?.uid || '']) return false;
                 const searchStr = forwardSearchQuery.toLowerCase();
                 if (!searchStr) return true;
                 const title = c.chatName || (c.isGroup ? 'Unnamed Group' : (c.resolvedParticipant?.username || 'Direct Message'));
                 return title.toLowerCase().includes(searchStr);
              }).map(chat => (
                <div 
                  key={chat.chatId}
                  onClick={() => handleForwardMessage(chat)}
                  className="px-4 py-3 hover:bg-[#202c33] cursor-pointer flex items-center gap-3 border-b border-slate-800/50"
                >
                  <div className="flex-1">
                    <div className="text-[#e9edef] text-[15px] font-medium">
                      {chat.chatName || (chat.isGroup ? 'Unnamed Group' : (chat.resolvedParticipant?.username || 'Direct Message'))}
                    </div>
                  </div>
                </div>
              ))}
              {chats.filter(c => {
                 if (c.chatId === activeChat?.chatId) return false;
                 if (!c.participants || !c.participants[currentUser?.uid || '']) return false;
                 const searchStr = forwardSearchQuery.toLowerCase();
                 if (!searchStr) return true;
                 const title = c.chatName || (c.isGroup ? 'Unnamed Group' : (c.resolvedParticipant?.username || 'Direct Message'));
                 return title.toLowerCase().includes(searchStr);
              }).length === 0 && (
                <div className="p-4 text-center text-[#8696a0] text-[14px]">No chats found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isFriendPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-slate-700/50">
              <h3 className="text-[#e9edef] font-medium text-[16px]">New Chat</h3>
              <button onClick={() => setIsFriendPickerOpen(false)} className="text-[#8696a0] hover:text-[#d1d7db]">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[320px] bg-[#111b21] custom-scrollbar">
              {loadingFriends ? (
                <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#22c55e]" /></div>
              ) : friendsList.length === 0 ? (
                <div className="p-4 text-center text-[#8696a0] text-[14px]">No friends found</div>
              ) : (
                friendsList.map(friend => (
                  <div 
                    key={friend.uid}
                    onClick={() => handleSelectFriend(friend)}
                    className="px-4 py-3 hover:bg-[#202c33] cursor-pointer flex items-center gap-3 border-b border-slate-800/50"
                  >
                    <div className="w-[40px] h-[40px] rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {friend.profileImage ? (
                        <img src={friend.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-[#e9edef] text-[15px] font-medium">
                        {friend.username || friend.email || 'Unknown'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
