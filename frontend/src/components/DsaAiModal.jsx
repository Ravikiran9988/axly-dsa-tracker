import React from 'react';
import { X } from 'lucide-react';
import DsaAiCoachPanel from './DsaAiCoachPanel';

export default function DsaAiModal({ isOpen, onClose, problem = null, initialCode = '' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl h-[85vh] flex flex-col bg-[#080d1a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Close AI Assistant"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 overflow-hidden">
          <DsaAiCoachPanel
            problem={problem}
            currentCode={initialCode}
          />
        </div>
      </div>
    </div>
  );
}
