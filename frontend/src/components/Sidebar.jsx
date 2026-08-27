import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Compass,
  CheckSquare,
  History,
  GraduationCap,
  Code2,
  Trophy,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  Users,
  PlusCircle,
  ClipboardList,
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
  Flame,
  Radio
} from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({
  currentView,
  setCurrentView,
  user,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  unreadCount = 0
}) {
  const isAdmin = user?.role === 'admin';

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily Challenge', icon: Calendar },
    { id: 'available', label: 'Available Challenges', icon: Compass },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'submissions', label: 'Submission History', icon: History }
  ];

  const learningNavItems = [
    { id: 'learning-path', label: 'Learning Path', icon: GraduationCap },
    { id: 'practice', label: 'Practice Bank', icon: Code2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }
  ];

  const accountNavItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Admin KPI Overview', icon: Shield },
    { id: 'admin-challenges', label: 'Manage Challenges', icon: Code2 },
    { id: 'admin-create', label: 'Create Challenge', icon: PlusCircle },
    { id: 'admin-users', label: 'User Directory', icon: Users },
    { id: 'admin-cohorts', label: 'Cohort Batches', icon: Radio },
    { id: 'admin-assignments', label: 'Assignments Manager', icon: ClipboardList },
    { id: 'admin-reviews', label: 'Mentor Reviews', icon: GitPullRequest }
  ];

  return (
    <aside
      className={`relative flex flex-col bg-[#0A0F1D]/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div 
          onClick={() => setCurrentView(isAdmin ? 'admin-dashboard' : 'dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <span className="text-white font-extrabold text-lg tracking-wider">A</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                Axly <span className="text-cyan-400 font-normal text-xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">DSA</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate">Challenge & Tasks</span>
            </div>
          )}
        </div>

        {/* Toggle Collapse */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Streak / Level Pill */}
      {!isCollapsed && user && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">{user.streak || 1} Day Streak</div>
              <div className="text-[10px] text-slate-400">{user.points || 100} Points</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Rank #{user.rank || 3}
          </span>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-1">
          {!isCollapsed && <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Main</div>}
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Learning Section */}
        <div className="space-y-1">
          {!isCollapsed && <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Learning</div>}
          {learningNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Admin Section (If admin) */}
        {isAdmin && (
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            {!isCollapsed && (
              <div className="px-3 flex items-center justify-between text-[10px] font-bold tracking-wider text-amber-400/90 uppercase">
                <span>Mentor & Admin</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-[9px]">STAFF</span>
              </div>
            )}
            {adminNavItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Account Section */}
        <div className="space-y-1 pt-2 border-t border-slate-800/60">
          {!isCollapsed && <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Account</div>}
          {accountNavItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {item.badge > 0 && !isCollapsed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors group mt-2"
            title={isCollapsed ? 'Log out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5 text-rose-400" />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div 
          onClick={() => setCurrentView('profile')}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</span>
              <span className="text-[10px] text-slate-400 truncate">{user?.email || ''}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
