import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [questionsForModal, setQuestionsForModal] = useState([]);

  // Handle open admin daily question modal from UserDashboard daily card
  const handleOpenAdminDailyModal = async () => {
    try {
      const res = await api.getQuestions({ limit: 100 });
      setQuestionsForModal(res.data || []);
      setIsDailyModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDailyFromModal = async (questionId) => {
    await api.setDailyQuestion({ question_id: questionId });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-axly-500 animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider">Loading Axly DSA Tracker...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1">
        {isAdmin && activeTab === 'admin' ? (
          <AdminDashboard onOpenDailyModal={handleOpenAdminDailyModal} />
        ) : (
          <UserDashboard
            onOpenAdminDailyModal={handleOpenAdminDailyModal}
            isAdmin={isAdmin}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <p>Axly DSA Tracker · Built for consistent Data Structures & Algorithms mastery</p>
      </footer>

      {/* Global Daily Question Modal for Admin Shortcut */}
      {isAdmin && (
        <AdminDailyQuestionModal
          isOpen={isDailyModalOpen}
          onClose={() => setIsDailyModalOpen(false)}
          onSetDaily={handleSetDailyFromModal}
          questions={questionsForModal}
        />
      )}
    </div>
  );
}
