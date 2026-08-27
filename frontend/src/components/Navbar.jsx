import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Terminal, Sparkles, Menu, X, Code2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#080C14]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-axly-600 via-axly-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-axly-500/25 transition-transform duration-200 group-hover:scale-105">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-axly-500 to-cyan-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300 pointer-events-none" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight text-white font-mono">AXLY</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-axly-500/10 text-axly-400 border border-axly-500/30">
                  DSA Tracker
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">dsatracker.axly.in</p>
            </div>
          </div>

          {/* Desktop Navigation & Profile */}
          <div className="hidden sm:flex items-center space-x-4">
            {isAdmin && (
              <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  id="tab-user-view"
                  onClick={() => setActiveTab('user')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'user'
                      ? 'bg-axly-600 text-white shadow-md shadow-axly-600/30'
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
                  onClick={() => setActiveTab('admin')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
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

            {/* User Profile & Role Badge */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-axly-300 shadow-sm">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080C14] ${isAdmin ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>

                <span
                  id="user-role-badge"
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
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
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
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
                  setActiveTab('user');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold ${
                  activeTab === 'user' ? 'bg-axly-600 text-white' : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Practice View</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold ${
                  activeTab === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-800/80 text-slate-300'
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
                <div className="w-7 h-7 rounded-full bg-slate-800 text-axly-300 text-xs font-bold flex items-center justify-center">
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
