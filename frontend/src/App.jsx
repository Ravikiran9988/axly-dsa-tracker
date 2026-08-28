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
import StudentAnalytics from './pages/StudentAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import AdminCohorts from './pages/AdminCohorts';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import SubmissionReviewConsole from './pages/SubmissionReviewConsole';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import AdminQuestionModal from './components/AdminQuestionModal';
import AdminAssignModal from './components/AdminAssignModal';
import { api } from './services/api';
import { Loader2, Terminal } from 'lucide-react';

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [questionsForModal, setQuestionsForModal] = useState([]);
  const [usersForModal, setUsersForModal] = useState([]);

  useEffect(() => {
    if (user) loadNotificationsCount();
  }, [user, currentView]);

  async function loadNotificationsCount() {
    try {
      const res = await api.getNotifications();
      setUnreadNotifsCount(res.data?.unreadCount || 0);
    } catch {}
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
      <div className="min-h-screen flex items-center justify-center bg-[#080C14]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Axly...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-row font-sans">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={logout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <Navbar
          activeTab={currentView}
          setActiveTab={setCurrentView}
          onOpenAdminDailyModal={handleOpenAdminDailyModal}
          onOpenCreateChallenge={() => setIsCreateChallengeModalOpen(true)}
          unreadCount={unreadNotifsCount}
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 bg-[#070B14]">
          {currentView === 'solve' && activeQuestionId ? (
            <ProblemWorkspace
              questionId={activeQuestionId}
              onBack={() => setCurrentView('tasks')}
              onStatusUpdated={loadNotificationsCount}
            />
          ) : currentView === 'dashboard' ? (
            <UserDashboard
              user={user}
              onSelectProblem={handleSelectProblem}
              onNavigate={setCurrentView}
            />
          ) : currentView === 'available' || currentView === 'practice' ? (
            <AvailableChallenges onSelectProblem={handleSelectProblem} />
          ) : currentView === 'tasks' || currentView === 'daily' ? (
            <MyTasks onSelectProblem={handleSelectProblem} />
          ) : currentView === 'submissions' ? (
            <SubmissionHistory onSelectProblem={handleSelectProblem} />
          ) : currentView === 'analytics' ? (
            <StudentAnalytics onSelectProblem={handleSelectProblem} />
          ) : currentView === 'profile' ? (
            <UserProfile onSelectProblem={handleSelectProblem} />
          ) : currentView === 'notifications' ? (
            <NotificationsPage onNavigate={setCurrentView} />
          ) : currentView === 'leaderboard' ? (
            <Leaderboard currentUser={user} />
          ) : currentView === 'learning-path' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0C1425] via-[#121E3E] to-[#0C1425] border border-cyan-900/30">
                <h1 className="text-2xl font-bold text-white">DSA & System Design Mastery Track</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Step-by-step roadmap from Arrays & Two Pointers to Dynamic Programming and Graph traversals.
                </p>
              </div>
            </div>
          ) : currentView === 'settings' ? (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h1 className="text-lg font-bold text-white">Platform Settings</h1>
            </div>
          ) : currentView === 'admin-dashboard' || currentView === 'admin-challenges' || currentView === 'admin-assignments' ? (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-create' ? (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-cohorts' ? (
            <AdminCohorts onSelectProblem={handleSelectProblem} />
          ) : currentView === 'admin-users' ? (
            <AdminUsers
              onOpenAssignModal={handleOpenAssignModal}
              onSelectStudent={() => setCurrentView('admin-users')}
            />
          ) : currentView === 'admin-reviews' ? (
            <SubmissionReviewConsole />
          ) : currentView === 'admin-audit' ? (
            <AdminAuditLogs />
          ) : (
            <UserDashboard
              user={user}
              onSelectProblem={handleSelectProblem}
              onNavigate={setCurrentView}
            />
          )}
        </div>
      </div>
      {isAdmin && (
        <>
          {isDailyModalOpen && (
            <AdminDailyQuestionModal
              isOpen={isDailyModalOpen}
              onClose={() => setIsDailyModalOpen(false)}
              questions={questionsForModal}
            />
          )}
          {isCreateChallengeModalOpen && (
            <AdminQuestionModal
              isOpen={isCreateChallengeModalOpen}
              onClose={() => setIsCreateChallengeModalOpen(false)}
              onSuccess={() => {
                setIsCreateChallengeModalOpen(false);
              }}
            />
          )}
          {isAssignModalOpen && (
            <AdminAssignModal
              isOpen={isAssignModalOpen}
              onClose={() => setIsAssignModalOpen(false)}
              targetUser={selectedUserForAssign}
              questions={questionsForModal}
              users={usersForModal}
            />
          )}
        </>
      )}
    </div>
  );
}
