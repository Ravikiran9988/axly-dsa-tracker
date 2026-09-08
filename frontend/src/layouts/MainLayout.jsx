import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AdminQuestionModal from '../components/AdminQuestionModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);

  // Derive current view from pathname for backwards compatibility with Sidebar/Navbar props
  const currentView = location.pathname.split('/')[1] || 'dashboard';

  useEffect(() => {
    if (user) {
      loadNotificationsCount();
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

  const handleSetCurrentView = (view) => {
    navigate(`/${view}`);
  };

  const handleOpenAdminDailyModal = async () => {
    if (!isAdmin) return;
    setIsDailyModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text1 flex flex-row font-sans">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleSetCurrentView}
        user={user}
        onLogout={logout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <Navbar
          activeTab={currentView}
          setActiveTab={handleSetCurrentView}
          onOpenAdminDailyModal={handleOpenAdminDailyModal}
          onOpenCreateChallenge={() => setIsCreateChallengeModalOpen(true)}
          unreadCount={unreadNotifsCount}
        />

        <div className={`flex-1 overflow-y-auto custom-scrollbar bg-theme-bg ${currentView === 'solve' ? '' : 'p-4 md:p-6 lg:p-8'}`}>
          <Outlet />
        </div>
      </div>

      {isAdmin && (
        <>
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
