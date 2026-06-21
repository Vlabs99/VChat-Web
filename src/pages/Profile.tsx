import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ClipboardList, MoreVertical, MessageSquare, Users, User as UserIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DesktopLayout } from '../components/layout/DesktopLayout';
import { useAuthStore } from '../store/useAuthStore';
import { getUserProfile, updateUserProfile, uploadProfileImage } from '../services/userService';
import { auth } from '../services/firebase';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setUsername(profile.username || '');
          setEmail(profile.email || currentUser.email || '');
          setBio(profile.bio || '');
          setProfileImage(profile.profileImage || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser, navigate]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!username.trim()) {
      alert('Username cannot be empty');
      return;
    }
    
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        username: username.trim(),
        bio: bio.trim()
      });
      alert('Profile updated');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUser) return;
    const file = e.target.files[0];
    e.target.value = '';
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadProfileImage(currentUser.uid, file);
      await updateUserProfile(currentUser.uid, { profileImage: url });
      setProfileImage(url);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const listPanel = (
    <div className="flex flex-col h-full w-full relative bg-[#121212]">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#111827] shrink-0 shadow-sm border-b border-slate-800/50">
        <h1 className="text-xl font-bold text-white tracking-wide">VChat</h1>
        <div className="flex items-center gap-6 text-slate-300">
          <div className="relative cursor-pointer">
            <Bell size={22} />
          </div>
          <ClipboardList size={22} className="cursor-pointer" />
          <MoreVertical size={22} className="cursor-pointer" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] custom-scrollbar px-4 pt-8 pb-8">
        
        {/* Profile Image & Change Photo */}
        <div className="flex flex-col items-center mb-8">
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
          <div className="w-32 h-32 bg-[#1e293b] rounded-3xl flex items-center justify-center shadow-lg overflow-hidden mb-3 relative">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-16 h-16 text-slate-400" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-[#22c55e] font-semibold text-sm active:opacity-70 transition-opacity disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
        </div>

        {/* Input Fields Container */}
        <div className="flex flex-col gap-5 w-full">
          
          {/* Username Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-200 text-sm ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[#1a222c] rounded-2xl px-5 py-4 text-white text-[15px] outline-none border border-transparent focus:border-slate-700 w-full transition-colors"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-200 text-sm ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#1a222c] rounded-2xl px-5 py-4 text-white text-[15px] outline-none border border-transparent focus:border-slate-700 w-full transition-colors"
            />
          </div>

          {/* Bio Field */}
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-slate-200 text-sm ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-[#1a222c] rounded-2xl px-5 py-4 text-white text-[15px] outline-none border border-transparent focus:border-slate-700 w-full min-h-[120px] resize-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-2">
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full bg-[#22c55e] text-[#121212] font-bold text-[15px] py-4 rounded-xl shadow-md active:bg-[#16a34a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-[#1a222c] text-white font-bold text-[15px] py-4 rounded-xl active:bg-[#1e293b] transition-colors"
            >
              Logout
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Navigation & Footer */}
      <div className="shrink-0 bg-[#121212] flex flex-col z-10 border-t border-slate-800/50 lg:hidden">
        <div className="flex justify-center pt-2 pb-0.5">
          <span className="text-[11px] text-slate-500">from Vishvarajsinh</span>
        </div>
        <div className="flex items-center justify-around pb-3 pt-2">
          <div onClick={() => navigate('/chat')} className="flex flex-col items-center gap-1 cursor-pointer">
            <MessageSquare size={26} className="text-[#22c55e]" />
          </div>
          <div onClick={() => navigate('/groups')} className="flex flex-col items-center gap-1 cursor-pointer">
            <Users size={26} className="text-[#22c55e]" />
          </div>
          <div onClick={() => navigate('/search')} className="flex flex-col items-center gap-1 cursor-pointer">
            <Search size={26} className="text-[#22c55e]" />
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <UserIcon size={26} className="text-[#22c55e]" />
            <span className="text-[10px] text-[#22c55e] font-medium">Profile</span>
          </div>
        </div>
      </div>
    </div>
  );

  const detailPanel = (
    <div className="hidden lg:flex flex-col items-center justify-center h-full w-full bg-[#121212] border-l border-slate-800/50 shadow-inner">
       <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50">
         <UserIcon className="w-10 h-10 text-slate-500" />
       </div>
       <h3 className="text-[22px] font-light text-slate-300 tracking-wide mb-2">Profile</h3>
       <p className="text-[14px] text-slate-500">Manage your account settings.</p>
    </div>
  );

  return (
    <DesktopLayout
      activeTab="profile"
      mobileView="list"
      listPanel={listPanel}
      detailPanel={detailPanel}
    />
  );
};
