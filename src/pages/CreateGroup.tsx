import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Check, Users, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { fetchConnectedFriends, resolveMembersByEmails, createGroup } from '../services/groupService';
import type { UserProfile } from '../types/user';
import { DesktopLayout } from '../components/layout/DesktopLayout';

export const CreateGroup: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailFallback, setEmailFallback] = useState('');
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const loadFriends = async () => {
      try {
        const connected = await fetchConnectedFriends(currentUser.uid);
        setFriends(connected);
      } catch (err: any) {
        alert(err.message || 'Failed to load friends');
      } finally {
        setLoadingFriends(false);
      }
    };
    loadFriends();
  }, [currentUser]);

  const toggleSelection = (uid: string) => {
    const next = new Set(selectedUids);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setSelectedUids(next);
  };

  const handleCreateGroup = async () => {
    if (!currentUser) {
      alert("Login required");
      return;
    }
    if (!groupName.trim()) {
      alert("Enter group name");
      return;
    }

    setIsCreating(true);

    try {
      const memberUids = Array.from(selectedUids);
      const emailText = emailFallback.trim().toLowerCase();

      if (emailText) {
        try {
          const resolvedUids = await resolveMembersByEmails([emailText]);
          resolvedUids.forEach(uid => {
            if (!memberUids.includes(uid)) {
              memberUids.push(uid);
            }
          });
        } catch (err: any) {
          console.error("Failed to resolve email", err);
          // Invalid email must NOT block creation, proceed with what we have
        }
      }

      await createGroup(currentUser.uid, groupName.trim(), memberUids);
      console.log("Group created");
      navigate('/groups');
    } catch (err: any) {
      console.error(err);
      alert("Failed to create group");
      setIsCreating(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const name = f.username?.toLowerCase() || '';
    const email = f.email?.toLowerCase() || '';
    return name.includes(query) || email.includes(query);
  });

  const listPanel = (
    <div className="flex flex-col h-full w-full bg-[#121212]">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <button onClick={() => navigate(-1)} className="text-slate-300 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white tracking-wide">Create Group</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Inputs section */}
        <div className="p-4 space-y-4 border-b border-slate-800/50 bg-[#111b21]">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold pl-1">Group Name</label>
            <div className="bg-[#1e293b] rounded-xl flex items-center px-4 h-12 border border-slate-700/50">
              <input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-[15px] placeholder-slate-400 w-full"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold pl-1">Fallback Email (Optional)</label>
            <div className="bg-[#1e293b] rounded-xl flex items-center px-4 h-12 border border-slate-700/50">
              <Mail className="text-slate-400 mr-3" size={18} />
              <input
                type="email"
                placeholder="Add member by email"
                value={emailFallback}
                onChange={(e) => setEmailFallback(e.target.value)}
                className="bg-transparent border-none outline-none text-white text-[15px] placeholder-slate-400 w-full"
              />
            </div>
          </div>
        </div>

        {/* Friend picker section */}
        <div className="p-4 bg-[#111b21] min-h-full">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold pl-1 mb-2 block">
            Select Friends
          </label>
          
          <div className="bg-[#1e293b] rounded-full flex items-center px-4 h-10 border border-slate-700/50 mb-4">
            <Search className="text-slate-400 mr-2" size={18} />
            <input
              type="text"
              placeholder="Search friends"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-[14px] placeholder-slate-400 w-full"
            />
          </div>

          {loadingFriends ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-sm">
              {searchQuery ? "No friends match search." : "No friends available."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.map((user) => {
                const isSelected = selectedUids.has(user.uid);
                return (
                  <div
                    key={user.uid}
                    onClick={() => toggleSelection(user.uid)}
                    className="flex items-center p-2 rounded-lg hover:bg-[#202c33] cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{user.username || 'Unknown'}</div>
                      <div className="text-slate-400 text-xs truncate">{user.email || ''}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${isSelected ? 'bg-[#22c55e] border-[#22c55e]' : 'border-slate-500'}`}>
                      {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer create button */}
      <div className="p-4 bg-[#111827] border-t border-slate-800/50 shrink-0">
        <div className="text-center mb-3">
          <span className="text-sm text-slate-400">
            {selectedUids.size === 0 ? "No members selected" : `Selected (${selectedUids.size})`}
          </span>
        </div>
        <button
          onClick={handleCreateGroup}
          disabled={isCreating}
          className="w-full py-3.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Group"}
        </button>
      </div>
    </div>
  );

  const detailPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#222e35] border-l border-[#313d45]">
       <div className="w-[320px] max-w-full flex flex-col items-center text-center px-4">
         <Users className="w-[120px] h-[120px] text-[#41525d] mb-8" strokeWidth={1} />
         <h3 className="text-[32px] font-light text-[#e9edef] tracking-wide mb-4 leading-tight">Create Group</h3>
         <p className="text-[14px] text-[#8696a0] leading-relaxed">
           Connect with multiple friends at once.<br/>
           Pick members to start.
         </p>
       </div>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="groups"
      mobileView="list"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
