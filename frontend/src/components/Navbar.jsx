import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-axly-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-axly-500/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">AXLY</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-axly-500/10 text-axly-400 border border-axly-500/30">
                  DSA Tracker
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">dsatracker.axly.in</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  id="tab-user-view"
                  onClick={() => setActiveTab('user')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'user'
                      ? 'bg-axly-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Practice View</span>
                  </span>
                </button>
                <button
                  id="tab-admin-portal"
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Portal</span>
                  </span>
                </button>
              </div>
            )}

            {/* User Profile & Role Badge */}
            {user && (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-axly-400">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-medium text-slate-200 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>

                <span
                  id="user-role-badge"
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {user.role}
                </span>

                <button
                  id="logout-button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
