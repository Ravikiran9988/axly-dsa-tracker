import React, { useState, useEffect } from 'react';
import StudentSidebar from '../components/StudentSidebar';
import StudentNavbar from '../components/StudentNavbar';
import UserDashboard from '../pages/UserDashboard';
import AvailableChallenges from '../pages/AvailableChallenges';
import MyTasks from '../pages/MyTasks';
import ProblemWorkspace from '../pages/ProblemWorkspace';
import SubmissionHistory from '../pages/SubmissionHistory';
import StudentAnalytics from '../pages/StudentAnalytics';
import Leaderboard from '../pages/Leaderboard';
import UserProfile from '../pages/UserProfile';
import NotificationsPage from '../pages/NotificationsPage';
import { api } from '../services/api';

export default function StudentLayout({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

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

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-row font-sans">
      {/* Dedicated Student Sidebar */}
      <StudentSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
      />

      {/* Main Content Area with Dedicated Student Top Navbar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <StudentNavbar
          activeTab={currentView}
          setActiveTab={setCurrentView}
          unreadCount={unreadNotifsCount}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 bg-[#070B14]">
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
          ) : currentView === 'daily' || currentView === 'tasks' ? (
            <MyTasks onSelectProblem={handleSelectProblem} />
          ) : currentView === 'available' || currentView === 'practice' ? (
            <AvailableChallenges onSelectProblem={handleSelectProblem} />
          ) : currentView === 'submissions' ? (
            <SubmissionHistory onSelectProblem={handleSelectProblem} />
          ) : currentView === 'analytics' ? (
            <StudentAnalytics onSelectProblem={handleSelectProblem} />
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
          ) : currentView === 'profile' ? (
            <UserProfile onSelectProblem={handleSelectProblem} />
          ) : currentView === 'notifications' ? (
            <NotificationsPage onNavigate={setCurrentView} />
          ) : currentView === 'settings' ? (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h1 className="text-lg font-bold text-white">Account Settings</h1>
            </div>
          ) : (
            <UserDashboard
              user={user}
              onSelectProblem={handleSelectProblem}
              onNavigate={setCurrentView}
            />
          )}
        </main>
      </div>
    </div>
  );
}
