import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, User as UserIcon, Users, Loader2, X, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { ChatMetadata } from '../types/chat';
import type { UserProfile } from '../types/user';
import {
  updateGroupMeta,
  setAdminOnlyMessaging,
  setAdmin,
  removeMember,
  addMember,
  leaveGroup,
  sendGroupSystemMessage,
  resolveMembersByEmails,
  fetchConnectedFriends
} from '../services/groupService';
import { muteChat, unmuteChat, isMutedForUser } from '../services/chatService';

export const GroupSettings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();
  
  const initialChat = location.state?.activeChat as ChatMetadata | undefined;
  
  const [groupData, setGroupData] = useState<any>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  
  // Local edit states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupRules, setGroupRules] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Email add states
  const [emailInput, setEmailInput] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);

  // Friend picker states
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');

  // Member Action Sheet
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Modals
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!initialChat || !currentUser) {
      navigate('/groups');
    }
  }, [initialChat, currentUser, navigate]);

  useEffect(() => {
    if (!initialChat) return;
    const unsub = onSnapshot(doc(db, 'chats', initialChat.chatId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupData(data);
        if (isInitialLoad.current) {
          setGroupName(data.chatName || '');
          setGroupDesc(data.groupDescription || '');
          setGroupRules(data.groupRules || '');
          isInitialLoad.current = false;
        }
      }
    });
    return () => unsub();
  }, [initialChat]);

  // Fetch Member Profiles when participants change
  useEffect(() => {
    if (!groupData?.participants) return;
    const uids = Object.keys(groupData.participants);
    
    const fetchProfiles = async () => {
      const newProfiles = { ...memberProfiles };
      let changed = false;
      for (const uid of uids) {
        if (!newProfiles[uid]) {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            newProfiles[uid] = snap.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) {
        setMemberProfiles(newProfiles);
      }
    };
    fetchProfiles();
  }, [groupData?.participants]);

  if (!initialChat || !currentUser || !groupData) return null;

  const isAdmin = groupData.admins && groupData.admins[currentUser.uid] === true;
  const isMuted = isMutedForUser(groupData, currentUser.uid);
  const onlyAdminsCanMessage = groupData.groupSettings?.onlyAdminsCanMessage === true;

  const handleSaveMeta = async () => {
    if (!isAdmin || !groupName.trim()) return;
    setSavingMeta(true);
    try {
      await updateGroupMeta(initialChat.chatId, groupName.trim(), groupDesc.trim(), groupRules.trim());
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleToggleAdminOnly = async () => {
    if (!isAdmin) return;
    await setAdminOnlyMessaging(initialChat.chatId, !onlyAdminsCanMessage);
  };

  const handleToggleMute = async () => {
    if (isMuted) {
      await unmuteChat(initialChat.chatId, currentUser.uid, true);
    } else {
      await muteChat(initialChat.chatId, currentUser.uid, true);
    }
  };

  const handleAddByEmail = async () => {
    if (!emailInput.trim()) return;
    setAddingEmail(true);
    try {
      const uids = await resolveMembersByEmails([emailInput.trim()]);
      if (uids.length === 0) {
        alert("User not found");
        return;
      }
      const newMemberUid = uids[0];
      if (groupData.participants && groupData.participants[newMemberUid]) {
        alert("User is already a member");
        return;
      }
      await addMember(initialChat.chatId, newMemberUid);
      
      // Send System Message
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const targetDoc = await getDoc(doc(db, 'users', newMemberUid));
      const myName = myDoc.exists() ? myDoc.data().username : "Someone";
      const targetName = targetDoc.exists() ? targetDoc.data().username : "new member";
      await sendGroupSystemMessage(initialChat.chatId, currentUser.uid, `${myName} added ${targetName}`);
      
      setEmailInput('');
    } catch (e) {
      console.error(e);
      alert("Failed to add member");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleOpenFriendPicker = async () => {
    setShowFriendPicker(true);
    setLoadingFriends(true);
    try {
      const users = await fetchConnectedFriends(currentUser.uid);
      setFriends(users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAddFriendToGroup = async (targetUid: string) => {
    if (groupData.participants && groupData.participants[targetUid]) return;
    try {
      setShowFriendPicker(false);
      await addMember(initialChat.chatId, targetUid);
      
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const targetDoc = await getDoc(doc(db, 'users', targetUid));
      const myName = myDoc.exists() ? myDoc.data().username : "Someone";
      const targetName = targetDoc.exists() ? targetDoc.data().username : "new member";
      await sendGroupSystemMessage(initialChat.chatId, currentUser.uid, `${myName} added ${targetName}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAdminStatus = async () => {
    if (!isAdmin || !selectedMember) return;
    const isTargetAdmin = groupData.admins && groupData.admins[selectedMember];
    try {
      await setAdmin(initialChat.chatId, selectedMember, !isTargetAdmin);
    } catch (e) {
      console.error(e);
    } finally {
      setSelectedMember(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!isAdmin || !selectedMember) return;
    const targetUid = selectedMember;
    setSelectedMember(null);
    try {
      await removeMember(initialChat.chatId, targetUid);
      
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const targetDoc = memberProfiles[targetUid]; // Can use cached
      const myName = myDoc.exists() ? myDoc.data().username : "Someone";
      const targetName = targetDoc ? targetDoc.username : "a member";
      await sendGroupSystemMessage(initialChat.chatId, currentUser.uid, `${targetName} was removed by ${myName}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(initialChat.chatId, currentUser.uid);
      navigate('/groups');
    } catch (e) {
      console.error(e);
      alert("Failed to leave group");
    }
  };

  const participantsList = Object.keys(groupData.participants || {});
  
  const filteredFriends = friends.filter(f => {
    if (groupData.participants && groupData.participants[f.uid]) return false;
    const q = friendSearchQuery.toLowerCase();
    if (!q) return true;
    return f.username?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
  });

  const listPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#121212] border-r border-slate-800/50 shadow-inner">
       <div 
         onClick={() => navigate('/groups')}
         className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
       >
         <Users className="w-8 h-8 text-slate-500" />
       </div>
       <h3 className="text-[20px] font-light text-slate-300 tracking-wide mb-2">Return to Groups</h3>
       <p className="text-[13px] text-slate-500">Click to go back to your groups list.</p>
    </div>
  );

  const detailPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* Secondary App Bar */}
      <div className="flex items-center px-4 py-3 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-5 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={26} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white leading-tight">Group Settings</h1>
          <span className="text-[13px] text-slate-400 font-medium">{groupData.chatName || 'Unnamed Group'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] p-4 custom-scrollbar relative z-0">
        
        {/* Group Details Section */}
        <div className="flex flex-col gap-4 mb-5">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={!isAdmin}
            placeholder="Group Name"
            className={`w-full bg-[#1e293b] rounded-2xl px-5 py-4 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-600 border border-slate-700/50 ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
          <input
            type="text"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            disabled={!isAdmin}
            placeholder="Group description/about"
            className={`w-full bg-[#1e293b] rounded-2xl px-5 py-4 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-600 border border-slate-700/50 ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
          <textarea
            value={groupRules}
            onChange={(e) => setGroupRules(e.target.value)}
            disabled={!isAdmin}
            placeholder="Group rules"
            rows={3}
            className={`w-full bg-[#1e293b] rounded-2xl px-5 py-4 text-[16px] text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-600 border border-slate-700/50 resize-none ${!isAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
          ></textarea>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSaveMeta}
          disabled={!isAdmin || savingMeta || !groupName.trim()}
          className={`w-full font-bold text-[15px] py-3.5 rounded-xl transition-colors mb-3 ${isAdmin && groupName.trim() ? 'bg-[#22c55e] text-[#121212] hover:bg-[#16a34a]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          {savingMeta ? 'SAVING...' : 'SAVE GROUP SETTINGS'}
        </button>

        {/* Helper Text */}
        <p className="text-[13px] text-slate-400 leading-snug mb-8 px-1">
          Only admins can edit group details and manage admin/member roles. Any member can add new participants.
        </p>

        {/* Toggles Section */}
        <div className="flex flex-col gap-6 mb-8 px-1">
          <div className={`flex items-center justify-between ${!isAdmin ? 'opacity-60' : 'cursor-pointer'}`} onClick={() => isAdmin && handleToggleAdminOnly()}>
            <span className="text-[16px] text-white">Only admins can send messages</span>
            <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${onlyAdminsCanMessage ? 'bg-[#22c55e]' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 rounded-full transition-transform ${onlyAdminsCanMessage ? 'translate-x-5 bg-[#121212]' : 'bg-slate-400'}`}></div>
            </div>
          </div>
          <div className="flex items-center justify-between cursor-pointer" onClick={handleToggleMute}>
            <span className="text-[16px] text-white">Mute this group</span>
            <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${isMuted ? 'bg-[#22c55e]' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 rounded-full transition-transform ${isMuted ? 'translate-x-5 bg-[#121212]' : 'bg-slate-400'}`}></div>
            </div>
          </div>
        </div>

        {/* Add Member Section */}
        <div className="flex flex-col gap-4 mb-4">
          <input
            type="text"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="Add non-friend by email (fallback)"
            className="w-full bg-[#1e293b] rounded-full px-5 py-3.5 text-[15px] text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-600 border border-slate-700/50"
          />
          <button 
            onClick={handleAddByEmail}
            disabled={addingEmail || !emailInput.trim()}
            className="w-full bg-[#111827] text-white font-bold text-[14px] py-3.5 rounded-full hover:bg-slate-800 transition-colors border border-slate-700/50 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {addingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ADD BY EMAIL'}
          </button>
          <button 
            onClick={handleOpenFriendPicker}
            className="w-full bg-[#22c55e] text-[#121212] font-bold text-[14px] py-3.5 rounded-full hover:bg-[#16a34a] transition-colors"
          >
            ADD FROM FRIENDS
          </button>
        </div>

        {/* Leave Group Button */}
        <button 
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full bg-[#111827] text-red-400 font-bold text-[14px] py-3.5 rounded-full hover:bg-slate-800 transition-colors border border-slate-700/50 mb-8"
        >
          LEAVE GROUP
        </button>

        {/* Members Section */}
        <div className="mb-6">
          <h2 className="text-slate-400 text-[14px] font-medium mb-3 px-1">Current members ({participantsList.length})</h2>
          
          <div className="flex flex-col gap-3">
            {participantsList.map(uid => {
              const profile = memberProfiles[uid];
              const isMemberAdmin = groupData.admins && groupData.admins[uid] === true;
              const isMe = uid === currentUser.uid;
              return (
                <div 
                  key={uid} 
                  onClick={() => {
                    if (isAdmin && !isMe) setSelectedMember(uid);
                  }}
                  className={`w-full bg-[#1a222c] rounded-2xl p-4 flex items-center gap-4 border border-slate-700/50 ${isAdmin && !isMe ? 'cursor-pointer hover:bg-slate-800/80 transition-colors' : ''}`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                      {profile?.profileImage ? (
                        <img src={profile.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[16px] font-bold text-white">
                      {isMe ? 'You' : profile?.username || 'Loading...'}
                    </span>
                    {isMemberAdmin && <span className="text-[13px] text-[#53bdeb] font-medium mt-0.5">Admin</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Member Action Bottom Sheet */}
      {selectedMember && (
        <>
          <div className="absolute inset-0 bg-black/60 z-20" onClick={() => setSelectedMember(null)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-[#1e293b] rounded-t-2xl z-30 flex flex-col p-2 animate-slide-up shadow-2xl border-t border-slate-700">
            <div className="flex justify-center py-2 mb-2">
              <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
            </div>
            
            <button onClick={handleToggleAdminStatus} className="w-full text-left px-5 py-4 text-white text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
              {groupData.admins && groupData.admins[selectedMember] ? 'Remove admin' : 'Make admin'}
            </button>
            <button onClick={handleRemoveMember} className="w-full text-left px-5 py-4 text-red-400 text-[16px] font-medium hover:bg-slate-800 rounded-xl transition-colors">
              Remove member
            </button>
            <div className="h-4"></div>
          </div>
        </>
      )}

      {/* Friend Picker Modal */}
      {showFriendPicker && (
        <div className="absolute inset-0 bg-black/80 z-40 flex flex-col animate-fade-in backdrop-blur-sm">
          <div className="flex-1 overflow-hidden flex flex-col mt-auto bg-[#121212] rounded-t-3xl border-t border-slate-700/50 shadow-2xl" style={{ height: '85%' }}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-white text-lg font-bold">Add from Friends</h2>
              <button onClick={() => setShowFriendPicker(false)} className="text-slate-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-[#111827]">
              <div className="bg-[#1e293b] rounded-full flex items-center px-4 h-12 border border-slate-700/50 w-full">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search friends"
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-[15px] placeholder-slate-400 w-full"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loadingFriends ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-slate-500 text-center py-8">No friends match this search</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredFriends.map(f => (
                    <div 
                      key={f.uid} 
                      onClick={() => handleAddFriendToGroup(f.uid)}
                      className="w-full bg-[#1a222c] rounded-2xl p-4 flex items-center gap-4 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {f.profileImage ? (
                          <img src={f.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pr-4">
                        <span className="text-[16px] font-bold text-white truncate">{f.username}</span>
                        <span className="text-[13px] text-slate-400 truncate">{f.email}</span>
                      </div>
                      <button className="px-4 py-1.5 bg-[#22c55e]/10 text-[#22c55e] font-bold text-[12px] rounded-full shrink-0 border border-[#22c55e]/20">
                        ADD
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-700 animate-fade-in">
            <h3 className="text-white text-xl font-bold mb-2">Leave group?</h3>
            <p className="text-slate-300 mb-8">You will stop receiving messages from this group.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowLeaveConfirm(false)}
                className="px-5 py-2.5 text-slate-300 font-medium hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLeaveGroup}
                className="px-5 py-2.5 bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center border border-red-500/20"
              >
                Leave
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
      activeTab="groups"
      mobileView="detail"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
