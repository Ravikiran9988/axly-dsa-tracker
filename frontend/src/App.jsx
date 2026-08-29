import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import UserDashboard from './pages/UserDashboard';
import AvailableChallenges from './pages/AvailableChallenges';
import DailyChallenge from './pages/DailyChallenge';
import ProblemWorkspace from './pages/ProblemWorkspace';
import SubmissionHistory from './pages/SubmissionHistory';
import UserProfile from './pages/UserProfile';
import NotificationsPage from './pages/NotificationsPage';
import Leaderboard from './pages/Leaderboard';
import StudentAnalytics from './pages/StudentAnalytics';
import AdminCoreDashboard from './pages/AdminCoreDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import SubmissionReviewConsole from './pages/SubmissionReviewConsole';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import AdminQuestionModal from './components/AdminQuestionModal';
import { api } from './services/api';
import { practiceApi } from './services/practiceApi';
import { Loader2, Terminal } from 'lucide-react';

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [questionsForModal, setQuestionsForModal] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotificationsCount();
    }
  }, [user, currentView]);

  async function loadNotificationsCount() {
    try {
      const res = await api.getNotifications();
      setUnreadNotifsCount(res.data?.unreadCount || 0);
    } catch (error) {
      console.warn('Failed to load notifications count', error);
    }
  }

  const handleSelectProblem = async (questionId) => {
    const fromPractice = currentView === 'practice' || currentView === 'available';
    if (fromPractice) {
      try {
        await practiceApi.start(questionId);
      } catch (error) {
        console.error('Failed to start practice problem:', error);
        return;
      }
    }
    setActiveQuestionId(questionId);
    setCurrentView('solve');
  };

  const handleOpenAdminDailyModal = async () => {
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestionsForModal(res.data || []);
      setIsDailyModalOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C14]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/20">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Axly DSA Tracker...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    if (currentView === 'solve' && activeQuestionId) {
      return <ProblemWorkspace questionId={activeQuestionId} onBack={() => setCurrentView('practice')} onStatusUpdated={loadNotificationsCount} />;
    }
    if (currentView === 'dashboard') {
      return <UserDashboard user={user} onSelectProblem={handleSelectProblem} onNavigate={setCurrentView} />;
    }
    if (currentView === 'practice' || currentView === 'available') {
      return <AvailableChallenges onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'daily') {
      return <DailyChallenge onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'submissions') {
      return <SubmissionHistory onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'analytics') {
      return <StudentAnalytics onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'profile') {
      return <UserProfile onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'notifications') {
      return <NotificationsPage onNavigate={setCurrentView} />;
    }
    if (currentView === 'leaderboard') {
      return <Leaderboard currentUser={user} />;
    }
    if (currentView === 'learning-path') {
      return (
        <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h1 className="text-2xl font-bold text-white">DSA & System Design Mastery Track</h1>
          <p className="text-sm text-slate-400 mt-2">Step-by-step roadmap from Arrays & Two Pointers to Dynamic Programming and Graph traversals.</p>
        </div>
      );
    }
    if (currentView === 'settings') {
      return (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h1 className="text-lg font-bold text-white">Platform Settings</h1>
        </div>
      );
    }
    if (currentView === 'admin-dashboard') {
      return <AdminCoreDashboard onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'admin-users') {
      return <AdminUsers onSelectStudent={() => setCurrentView('admin-users')} />;
    }
    if (currentView === 'admin-reviews') {
      return <SubmissionReviewConsole />;
    }
    if (currentView === 'admin-audit') {
      return <AdminAuditLogs />;
    }
    return <UserDashboard user={user} onSelectProblem={handleSelectProblem} onNavigate={setCurrentView} />;
  };

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
          {renderView()}
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
              onSuccess={() => setIsCreateChallengeModalOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
