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
  Terminal,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, user, onLogout, isCollapsed, setIsCollapsed, unreadCount = 0, isMobileMenuOpen, setIsMobileMenuOpen }) {
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
        { id: 'dsa-ai', label: 'DSA AI Coach', icon: Sparkles },
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
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}
      
      <aside
        className={`fixed md:relative top-0 left-0 flex flex-col h-screen border-r border-theme-border bg-theme-bg transition-transform duration-300 z-50 shrink-0 select-none ${
          isCollapsed ? 'w-[52px]' : 'w-64 md:w-56'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-theme-border shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isAdmin ? 'bg-indigo-500' : 'bg-theme-cyan'
          }`}>
            <Terminal className="w-4 h-4 text-theme-text1" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 leading-none">
              <span className="font-bold text-theme-text1 text-sm tracking-tight font-mono truncate">AXLY</span>
              <span className={`text-[10px] font-semibold tracking-wide truncate ${
                isAdmin ? 'text-indigo-400' : 'text-theme-cyan'
              }`}>
                {isAdmin ? 'Admin Portal' : 'DSA Platform'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors shrink-0 ml-auto hidden md:block"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
          className="p-1 rounded text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors shrink-0 ml-auto md:hidden"
          title="Close Menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Stats pill */}
      {!isAdmin && !isCollapsed && (
        <div className="mx-2.5 my-2 px-3 py-2 rounded-md bg-theme-surface border border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold" title="Consecutive days you've logged in">
            <Zap className="w-3.5 h-3.5" />
            <span>{user?.individualStreak ?? user?.streak ?? 1}d streak</span>
          </div>
          <div className="flex items-center gap-1 text-theme-cyan text-xs font-semibold" title="Total Score (Practice + Daily + Streak)">
            <Trophy className="w-3.5 h-3.5 text-theme-cyan" />
            <span>{user?.points || user?.total_score || 0} pts</span>
          </div>
        </div>
      )}
      {isAdmin && !isCollapsed && (
        <div className="flex flex-col gap-2 mx-2.5 my-2">
          <div className="px-3 py-2 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Administrator</span>
          </div>
          
          {/* Mobile Portal Switcher */}
          <div className="md:hidden">
            {currentView.startsWith('admin') ? (
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-theme-cyan text-theme-bg font-bold shadow-sm transition-all"
              >
                <User className="w-4 h-4" />
                Switch to Practice
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentView('admin-dashboard');
                  if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-indigo-500 text-white font-bold shadow-sm transition-all"
              >
                <Shield className="w-4 h-4" />
                Switch to Admin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed && section.title && (
              <div className="px-3 pb-1 pt-0.5 text-[10px] font-semibold tracking-widest text-theme-text2 uppercase">
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
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-theme-cyan' : 'text-theme-text3'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto w-5 h-5 rounded-full bg-theme-cyan text-theme-cyan border border-theme-cyan text-[10px] font-bold flex items-center justify-center shrink-0">
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
      <div className="border-t border-theme-border p-2 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-theme-surface2 border border-theme-border flex items-center justify-center text-xs font-bold text-theme-cyan shrink-0">
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-theme-text1 truncate leading-none">
                {user?.name || user?.email?.split('@')[0]}
              </div>
              <div className="text-[10px] text-theme-text2 truncate mt-0.5">{user?.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded text-theme-text2 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex justify-center p-2 rounded text-theme-text2 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
    </>
  );
}
