import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, Search, Star, Loader2 } from 'lucide-react';

interface StarredMessage {
  messageId: string;
  chatId: string; // The parent chat ID (extracted from ref path)
  senderId: string;
  messageText: string;
  timestamp: number;
  messageType: string;
  pollQuestion?: string;
  deletedFor?: Record<string, boolean>;
  // We'll extract basic info
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
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const StarredMessages: React.FC = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<StarredMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const fetchStarred = async () => {
      try {
        const q = query(
          collectionGroup(db, 'messages'),
          where(`starredBy.${currentUser.uid}`, '==', true)
        );
        const snapshot = await getDocs(q);
        
        const loaded: StarredMessage[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Extract chatId from path: chats/{chatId}/messages/{messageId}
          const pathSegments = doc.ref.path.split('/');
          const chatId = pathSegments.length >= 4 ? pathSegments[1] : '';

          loaded.push({
            messageId: doc.id,
            chatId,
            senderId: data.senderId,
            messageText: data.messageText || '',
            timestamp: data.timestampRaw || data.timestamp || Date.now(),
            messageType: data.messageType || 'text',
            pollQuestion: data.pollQuestion,
            deletedFor: data.deletedFor
          });
        });
        
        setMessages(loaded);
      } catch (err) {
        console.error('Failed to fetch starred messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStarred();
  }, [currentUser]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const lowerQ = searchQuery.toLowerCase();
    return messages.filter(m => m.messageText?.toLowerCase().includes(lowerQ));
  }, [messages, searchQuery]);

  const handleMessageClick = (msg: StarredMessage) => {
    navigate('/chat', { 
      state: { 
        openChatId: msg.chatId, 
        scrollToMessageId: msg.messageId 
      } 
    });
  };

  const getDisplayText = (msg: StarredMessage) => {
    if (msg.messageType === 'poll' || msg.messageType === 'image') return '(empty)';
    return msg.messageText;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#111b21]">
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button onClick={() => navigate(-1)} className="text-[#aebac1] hover:text-[#e9edef]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[19px] text-[#e9edef] font-medium flex-grow">Starred messages</h1>
      </div>

      <div className="p-3 bg-[#111b21] shrink-0 border-b border-slate-800/50">
        <div className="bg-[#202c33] rounded-lg px-4 py-2 flex items-center gap-3">
          <Search size={20} className="text-[#8696a0]" />
          <input
            type="text"
            placeholder="Search starred messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-[#d1d7db] text-[15px] placeholder-[#8696a0] w-full"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#0b141a]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[#00a884]" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8696a0]">
            <Star size={48} className="mb-4 opacity-20" />
            <p>No starred messages</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-800/50">
            {filteredMessages.map(msg => (
              <div 
                key={msg.messageId}
                onClick={() => handleMessageClick(msg)}
                className="px-4 py-3 hover:bg-[#202c33] cursor-pointer flex flex-col gap-1 transition-colors"
              >
                <div className="flex justify-between items-center text-[13px] text-[#8696a0]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{msg.senderId === currentUser?.uid ? 'You' : msg.senderId}</span>
                  </div>
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
                <div className="text-[15px] text-[#e9edef] line-clamp-3 whitespace-pre-wrap">
                  {getDisplayText(msg)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
