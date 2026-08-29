import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Terminal,
  Trophy,
  Award,
  Info,
  Flame,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsPage({ onNavigate, onUnreadChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'unread' | 'daily_challenge' | 'practice' | 'submission' | 'achievement' | 'system'
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [activeCategory]);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getNotifications(activeCategory !== 'all' ? { category: activeCategory } : {});
      const payload = res.data || res;
      setNotifications(payload.notifications || []);
      const unread = Number(payload.unreadCount || 0);
      setUnreadCount(unread);
      setCategoryCounts(payload.categoryCounts || {});
      if (onUnreadChange) onUnreadChange(unread);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id, link, e) {
    if (e) e.stopPropagation();
    try {
      const res = await api.markNotificationAsRead(id);
      const payload = res.data || res;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      const newUnread = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnread);
      if (payload.categoryCounts) setCategoryCounts(payload.categoryCounts);
      if (onUnreadChange) onUnreadChange(newUnread);

      if (link && onNavigate) {
        const cleanRoute = link.replace(/^\//, '').trim();
        if (cleanRoute) {
          onNavigate(cleanRoute);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      const res = await api.markAllNotificationsAsRead(activeCategory !== 'all' && activeCategory !== 'unread' ? activeCategory : null);
      const payload = res.data || res;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      const newUnread = activeCategory === 'all' || activeCategory === 'unread' ? 0 : Math.max(0, unreadCount - (categoryCounts[activeCategory] || 0));
      setUnreadCount(newUnread);
      if (payload.categoryCounts) setCategoryCounts(payload.categoryCounts);
      if (onUnreadChange) onUnreadChange(newUnread);
      if (activeCategory === 'unread') {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  }

  const CATEGORY_TABS = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'unread', label: 'Unread', count: unreadCount, icon: Sparkles },
    { id: 'daily_challenge', label: 'Daily Challenge', icon: Zap },
    { id: 'practice', label: 'Practice', icon: Code2 },
    { id: 'submission', label: 'Submissions', icon: Terminal },
    { id: 'achievement', label: 'Achievements', icon: Trophy },
    { id: 'system', label: 'System', icon: Info }
  ];

  const CATEGORY_STYLES = {
    daily_challenge: {
      icon: Zap,
      label: 'Daily Challenge',
      badgeCls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      iconBoxCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dotCls: 'bg-amber-400'
    },
    practice: {
      icon: Code2,
      label: 'Practice',
      badgeCls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      iconBoxCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dotCls: 'bg-emerald-400'
    },
    submission: {
      icon: Terminal,
      label: 'Submission',
      badgeCls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      iconBoxCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      dotCls: 'bg-cyan-400'
    },
    achievement: {
      icon: Trophy,
      label: 'Achievement',
      badgeCls: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      iconBoxCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      dotCls: 'bg-purple-400'
    },
    system: {
      icon: Info,
      label: 'System',
      badgeCls: 'text-slate-400 bg-slate-800 border-slate-700',
      iconBoxCls: 'bg-slate-800/80 text-slate-300 border-slate-700',
      dotCls: 'bg-slate-400'
    }
  };

  const EMPTY_MESSAGES = {
    all: {
      title: 'No notifications yet',
      desc: 'Notifications about Daily Challenges, practice milestones, test submissions, and streak achievements will appear here.'
    },
    unread: {
      title: "You're all caught up! 🎉",
      desc: 'No unread notifications right now. Check back when new challenges or milestones unlock.'
    },
    daily_challenge: {
      title: 'No Daily Challenge notifications',
      desc: 'Updates for scheduled daily challenges and solved rewards will be posted here.'
    },
    practice: {
      title: 'No Practice notifications',
      desc: 'Solve problems in the 80 curated Practice Problem bank to record progress milestones.'
    },
    submission: {
      title: 'No Submission notifications',
      desc: 'Run and submit test cases in the code editor to receive automated grading notifications.'
    },
    achievement: {
      title: 'No Achievement notifications',
      desc: 'Build your consecutive day streaks and hit practice milestones to unlock achievements.'
    },
    system: {
      title: 'No System notifications',
      desc: 'Platform announcements and maintenance notices will be displayed here.'
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#121B35] to-[#0C1425] border border-cyan-900/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Activity Feed</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Stay updated with Daily Challenge releases, practice problem milestones, test submissions, and streak achievements.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{markingAll ? 'Marking...' : 'Mark All as Read'}</span>
            </button>
          )}

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-800">
        {CATEGORY_TABS.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeCategory === tab.id;
          const count = tab.id === 'unread' ? unreadCount : (categoryCounts[tab.id] !== undefined ? categoryCounts[tab.id] : null);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {count != null && count > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : tab.id === 'unread' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800/80 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-rose-900/30 text-rose-400 space-y-3">
          <Info className="w-8 h-8 mx-auto text-rose-500" />
          <div className="text-sm font-semibold">{error}</div>
          <button onClick={loadNotifications} className="btn-secondary btn-sm inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {EMPTY_MESSAGES[activeCategory]?.title || 'No notifications found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {EMPTY_MESSAGES[activeCategory]?.desc || 'No notifications in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const cat = notif.category || 'system';
            const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.system;
            const CategoryIcon = style.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id, notif.link)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer group ${
                  notif.is_read
                    ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 opacity-80'
                    : 'bg-gradient-to-r from-slate-900/95 via-[#0c1424] to-slate-950/95 border-cyan-500/40 shadow-xl shadow-cyan-950/20 hover:border-cyan-400'
                }`}
              >
                <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 mt-0.5 shadow-inner ${style.iconBoxCls}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>

                  {/* Body */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-md border ${style.badgeCls}`}>
                        {style.label}
                      </span>
                      <h3 className={`text-sm font-bold truncate ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className={`w-2 h-2 rounded-full animate-pulse ${style.dotCls}`} />
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span title={new Date(notif.created_at).toLocaleString()}>
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </span>
                      {notif.link && (
                        <span className="text-cyan-400/80 font-medium group-hover:underline">
                          View details &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {!notif.is_read && (
                    <button
                      onClick={(e) => handleMarkRead(notif.id, null, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
