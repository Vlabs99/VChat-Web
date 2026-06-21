import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Loader2, AlertCircle, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUserProfile } from '../services/userService';
import { acceptFriendRequest, rejectFriendRequest } from '../services/relationshipService';
import type { ChatRequest } from '../types/relationship';
import type { UserProfile } from '../types/user';

interface IncomingRequest extends ChatRequest {
  senderProfile?: UserProfile;
}

export const PendingRequests: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'chat_requests'),
          where('receiverId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        const reqs: IncomingRequest[] = [];
        
        for (const document of snapshot.docs) {
          const data = document.data() as ChatRequest;
          const profile = await getUserProfile(data.senderId);
          reqs.push({
            ...data,
            senderProfile: profile || undefined
          });
        }
        
        // Sort by timestamp desc
        reqs.sort((a, b) => {
          const tA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
          const tB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
          return tB - tA;
        });

        setRequests(reqs);
      } catch (err: any) {
        console.error('Error fetching requests:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

  const handleAccept = async (req: IncomingRequest) => {
    if (!currentUser) return;
    setActionLoading(req.requestId);
    try {
      await acceptFriendRequest(req.requestId, currentUser.uid, req.senderId);
      setRequests(prev => prev.filter(r => r.requestId !== req.requestId));
    } catch (err: any) {
      console.error('Error accepting request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: IncomingRequest) => {
    if (!currentUser) return;
    setActionLoading(req.requestId);
    try {
      await rejectFriendRequest(req.requestId, currentUser.uid, req.senderId);
      setRequests(prev => prev.filter(r => r.requestId !== req.requestId));
    } catch (err: any) {
      console.error('Error rejecting request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* Secondary App Bar */}
      <div className="flex items-center px-4 py-3 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-5 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={26} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white leading-tight">Pending Requests</h1>
          <span className="text-[13px] text-slate-400 font-medium">VChat</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4 opacity-50" />
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            No pending requests
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <div 
                key={req.requestId} 
                className="w-full bg-[#1a222c] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700/50 shadow-sm"
              >
                
                {/* User Info (Left) */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                    {req.senderProfile?.profileImage ? (
                      <img src={req.senderProfile.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[17px] font-bold text-white truncate">
                      {req.senderProfile?.username || 'Unknown User'}
                    </span>
                    <span className="text-[14px] text-slate-400 truncate">
                      {req.senderProfile?.email || 'No email available'}
                    </span>
                  </div>
                </div>

                {/* Actions (Right) */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => handleReject(req)}
                    disabled={actionLoading === req.requestId}
                    className="bg-[#111827] text-white font-bold text-[13px] px-6 py-2.5 rounded-full hover:bg-slate-800 transition-colors border border-slate-700/50 shadow-sm disabled:opacity-50"
                  >
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleAccept(req)}
                    disabled={actionLoading === req.requestId}
                    className="bg-[#22c55e] text-[#121212] font-bold text-[13px] px-6 py-2.5 rounded-full hover:bg-[#16a34a] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[90px]"
                  >
                    {actionLoading === req.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ACCEPT'}
                  </button>
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
         <ClipboardList className="w-10 h-10 text-slate-500" />
       </div>
       <h3 className="text-[22px] font-light text-slate-300 tracking-wide mb-2">Pending Requests</h3>
       <p className="text-[14px] text-slate-500">Manage your incoming friend requests.</p>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="pending"
      mobileView="list"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
