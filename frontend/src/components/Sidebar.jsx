import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Compass,
  History,
  Route,
  Code2,
  Trophy,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  TrendingUp,
  ShieldAlert,
  Sliders,
  GitPullRequest
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isCollapsed, setIsCollapsed, unreadCount = 0 }) {
  const isAdmin = user?.role === 'admin';

  const adminSections = [
    {
      title: null,
      items: [{ id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'DSA Management',
      items: [
        { id: 'admin-challenges', label: 'Questions & Versions', icon: Code2 },
        { id: 'admin-daily', label: 'Daily Challenge', icon: Calendar },
        { id: 'admin-reviews', label: 'Manual & AI Reviews', icon: GitPullRequest }
      ]
    },
    {
      title: 'Learners & Progress',
      items: [
        { id: 'admin-users', label: 'Students', icon: Users },
        { id: 'admin-progress', label: 'Student Progress', icon: TrendingUp },
        { id: 'admin-submissions', label: 'Submissions History', icon: History }
      ]
    },
    {
      title: 'System & Security',
      items: [
        { id: 'admin-audit', label: 'Audit Logs', icon: ShieldAlert },
        { id: 'admin-settings', label: 'Platform Settings', icon: Sliders }
      ]
    },
    {
      title: 'Account',
      items: [{ id: 'profile', label: 'Profile', icon: User }]
    }
  ];

  const learnerSections = [
    {
      title: 'Core Product',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'daily', label: 'Daily Challenge', icon: Calendar },
        { id: 'available', label: 'Practice Library', icon: Compass },
        { id: 'submissions', label: 'Submission History', icon: History }
      ]
    },
    {
      title: 'Progress & Rank',
      items: [
        { id: 'analytics', label: 'My Progress & Analytics', icon: TrendingUp },
        { id: 'leaderboard', label: 'Competitive Leaderboard', icon: Trophy },
        { id: 'learning-path', label: 'Learning Path', icon: Route }
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const sections = isAdmin ? adminSections : learnerSections;

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-slate-800/80 bg-[#080C14] transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
            isAdmin
              ? 'bg-gradient-to-tr from-rose-600 via-indigo-600 to-cyan-500 shadow-indigo-500/20'
              : 'bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 shadow-cyan-500/20'
          }`}>
            <span className="font-extrabold text-white text-base tracking-wider font-mono">AX</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white text-sm tracking-wider font-mono leading-none truncate">
                AXLY DSA
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 truncate ${
                isAdmin ? 'text-rose-400' : 'text-cyan-400'
              }`}>
                {isAdmin ? 'Admin Portal' : 'DSA Tracker'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 mx-3 my-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-inner">
          {isAdmin ? (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <Shield className="w-4 h-4" />
                <span>Super Administrator</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300">ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Flame className="w-4 h-4 fill-amber-400" />
                <span>{user?.streak || 1} Day Streak</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-300 font-semibold text-[11px]">
                <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                <span>{user?.points || 100} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-5">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && section.title && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">{section.title}</div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id || 
                (item.id === 'available' && (currentView === 'practice' || currentView === 'available')) ||
                (item.id === 'admin-challenges' && (currentView === 'admin-questions' || currentView === 'admin-challenges'));
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/15 to-transparent text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || 'User'} className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">{user?.name || user?.email?.split('@')[0]}</span>
                <span className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all ${isCollapsed ? 'w-full flex justify-center' : ''}`}
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
