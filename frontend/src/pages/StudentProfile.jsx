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
  Calendar,
  Camera
} from 'lucide-react';
import { api } from '../services/api';

export default function StudentProfile({ onSelectProblem }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

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

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      // Preview locally since backend upload API is not implemented yet
      const url = URL.createObjectURL(file);
      setProfileImagePreview(url);
    }
  }

  if (loading || !profileData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-theme-text2">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
        <div className="text-xs">Loading student profile & stats...</div>
      </div>
    );
  }

  const { stats, badges, cohorts, recent_submissions, recent_feedback } = profileData;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Compact Profile Header */}
      <div className="p-5 md:p-6 rounded-2xl bg-theme-surface border border-theme-border shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative group shrink-0 mt-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-2xl font-extrabold text-white border border-theme-border overflow-hidden">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profileData.name ? profileData.name[0].toUpperCase() : 'U'
                )}
              </div>
              <label 
                className="absolute bottom-0 right-0 w-6 h-6 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center text-theme-text2 hover:text-theme-text1 hover:bg-theme-surface3 transition-colors shadow-sm cursor-pointer"
                title="Change profile photo"
              >
                <Camera className="w-3 h-3" />
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/jpg" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
              </label>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-theme-text1 tracking-tight">
                {profileData.name}
              </h1>
              <p className="text-[13px] text-theme-text2 font-medium">@{profileData.username || profileData.email?.split('@')[0] || 'student'}</p>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-theme-text3 pt-1">
                {profileData.institution && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> {profileData.institution}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {profileData.email}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile CTA */}
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-4 md:mt-0 rounded-lg bg-theme-surface2 hover:bg-theme-surface3 text-theme-text1 text-[13px] font-semibold border border-theme-border transition-colors w-full md:w-auto"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        {/* Bio & Skills & Links */}
        <div className="mt-5 pt-5 border-t border-theme-border flex flex-col md:flex-row gap-5 items-start justify-between">
          <div className="flex-1 space-y-3">
            {profileData.bio && (
              <p className="text-[13px] text-theme-text2 leading-relaxed max-w-3xl">
                {profileData.bio}
              </p>
            )}
            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill, idx) => (
                  <span key={idx} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-theme-bg border border-theme-border text-theme-text2">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {profileData.github_url && (
              <a
                href={profileData.github_url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-theme-surface2 border border-theme-border text-theme-text2 hover:text-theme-text1 transition-colors"
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
                className="p-2 rounded-lg bg-theme-surface2 border border-theme-border text-theme-text2 hover:text-theme-text1 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Score Breakdown Section */}
      <div className="p-6 rounded-3xl bg-theme-surface border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-theme-border">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <Trophy className="w-4 h-4" />
            <span>Score Architecture & Performance</span>
          </div>
          <span className="text-[11px] text-theme-text3 font-mono">Server Authoritative</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Total Score */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-cyan-500/30 text-center">
            <div className="text-xl font-black text-cyan-500 dark:text-cyan-400">{stats?.total_score || stats?.points || 0}</div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Total Score</div>
          </div>

          {/* Practice Points */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-emerald-500/20 text-center">
            <div className="text-xl font-black text-emerald-500 dark:text-emerald-400">{stats?.practice_points || 0}</div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Practice Pts</div>
          </div>

          {/* Daily Challenge Points */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-amber-500/20 text-center">
            <div className="text-xl font-black text-amber-500 dark:text-amber-400">{stats?.daily_challenge_points || 0}</div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Daily Challenge</div>
          </div>

          {/* Streak Bonus */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-orange-500/20 text-center">
            <div className="text-xl font-black text-orange-500 dark:text-orange-400">{stats?.streak_bonus || 0}</div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Streak Bonus</div>
          </div>

          {/* Leaderboard Score */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-purple-500/20 text-center">
            <div className="text-xl font-black text-purple-500 dark:text-purple-400">{stats?.leaderboard_score || stats?.daily_challenge_points || 0}</div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Leaderboard Score</div>
          </div>

          {/* Individual Activity Streak */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-amber-500/20 text-center">
            <div className="text-xl font-black text-amber-500 dark:text-amber-400 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" /> {stats?.individualStreak ?? stats?.streak ?? 1}d
            </div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Activity (Best: {stats?.individualBestStreak ?? stats?.longest_streak ?? 1}d)</div>
          </div>

          {/* Challenge Streak */}
          <div className="p-4 rounded-2xl bg-theme-surface border border-rose-500/20 text-center">
            <div className="text-xl font-black text-rose-500 dark:text-rose-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-rose-500 dark:fill-rose-400" /> {stats?.dailyChallengeStreak ?? 0}d
            </div>
            <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Challenge (Best: {stats?.dailyChallengeBestStreak ?? 0}d)</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border text-center">
          <div className="text-xl font-bold text-theme-text1">{stats?.total_challenges || 0}</div>
          <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Total Assigned</div>
        </div>
        <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border text-center">
          <div className="text-xl font-bold text-emerald-500 dark:text-emerald-400">{stats?.completed || 0}</div>
          <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Completed</div>
        </div>
        <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border text-center">
          <div className="text-xl font-bold text-cyan-500 dark:text-cyan-400">{stats?.accuracy_rate || '0%'}</div>
          <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Accuracy Rate</div>
        </div>
        <div className="p-4 rounded-2xl bg-theme-surface border border-theme-border text-center">
          <div className="text-xl font-bold text-violet-500 dark:text-violet-400">#{stats?.rank || 1}</div>
          <div className="text-[10px] text-theme-text2 uppercase tracking-wider mt-0.5">Leaderboard Rank</div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border space-y-4">
        <h2 className="text-sm font-bold text-theme-text1 tracking-wider uppercase flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Earned Achievements & Badges</span>
        </h2>
        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {badges.map(b => (
              <div key={b.id} className="p-3.5 rounded-xl bg-theme-surface border border-theme-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-theme-text1">{b.name}</div>
                  <div className="text-[10px] text-theme-text2">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-theme-text3 italic">No badges earned yet. Complete challenges to unlock achievements!</div>
        )}
      </div>

      {/* Recent Activity & Mentor Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border space-y-4">
          <h2 className="text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recent Activity</span>
          </h2>
          <div className="space-y-2.5">
            {recent_submissions && recent_submissions.length > 0 ? (
              recent_submissions.slice(0, 5).map(sub => (
                <div key={sub.id} className="p-3 rounded-xl bg-theme-surface border border-theme-border flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{sub.question_title}</div>
                    <div className="text-[10px] text-theme-text2">{sub.submission_type === 'github' ? 'GitHub Link' : 'In-Platform IDE'} • {sub.status}</div>
                  </div>
                  {onSelectProblem && (
                    <button
                      onClick={() => onSelectProblem(sub.question_id)}
                      className="px-2.5 py-1 rounded bg-theme-surface2 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold"
                    >
                      View
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-theme-text3 italic">No recent submission activity.</div>
            )}
          </div>
        </div>

        {/* Mentor Feedback */}
        <div className="p-6 rounded-2xl bg-theme-surface border border-theme-border space-y-4">
          <h2 className="text-sm font-bold text-theme-text1 tracking-wider uppercase flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
            <span>Mentor Feedback</span>
          </h2>
          <div className="space-y-2.5">
            {recent_feedback && recent_feedback.length > 0 ? (
              recent_feedback.map(fb => (
                <div key={fb.id} className="p-3.5 rounded-xl bg-theme-surface border border-theme-border space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-theme-text1">{fb.question_title}</span>
                    <span className="text-theme-text3">{fb.reviewer_name || 'Mentor'}</span>
                  </div>
                  <p className="text-theme-text2 italic text-[11px]">"{fb.feedback}"</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-theme-text3 italic">No mentor feedback records available yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h3 className="text-base font-bold text-theme-text1">Edit Student Profile</h3>
              <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg bg-theme-surface2 text-theme-text2 hover:text-theme-text1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-theme-text2 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-theme-text2 font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                    placeholder="Username"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-theme-text2 font-medium">Institution / University</label>
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. MIT, Stanford, IIT"
                />
              </div>

              <div className="space-y-1">
                <label className="text-theme-text2 font-medium">Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                  placeholder="A brief bio about your DSA journey..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-theme-text2 font-medium">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={e => setSkillsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. JavaScript, C++, Dynamic Programming"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-theme-text2 font-medium">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-theme-text2 font-medium">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme-border rounded-xl text-theme-text1 focus:outline-none focus:border-cyan-500"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-theme-surface2 hover:bg-slate-700 text-theme-text2 font-semibold"
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
