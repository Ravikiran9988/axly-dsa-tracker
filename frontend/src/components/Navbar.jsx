import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Terminal, Bell, PlusCircle, Calendar, Menu, X, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAdminDailyModal, onOpenCreateChallenge, unreadCount = 0 }) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div 
              onClick={() => setActiveTab(isAdmin ? 'admin-dashboard' : 'dashboard')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform duration-200 group-hover:scale-105">
                <Terminal className="w-5 h-5 text-white" />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-extrabold tracking-tight text-white font-mono">AXLY</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    DSA Platform
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono hidden sm:block">Code • Practice • Mentor</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="hidden sm:flex items-center space-x-4">
            {isAdmin && (
              <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  id="tab-user-view"
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'dashboard' || activeTab === 'tasks' || activeTab === 'available'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Practice View</span>
                  </span>
                </button>
                <button
                  id="tab-admin-portal"
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab.startsWith('admin')
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </span>
                </button>
              </div>
            )}

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

            {/* User Profile & Role Badge */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center space-x-2.5 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-cyan-300 shadow-sm group-hover:border-cyan-500 transition-colors">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080C14] ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-cyan-300 transition-colors">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>

                <span
                  id="user-role-badge"
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {user.role}
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
              <span
                id="user-role-badge-mobile"
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {user.role}
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

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-4 border-t border-slate-800 bg-[#080C14] space-y-3">
          {isAdmin && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold ${
                  activeTab === 'dashboard' ? 'bg-cyan-600 text-white' : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Practice View</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin-dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold ${
                  activeTab.startsWith('admin') ? 'bg-amber-600 text-white' : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            </div>
          )}

          {user && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-cyan-300 text-xs font-bold flex items-center justify-center">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
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
          )}
        </div>
      )}
    </header>
  );
}
