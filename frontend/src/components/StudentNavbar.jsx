import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Terminal, Bell, LogOut, Menu, X, Flame, Zap } from 'lucide-react';

export default function StudentNavbar({
  activeTab,
  setActiveTab,
  unreadCount = 0
}) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-xl transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform duration-200 group-hover:scale-105">
                <Terminal className="w-5 h-5 text-white" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white font-mono">
                    AXLY DSA
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Learning Hub
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  Practice • Algorithms • Mastery
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center space-x-3.5">
            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Student Profile & Badge */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center space-x-2.5 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-cyan-300 shadow-sm group-hover:border-cyan-500 transition-colors">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080C14] bg-emerald-400" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-cyan-300 transition-colors">
                      {user.name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>
                </div>

                <span
                  id="user-role-badge"
                  className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  STUDENT
                </span>

                <button
                  id="logout-button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center space-x-2 sm:hidden">
            {user && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                STUDENT
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-4 border-t border-slate-800 bg-[#080C14] space-y-3">
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-cyan-300 text-xs font-bold flex items-center justify-center">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-white">{user?.name || user?.email}</p>
                <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
