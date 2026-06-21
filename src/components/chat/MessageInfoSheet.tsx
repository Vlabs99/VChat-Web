import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getUserProfile } from '../../services/userService';
import type { Message } from '../../types/message';
import type { ChatMetadata } from '../../types/chat';

interface MessageInfoSheetProps {
  message: Message;
  activeChat: ChatMetadata;
  onClose: () => void;
}

interface UserInfo {
  uid: string;
  username: string;
}

export const MessageInfoSheet: React.FC<MessageInfoSheetProps> = ({ message, activeChat, onClose }) => {
  const [deliveredUsers, setDeliveredUsers] = useState<UserInfo[]>([]);
  const [seenUsers, setSeenUsers] = useState<UserInfo[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // We build buckets synchronously on mount
  const deliveredIds: string[] = [];
  const seenIds: string[] = [];
  const pendingIds: string[] = [];

  const participants = activeChat.participants || {};
  const total = Object.keys(participants).length;

  useEffect(() => {
    Object.keys(participants).forEach(uid => {
      const isSeen = message.seenBy?.[uid] === true;
      const isDelivered = message.deliveredTo?.[uid] === true;

      if (isSeen) {
        seenIds.push(uid);
      } else if (isDelivered) {
        deliveredIds.push(uid);
      } else {
        pendingIds.push(uid);
      }
    });

    const allUids = [...deliveredIds, ...seenIds, ...pendingIds];
    
    if (allUids.length === 0) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const promises = allUids.map(async (uid) => {
          const profile = await getUserProfile(uid);
          return {
            uid,
            username: profile?.username || uid
          };
        });

        const results = await Promise.all(promises);
        const usernameByUid: Record<string, string> = {};
        results.forEach(res => {
          usernameByUid[res.uid] = res.username;
        });

        setDeliveredUsers(deliveredIds.map(uid => ({ uid, username: usernameByUid[uid] })));
        setSeenUsers(seenIds.map(uid => ({ uid, username: usernameByUid[uid] })));
        setPendingUsers(pendingIds.map(uid => ({ uid, username: usernameByUid[uid] })));
      } catch (err) {
        console.error("Failed to fetch user profiles for message info", err);
        setDeliveredUsers(deliveredIds.map(uid => ({ uid, username: uid })));
        setSeenUsers(seenIds.map(uid => ({ uid, username: uid })));
        setPendingUsers(pendingIds.map(uid => ({ uid, username: uid })));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [message.messageId]);

  // Recalculate summary every render just like Android
  // No caching, fetch every time sheet opens
  let finalDeliveredIds: string[] = [];
  let finalSeenIds: string[] = [];
  let finalPendingIds: string[] = [];

  Object.keys(participants).forEach(uid => {
    const isSeen = message.seenBy?.[uid] === true;
    const isDelivered = message.deliveredTo?.[uid] === true;
    if (isSeen) {
      finalSeenIds.push(uid);
    } else if (isDelivered) {
      finalDeliveredIds.push(uid);
    } else {
      finalPendingIds.push(uid);
    }
  });

  const deliveredCount = finalDeliveredIds.length + finalSeenIds.length;
  const countsSummary = `Sent: ${total}   Delivered: ${deliveredCount}   Seen: ${finalSeenIds.length}   Pending: ${finalPendingIds.length}`;

  const renderSection = (title: string, users: UserInfo[], chipText: string, isPendingSection = false) => {
    // Exact Android quirk: if no participants, Delivered and Seen containers are completely empty (no 'None' row)
    if (total === 0 && !isPendingSection) {
      return (
        <div className="flex flex-col mb-4">
          <span className="text-[14px] font-bold text-[#e9edef] mb-2">{title}</span>
          <div className="flex flex-col gap-1">
            {/* Empty container */}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col mb-4">
        <span className="text-[14px] font-bold text-[#e9edef] mb-2">{title}</span>
        <div className="flex flex-col gap-1">
          {loading ? null : users.length === 0 ? (
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-[15px] text-[#e9edef]">{total === 0 && isPendingSection ? "No participants" : "None"}</span>
              <span className="text-[12px] text-[#8696a0]">{total === 0 && isPendingSection ? "" : chipText}</span>
            </div>
          ) : (
            users.map(u => (
              <div key={u.uid} className="flex items-center justify-between py-2 px-1">
                <span className="text-[15px] text-[#e9edef]">{u.username}</span>
                <span className="text-[12px] text-[#8696a0]">{chipText}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="relative bg-[#202c33] rounded-t-xl w-full max-w-md mx-auto flex flex-col max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
          <span className="text-[18px] font-bold text-[#e9edef]">Message info</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 custom-scrollbar">
          <div className="bg-[#111b21] rounded-lg p-3 mb-4">
            <span className="text-[13px] text-[#8696a0] whitespace-pre">{countsSummary}</span>
          </div>

          {renderSection("Delivered", deliveredUsers, "Delivered", false)}
          {renderSection("Seen", seenUsers, "Seen", false)}
          {renderSection("Pending", pendingUsers, "Pending", true)}
        </div>
      </div>
    </div>
  );
};
