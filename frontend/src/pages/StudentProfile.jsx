import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Building,
  Github,
  Linkedin,
  Flame,
  Award,
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  Edit3,
  X,
  Save,
  MessageSquareQuote,
  Code2,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';

export default function StudentProfile({ onSelectProblem }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [institution, setInstitution] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.getMyProfile();
      const p = res.data;
      setProfileData(p);
      setName(p.name || '');
      setUsername(p.username || '');
      setBio(p.bio || '');
      setInstitution(p.institution || '');
      setGithubUrl(p.github_url || '');
      setLinkedinUrl(p.linkedin_url || '');
      setSkillsInput(Array.isArray(p.skills) ? p.skills.join(', ') : '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
      await api.updateMyProfile({
        name,
        username,
        bio,
        institution,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        skills: skillsArray
      });
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profileData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
        <div className="text-xs">Loading student profile & stats...</div>
      </div>
    );
  }

  const { stats, badges, cohorts, recent_submissions, recent_feedback } = profileData;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Profile Header Hero Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0C1425] via-[#111A34] to-[#0C1425] border border-cyan-900/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-cyan-500/20 border-2 border-cyan-400/30 shrink-0">
              {profileData.name ? profileData.name[0].toUpperCase() : 'U'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  {profileData.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  STUDENT
                </span>
              </div>
              <p className="text-xs text-cyan-400 font-mono">@{profileData.username || profileData.email?.split('@')[0] || 'student'}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" /> {profileData.institution || '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {profileData.email}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile CTA */}
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-md transition-all active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        {/* Bio & Links */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8">
            <p className="text-xs text-slate-300 leading-relaxed">
              {profileData.bio || 'Continuous learner mastering algorithm design, time complexities, and full-stack systems.'}
            </p>
            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profileData.skills.map((skill, idx) => (
                  <span key={idx} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3">
            {profileData.github_url && (
              <a
                href={profileData.github_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            )}
            {profileData.linkedin_url && (
              <a
                href={profileData.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-bold text-white">{stats?.total_challenges || 0}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Total Assigned</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-bold text-emerald-400">{stats?.completed || 0}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Completed</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-bold text-cyan-400">{stats?.accuracy_rate || '0%'}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Accuracy Rate</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 fill-amber-400" /> {stats?.streak || 1}d
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Current Streak</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-xl font-bold text-indigo-400">{stats?.points || 100} pts</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Total Points</div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Earned Achievements & Badges</span>
        </h2>
        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {badges.map(b => (
              <div key={b.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{b.name}</div>
                  <div className="text-[10px] text-slate-400">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">No badges earned yet. Complete challenges to unlock achievements!</div>
        )}
      </div>

      {/* Recent Activity & Mentor Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recent Activity</span>
          </h2>
          <div className="space-y-2.5">
            {recent_submissions && recent_submissions.length > 0 ? (
              recent_submissions.slice(0, 5).map(sub => (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{sub.question_title}</div>
                    <div className="text-[10px] text-slate-400">{sub.submission_type === 'github' ? 'GitHub Link' : 'In-Platform IDE'} • {sub.status}</div>
                  </div>
                  {onSelectProblem && (
                    <button
                      onClick={() => onSelectProblem(sub.question_id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold"
                    >
                      View
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic">No recent submission activity.</div>
            )}
          </div>
        </div>

        {/* Mentor Feedback */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
            <span>Mentor Feedback</span>
          </h2>
          <div className="space-y-2.5">
            {recent_feedback && recent_feedback.length > 0 ? (
              recent_feedback.map(fb => (
                <div key={fb.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-white">{fb.question_title}</span>
                    <span className="text-slate-500">{fb.reviewer_name || 'Mentor'}</span>
                  </div>
                  <p className="text-slate-300 italic text-[11px]">"{fb.feedback}"</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic">No mentor feedback records available yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Student Profile</h3>
              <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Username"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Institution / University</label>
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. MIT, Stanford, IIT"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="A brief bio about your DSA journey..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={e => setSkillsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. JavaScript, C++, Dynamic Programming"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
