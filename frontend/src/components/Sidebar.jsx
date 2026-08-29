import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Compass,
  History,
  Code2,
  Trophy,
  Bell,
  User,
  LogOut,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  TrendingUp,
  ShieldAlert,
  GitPullRequest,
  Terminal
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isCollapsed, setIsCollapsed, unreadCount = 0 }) {
  const isAdmin = user?.role === 'admin';

  const adminSections = [
    {
      title: null,
      items: [{ id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'Content',
      items: [
        { id: 'admin-challenges', label: 'Question Bank', icon: Code2 },
        { id: 'admin-daily', label: 'Daily Challenge', icon: Calendar },
        { id: 'admin-reviews', label: 'Reviews', icon: GitPullRequest }
      ]
    },
    {
      title: 'Students',
      items: [
        { id: 'admin-users', label: 'Students', icon: Users },
        { id: 'admin-progress', label: 'Progress', icon: TrendingUp },
        { id: 'admin-submissions', label: 'Submissions', icon: History }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'admin-audit', label: 'Audit Logs', icon: ShieldAlert },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    }
  ];

  const learnerSections = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Practice',
      items: [
        { id: 'available', label: 'Problem Library', icon: Compass },
        { id: 'daily', label: 'Daily Challenge', icon: Calendar },
        { id: 'submissions', label: 'Submission History', icon: History },
      ]
    },
    {
      title: 'Compete',
      items: [
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'analytics', label: 'My Progress', icon: TrendingUp },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    }
  ];

  const sections = isAdmin ? adminSections : learnerSections;

  function isActive(item) {
    if (currentView === item.id) return true;
    if (item.id === 'available' && (currentView === 'practice' || currentView === 'available')) return true;
    if (item.id === 'admin-challenges' && (currentView === 'admin-questions' || currentView === 'admin-challenges')) return true;
    return false;
  }

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-[#1a2540] bg-[#070B14] transition-all duration-200 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-[52px]' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-[#1a2540] shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isAdmin ? 'bg-amber-600' : 'bg-axly-600'
          }`}>
            <Terminal className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 leading-none">
              <span className="font-bold text-white text-sm tracking-tight font-mono truncate">AXLY</span>
              <span className={`text-[10px] font-semibold tracking-wide truncate ${
                isAdmin ? 'text-amber-500' : 'text-axly-400'
              }`}>
                {isAdmin ? 'Admin Portal' : 'DSA Platform'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-[#111c2e] transition-colors shrink-0 ml-auto"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Stats pill */}
      {!isAdmin && !isCollapsed && (
        <div className="mx-2.5 my-2 px-3 py-2 rounded-md bg-[#0d1525] border border-[#1a2540] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold" title="Consecutive days you've logged in">
            <Zap className="w-3.5 h-3.5" />
            <span>{user?.individualStreak ?? user?.streak ?? 1}d streak</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400 text-xs font-semibold" title="Total Score (Practice + Daily + Streak)">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span>{user?.points || user?.total_score || 0} pts</span>
          </div>
        </div>
      )}
      {isAdmin && !isCollapsed && (
        <div className="mx-2.5 my-2 px-3 py-2 rounded-md bg-amber-500/5 border border-amber-500/15 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-amber-400">Administrator</span>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed && section.title && (
              <div className="px-3 pb-1 pt-0.5 text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`nav-item ${active ? 'nav-item-active' : ''} ${isCollapsed ? 'justify-center px-0 w-full' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-axly-400' : 'text-slate-500'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto w-5 h-5 rounded-full bg-axly-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#1a2540] p-2 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-[#1a2540] border border-[#253556] flex items-center justify-center text-xs font-bold text-axly-300 shrink-0">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate leading-none">
                {user?.name || user?.email?.split('@')[0]}
              </div>
              <div className="text-[10px] text-slate-600 truncate mt-0.5">{user?.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex justify-center p-2 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}
