import React, { useState } from 'react';
import { Loader2, User as UserIcon, UserPlus, Search as SearchIcon } from 'lucide-react';
import { searchUserByEmail } from '../services/userService';
import { sendFriendRequest } from '../services/relationshipService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { resolveCanonicalState, applyCanonicalToUser } from '../services/relationshipResolver';
import type { RelationshipDocument } from '../types/relationship';
import type { UserProfile } from '../types/user';
import { useAuthStore } from '../store/useAuthStore';
import { DesktopLayout } from '../components/layout/DesktopLayout';

export const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[] | null>(null);
  const { currentUser } = useAuthStore();
  

  const handleAddFriend = async (peerUid: string) => {
    if (!currentUser) return;
    try {
      await sendFriendRequest(currentUser.uid, peerUid);
      
      // Update the local state to show "REQUEST SENT"
      setSearchResults(prev => {
        if (!prev) return prev;
        return prev.map(u => {
          if (u.uid === peerUid) {
            return {
              ...u,
              stateLabel: 'REQUEST SENT',
              friendshipState: 'pending_outgoing'
            };
          }
          return u;
        });
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      // Optional: Add a toast notification for error here if needed
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults(null);

    try {
      const results = await searchUserByEmail(searchQuery);
      // Exclude current user from results
      const filteredResults = results.filter(u => u.uid !== currentUser?.uid);
      
      const resolvedResults = await Promise.all(filteredResults.map(async (user) => {
        if (!currentUser) return user;
        const relRef = doc(db, `users/${currentUser.uid}/relationships/${user.uid}`);
        const snap = await getDoc(relRef);
        
        let canonicalState = resolveCanonicalState('', '', currentUser.uid);
        let initiatedBy = '';
        
        if (snap.exists()) {
          const data = snap.data() as RelationshipDocument;
          canonicalState = resolveCanonicalState(data.state, data.blockedBy, currentUser.uid);
          initiatedBy = data.initiatedBy || '';
        }
        
        applyCanonicalToUser(user, canonicalState, currentUser.uid, initiatedBy);
        return user;
      }));
      
      setSearchResults(resolvedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to map backend states to Android pill text
  const getPillState = (label?: string) => {
    if (!label) return 'NOT FRIENDS';
    if (label === 'FRIEND') return 'FRIEND';
    if (label.includes('REQUEST')) return 'REQUEST PENDING';
    return 'NOT FRIENDS';
  };

  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* App Bar */}
      <div className="flex items-center px-4 py-3 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <h1 className="text-[20px] font-bold text-white leading-tight">Search</h1>
      </div>

      {/* Search Input Field */}
      <div className="px-4 py-3 bg-[#121212] shrink-0">
        <form onSubmit={handleSearch} className="flex items-center relative gap-3">
          <div className="flex-1 bg-[#1a222c] rounded-full px-5 py-3.5 flex items-center shadow-sm min-w-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username, name, or status"
              className="bg-transparent border-none outline-none text-white text-[15px] placeholder-slate-400 w-full"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching || !searchQuery.trim()}
            className="w-12 h-12 rounded-full bg-[#22c55e] hover:bg-[#1ea34d] flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SearchIcon size={20} className="text-white" />
          </button>
        </form>
      </div>

      {/* Results Area */}
      <div className="flex-grow overflow-y-auto px-4 pb-4 custom-scrollbar flex flex-col gap-3 bg-[#121212]">
         {isSearching ? (
           <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-8 h-8 text-[#22c55e] mb-4 animate-spin" />
           </div>
         ) : searchResults === null || searchResults.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Pure dark background per requirements */}
           </div>
         ) : (
           <div className="w-full flex flex-col gap-3">
             {searchResults.map((user) => {
               const pillState = getPillState(user.stateLabel);
               
               return (
                 <div key={user.uid} className="relative w-full bg-[#1a222c] rounded-[1.25rem] p-4 flex items-start gap-4 shadow-sm">
                   {/* Avatar */}
                   <div className="w-[52px] h-[52px] rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                     {user.profileImage ? (
                       <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                     ) : (
                       <UserIcon className="w-8 h-8 text-slate-400" />
                     )}
                   </div>
                   
                   {/* User Info */}
                   <div className="flex flex-col flex-grow min-w-0 pr-24 mt-0.5">
                     <span className="text-[16px] font-bold text-white mb-0.5 truncate">{user.username}</span>
                     <span className="text-[13px] text-slate-400 leading-snug break-all">{user.email}</span>
                     <span className="text-[13px] text-slate-400 leading-snug truncate mt-0.5">
                       {user.isOnline ? 'Online' : 'Last seen today at 06:31 PM'}
                     </span>
                   </div>
                   
                   {/* Relationship Pill */}
                   <div className="absolute top-4 right-4 z-10">
                     {pillState === 'FRIEND' ? (
                       <span className="inline-block px-2.5 py-1 bg-[#1a4031] text-[#22c55e] font-bold text-[10px] tracking-wider rounded-md uppercase cursor-default">
                         FRIEND
                       </span>
                     ) : pillState === 'REQUEST PENDING' ? (
                       <span className="inline-block px-2.5 py-1 bg-[#2a3441] text-slate-300 font-bold text-[10px] tracking-wider rounded-md uppercase cursor-default">
                         REQUEST PENDING
                       </span>
                     ) : (
                       <button
                         onClick={() => handleAddFriend(user.uid)}
                         className="inline-block px-2.5 py-1 bg-[#2a3441] hover:bg-slate-700 text-slate-300 font-bold text-[10px] tracking-wider rounded-md uppercase transition-colors"
                       >
                         NOT FRIENDS
                       </button>
                     )}
                   </div>
                 </div>
               );
             })}
           </div>
         )}
      </div>
    </div>
  );

  const detailPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#121212] border-l border-slate-800/50 shadow-inner">
       <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50">
         <UserPlus className="w-10 h-10 text-slate-500" />
       </div>
       <h3 className="text-[22px] font-light text-slate-300 tracking-wide mb-2">New Chat</h3>
       <p className="text-[14px] text-slate-500">Search for users to add as friends and start chatting.</p>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="search"
      mobileView="list"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
