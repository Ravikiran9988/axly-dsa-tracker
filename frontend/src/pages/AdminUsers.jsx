import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Award,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  UserCheck,
  Send,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminUsers({ onOpenAssignModal }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, [roleFilter, search, page]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
        limit,
        page
      });
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load students directory');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenStudentDetails = async (user) => {
    setSelectedStudent(user);
    setDetailsLoading(true);
    try {
      const res = await api.getUserById(user.id);
      setStudentDetails(res.data);
    } catch (err) {
      console.warn('Failed to load student details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change ${user.name || user.email}'s role to ${nextRole}?`)) return;
    try {
      await api.updateUserRole(user.id, nextRole);
      loadUsers();
    } catch (err) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Learner Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Student & User Management
          </h1>
          <p className="text-xs text-slate-400">
            Monitor registered developers, track individual problem-solving progress, and manage role permissions.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, email, or institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Roles</option>
          <option value="user">Students</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading students directory...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No students found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Solved</th>
                  <th className="py-3.5 px-4">Streak</th>
                  <th className="py-3.5 px-4">Points</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/40 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">
                            {u.name || u.email?.split('@')[0]}
                          </div>
                          {u.institution && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {u.institution}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {u.email}
                    </td>

                    {/* Solved */}
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">
                      {u.completed_count || 0} questions
                    </td>

                    {/* Streak */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{u.streak || 1}d</span>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {u.points || 100}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                        u.role === 'admin'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenStudentDetails(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          title="View student profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenAssignModal && onOpenAssignModal(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400"
                          title="Assign challenge"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleRole(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Toggle role"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Drawer Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {selectedStudent.avatar_url ? (
                  <img
                    src={selectedStudent.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                    {(selectedStudent.name || selectedStudent.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedStudent.name || selectedStudent.email}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {selectedStudent.email} &bull; Role: {selectedStudent.role}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">POINTS:</span>
                <span className="text-cyan-400 font-bold text-sm">{selectedStudent.points || 100}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">STREAK:</span>
                <span className="text-amber-400 font-bold text-sm">{selectedStudent.streak || 1} days</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">COMPLETED:</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedStudent.completed_count || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PENDING:</span>
                <span className="text-rose-400 font-bold text-sm">{selectedStudent.pending_count || 0}</span>
              </div>
            </div>

            {studentDetails?.assignments && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 font-mono uppercase">Assigned Tasks ({studentDetails.assignments.length})</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {studentDetails.assignments.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-xs bg-slate-950 rounded-xl">
                      No active assignments.
                    </div>
                  ) : (
                    studentDetails.assignments.map((a) => (
                      <div key={a.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-white font-medium">{a.question_title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {a.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  if (onOpenAssignModal) onOpenAssignModal(s);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Assign Challenge
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
