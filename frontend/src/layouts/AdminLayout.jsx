import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import AdminNavbar from '../components/AdminNavbar';
import AdminDashboard from '../pages/AdminDashboard';
import AdminQuestions from '../pages/AdminQuestions';
import AdminDailyChallenge from '../pages/AdminDailyChallenge';
import AdminAssignments from '../pages/AdminAssignments';
import AdminCohorts from '../pages/AdminCohorts';
import AdminUsers from '../pages/AdminUsers';
import SubmissionReviewConsole from '../pages/SubmissionReviewConsole';
import AdminAuditLogs from '../pages/AdminAuditLogs';
import AdminSettings from '../pages/AdminSettings';
import AdminProfile from '../pages/AdminProfile';
import NotificationsPage from '../pages/NotificationsPage';
import ProblemWorkspace from '../pages/ProblemWorkspace';
import AdminDailyQuestionModal from '../components/AdminDailyQuestionModal';
import AdminQuestionModal from '../components/AdminQuestionModal';
import AdminAssignModal from '../components/AdminAssignModal';
import { api } from '../services/api';

export default function AdminLayout({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('admin-dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Modals state
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [selectedQuestionForAssign, setSelectedQuestionForAssign] = useState(null);
  const [questionsForModal, setQuestionsForModal] = useState([]);
  const [usersForModal, setUsersForModal] = useState([]);

  useEffect(() => {
    loadNotificationsCount();
  }, [currentView]);

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

  const handleOpenAssignModal = async (targetUser = null, targetQuestion = null) => {
    setSelectedUserForAssign(targetUser);
    setSelectedQuestionForAssign(targetQuestion);
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

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-row font-sans">
      {/* Dedicated Admin Sidebar */}
      <AdminSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
      />

      {/* Main Content Area with Dedicated Admin Top Navbar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <AdminNavbar
          activeTab={currentView}
          setActiveTab={setCurrentView}
          onOpenAdminDailyModal={handleOpenAdminDailyModal}
          onOpenCreateChallenge={() => setIsCreateChallengeModalOpen(true)}
          unreadCount={unreadNotifsCount}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 bg-[#070B14]">
          {currentView === 'solve' && activeQuestionId ? (
            <ProblemWorkspace
              questionId={activeQuestionId}
              onBack={() => setCurrentView('admin-challenges')}
              onStatusUpdated={loadNotificationsCount}
            />
          ) : currentView === 'admin-dashboard' ? (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
              onNavigate={setCurrentView}
            />
          ) : currentView === 'admin-challenges' || currentView === 'admin-questions' ? (
            <AdminQuestions
              onSelectProblem={handleSelectProblem}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
            />
          ) : currentView === 'admin-daily' ? (
            <AdminDailyChallenge
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-assignments' ? (
            <AdminAssignments
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-cohorts' ? (
            <AdminCohorts
              onSelectProblem={handleSelectProblem}
            />
          ) : currentView === 'admin-users' ? (
            <AdminUsers
              onOpenAssignModal={handleOpenAssignModal}
            />
          ) : currentView === 'admin-reviews' ? (
            <SubmissionReviewConsole />
          ) : currentView === 'admin-audit' ? (
            <AdminAuditLogs />
          ) : currentView === 'admin-settings' ? (
            <AdminSettings />
          ) : currentView === 'notifications' ? (
            <NotificationsPage onNavigate={setCurrentView} />
          ) : currentView === 'profile' ? (
            <AdminProfile />
          ) : (
            <AdminDashboard
              onOpenDailyModal={handleOpenAdminDailyModal}
              onOpenCreateModal={() => setIsCreateChallengeModalOpen(true)}
              onOpenAssignModal={handleOpenAssignModal}
              onSelectProblem={handleSelectProblem}
              onNavigate={setCurrentView}
            />
          )}
        </main>
      </div>

      {/* Admin Action Modals */}
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
          targetQuestion={selectedQuestionForAssign}
          questions={questionsForModal}
          users={usersForModal}
        />
      )}
    </div>
  );
}
