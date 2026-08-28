import React from 'react';
import { LayoutDashboard, Calendar, History, Route, Code2, Trophy, Bell, User, Settings, LogOut, Shield, Users, GitPullRequest, ChevronLeft, ChevronRight, Flame, Zap, TrendingUp, ShieldAlert } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isCollapsed, setIsCollapsed, unreadCount = 0 }) {
  const isAdmin = user?.role === 'admin';
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily', label: 'Daily Challenge', icon: Calendar },
    { id: 'practice', label: 'Practice', icon: Code2 },
    { id: 'analytics', label: 'Progress', icon: TrendingUp },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'submissions', label: 'Submission History', icon: History }
  ];
  const learningNavItems = [{ id: 'learning-path', label: 'Learning Path', icon: Route }];
  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Question Management', icon: Shield },
    { id: 'admin-users', label: 'Students', icon: Users },
    { id: 'admin-reviews', label: 'Code Reviews', icon: GitPullRequest },
    { id: 'admin-audit', label: 'Security & Audit', icon: ShieldAlert }
  ];
  const accountNavItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderItems = (items, admin = false) => items.map(item => {
    const Icon = item.icon;
    const active = currentView === item.id;
    return <button key={item.id} onClick={() => setCurrentView(item.id)} title={isCollapsed ? item.label : undefined}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${active ? (admin ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-300 border border-amber-500/30' : 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 border border-cyan-500/30') : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}>
      <div className="flex items-center gap-3 min-w-0"><Icon className={`w-4 h-4 shrink-0 ${active ? (admin ? 'text-amber-400' : 'text-cyan-400') : 'text-slate-400'}`} />{!isCollapsed && <span className="truncate">{item.label}</span>}</div>
      {!isCollapsed && item.badge > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950">{item.badge}</span>}
    </button>;
  });
  const section = (label, items, admin = false) => <div className="space-y-1">{!isCollapsed && <div className={`px-3 text-[10px] font-bold tracking-wider uppercase ${admin ? 'text-amber-400/90' : 'text-slate-400'}`}>{label}</div>}{renderItems(items, admin)}</div>;

  return <aside className={`relative flex flex-col h-screen border-r border-slate-800/80 bg-[#080C14] transition-all duration-300 z-30 shrink-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
    <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
      <div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0"><span className="font-extrabold text-white text-base tracking-wider font-mono">AX</span></div>{!isCollapsed && <div className="flex flex-col"><span className="font-extrabold text-white text-sm tracking-wider font-mono leading-none">AXLY DSA</span><span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mt-1">Learning Hub</span></div>}</div>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800" title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
    </div>
    {!isCollapsed && user && <div className="p-3 mx-3 my-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900/80 border border-cyan-900/30"><div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5 text-amber-400 font-bold"><Flame className="w-4 h-4 fill-amber-400" /><span>{user.streak || 0} Day Streak</span></div><div className="flex items-center gap-1 text-cyan-300 font-semibold text-[11px]"><Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /><span>{user.points || 0} pts</span></div></div></div>}
    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
      {section('Main', mainNavItems)}
      {section('Learning', learningNavItems)}
      {isAdmin && <div className="space-y-1 pt-2 border-t border-slate-800/60">{section('Admin', adminNavItems, true)}</div>}
      <div className="space-y-1 pt-2 border-t border-slate-800/60">{section('Account', accountNavItems)}</div>
      <button onClick={onLogout} title={isCollapsed ? 'Log out' : undefined} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 mt-2"><LogOut className="w-4 h-4 shrink-0" />{!isCollapsed && <span>Log out</span>}</button>
    </div>
    <div className="p-3 border-t border-slate-800/80 bg-slate-950/40"><div onClick={() => setCurrentView('profile')} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/40 cursor-pointer"><div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>{!isCollapsed && <div className="flex flex-col min-w-0 flex-1"><span className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</span><div className="flex items-center justify-between gap-1"><span className="text-[10px] text-slate-400 truncate">{user?.email || ''}</span><span className="text-[9px] uppercase font-bold px-1.5 rounded bg-slate-800 text-cyan-400">{user?.role}</span></div></div>}</div></div>
  </aside>;
}
