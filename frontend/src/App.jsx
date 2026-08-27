import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDailyQuestionModal from './components/AdminDailyQuestionModal';
import { api } from './services/api';
import { Loader2, Terminal } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-[#080C14] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-axly-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center space-y-4 relative z-10 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-axly-600 via-axly-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-axly-500/25 animate-pulse-slow">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 text-axly-400 animate-spin" />
            <span>Loading Axly DSA Tracker...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-axly-500 selection:text-white">
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
      <footer className="border-t border-slate-800/80 py-7 text-center text-xs text-slate-500 font-mono bg-[#080C14]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Axly DSA Tracker</span>
            <span>·</span>
            <span>Production Ready</span>
          </div>
          <p className="text-slate-500">
            Engineered for consistent Data Structures & Algorithms mastery
          </p>
        </div>
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
