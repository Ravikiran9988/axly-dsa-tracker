import React from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2, Terminal } from 'lucide-react';

// Layouts
import MainLayout from './layouts/MainLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Student Pages
import UserDashboard from './pages/UserDashboard';
import AvailableChallenges from './pages/AvailableChallenges';
import DailyChallenge from './pages/DailyChallenge';
import ProblemWorkspace from './pages/ProblemWorkspace';
import SubmissionHistory from './pages/SubmissionHistory';
import UserProfile from './pages/UserProfile';
import NotificationsPage from './pages/NotificationsPage';
import Leaderboard from './pages/Leaderboard';
import StudentAnalytics from './pages/StudentAnalytics';
import DsaAiCoachPanel from './components/DsaAiCoachPanel';

// Admin Pages
import AdminCoreDashboard from './pages/AdminCoreDashboard';
import AdminQuestions from './pages/AdminQuestions';
import AdminDailyChallenge from './pages/AdminDailyChallenge';
import AdminProgress from './pages/AdminProgress';
import AdminSubmissions from './pages/AdminSubmissions';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminSettings from './pages/AdminSettings';
import SubmissionReviewConsole from './pages/SubmissionReviewConsole';

// Wrapper for ProblemWorkspace to read ID from URL
const ProblemWorkspaceWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ProblemWorkspace
      questionId={id}
      onBack={() => navigate('/practice')}
      onStatusUpdated={() => {}}
    />
  );
};

// Wrapper for components that expect onSelectProblem and onNavigate
const withNavProps = (Component) => {
  return function WrappedComponent(props) {
    const navigate = useNavigate();
    const handleSelectProblem = (id) => navigate(`/solve/${id}`);
    const handleNavigate = (view) => navigate(`/${view}`);
    
    return <Component 
      {...props} 
      onSelectProblem={handleSelectProblem} 
      onNavigate={handleNavigate}
      onOpenChallenge={handleSelectProblem}
    />;
  };
};

const DashboardNav = withNavProps(UserDashboard);
const ChallengesNav = withNavProps(AvailableChallenges);
const DailyNav = withNavProps(DailyChallenge);
const SubmissionsNav = withNavProps(SubmissionHistory);
const AnalyticsNav = withNavProps(StudentAnalytics);
const ProfileNav = withNavProps(UserProfile);
const AdminDashNav = withNavProps(AdminCoreDashboard);
const AdminQuestionsNav = withNavProps(AdminQuestions);
const AdminDailyNav = withNavProps(AdminDailyChallenge);
const AdminSubsNav = withNavProps(AdminSubmissions);

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-theme-text2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Axly...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Backward compatibility for public navigation props
  const handlePublicNav = (route, token = '') => {
    if (route === 'landing') navigate('/');
    else if (route === 'reset-password') navigate(token ? `/reset-password/${token}` : '/reset-password');
    else navigate(`/${route}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-theme-text2">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Loading Axly...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!user ? <LandingPage onNavigateToLogin={() => navigate('/login')} /> : <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />} />
      <Route path="/login" element={!user ? <Login onNavigate={handlePublicNav} onBackToHome={() => navigate('/')} /> : <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />} />
      <Route path="/signup" element={!user ? <Signup onNavigate={handlePublicNav} onBackToHome={() => navigate('/')} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/forgot-password" element={!user ? <ForgotPassword onNavigate={handlePublicNav} onBackToHome={() => navigate('/')} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/reset-password/:token?" element={!user ? <ResetPassword onNavigate={handlePublicNav} onBackToHome={() => navigate('/')} /> : <Navigate to="/dashboard" replace />} />
      <Route path="/verify-email/:token?" element={!user ? <VerifyEmail onNavigate={handlePublicNav} onBackToHome={() => navigate('/')} /> : <Navigate to="/dashboard" replace />} />

      {/* Protected Routes inside MainLayout */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Student Routes */}
        <Route path="/dashboard" element={<DashboardNav user={user} />} />
        <Route path="/practice" element={<ChallengesNav />} />
        <Route path="/available" element={<Navigate to="/practice" replace />} />
        <Route path="/daily" element={<DailyNav />} />
        <Route path="/daily-challenge" element={<Navigate to="/daily" replace />} />
        <Route path="/solve/:id" element={<ProblemWorkspaceWrapper />} />
        <Route path="/submissions" element={<SubmissionsNav />} />
        <Route path="/analytics" element={<AnalyticsNav />} />
        <Route path="/progress" element={<Navigate to="/analytics" replace />} />
        <Route path="/profile" element={<ProfileNav />} />
        <Route path="/notifications" element={<NotificationsPage onNavigate={(v) => navigate(`/${v}`)} />} />
        <Route path="/leaderboard" element={<Leaderboard currentUser={user} />} />
        <Route path="/ai-coach" element={<div className="max-w-4xl mx-auto h-[84vh] p-2"><DsaAiCoachPanel /></div>} />
        <Route path="/dsa-ai" element={<Navigate to="/ai-coach" replace />} />
        
        {/* Settings placeholders */}
        <Route path="/learning-path" element={
          <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-theme-surface border border-theme-border">
            <h1 className="text-2xl font-bold text-white">DSA & System Design Mastery Track</h1>
            <p className="text-sm text-theme-text2 mt-2">Structured mastery roadmap from Foundations & Two Pointers to Trees, Graphs, and Dynamic Programming.</p>
          </div>
        } />
        <Route path="/settings" element={
          <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-theme-surface border border-theme-border">
            <h1 className="text-lg font-bold text-white">Account & Editor Settings</h1>
          </div>
        } />

        {/* Admin Routes */}
        <Route path="/admin-dashboard" element={<ProtectedRoute requireAdmin><AdminDashNav /></ProtectedRoute>} />
        <Route path="/admin-challenges" element={<ProtectedRoute requireAdmin><AdminQuestionsNav /></ProtectedRoute>} />
        <Route path="/admin-questions" element={<Navigate to="/admin-challenges" replace />} />
        <Route path="/admin-daily" element={<ProtectedRoute requireAdmin><AdminDailyNav /></ProtectedRoute>} />
        <Route path="/admin-reviews" element={<ProtectedRoute requireAdmin><SubmissionReviewConsole /></ProtectedRoute>} />
        <Route path="/admin-users" element={<ProtectedRoute requireAdmin><AdminUsers onSelectStudent={() => navigate('/admin-users')} /></ProtectedRoute>} />
        <Route path="/admin-progress" element={<ProtectedRoute requireAdmin><AdminProgress /></ProtectedRoute>} />
        <Route path="/admin-submissions" element={<ProtectedRoute requireAdmin><AdminSubsNav /></ProtectedRoute>} />
        <Route path="/admin-audit" element={<ProtectedRoute requireAdmin><AdminAuditLogs /></ProtectedRoute>} />
        <Route path="/admin-settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
