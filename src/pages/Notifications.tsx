import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Bell, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUserProfile } from '../services/userService';
import type { InAppNotification } from '../types/notification';
import type { UserProfile } from '../types/user';

interface HydratedNotification extends InAppNotification {
  senderProfile?: UserProfile;
}

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const [notifications, setNotifications] = useState<HydratedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNotificationClick = async (notif: HydratedNotification) => {
    if (!currentUser) return;

    if (!notif.isRead) {
      setNotifications(prev => prev.map(n => 
        n.notificationId === notif.notificationId 
          ? { ...n, isRead: true } 
          : n
      ));

      try {
        const notifRef = doc(db, `users/${currentUser.uid}/notifications`, notif.notificationId);
        await updateDoc(notifRef, {
          isRead: true,
          readAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    if (notif.type === 'chat_request') {
      navigate('/pending');
    } else if (notif.chatId) {
      navigate('/chat', { state: { openChatId: notif.chatId } });
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    
    const unreadNotifs = notifications.filter(n => !n.isRead);
    if (unreadNotifs.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        const notifRef = doc(db, `users/${currentUser.uid}/notifications`, n.notificationId);
        batch.update(notifRef, {
          isRead: true,
          readAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, `users/${currentUser.uid}/notifications`),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const notifs: HydratedNotification[] = [];
        
        for (const document of snapshot.docs) {
          const data = document.data() as InAppNotification;
          const profile = await getUserProfile(data.fromUserId);
          notifs.push({
            ...data,
            senderProfile: profile || undefined
          });
        }
        
        setNotifications(notifs);
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser]);

  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* Secondary App Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-5 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={26} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white leading-tight">Notifications</h1>
            <span className="text-[13px] text-slate-400 font-medium">VChat</span>
          </div>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAllRead}
            className="text-[14px] text-[#22c55e] hover:text-[#1ea34d] font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] p-4 custom-scrollbar">
        <h2 className="text-slate-300 font-bold text-sm mb-4 ml-1">Earlier</h2>
        
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center p-6">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4 opacity-50" />
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-500">
            No notifications
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notif) => (
              <div 
                key={notif.notificationId} 
                onClick={() => handleNotificationClick(notif)}
                className="w-full bg-[#1a222c] rounded-2xl p-4 flex items-start gap-4 border border-slate-700/50 shadow-sm cursor-pointer hover:bg-[#1f2937] transition-colors"
              >
                
                {/* Left: Red dot + Avatar container */}
                <div className="flex items-center gap-3 shrink-0 mt-1">
                  {!notif.isRead ? (
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  ) : (
                    <div className="w-2.5 h-2.5 bg-transparent"></div>
                  )}
                  <div className="w-11 h-11 bg-slate-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                    {notif.senderProfile?.profileImage ? (
                      <img src={notif.senderProfile.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Right: Content */}
                <div className="flex flex-col flex-1 min-w-0 pr-2">
                  <span className="text-[17px] font-bold text-white mb-0.5">
                    {notif.title}
                  </span>
                  <div className="mb-2">
                     <span className="inline-block px-2.5 py-0.5 bg-green-900/30 text-[#22c55e] border border-green-900/50 text-[10px] font-bold rounded-md uppercase tracking-wide">
                      {notif.type}
                    </span>
                  </div>
                  <p className="text-[15px] text-slate-400 leading-snug break-words">
                    {notif.body}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const detailPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#121212] border-l border-slate-800/50 shadow-inner">
       <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50">
         <div className="relative">
           <Bell className="w-10 h-10 text-slate-500" />
           <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e293b]"></div>
         </div>
       </div>
       <h3 className="text-[22px] font-light text-slate-300 tracking-wide mb-2">Notifications</h3>
       <p className="text-[14px] text-slate-500">Stay updated with requests and activity.</p>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="notifications"
      mobileView="list"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
