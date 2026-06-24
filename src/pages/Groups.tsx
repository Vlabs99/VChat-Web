import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Users, User as UserIcon, Plus, Loader2, AlertCircle, ArrowLeft, VolumeX, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { subscribeToUserChats, archiveChat, unarchiveChat, isArchivedForUser, isMutedForUser } from '../services/chatService';
import type { ChatMetadata } from '../types/chat';
import { ConversationEngine } from '../components/chat/ConversationEngine';

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

export const Groups: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatMetadata | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Context Menu State
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number, y: number, chat: ChatMetadata } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoadingChats(true);
    setChatsError(null);

    const unsubscribe = subscribeToUserChats(currentUser.uid, (userChats) => {
      try {
        const groups = userChats.filter(chat => chat.isGroup === true);
        setChats(groups);
        setLoadingChats(false);
      } catch (err: any) {
        setChatsError(err.message);
        setLoadingChats(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Click away listener for Context Menu
  useEffect(() => {
    const handleClick = () => {
      if (chatContextMenu) setChatContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [chatContextMenu]);

  const handleChatClick = (chat: ChatMetadata) => {
    setActiveChat(chat);
  };

  const handleHeaderClick = () => {
    if (activeChat) {
      window.location.href = '/group-settings';
    }
  };


  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <h1 className="text-xl font-bold text-white tracking-wide">VChat</h1>
      </div>

      {/* Group Search Bar & Add Button */}
      <div className="px-4 py-3 bg-[#121212] flex items-center gap-3 shrink-0">
        <div className="flex-1 bg-[#1e293b] rounded-full flex items-center px-4 h-12 border border-slate-700/50">
          <input
            type="text"
            placeholder="Search groups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-[15px] placeholder-slate-400 w-full"
          />
        </div>
        {/* Make the Add Group button slightly larger than search bar height */}
        <button 
          onClick={() => navigate('/create-group')}
          className="w-14 h-14 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0 hover:bg-[#16a34a] transition-colors shadow-md"
        >
          <Plus size={26} className="text-white" strokeWidth={3} />
        </button>
      </div>

      {/* Group List Content */}
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
            {chats.map((group) => {
              const isSelected = activeChat?.chatId === group.chatId;
              return (
              <div 
                key={group.chatId} 
                onClick={() => handleChatClick(group)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setChatContextMenu({ x: e.clientX, y: e.clientY, chat: group });
                }}
                className={`px-3 py-3 mx-2 my-0.5 rounded-xl transition-all flex items-center gap-3.5 cursor-pointer relative group ${
                  isSelected 
                    ? 'bg-[#2a3942]' 
                    : 'hover:bg-[#202c33]'
                }`}
              >
                {/* Avatar */}
                <div className="w-[48px] h-[48px] rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  <Users className="w-6 h-6 text-slate-400" />
                </div>
                
                {/* Content */}
                <div className="flex-grow min-w-0 pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[16px] font-medium text-[#e9edef] truncate">
                      {group.chatName || 'Unnamed Group'}
                    </h3>
                    <span className="text-[12px] text-[#8696a0]">
                      {group.lastMessageTimestamp ? formatTime(group.lastMessageTimestamp) : 'New'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[14px] text-[#8696a0] truncate max-w-[85%] ${isMutedForUser(group, currentUser?.uid || '') ? 'opacity-80' : ''}`}>
                      {isArchivedForUser(group, currentUser?.uid || '') && !isSelected ? '[Archived] ' : ''}
                      {group.lastMessage ? group.lastMessage : 'No messages'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {isMutedForUser(group, currentUser?.uid || '') && <VolumeX size={14} className="text-slate-500" />}
                      <span className="text-[#22c55e] text-[9px] font-bold tracking-wider uppercase opacity-80 mt-0.5">
                        GROUP
                      </span>
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
                await unarchiveChat(chat.chatId, currentUser!.uid, true);
              } else {
                await archiveChat(chat.chatId, currentUser!.uid, true);
              }
              setChatContextMenu(null);
            }}
          >
            {isArchivedForUser(chatContextMenu.chat, currentUser?.uid || '') ? 'Unarchive Group' : 'Archive Group'}
          </div>
        </div>
      )}

      {/* Bottom Navigation & Footer (Mobile Only) */}
      <div className="shrink-0 bg-[#121212] flex flex-col z-10 border-t border-slate-800/50 lg:hidden">
        <div className="flex justify-center pt-2 pb-0.5">
          <span className="text-[11px] text-slate-500">from Vishvarajsinh</span>
        </div>
        <div className="flex items-center justify-around pb-3 pt-2">
          <div onClick={() => navigate('/chat')} className="flex flex-col items-center gap-1 cursor-pointer">
            <MessageSquare size={26} className="text-[#22c55e]" />
            {/* No text label for inactive tab */}
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <Users size={26} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e] font-medium">Groups</span>
          </div>
          <div onClick={() => navigate('/search')} className="flex flex-col items-center gap-1 cursor-pointer">
            <Search size={26} className="text-[#22c55e]" />
            {/* No text label for inactive tab */}
          </div>
          <div onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 cursor-pointer">
            <UserIcon size={26} className="text-[#22c55e]" />
            {/* No text label for inactive tab */}
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
          <Users className="w-6 h-6 text-slate-400" />
        </div>
        <div onClick={handleHeaderClick} className="flex flex-col cursor-pointer flex-grow">
          <h2 className="text-[16px] font-medium text-[#e9edef] leading-tight">
            {activeChat.chatName || 'Unnamed Group'}
          </h2>
          <span className="text-[13px] text-[#8696a0] font-normal leading-snug mt-0.5">
            {Object.keys(activeChat.participants || {}).length} members
          </span>
        </div>

        {/* Right side icons */}
        <div className="ml-auto flex items-center gap-5 lg:gap-6 text-[#aebac1]">
          <Search size={20} className="cursor-pointer hover:text-[#e9edef]" />
          <MoreVertical size={20} className="cursor-pointer hover:text-[#e9edef]" />
        </div>
      </div>

      {/* Message Engine */}
      <ConversationEngine 
        activeChat={activeChat} 
        currentUser={currentUser}
      />
    </div>
  ) : (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#222e35] border-l border-[#313d45]">
       <div className="w-[320px] max-w-full flex flex-col items-center text-center px-4">
         <Users className="w-[120px] h-[120px] text-[#41525d] mb-8" strokeWidth={1} />
         <h3 className="text-[32px] font-light text-[#e9edef] tracking-wide mb-4 leading-tight">VChat Groups</h3>
         <p className="text-[14px] text-[#8696a0] leading-relaxed">
           Connect with multiple friends at once.<br/>
           Select a group to start messaging.
         </p>
       </div>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="groups"
      mobileView={activeChat ? 'detail' : 'list'}
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
