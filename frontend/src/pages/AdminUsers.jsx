import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Send,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building,
  Layers,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminUsers({ onOpenAssignModal }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('user');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 25;

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
            Monitor registered students, track assignment progress, evaluate task completions, and manage permissions.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
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
          <option value="user">Students Only</option>
          <option value="admin">Administrators</option>
          <option value="">All Roles</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <div className="text-xs font-mono">Loading directory records...</div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            No registered users found matching the current search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Institution</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Student Name + Avatar */}
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
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {u.email}
                    </td>

                    {/* Institution */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.institution || '—'}
                    </td>

                    {/* Cohort */}
                    <td className="py-3.5 px-4">
                      {u.cohort_name ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">
                          {u.cohort_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Assigned */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-300">
                      {u.assigned_count || 0}
                    </td>

                    {/* Completed */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                      {u.completed_count || 0}
                    </td>

                    {/* Pending */}
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-amber-400">
                      {u.pending_count || 0}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                        u.role === 'admin'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenStudentDetails(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                          title="View student profile details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onOpenAssignModal && onOpenAssignModal(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors"
                          title="Assign targeted problem"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleRole(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Toggle role permissions"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                  {(selectedStudent.name || selectedStudent.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedStudent.name || selectedStudent.email}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedStudent.email} • Role: {selectedStudent.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading learner history...</div>
            ) : studentDetails ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold text-white">{studentDetails.assignments?.length || 0}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Assigned Tasks</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold text-emerald-400">
                      {studentDetails.assignments?.filter(a => a.submission_status === 'solved' || a.status === 'completed').length || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Completed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {studentDetails.assignments?.filter(a => a.status === 'assigned' || a.status === 'ongoing').length || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">Pending</div>
                  </div>
                </div>

                {/* Assigned Challenges List */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">Assigned Challenges</h4>
                  {studentDetails.assignments && studentDetails.assignments.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5">
                      {studentDetails.assignments.map(a => (
                        <div key={a.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white">{a.question_title}</span>
                            <span className="ml-2 text-[10px] text-slate-400">Due: {a.due_date || 'No deadline'}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.submission_status === 'solved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {a.submission_status || a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-xs">No problems currently assigned to this student.</div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const target = selectedStudent;
                  setSelectedStudent(null);
                  if (onOpenAssignModal) onOpenAssignModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Assign New Challenge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
