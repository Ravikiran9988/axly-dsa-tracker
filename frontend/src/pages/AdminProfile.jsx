import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Mail,
  Building,
  Calendar,
  Clock,
  Edit3,
  CheckCircle2,
  X,
  Save,
  Users,
  Code2,
  Radio,
  GitPullRequest,
  ClipboardList,
  Activity,
  Lock,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminProfile() {
  const { user: authUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [profileRes, statsRes, auditRes] = await Promise.all([
        api.getMyProfile().catch(() => ({ data: authUser || {} })),
        api.getAdminStats().catch(() => ({ data: {} })),
        api.getAuditLogs({ limit: 6 }).catch(() => ({ data: [] }))
      ]);

      const p = profileRes?.data || authUser || {};
      setProfileData(p);
      setName(p.name || '');
      setInstitution(p.institution || '');
      setBio(p.bio || '');
      setAdminStats(statsRes?.data || {});
      setAuditLogs(auditRes?.data || []);
    } catch (err) {
      console.warn('Failed to load admin profile info:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateMyProfile({
        name,
        institution,
        bio
      });
      setIsEditing(false);
      setSaveSuccess(true);
      await loadData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Failed to update profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const p = profileData || authUser || {};
  const stats = adminStats || {};
  const students = stats.students || stats.learners || { total: 0, active: 0 };
  const questions = stats.questions || { total: 0 };
  const cohorts = stats.cohorts || { active: 0 };
  const assignments = stats.assignments || { total: 0 };
  const pendingReviews = stats.pending_reviews || 0;

  const permissions = [
    { name: 'Manage Questions & Tests', desc: 'Create, edit, validate, version & deactivate coding questions', granted: true },
    { name: 'Manage Daily Challenges', desc: 'Curate, schedule and broadcast featured algorithmic challenges', granted: true },
    { name: 'Manage Assignments & Tasks', desc: 'Assign challenges to learners with due dates and priority tiers', granted: true },
    { name: 'Manage Cohorts & Batches', desc: 'Organize learners into batches and host live mentorship sessions', granted: true },
    { name: 'Manage Student Directory', desc: 'Track individual learner velocity and manage system permissions', granted: true },
    { name: 'Review Submissions & Code', desc: 'Perform manual scoring, test review and inspect AI code evaluations', granted: true },
    { name: 'Security & Audit Logs', desc: 'Inspect immutable tamper-evident security audit trails', granted: true }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-3" />
        <div className="text-xs font-mono">Loading administrator profile & system telemetry...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Admin profile details updated successfully.</span>
        </div>
      )}

      {/* 1. Header Hero Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#140C1A] via-[#1F102B] to-[#0D0B18] border border-rose-900/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.name || 'Admin'}
                  className="w-20 h-20 rounded-3xl border-2 border-rose-500/40 object-cover shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-600 to-indigo-700 border-2 border-rose-500/40 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                  {(p.name || p.email || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-[#080C14] border border-rose-500/40 text-rose-400 shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Admin Name & Role */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {p.name || p.email?.split('@')[0]}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  ADMIN
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {p.email}
                </span>
                <span>&bull;</span>
                <span className="text-rose-300 font-semibold">
                  {p.role === 'admin' ? 'Super Administrator' : 'Platform Administrator'}
                </span>
              </div>

              {p.bio && (
                <p className="text-xs text-slate-300 max-w-xl pt-1">
                  {p.bio}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors shrink-0 shadow-md"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4 text-rose-400" />}
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Inline Edit Form Modal / Drawer */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-800/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  placeholder="Administrator Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Organization / Department</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  placeholder="e.g. Axly Curriculum HQ"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-400 font-medium">Admin Bio / Responsibility</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  placeholder="Lead Mentor & Platform Architect"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Admin Information & Account Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin Account Details */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Admin Account Details</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">RBAC LEVEL: ROOT</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Full Name</span>
              <span className="font-semibold text-white">{p.name || '—'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Email Address</span>
              <span className="font-mono text-slate-200">{p.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">System Role</span>
              <span className="font-bold text-rose-400 uppercase font-mono">
                {p.role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Organization</span>
              <span className="font-semibold text-slate-200">{p.institution || 'Axly Technology HQ'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Account Created</span>
              <span className="font-mono text-slate-300">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Active'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Last Active</span>
              <span className="font-mono text-slate-300">
                {p.last_active_at ? new Date(p.last_active_at).toLocaleString() : 'Current Session'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Administration Overview Telemetry */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Administration Overview</span>
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-slate-400 hover:text-white"
              title="Refresh telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Total Students</span>
              <div className="text-xl font-bold text-white font-mono">{students.total}</div>
              <div className="text-[10px] text-emerald-400 font-semibold">{students.active || students.total} active this month</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Total Questions</span>
              <div className="text-xl font-bold text-indigo-400 font-mono">{questions.total}</div>
              <div className="text-[10px] text-slate-400">{questions.published || questions.total} published</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Active Cohorts</span>
              <div className="text-xl font-bold text-cyan-400 font-mono">{cohorts.active}</div>
              <div className="text-[10px] text-slate-400">Live batches</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Pending Reviews</span>
              <div className="text-xl font-bold text-purple-400 font-mono">{pendingReviews}</div>
              <div className="text-[10px] text-purple-400">Requires review</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 col-span-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Assignments Created</span>
              <div className="text-xl font-bold text-rose-400 font-mono">{assignments.total}</div>
              <div className="text-[10px] text-slate-400">Targeted student challenges assigned</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Admin Permissions Matrix */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Assigned Role Privileges & Access Guardrails</span>
          </h2>
          <span className="text-xs text-emerald-400 font-mono font-semibold">ALL PRIVILEGES GRANTED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {permissions.map((perm, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{perm.name}</span>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {perm.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Recent Admin Activity Log */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Recent Administrative Actions</span>
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">AUDIT EVENT LOG</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No recent admin audit entries recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {log.action}
                    </span>
                    <span className="font-semibold text-white">
                      {log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    By {log.actor_name || log.actor_email} &bull; IP: {log.ip_address || '127.0.0.1'}
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
