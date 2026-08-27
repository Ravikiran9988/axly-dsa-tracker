import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  Building,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  MoreVertical,
  Radio,
  ClipboardList
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminUsers({ onOpenAssignModal, onSelectStudent }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, [roleFilter, search]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
        limit: 100
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#161C38] to-[#0C1425] border border-cyan-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Student & Mentor Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management & Cohort Roster</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor registered developers, track individual assignment progress, and manage batch memberships.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, email, or institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Roles (Students & Staff)</option>
          <option value="user">Students / Developers</option>
          <option value="admin">Mentors & Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Developer</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4">Cohort</th>
                <th className="px-6 py-4 text-center">Assigned</th>
                <th className="px-6 py-4 text-center">Completed</th>
                <th className="px-6 py-4 text-center">Pending</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading student roster...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {u.name ? u.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'admin' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                STAFF
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {u.institution || 'Axly Academy'}
                    </td>
                    <td className="px-6 py-4">
                      {u.cohort_name ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                          {u.cohort_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-300">
                      {u.assigned_count || 0}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-emerald-400">
                      {u.completed_count || 0}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-amber-400">
                      {u.pending_count || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onOpenAssignModal && onOpenAssignModal(u)}
                        className="px-3 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                      >
                        Assign Task
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
