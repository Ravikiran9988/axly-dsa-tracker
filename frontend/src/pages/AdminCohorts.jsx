import React, { useState, useEffect } from 'react';
import {
  Radio,
  Users,
  PlusCircle,
  Video,
  ClipboardList,
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  X,
  ExternalLink,
  Save,
  Send,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminCohorts({ onSelectProblem }) {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState(null);

  // Modals
  const [isCreatingCohort, setIsCreatingCohort] = useState(false);
  const [isAssigningChallenge, setIsAssigningChallenge] = useState(false);
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);

  // Form states
  const [cohortName, setCohortName] = useState('');
  const [cohortDesc, setCohortDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Assign Challenge to Cohort
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignPriority, setAssignPriority] = useState('Medium');
  const [assignInstructions, setAssignInstructions] = useState('');

  // Live session
  const [sessionTitle, setSessionTitle] = useState('Live Mentorship & Code Review Session');
  const [meetLink, setMeetLink] = useState('');

  useEffect(() => {
    loadCohorts();
  }, []);

  async function loadCohorts() {
    setLoading(true);
    try {
      const res = await api.getCohorts();
      setCohorts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCohort(id) {
    try {
      const res = await api.getCohortById(id);
      setSelectedCohort(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateCohort(e) {
    e.preventDefault();
    if (!cohortName.trim()) return;
    try {
      await api.createCohort({
        name: cohortName.trim(),
        description: cohortDesc.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setIsCreatingCohort(false);
      setCohortName('');
      setCohortDesc('');
      loadCohorts();
    } catch (err) {
      alert(err.message || 'Failed to create cohort.');
    }
  }

  async function openAssignModal(cohort) {
    setSelectedCohort(cohort);
    setIsAssigningChallenge(true);
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestions(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedQuestionId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAssignCohortChallenge(e) {
    e.preventDefault();
    if (!selectedCohort || !selectedQuestionId) return;
    try {
      await api.assignCohortChallenge(selectedCohort.id, {
        question_id: selectedQuestionId,
        due_date: assignDueDate || undefined,
        priority: assignPriority,
        instructions: assignInstructions || undefined
      });
      alert(`Challenge successfully assigned to all students in ${selectedCohort.name}!`);
      setIsAssigningChallenge(false);
      handleSelectCohort(selectedCohort.id);
    } catch (err) {
      alert(err.message || 'Failed to assign cohort challenge.');
    }
  }

  async function handleStartLiveSession(e) {
    e.preventDefault();
    if (!selectedCohort) return;
    try {
      const res = await api.startLiveSession(selectedCohort.id, {
        title: sessionTitle.trim(),
        meet_link: meetLink.trim() || undefined
      });
      alert(`Live Session started! Students received notifications with meeting link: ${res.data?.meet_link}`);
      setIsLiveSessionOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to start live session.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#1A1C3B] to-[#0C1425] border border-indigo-900/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Cohort Batches & Programs</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Cohort Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize learners into batches (MERN, AI/ML, DSA Masterclass), assign group milestones, and broadcast live sessions.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingCohort(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Cohort</span>
        </button>
      </div>

      {/* Cohorts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Radio className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No cohorts created yet</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Create New Cohort" to establish your first student batch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cohorts.map(c => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Active Program
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {c.completion_rate || 0}% Completion
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight mb-1">{c.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{c.description || 'Curated curriculum & mentorship.'}</p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-sm font-bold text-white">{c.total_students || 0}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Students</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-sm font-bold text-cyan-400">{c.total_assignments || 0}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Assigned</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => openAssignModal(c)}
                  className="w-full py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Assign Challenge
                </button>

                <button
                  onClick={() => { setSelectedCohort(c); setIsLiveSessionOpen(true); }}
                  className="w-full py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5 text-rose-400" /> Start Live Class
                </button>

                <button
                  onClick={() => handleSelectCohort(c.id)}
                  className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  View Cohort Roster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort Details Drawer */}
      {selectedCohort && selectedCohort.students && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Student Directory: {selectedCohort.name}
              </h2>
              <p className="text-xs text-slate-400">{selectedCohort.students.length} enrolled developers</p>
            </div>
            <button onClick={() => setSelectedCohort(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedCohort.students.map(s => (
              <div key={s.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white">
                    {s.name ? s.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-white">{s.name}</div>
                    <div className="text-[10px] text-slate-400">{s.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">{s.completed_count || 0}/{s.assigned_count || 0}</div>
                  <div className="text-[9px] text-slate-500">Solved</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Cohort Modal */}
      {isCreatingCohort && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-400" /> Create Cohort Batch
              </h2>
              <button onClick={() => setIsCreatingCohort(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cohort Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., MERN Batch 2026 / AI ML Engineering"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Curriculum Overview</label>
                <textarea
                  rows={2}
                  placeholder="Goals, topics, and milestones..."
                  value={cohortDesc}
                  onChange={(e) => setCohortDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingCohort(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-950"
                >
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Challenge to Cohort Modal */}
      {isAssigningChallenge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-400" /> Assign Challenge to {selectedCohort?.name}
              </h2>
              <button onClick={() => setIsAssigningChallenge(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCohortChallenge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Challenge *</label>
                <select
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {questions.map(q => (
                    <option key={q.id} value={q.id}>
                      [{q.difficulty.toUpperCase()}] {q.title} (+{q.points || 20} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Optional Mentor Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Focus on O(N) linear time and avoid auxiliary arrays..."
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssigningChallenge(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-950"
                >
                  Assign to Entire Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Class Session Modal */}
      {isLiveSessionOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-400" /> Start Live Class for {selectedCohort?.name}
              </h2>
              <button onClick={() => setIsLiveSessionOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartLiveSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Meeting Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  If left blank, an Axly Meet link will be automatically generated.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLiveSessionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold shadow-md shadow-rose-950"
                >
                  Broadcast & Notify Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
