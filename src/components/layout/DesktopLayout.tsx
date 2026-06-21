import React from 'react';
import { MessageSquare, Users, Search, Bell, ClipboardList, UserCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface DesktopLayoutProps {
  activeTab: 'chats' | 'groups' | 'search' | 'notifications' | 'pending' | 'profile' | 'settings';
  mobileView: 'list' | 'detail';
  listPanel: React.ReactNode;
  detailPanel: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  activeTab,
  mobileView,
  listPanel,
  detailPanel
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();

  const getIconColor = (tab: string) => activeTab === tab ? 'text-[#22c55e]' : 'text-slate-400 hover:text-slate-200';

  return (
    <div className="flex h-[100dvh] w-full bg-[#121212] overflow-hidden">
      
      {/* 
        COLUMN 1: Sidebar Navigation (Desktop Only)
        Visible only on lg breakpoints.
      */}
      <div className="hidden lg:flex w-[64px] flex-col items-center py-4 bg-[#111827] border-r border-slate-800/50 shrink-0 z-20">
        
        {/* Top: Logo Placeholder */}
        <div className="w-10 h-10 bg-[#1e293b] rounded-xl flex items-center justify-center mb-5 shadow-sm border border-slate-700/50">
          <MessageSquare className="w-5 h-5 text-[#22c55e]" />
        </div>

        {/* Middle: Navigation Icons */}
        <div className="flex flex-col gap-5 items-center flex-grow w-full mt-2">
          <button onClick={() => navigate('/chat')} className={`p-2 transition-colors ${getIconColor('chats')}`} title="Chats">
            <MessageSquare className="w-[24px] h-[24px]" />
          </button>
          <button onClick={() => navigate('/groups')} className={`p-2 transition-colors ${getIconColor('groups')}`} title="Groups">
            <Users className="w-[24px] h-[24px]" />
          </button>
          <button onClick={() => navigate('/search')} className={`p-2 transition-colors ${getIconColor('search')}`} title="New Chat">
            <Search className="w-[24px] h-[24px]" />
          </button>
          <button onClick={() => navigate('/notifications')} className={`p-2 transition-colors ${getIconColor('notifications')}`} title="Notifications">
            <Bell className="w-[24px] h-[24px]" />
          </button>
          <button onClick={() => navigate('/pending')} className={`p-2 transition-colors ${getIconColor('pending')}`} title="Pending Requests">
            <ClipboardList className="w-[24px] h-[24px]" />
          </button>
        </div>

        {/* Bottom: Profile & Settings */}
        <div className="flex flex-col gap-5 items-center mt-auto w-full mb-2">
          <button onClick={() => navigate('/settings')} className={`p-2 transition-colors ${getIconColor('settings')}`} title="Settings">
            <Settings className="w-[24px] h-[24px]" />
          </button>
          <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-600 hover:border-slate-400 transition-colors cursor-pointer shrink-0">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-6 h-6 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* 
        COLUMN 2: List Panel 
        Mobile: Full width, visible only if mobileView === 'list'
        Desktop: Fixed width 380px, always visible
      */}
      <div className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'} 
        lg:flex 
        w-full lg:w-[400px] xl:w-[420px] 
        flex-col shrink-0 border-r border-slate-800/50 bg-[#121212] z-10 relative overflow-hidden
      `}>
        {listPanel}
      </div>

      {/* 
        COLUMN 3: Content Panel (Detail View)
        Mobile: Full width, visible only if mobileView === 'detail'
        Desktop: Fluid width (flex-1), always visible
      */}
      <div className={`
        ${mobileView === 'detail' ? 'flex' : 'hidden'} 
        lg:flex 
        flex-col flex-1 bg-[#121212] relative overflow-hidden
      `}>
        {detailPanel}
      </div>

    </div>
  );
};
