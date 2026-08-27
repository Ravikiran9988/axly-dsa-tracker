import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AvailableChallenges from './pages/AvailableChallenges';
import MyTasks from './pages/MyTasks';
import ProblemWorkspace from './pages/ProblemWorkspace';
import SubmissionHistory from './pages/SubmissionHistory';
import UserProfile from './pages/UserProfile';
import NotificationsPage from './pages/NotificationsPage';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminCohorts from './pages/AdminCohorts';
import AdminUsers from './pages/AdminUsers';
import AdminSubmissionsReview from './pages/AdminSubmissionsReview';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import AdminQuestionModal from './components/AdminQuestionModal';
import AdminAssignModal from './components/AdminAssignModal';
import { api } from './services/api';
import { Loader2, Terminal, CheckCircle2, Shield, Compass, BookOpen } from 'lucide-react';

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Admin Modals
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [questionsForModal, setQuestionsForModal] = useState([]);
  const [usersForModal, setUsersForModal] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotificationsCount();
    }
  }, [user, currentView]);

  async function loadNotificationsCount() {
    try {
      const res = await api.getNotifications();
      setUnreadNotifsCount(res.data?.unreadCount || 0);
    } catch {
      // ignore
    }
  }

  const handleSelectProblem = (questionId) => {
    setActiveQuestionId(questionId);
    setCurrentView('solve');
  };

  const handleOpenAssignModal = async (targetUser = null) => {
    setSelectedUserForAssign(targetUser);
    try {
      const [qRes, uRes] = await Promise.all([
        api.getQuestions({ limit: 100 }),
        api.getUsers({ limit: 100 })
      ]);
      setQuestionsForModal(qRes.data || []);
      setUsersForModal(uRes.data || []);
      setIsAssignModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdminDailyModal = async () => {
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestionsForModal(res.data || []);
      setIsDailyModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C14] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center space-y-4 relative z-10 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/25 animate-pulse">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Coding Challenge & Task Platform...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-row font-sans selection:bg-cyan-500 selection:text-white">
      {/* Persistent Responsive Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={logout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Top Navbar */}
        <Navbar
          activeTab={currentView}
          setActiveTab={setCurrentView}
          onOpenAdminDailyModal={handleOpenAdminDailyModal}
          onOpenCreateChallenge={() => setIsCreateChallengeModalOpen(true)}
          unreadCount={unreadNotifsCount}
        />

        {/* Dynamic View Router */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 bg-[#070B14]">
          {currentView === 'solve' && activeQuestionId ? (
            <ProblemWorkspace
              questionId={activeQuestionId}
              onBack={() => setCurrentView('tasks')}
              onStatusUpdated={() => {
                loadNotificationsCount();
              }}
            />
          ) : currentView === 'dashboard' ? (
            <UserDashboard
              user={user}
              onSelectProblem={handleSelectProblem}
              onNavigate={(view) => setCurrentView(view)}
            />
          ) : currentView === 'available' || currentView === 'practice' ? (
            <AvailableChallenges
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'tasks' || currentView === 'daily' ? (
            <MyTasks
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'submissions' ? (
            <SubmissionHistory
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'profile' ? (
            <UserProfile
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'notifications' ? (
            <NotificationsPage
              onNavigate={(view) => setCurrentView(view)}
            />
          ) : currentView === 'leaderboard' ? (
            <Leaderboard
              currentUser={user}
            />
          ) : currentView === 'learning-path' ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#121E3E] to-[#0C1425] border border-cyan-900/30 shadow-xl">
                <h1 className="text-2xl font-bold text-white mb-1">DSA & System Design Mastery Track</h1>
                <p className="text-xs text-slate-400">Step-by-step roadmap from Arrays & Two Pointers to Dynamic Programming and Graph traversals.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['1. Arrays & Hashing', '2. Two Pointers & Sliding Window', '3. Stack & Queue Mastery', '4. Binary Search', '5. Trees & Graphs', '6. Dynamic Programming Patterns'].map((track, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 hover:border-cyan-500/40 transition-colors cursor-pointer" onClick={() => setCurrentView('available')}>
                    <div className="text-xs font-bold text-cyan-400">Module {i + 1}</div>
                    <div className="text-sm font-bold text-white">{track}</div>
                    <div className="text-xs text-slate-400">Includes theory, 10 coding challenges, and mentor test cases.</div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentView === 'settings' ? (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h1 className="text-lg font-bold text-white">Platform Settings</h1>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
                <div className="flex justify-between"><span>Theme:</span><span className="font-semibold text-cyan-400">Dark SaaS (Active)</span></div>
                <div className="flex justify-between"><span>Integrated Compiler:</span><span className="font-semibold text-emerald-400">Sandboxed Node/Python</span></div>
                <div className="flex justify-between"><span>Role:</span><span className="font-semibold text-white uppercase">{user?.role}</span></div>
              </div>
            </div>
          ) : currentView === 'admin-dashboard' || currentView === 'admin-challenges' ? (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-create' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <AdminDashboard
                onOpenDailyModal={handleOpenAdminDailyModal}
                onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
                onOpenAssignModal={handleOpenAssignModal}
                onSelectProblem={handleSelectProblem}
              />
            </div>
          ) : currentView === 'admin-cohorts' ? (
            <AdminCohorts
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-users' ? (
            <AdminUsers
              onOpenAssignModal={handleOpenAssignModal}
              onSelectStudent={(s) => setCurrentView('admin-users')}
            />
          ) : currentView === 'admin-assignments' ? (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-reviews' ? (
            <AdminSubmissionsReview />
          ) : (
            <UserDashboard
              user={user}
              onSelectProblem={handleSelectProblem}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}
        </div>
      </div>

      {/* Global Modals for Admin */}
      {isAdmin && (
        <>
          <AdminDailyQuestionModal
            isOpen={isDailyModalOpen}
            onClose={() => setIsDailyModalOpen(false)}
            onSetDaily={async (questionId) => {
              await api.setDailyQuestion({ question_id: questionId });
              setIsDailyModalOpen(false);
            }}
            questions={questionsForModal}
          />

          <AdminQuestionModal
            isOpen={isCreateChallengeModalOpen}
            onClose={() => setIsCreateChallengeModalOpen(false)}
            onSaved={() => {
              setIsCreateChallengeModalOpen(false);
            }}
          />

          <AdminAssignModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            questions={questionsForModal}
            users={usersForModal}
            selectedUser={selectedUserForAssign}
            onAssigned={() => {
              setIsAssignModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
