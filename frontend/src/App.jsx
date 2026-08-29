import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
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
import AdminQuestions from './pages/AdminQuestions';
import AdminDailyChallenge from './pages/AdminDailyChallenge';
import AdminProgress from './pages/AdminProgress';
import AdminSubmissions from './pages/AdminSubmissions';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminSettings from './pages/AdminSettings';
import SubmissionReviewConsole from './pages/SubmissionReviewConsole';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import AdminQuestionModal from './components/AdminQuestionModal';
import { api } from './services/api';
import { practiceApi } from './services/practiceApi';
import { Loader2, Terminal } from 'lucide-react';

function parsePublicRoute() {
  if (typeof window === 'undefined') return { name: 'landing' };
  const path = window.location.pathname;
  if (path === '/login') return { name: 'login' };
  if (path === '/signup') return { name: 'signup' };
  if (path === '/forgot-password') return { name: 'forgot-password' };
  if (path.startsWith('/reset-password')) {
    const token = path.split('/')[2] || '';
    return { name: 'reset-password', token };
  }
  if (path.startsWith('/verify-email')) {
    return { name: 'verify-email' };
  }
  return { name: 'landing' };
}

export default function App() {
  const { user, loading, logout, isAdmin } = useAuth();
  const [publicRoute, setPublicRoute] = useState(parsePublicRoute);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [questionsForModal, setQuestionsForModal] = useState([]);

  useEffect(() => {
    const handlePopState = () => {
      setPublicRoute(parsePublicRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigatePublic = (route, token = '') => {
    let path = '/';
    if (route === 'login') path = '/login';
    else if (route === 'signup') path = '/signup';
    else if (route === 'forgot-password') path = '/forgot-password';
    else if (route === 'reset-password') path = token ? `/reset-password/${token}` : '/reset-password';
    else if (route === 'verify-email') path = '/verify-email';

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setPublicRoute({ name: route, token });
  };

  useEffect(() => {
    if (user) {
      loadNotificationsCount();
      if (user.role === 'admin' && currentView === 'dashboard') {
        setCurrentView('admin-dashboard');
      }
    }
  }, [user]);

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
    const routeName = typeof publicRoute === 'object' ? publicRoute.name : publicRoute;
    const routeToken = typeof publicRoute === 'object' ? publicRoute.token : '';

    if (routeName === 'login') {
      return (
        <Login
          onNavigate={(target, tok) => navigatePublic(target, tok)}
          onBackToHome={() => navigatePublic('landing')}
        />
      );
    }
    if (routeName === 'signup') {
      return (
        <Signup
          onNavigate={(target, tok) => navigatePublic(target, tok)}
          onBackToHome={() => navigatePublic('landing')}
        />
      );
    }
    if (routeName === 'forgot-password') {
      return (
        <ForgotPassword
          onNavigate={(target, tok) => navigatePublic(target, tok)}
          onBackToHome={() => navigatePublic('landing')}
        />
      );
    }
    if (routeName === 'reset-password') {
      return (
        <ResetPassword
          token={routeToken}
          onNavigate={(target, tok) => navigatePublic(target, tok)}
          onBackToHome={() => navigatePublic('landing')}
        />
      );
    }
    if (routeName === 'verify-email') {
      return (
        <VerifyEmail
          token={routeToken}
          onNavigate={(target, tok) => navigatePublic(target, tok)}
          onBackToHome={() => navigatePublic('landing')}
        />
      );
    }
    return <LandingPage onNavigateToLogin={() => navigatePublic('login')} />;
  }

  const renderView = () => {
    // Problem Solving IDE
    if (currentView === 'solve' && activeQuestionId) {
      return (
        <ProblemWorkspace
          questionId={activeQuestionId}
          onBack={() => setCurrentView('practice')}
          onStatusUpdated={loadNotificationsCount}
        />
      );
    }

    // Student Views
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
          <p className="text-sm text-slate-400 mt-2">Structured mastery roadmap from Foundations & Two Pointers to Trees, Graphs, and Dynamic Programming.</p>
        </div>
      );
    }
    if (currentView === 'settings') {
      return (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h1 className="text-lg font-bold text-white">Account & Editor Settings</h1>
        </div>
      );
    }

    // Admin Views
    if (currentView === 'admin-dashboard') {
      return <AdminCoreDashboard onSelectProblem={handleSelectProblem} onNavigate={setCurrentView} />;
    }
    if (currentView === 'admin-challenges' || currentView === 'admin-questions') {
      return <AdminQuestions onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'admin-daily') {
      return <AdminDailyChallenge onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'admin-reviews') {
      return <SubmissionReviewConsole />;
    }
    if (currentView === 'admin-users') {
      return <AdminUsers onSelectStudent={() => setCurrentView('admin-users')} />;
    }
    if (currentView === 'admin-progress') {
      return <AdminProgress />;
    }
    if (currentView === 'admin-submissions') {
      return <AdminSubmissions onSelectProblem={handleSelectProblem} />;
    }
    if (currentView === 'admin-audit') {
      return <AdminAuditLogs />;
    }
    if (currentView === 'admin-settings') {
      return <AdminSettings />;
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
