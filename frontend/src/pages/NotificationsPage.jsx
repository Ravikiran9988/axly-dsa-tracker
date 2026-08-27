import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Calendar,
  MessageSquareQuote,
  Radio,
  Clock,
  ArrowRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export default function NotificationsPage({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'unread' | 'assignment' | 'submission' | 'mentor' | 'cohort'

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id, link) {
    try {
      const res = await api.markNotificationAsRead(id);
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
      if (link && onNavigate) {
        onNavigate(link.replace('/', ''));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      const res = await api.markAllNotificationsAsRead();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  const typeIcons = {
    assignment: Calendar,
    submission: CheckCircle2,
    mentor: MessageSquareQuote,
    cohort: Radio,
    general: Bell
  };

  const typeColors = {
    assignment: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    submission: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    mentor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    cohort: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    general: 'text-slate-400 bg-slate-800 border-slate-700'
  };

  const filteredNotifs = notifications.filter(n => {
    if (categoryFilter === 'unread') return !n.is_read;
    if (categoryFilter !== 'all') return n.type === categoryFilter;
    return true;
  });

  const filterTabs = [
    { id: 'all', label: 'All Notifications' },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'assignment', label: 'Assignments' },
    { id: 'submission', label: 'Submissions' },
    { id: 'mentor', label: 'Mentor Reviews' },
    { id: 'cohort', label: 'Cohort Events' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#121B35] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Activity Feed</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Mentor Notifications</h1>
          <p className="text-xs text-slate-400 mt-1">
            Stay updated with newly assigned tasks, submission approvals, mentor feedback, and live class broadcasts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-800">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === tab.id
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Bell className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No notifications in this category</h3>
          <p className="text-xs text-slate-500 mt-1">You're all caught up with your latest assignments and reviews.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map(notif => {
            const Icon = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || typeColors.general;

            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id, notif.link)}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                  notif.is_read
                    ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/70 opacity-80'
                    : 'bg-gradient-to-r from-slate-900/90 to-slate-950/90 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs font-bold ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                      <Clock className="w-3 h-3" /> {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
