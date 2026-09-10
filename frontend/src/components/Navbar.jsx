import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Shield, User, LogOut, Bell, Menu, X, Sun, Moon } from 'lucide-react';

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

export default function Navbar({ activeTab, setActiveTab, onOpenAdminDailyModal, onOpenCreateChallenge, unreadCount = 0, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const pageTitle = PAGE_TITLES[activeTab] || 'Axly DSA Platform';

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-theme-border bg-theme-bg backdrop-blur-sm flex items-center px-4 sm:px-6 gap-4">
      {/* Mobile: Hamburger + Brand (Left side) */}
      <div className="flex items-center gap-1 sm:hidden shrink-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 -ml-1 rounded-md text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h2 className="text-sm font-bold tracking-tight text-theme-text1 font-mono">
          AXLY
        </h2>
      </div>

      {/* Page title (Desktop only) */}
      <div className="hidden sm:block flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-theme-text1 truncate">{pageTitle}</h2>
      </div>

      {/* Spacer for mobile to push actions to the right */}
      <div className="flex-1 sm:hidden"></div>

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Admin/Practice switcher */}
        {isAdmin && (
          <div className="flex bg-theme-surface border border-theme-border rounded-md p-0.5 gap-0.5">
            <button
              id="tab-user-view"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                !activeTab.startsWith('admin')
                  ? 'bg-theme-cyan text-theme-text1'
                  : 'text-theme-text2 hover:text-theme-text1'
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
                  ? 'bg-indigo-500 text-white'
                  : 'text-theme-text2 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>
        )}

        <button
          onClick={() => setActiveTab('notifications')}
          className="relative p-2 rounded-md text-theme-text3 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-theme-cyan text-theme-text1 font-bold text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-md text-theme-text3 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-theme-border">
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to profile"
            >
              <div className="relative w-7 h-7 rounded-full bg-theme-surface2 border border-theme-border flex items-center justify-center text-xs font-bold text-theme-cyan">
                {(user.name || 'U')[0].toUpperCase()}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#070B14] ${isAdmin ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-theme-text1 leading-none">{user.name}</div>
              </div>
            </button>
            <button
              id="logout-button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-md text-theme-text2 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: actions (Right side) */}
      <div className="flex items-center gap-1 sm:hidden">
        {/* Mobile Portal Switcher */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab(activeTab.startsWith('admin') ? 'dashboard' : 'admin-dashboard')}
            className={`mr-1 flex items-center gap-1.5 h-[32px] px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors ${
              activeTab.startsWith('admin')
                ? 'bg-theme-cyan text-theme-bg shadow-sm'
                : 'bg-indigo-500 text-white shadow-sm'
            }`}
          >
            {activeTab.startsWith('admin') ? (
              <>
                <span>Practice</span>
              </>
            ) : (
              <>
                <span>Admin</span>
              </>
            )}
          </button>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-theme-text3 hover:text-theme-text1"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className="relative p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-theme-text3 hover:text-theme-text1"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-theme-cyan text-theme-text1 text-[8px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
