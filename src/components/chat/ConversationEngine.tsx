import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, Plus, Send, X, Check, CheckCheck, CalendarDays, User, Star, Copy, CornerUpRight, Trash2, BarChart2, Image } from 'lucide-react';
import { MessageInfoSheet } from './MessageInfoSheet';
import { CreateEventDialog } from './CreateEventDialog';
import { EventDetailsDialog } from './EventDetailsDialog';
import { CreateContactDialog } from './CreateContactDialog';
import { CreatePollDialog } from './CreatePollDialog';
import { subscribeToMessages, sendMessage, sendEventMessage, sendContactMessage, sendPollMessage, sendImageMessage, voteOnPoll, deleteMessageForMe, deleteMessageForEveryone, reactToMessage, starMessage, unstarMessage, _diagnosticRawMessages } from '../../services/messageService';
import type { ChatMetadata } from '../../types/chat';
import type { Message } from '../../types/message';
import { updateTypingStatus } from '../../services/userService';
import { doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ConversationEngineProps {
  activeChat: ChatMetadata;
  currentUser: any;
  restrictionBanner?: React.ReactNode;
  onTypingChange?: (isTyping: boolean) => void;
  onForwardRequest?: (message: Message) => void;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
  onUnpin?: () => void;
  onPinRequest?: (message: Message) => void;
  highlightMessageId?: string;
}

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

export const ConversationEngine: React.FC<ConversationEngineProps> = ({ 
  activeChat,
  currentUser,
  restrictionBanner,
  onTypingChange,
  onForwardRequest,
  pinnedMessageId,
  pinnedMessageText,
  onUnpin,
  onPinRequest,
  highlightMessageId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);
  const [infoMessage, setInfoMessage] = useState<Message | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selection State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [eventDetailsMessage, setEventDetailsMessage] = useState<Message | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) return;
    const file = e.target.files[0];
    e.target.value = ''; // Reset input
    
    // Check if it's actually an image
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file');
      return;
    }
    
    const isAdmin = activeChat.admins?.[currentUser.uid] === true;
    if (activeChat.isGroup && activeChat.groupSettings?.onlyAdminsCanMessage && !isAdmin) {
      showToast('Only admins can send messages in this group');
      return;
    }

    setSendingMessage(true);
    try {
      await sendImageMessage(
        activeChat.chatId,
        currentUser.uid,
        activeChat.isGroup || false,
        file,
        ''
      );
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send image:', err);
      showToast('Failed to send image');
    } finally {
      setSendingMessage(false);
    }
  };


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Seen Receipts Observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!currentUser || !activeChat) return;

    observerRef.current = new IntersectionObserver((entries) => {
      const visibleMessages = entries.filter(e => e.isIntersecting).map(e => {
        const id = e.target.getAttribute('data-message-id');
        return messages.find(m => m.messageId === id);
      }).filter(Boolean) as Message[];

      if (visibleMessages.length === 0) return;

      let hasUpdates = false;
      const batch = writeBatch(db);

      visibleMessages.forEach(msg => {
        const isIncoming = msg.senderId !== currentUser.uid;
        if (!isIncoming) return;

        const msgRef = doc(db, `chats/${activeChat.chatId}/messages`, msg.messageId);

        if (activeChat.isGroup) {
          const deliveredTo = msg.deliveredTo || {};
          const seenBy = msg.seenBy || {};
          const deliveredSet = deliveredTo[currentUser.uid] === true;
          const seenSet = seenBy[currentUser.uid] === true;
          
          if (!deliveredSet || !seenSet) {
            batch.update(msgRef, {
              [`deliveredTo.${currentUser.uid}`]: true,
              [`seenBy.${currentUser.uid}`]: true
            });
            hasUpdates = true;
          }
        } else if (msg.status !== 'seen') {
          batch.update(msgRef, { status: 'seen' });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        batch.commit().catch(err => console.error('Seen receipt update failed:', err));
      }
    }, { threshold: 0.5 });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages, currentUser, activeChat]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) setContextMenu(null);
      if (isAttachMenuOpen && attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, isAttachMenuOpen]);

  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TYPING_STOP_DELAY_MS = 1200;

  useEffect(() => {
    if (!activeChat || !currentUser || restrictionBanner) return;

    if (newMessageText.length > 0) {
      updateTypingStatus(currentUser.uid, activeChat.chatId).catch(console.error);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(currentUser.uid, '').catch(console.error);
      }, TYPING_STOP_DELAY_MS);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateTypingStatus(currentUser.uid, '').catch(console.error);
    }
  }, [newMessageText, activeChat, currentUser, restrictionBanner]);

  useEffect(() => {
    
    if (onTypingChange) onTypingChange(false);
    if (!activeChat || activeChat.isGroup || restrictionBanner || !activeChat.resolvedParticipant) return;

    const otherUserId = activeChat.resolvedParticipant.uid;
    const unsub = onSnapshot(doc(db, 'users', otherUserId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.typingTo === activeChat.chatId) {
          
          if (onTypingChange) onTypingChange(true);
        } else {
          
          if (onTypingChange) onTypingChange(false);
        }
      }
    });

    return () => unsub();
  }, [activeChat, restrictionBanner]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (currentUser) {
        updateTypingStatus(currentUser.uid, '').catch(console.error);
      }
    };
  }, [currentUser]);

  const [messageLimit, setMessageLimit] = useState(30);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  const previousScrollHeightRef = useRef<number>(0);
  const isPaginating = useRef(false);

  // Reset pagination when active chat changes
  useEffect(() => {
    setMessageLimit(30);
    isPaginating.current = false;
    previousScrollHeightRef.current = 0;
    setReplyTarget(null);
    setContextMenu(null);
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [activeChat.chatId]);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    
    if (messages.length === 0) setLoadingMessages(true);
    setMessagesError(null);

    const unsubscribe = subscribeToMessages(activeChat.chatId, messageLimit, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeChat.chatId, messageLimit]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (highlightMessageId && messages.some(m => m.messageId === highlightMessageId)) {
      setTimeout(() => {
        const el = document.getElementById(`message-${highlightMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'background-color 0.5s ease';
          const originalBg = el.style.backgroundColor;
          el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          setTimeout(() => {
            el.style.backgroundColor = originalBg;
          }, 1500);
        }
      }, 100);
      return;
    }

    if (isPaginating.current) {
      container.scrollTop = container.scrollHeight - previousScrollHeightRef.current;
      isPaginating.current = false;
    } else {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 10);
    }
  }, [messages, highlightMessageId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChat || !currentUser) return;

    const isAdmin = activeChat.admins?.[currentUser.uid] === true;
    if (activeChat.isGroup && activeChat.groupSettings?.onlyAdminsCanMessage && !isAdmin) {
      showToast('Only admins can send messages in this group');
      return;
    }

    const text = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);

    let replyToMessageId = '';
    let replyPreview = '';

    if (replyTarget) {
      replyToMessageId = replyTarget.messageId;
      const previewText = replyTarget.messageText;
      replyPreview = previewText.length > 60 ? previewText.substring(0, 60) + "..." : previewText;
    }

    try {
      await sendMessage(activeChat.chatId, currentUser.uid, text, replyToMessageId, replyPreview);
      setReplyTarget(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && messages.length >= messageLimit) {
      isPaginating.current = true;
      previousScrollHeightRef.current = target.scrollHeight;
      setMessageLimit(prev => prev + 30);
    }
  };

  const renderReactions = (reactions?: Record<string, string>) => {
    if (!reactions) return null;
    const values = Object.values(reactions);
    if (values.length === 0) return null;
    
    const countMap: Record<string, number> = {};
    for (const emoji of values) {
      if (!emoji) continue;
      countMap[emoji] = (countMap[emoji] || 0) + 1;
    }
    
    const parts = Object.entries(countMap).map(([emoji, count]) => `${emoji} ${count}`);
    if (parts.length === 0) return null;

    return (
      <div className="text-[11px] bg-black/20 rounded-full px-2 py-0.5 mt-1 self-start select-none whitespace-pre border border-slate-700/30 text-white">
        {parts.join("   ")}
      </div>
    );
  };

  return (
    <>
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#323232] text-[#e9edef] px-4 py-2 rounded shadow-lg text-[14px]">
          {toastMessage}
        </div>
      )}
      {infoMessage && (
        <MessageInfoSheet 
          message={infoMessage} 
          activeChat={activeChat} 
          onClose={() => setInfoMessage(null)} 
        />
      )}
      {restrictionBanner}
      
      {selectionMode && (
        <div className="bg-[#202c33] border-b border-slate-800/50 px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-sm w-full relative">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectionMode(false); setSelectedMessageIds(new Set()); }} 
              className="text-[#8696a0] hover:text-[#d1d7db] transition-colors"
            >
              <X size={20} />
            </button>
            <span className="text-[#e9edef] text-[16px] font-medium">{selectedMessageIds.size} selected</span>
          </div>
          <div className="flex items-center gap-5 text-[#aebac1]">
            <button 
              onClick={async () => {
                if (selectedMessageIds.size === 0 || !currentUser) return;
                const promises = Array.from(selectedMessageIds).map(id => starMessage(activeChat.chatId, id, currentUser.uid));
                try { await Promise.all(promises); } catch (e) { console.error(e); }
                setSelectionMode(false);
                setSelectedMessageIds(new Set());
              }} 
              className="hover:text-[#e9edef] transition-colors"
              title="Star"
            >
              <Star size={18} />
            </button>
            <button 
              onClick={async () => {
                if (selectedMessageIds.size === 0 || !currentUser) return;
                const promises = messages.filter(m => selectedMessageIds.has(m.messageId)).map(m => {
                  if (m.senderId === currentUser.uid) {
                    return deleteMessageForMe(activeChat.chatId, m.messageId, currentUser.uid);
                  }
                  return Promise.resolve();
                });
                try { await Promise.all(promises); } catch (e) { console.error(e); }
                setSelectionMode(false);
                setSelectedMessageIds(new Set());
              }} 
              className="hover:text-[#e9edef] transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={() => {
                if (selectedMessageIds.size === 0) return;
                const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.messageId)).sort((a, b) => a.timestamp - b.timestamp);
                const textToCopy = selectedMsgs.map(m => m.messageText || '').join('\n');
                navigator.clipboard.writeText(textToCopy).catch(console.error);
                setSelectionMode(false);
                setSelectedMessageIds(new Set());
                showToast(`${selectedMsgs.length} message(s) copied`);
              }} 
              className="hover:text-[#e9edef] transition-colors"
              title="Copy"
            >
              <Copy size={18} />
            </button>
            <button 
              onClick={() => {
                if (selectedMessageIds.size === 0) return;
                const firstId = Array.from(selectedMessageIds)[0];
                const msg = messages.find(m => m.messageId === firstId);
                setSelectionMode(false);
                setSelectedMessageIds(new Set());
                if (msg && onForwardRequest) onForwardRequest(msg);
              }} 
              className="hover:text-[#e9edef] transition-colors"
              title="Forward"
            >
              <CornerUpRight size={18} />
            </button>
          </div>
        </div>
      )}

      {!selectionMode && pinnedMessageId && pinnedMessageText && (
        <div 
          className="bg-[#202c33] border-b border-slate-800/50 px-4 py-2 flex items-center justify-between cursor-pointer shrink-0 z-10 shadow-sm"
          onClick={() => {
            if (messages.some(m => m.messageId === pinnedMessageId)) {
              const el = document.getElementById(`message-${pinnedMessageId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        >
          <div className="flex flex-col overflow-hidden mr-3 flex-1">
            <span className="text-[#00a884] text-[12px] font-medium leading-tight">Pinned message</span>
            <span className="text-[#d1d7db] text-[14px] truncate leading-snug">{pinnedMessageText}</span>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onUnpin) onUnpin(); 
            }} 
            className="text-[#8696a0] hover:text-[#d1d7db] shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#2a3942] rounded-lg shadow-xl py-2 min-w-[150px] border border-slate-700/50 flex flex-col"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-700/50 mb-1 gap-1">
            {['❤️', '😂', '👍', '😮', '😢', '🙏'].map((emoji) => (
              <button
                key={emoji}
                className="w-8 h-8 flex items-center justify-center hover:bg-[#202c33] rounded-full transition-colors text-[16px]"
                onClick={async (e) => {
                  e.stopPropagation();
                  const msg = contextMenu.message;
                  setContextMenu(null);
                  try {
                    await reactToMessage(activeChat.chatId, msg.messageId, currentUser!.uid, emoji);
                  } catch (err) {
                    console.error('Reaction failed:', err);
                  }
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button 
            className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const msg = contextMenu.message;
              setContextMenu(null);
              setSelectionMode(true);
              setSelectedMessageIds(new Set([msg.messageId]));
            }}
          >
            Multi Select
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setReplyTarget(contextMenu.message);
              setContextMenu(null);
            }}
          >
            Reply
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
            onClick={async (e) => {
              e.stopPropagation();
              const msg = contextMenu.message;
              const isStarred = msg.starredBy?.[currentUser.uid];
              setContextMenu(null);
              try {
                if (isStarred) {
                  await unstarMessage(activeChat.chatId, msg.messageId, currentUser.uid);
                } else {
                  await starMessage(activeChat.chatId, msg.messageId, currentUser.uid);
                }
              } catch (err) {
                console.error('Star action failed:', err);
              }
            }}
          >
            {contextMenu.message.starredBy?.[currentUser.uid] ? 'Unstar' : 'Star'}
          </button>
          {onForwardRequest && (
            <button 
              className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const msg = contextMenu.message;
                setContextMenu(null);
                onForwardRequest(msg);
              }}
            >
              Forward
            </button>
          )}
          {onPinRequest && (
            <button 
              className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const msg = contextMenu.message;
                setContextMenu(null);
                onPinRequest(msg);
              }}
            >
              Pin
            </button>
          )}
          <button 
            className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const msg = contextMenu.message;
              setContextMenu(null);
              if (!activeChat.isGroup) {
                showToast("Message info is available in group chats");
                return;
              }
              setInfoMessage(msg);
            }}
          >
            Info
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors"
            onClick={async (e) => {
              e.stopPropagation();
              const msg = contextMenu.message;
              setContextMenu(null);
              if (window.confirm('Delete this message for you?')) {
                try {
                  await deleteMessageForMe(activeChat.chatId, msg.messageId, currentUser!.uid);
                } catch (err) {
                  console.error('Failed to delete message for me:', err);
                }
              }
            }}
          >
            Delete for me
          </button>
          {currentUser && contextMenu.message.senderId === currentUser.uid && (
            <button 
              className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#202c33] transition-colors text-red-400 hover:text-red-300"
              onClick={async (e) => {
                e.stopPropagation();
                const msg = contextMenu.message;
                setContextMenu(null);
                if (window.confirm('Delete this message for everyone?')) {
                  try {
                    await deleteMessageForEveryone(activeChat.chatId, msg.messageId);
                  } catch (err) {
                    console.error('Failed to delete message for everyone:', err);
                  }
                }
              }}
            >
              Delete for everyone
            </button>
          )}
        </div>
      )}

      <div 
        id="message-container" 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto py-4 custom-scrollbar flex flex-col items-center bg-[#0b141a]"
      >
        <div className="w-full max-w-4xl flex flex-col gap-4">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#00a884]" />
              <p>Loading Messages...</p>
            </div>
          ) : messagesError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <AlertCircle className="w-10 h-10 text-red-400 mb-4 opacity-50" />
              <p className="text-sm text-red-400">{messagesError}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-transparent mt-10">
              <span className="text-[#8696a0] text-[12px] bg-[#111b21] px-4 py-1.5 rounded-lg shadow-sm">No messages here yet</span>
            </div>
          ) : (
            <>
              <div id="diagnostic-raw-json" className="hidden" data-raw={JSON.stringify(_diagnosticRawMessages)}></div>
              {messages.filter(m => (m.messageType === 'text' || m.messageType === 'system' || m.messageType === 'event' || m.messageType === 'contact' || m.messageType === 'poll' || m.messageType === 'image') && (!currentUser || !m.deletedFor?.[currentUser.uid])).map((msg) => {
                if (msg.messageType === 'system') {
                  return (
                    <div key={msg.messageId} className="flex justify-center w-full my-1.5">
                      <div className="bg-[#182229] px-3 py-1.5 rounded-lg border border-slate-700/30 shadow-sm max-w-[85%] text-center">
                        <span className="text-[12.5px] text-[#8696a0] font-medium leading-tight">
                          {msg.messageText}
                        </span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.senderId === currentUser?.uid;
                let senderName = msg.senderId;
                if (isMe) {
                  senderName = 'You';
                } else if (!activeChat.isGroup && activeChat.resolvedParticipant && msg.senderId === activeChat.resolvedParticipant.uid) {
                  senderName = activeChat.resolvedParticipant.username;
                }

                const isSelected = selectedMessageIds.has(msg.messageId);

                return (
                  <div 
                    key={msg.messageId} 
                    id={`message-${msg.messageId}`} 
                    className={`flex flex-col w-full px-4 lg:px-12 py-0.5 transition-colors ${isSelected ? 'bg-white/10' : ''}`}
                    onClick={(e) => {
                      if (selectionMode) {
                        e.preventDefault();
                        const newSet = new Set(selectedMessageIds);
                        if (newSet.has(msg.messageId)) {
                          newSet.delete(msg.messageId);
                          if (newSet.size === 0) setSelectionMode(false);
                        } else {
                          newSet.add(msg.messageId);
                        }
                        setSelectedMessageIds(newSet);
                      }
                    }}
                  >
                    <div className={`flex flex-col max-w-[85%] lg:max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div 
                        data-message-id={msg.messageId}
                        ref={(el) => {
                          if (el && observerRef.current && !isMe) {
                            observerRef.current.observe(el);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (selectionMode) {
                            const newSet = new Set(selectedMessageIds);
                            if (newSet.has(msg.messageId)) {
                              newSet.delete(msg.messageId);
                              if (newSet.size === 0) setSelectionMode(false);
                            } else {
                              newSet.add(msg.messageId);
                            }
                            setSelectedMessageIds(newSet);
                          } else {
                            setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                          }
                        }}
                        onDoubleClick={async (e) => {
                          e.preventDefault();
                          if (!currentUser || selectionMode) return;
                          try {
                            await reactToMessage(activeChat.chatId, msg.messageId, currentUser.uid, '❤️');
                          } catch (err) {
                            console.error('Reaction failed:', err);
                          }
                        }}
                        className={`px-3 py-1.5 flex flex-col cursor-pointer ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-[10px] rounded-tr-none shadow-sm' : 'bg-[#202c33] text-[#e9edef] rounded-[10px] rounded-tl-none shadow-sm'}`}
                      >
                      {!isMe && activeChat.isGroup && (
                        <span className="text-[12px] font-bold text-[#53bdeb] mb-0.5">{senderName}</span>
                      )}

                      {msg.replyToMessageId && msg.replyPreview && (
                        <div 
                          onClick={() => {
                            const el = document.getElementById(`message-${msg.replyToMessageId}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="bg-black/20 rounded-md p-2 mb-1 border-l-4 border-[#53bdeb] cursor-pointer"
                        >
                          <span className="text-[12px] text-[#53bdeb] font-semibold block mb-0.5">Reply:</span>
                          <span className="text-[13px] text-slate-300 opacity-90 leading-tight whitespace-pre-wrap">{msg.replyPreview}</span>
                        </div>
                      )}

                      <div className="flex items-end gap-3">
                        {msg.messageType === 'poll' ? (
                          <div 
                            className="flex flex-col cursor-pointer"
                            onClick={async (e) => {
                               if (selectionMode) return;
                               e.stopPropagation();
                               if (!currentUser) return;
                               const uid = currentUser.uid;
                               const currentVote = msg.pollVotes?.[uid] ?? -1;
                               const numOptions = msg.pollOptions?.length || 0;
                               if (numOptions === 0) return;
                               const nextVote = (currentVote + 1) % (numOptions + 1) - 1;
                               try {
                                 await voteOnPoll(activeChat.chatId, msg.messageId, uid, nextVote === -1 ? null : nextVote);
                               } catch (err) {
                                 console.error(err);
                               }
                            }}
                          >
                            <p className="text-[14.5px] whitespace-pre-wrap leading-snug">
                              {`Poll: ${msg.pollQuestion || ''}\n` + 
                               (msg.pollOptions || []).map((opt, i) => {
                                  const count = Object.values(msg.pollVotes || {}).filter(v => v === i).length;
                                  return `${i + 1}. ${opt} (${count})`;
                               }).join('\n') +
                               `\n\nTap poll to vote`}
                            </p>
                          </div>
                        ) : msg.messageType === 'event' ? (
                          <div 
                            className="flex flex-col cursor-pointer"
                            onClick={() => setEventDetailsMessage(msg)}
                          >
                            <p className="text-[14.5px] whitespace-pre-wrap leading-snug">
                              Event: {msg.messageText.split('\n')[1]?.replace('Title:', '').trim() || 'Event'}
                            </p>
                            <p className="text-[13px] text-[#53bdeb] mt-1 font-medium">Tap to view details</p>
                          </div>
                        ) : msg.messageType === 'image' ? (
                          <div className="flex flex-col max-w-[240px] sm:max-w-[300px]">
                            {msg.mediaUrl ? (
                              <img src={msg.mediaUrl} alt={msg.mediaName || "Image"} className="w-full rounded-lg object-cover mb-1 bg-black/10" />
                            ) : (
                              <div className="w-full h-32 bg-black/20 rounded-lg mb-1 flex items-center justify-center text-slate-400">Loading...</div>
                            )}
                            {msg.messageText && (
                              <p className="text-[14.5px] whitespace-pre-wrap leading-snug mt-1">{msg.messageText}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[14.5px] whitespace-pre-wrap leading-snug">{msg.messageText}</p>
                        )}
                          <div className={`text-[11px] mb-[-2px] flex items-center justify-end shrink-0 ${isMe ? 'text-[#8baea3]' : 'text-[#8696a0]'}`}>
                            {msg.starredBy?.[currentUser.uid] && (
                              <Star size={10} className="mr-1 fill-current" />
                            )}
                            {formatTime(msg.timestamp)} 
                          {isMe && (
                            <span className="ml-0.5 flex items-center">
                              {msg.status === 'seen' ? (
                                <CheckCheck size={16} strokeWidth={2.5} className="text-[#53bdeb]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck size={16} strokeWidth={2.5} className="text-[#8696a0]" />
                              ) : (
                                <Check size={16} strokeWidth={2.5} className="text-[#8696a0]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {renderReactions(msg.reactions)}
                  </div>
                  </div>
                );
              })}
              <CreateEventDialog
                isOpen={isEventDialogOpen}
                onClose={() => setIsEventDialogOpen(false)}
                onSubmit={async (title, date, time, location, note) => {
                  if (!currentUser) return;
                  try {
                    await sendEventMessage(
                      activeChat.chatId,
                      currentUser.uid,
                      activeChat.isGroup || false,
                      title,
                      date,
                      time,
                      location,
                      note
                    );
                    setIsEventDialogOpen(false);
                    scrollToBottom();
                  } catch (err) {
                    console.error('Failed to send event message:', err);
                    showToast('Failed to send event');
                  }
                }}
              />
              <EventDetailsDialog
                isOpen={eventDetailsMessage !== null}
                onClose={() => setEventDetailsMessage(null)}
                fullText={eventDetailsMessage?.messageText || ''}
              />
              <CreateContactDialog
                isOpen={isContactDialogOpen}
                onClose={() => setIsContactDialogOpen(false)}
                onSubmit={async (name, number) => {
                  if (!currentUser) return;
                  
                  const isAdmin = activeChat.admins?.[currentUser.uid] === true;
                  if (activeChat.isGroup && activeChat.groupSettings?.onlyAdminsCanMessage && !isAdmin) {
                    showToast('Only admins can send messages in this group');
                    setIsContactDialogOpen(false);
                    return;
                  }

                  try {
                    await sendContactMessage(
                      activeChat.chatId,
                      currentUser.uid,
                      activeChat.isGroup || false,
                      name,
                      number
                    );
                    setIsContactDialogOpen(false);
                    scrollToBottom();
                  } catch (err) {
                    console.error('Failed to send contact message:', err);
                    showToast('Failed to send contact');
                  }
                }}
              />
              <CreatePollDialog
                isOpen={isPollDialogOpen}
                onClose={() => setIsPollDialogOpen(false)}
                onSubmit={async (question, o1, o2, o3, o4) => {
                  if (!currentUser) return;
                  // Intentionally bypass admin check per Android parity bug
                  try {
                    await sendPollMessage(
                      activeChat.chatId,
                      currentUser.uid,
                      activeChat.isGroup || false,
                      question,
                      o1,
                      o2,
                      o3,
                      o4
                    );
                    setIsPollDialogOpen(false);
                    scrollToBottom();
                  } catch (err) {
                    console.error('Failed to send poll message:', err);
                    showToast('Failed to send poll');
                  }
                }}
              />
            </>
          )}
        </div>
      </div>

      {!restrictionBanner && (
        <div className="flex flex-col shrink-0 border-t border-slate-800/50 bg-[#202c33]">
          {replyTarget && (
            <div className="px-4 py-2 bg-[#2a3942] flex items-center justify-between border-b border-slate-800/50">
              <div className="flex flex-col pl-3 border-l-4 border-[#53bdeb] max-w-[80%]">
                <span className="text-[12px] font-bold text-[#53bdeb]">Replying to</span>
                <span className="text-[13px] text-[#d1d7db] truncate">
                  {replyTarget.messageText.length > 60 ? replyTarget.messageText.substring(0, 60) + "..." : replyTarget.messageText}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setReplyTarget(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          )}
          <div className="px-4 py-3 lg:px-6">
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            <div className="relative" ref={attachMenuRef}>
              <button 
                type="button" 
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                className="w-10 h-10 flex items-center justify-center shrink-0 text-[#aebac1] hover:text-[#e9edef] transition-colors"
              >
                <Plus className={`w-7 h-7 transition-transform ${isAttachMenuOpen ? 'rotate-45' : ''}`} strokeWidth={2} />
              </button>
              
              {isAttachMenuOpen && (
                <div className="absolute bottom-14 left-0 bg-[#202c33] rounded-2xl shadow-xl flex flex-col py-2 w-48 animate-in fade-in slide-in-from-bottom-5 duration-200 z-50 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-[#111b21] transition-colors text-[#e9edef] w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Image className="w-5 h-5 text-pink-400" />
                    </div>
                    <span className="font-medium">Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      setIsContactDialogOpen(true);
                    }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-[#111b21] transition-colors text-[#e9edef] w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="font-medium">Contact</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      setIsEventDialogOpen(true);
                    }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-[#111b21] transition-colors text-[#e9edef] w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="font-medium">Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      setIsPollDialogOpen(true);
                    }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-[#111b21] transition-colors text-[#e9edef] w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <BarChart2 className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="font-medium">Poll</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex-grow bg-[#2a3942] rounded-lg flex items-center px-4 py-2.5 shadow-sm">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type a message"
                className="bg-transparent border-none outline-none text-[#d1d7db] text-[15px] placeholder-[#8696a0] w-full"
                disabled={sendingMessage}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessageText.trim() || sendingMessage}
              className="w-10 h-10 flex items-center justify-center text-[#aebac1] hover:text-[#e9edef] transition-colors disabled:opacity-50 shrink-0"
            >
              {sendingMessage ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
              ) : (
                <Send className="w-6 h-6 ml-0.5" />
              )}
            </button>
          </form>
          </div>
        </div>
      )}
    </>
  );
};
