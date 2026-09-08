import React from 'react';
import {
  LayoutDashboard,
  Code2,
  Calendar,
  ClipboardList,
  Radio,
  Users,
  GitPullRequest,
  ShieldAlert,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function AdminSidebar({
  currentView,
  setCurrentView,
  user,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  unreadCount = 0
}) {
  const adminSections = [
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
        { id: 'admin-challenges', label: 'Question Management', icon: Code2 },
        { id: 'admin-daily', label: 'Daily Challenge Management', icon: Calendar },
        { id: 'admin-assignments', label: 'Assignments', icon: ClipboardList },
        { id: 'admin-cohorts', label: 'Cohorts & Batches', icon: Radio },
        { id: 'admin-users', label: 'Student Directory', icon: Users },
        { id: 'admin-reviews', label: 'Code & GitHub Reviews', icon: GitPullRequest },
        { id: 'admin-audit', label: 'Security & Audit Logs', icon: ShieldAlert }
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'admin-settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`relative flex flex-col h-screen border-r border-theme-border bg-theme-surface2 transition-all duration-300 z-30 shrink-0 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Admin Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="font-extrabold text-white text-base tracking-wider font-mono">AX</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white text-sm tracking-wider font-mono leading-none truncate">
                AXLY DSA
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest mt-1 text-rose-400 truncate">
                Admin Portal
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl bg-theme-surface border border-theme-border text-theme-text2 hover:text-white hover:bg-theme-surface2 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Admin Role Status Badge */}
      {!isCollapsed && (
        <div className="p-3 mx-3 my-2.5 rounded-2xl bg-theme-surface border border-theme-border shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>Super Administrator</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300">
              ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-5">
        {adminSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-theme-text3 uppercase font-mono">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id || (item.id === 'admin-challenges' && currentView === 'admin-questions');
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    active
                      ? 'bg-gradient-to-r from-rose-500/20 via-indigo-500/15 to-transparent text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-500/10 font-semibold'
                      : 'text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface2'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-rose-400' : 'text-theme-text2 group-hover:text-white'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer User & Logout */}
      <div className="p-3 border-t border-theme-border bg-theme-surface">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'Admin'}
                  className="w-8 h-8 rounded-full border border-theme-border object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-theme-surface2 border border-theme-border flex items-center justify-center text-xs font-bold text-theme-text2 shrink-0">
                  {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-theme-text3 truncate font-mono">
                  {user?.email}
                </span>
              </div>
            </div>
          )}

          <button
            id="logout-btn"
            onClick={onLogout}
            className={`p-2 rounded-xl text-theme-text2 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all ${
              isCollapsed ? 'w-full flex justify-center' : ''
            }`}
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
