import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Bell, Menu, X } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  available: 'Practice Library',
  practice: 'Practice Library',
  daily: 'Daily Challenge',
  submissions: 'Submission History',
  analytics: 'My Progress',
  leaderboard: 'Leaderboard',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  'learning-path': 'Learning Path',
  'admin-dashboard': 'Admin Dashboard',
  'admin-challenges': 'Question Bank',
  'admin-questions': 'Question Bank',
  'admin-daily': 'Daily Challenge',
  'admin-reviews': 'Submission Reviews',
  'admin-users': 'Students',
  'admin-progress': 'Student Progress',
  'admin-submissions': 'Submissions Log',
  'admin-audit': 'Audit Logs',
  'admin-settings': 'Settings',
  solve: 'Problem Workspace',
};

export default function Navbar({ activeTab, setActiveTab, onOpenAdminDailyModal, onOpenCreateChallenge, unreadCount = 0 }) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = PAGE_TITLES[activeTab] || 'Axly DSA Platform';

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-[#1a2540] bg-[#070B14]/95 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-4">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-white truncate">{pageTitle}</h2>
      </div>

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Admin/Practice switcher */}
        {isAdmin && (
          <div className="flex bg-[#0d1525] border border-[#1a2540] rounded-md p-0.5 gap-0.5">
            <button
              id="tab-user-view"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                !activeTab.startsWith('admin')
                  ? 'bg-axly-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Practice
            </button>
            <button
              id="tab-admin-portal"
              onClick={() => setActiveTab('admin-dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                activeTab.startsWith('admin')
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        )}

        {/* Notifications */}
        <button
          onClick={() => setActiveTab('notifications')}
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-200 hover:bg-[#111c2e] transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-axly-500 text-white font-bold text-[9px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-[#1a2540]">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to profile"
            >
              <div className="relative w-7 h-7 rounded-full bg-[#1a2540] border border-[#253556] flex items-center justify-center text-xs font-bold text-axly-300">
                {(user.name || 'U')[0].toUpperCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#070B14] ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-200 leading-none">{user.name}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{user.role}</div>
              </div>
            </button>
            <button
              id="logout-button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: hamburger + notifications */}
      <div className="flex items-center gap-1 sm:hidden">
        <button
          onClick={() => setActiveTab('notifications')}
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-200"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-axly-500 text-white text-[8px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-slate-500 hover:text-slate-200 hover:bg-[#111c2e]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#070B14] border-b border-[#1a2540] px-4 py-3 space-y-2 sm:hidden z-50">
          {isAdmin && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold ${
                  !activeTab.startsWith('admin') ? 'bg-axly-600 text-white' : 'bg-[#0d1525] text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Practice
              </button>
              <button
                onClick={() => { setActiveTab('admin-dashboard'); setMobileMenuOpen(false); }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold ${
                  activeTab.startsWith('admin') ? 'bg-amber-600 text-white' : 'bg-[#0d1525] text-slate-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </button>
            </div>
          )}
          {user && (
            <div className="flex items-center justify-between pt-2 border-t border-[#1a2540]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1a2540] flex items-center justify-center text-xs font-bold text-axly-300">
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{user.name}</div>
                  <div className="text-[10px] text-slate-500">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-md font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
