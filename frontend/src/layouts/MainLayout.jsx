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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    setIsMobileMenuOpen(false);
  };

  const handleOpenAdminDailyModal = async () => {
    if (!isAdmin) return;
    setIsDailyModalOpen(true);
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-theme-bg text-theme-text1 flex flex-row font-sans">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleSetCurrentView}
        user={user}
        onLogout={logout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        unreadCount={unreadNotifsCount}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-[100dvh] relative">
        <Navbar
          activeTab={currentView}
          setActiveTab={handleSetCurrentView}
          onOpenAdminDailyModal={handleOpenAdminDailyModal}
          onOpenCreateChallenge={() => setIsCreateChallengeModalOpen(true)}
          unreadCount={unreadNotifsCount}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-theme-bg ${['solve', 'ai-coach'].includes(currentView) ? '' : 'p-4 md:p-6 lg:p-8'}`}>
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
