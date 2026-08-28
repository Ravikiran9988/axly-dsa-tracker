import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sliders,
  Shield,
  Server,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  Lock,
  Zap
} from 'lucide-react';

export default function AdminSettings() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setLoading(true);
    try {
      const res = await fetch('/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            System & Security Settings
          </h1>
          <p className="text-xs text-slate-400">
            Platform runtime parameters, authentication providers, and service health monitors.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Check Health</span>
        </button>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Backend Server</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{health?.status || 'Online'}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {health?.timestamp ? `Ping: ${new Date(health.timestamp).toLocaleTimeString()}` : 'Port 5000'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Auth & Identity</span>
            <Lock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-white">
            Supabase + OAuth
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            Google OAuth 2.0 active
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Code Execution Sandbox</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">
            Isolated Process
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Timeout: 5000ms &bull; Limit: 64KB
          </div>
        </div>
      </div>

      {/* Security & Rate Limit Safeguards */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span>Security & Guardrail Specifications</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="text-slate-400 font-bold font-mono text-[11px] block">API RATE LIMITING</span>
            <p className="text-slate-300 leading-relaxed">
              Express Rate Limit enforces maximum 300 requests / 15 minutes per IP in production to guard against credential stuffing and DoS attacks.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="text-slate-400 font-bold font-mono text-[11px] block">ROLE-BASED ACCESS CONTROL (RBAC)</span>
            <p className="text-slate-300 leading-relaxed">
              Admin routes require both a verified token and verified role from the server database before granting access to modification endpoints.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="text-slate-400 font-bold font-mono text-[11px] block">AUDIT TRAIL SANITIZATION</span>
            <p className="text-slate-300 leading-relaxed">
              Passwords, secret keys, bearer tokens, and hidden test expected outputs are strictly redacted prior to persistent logging.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
            <span className="text-slate-400 font-bold font-mono text-[11px] block">QUESTION LIFECYCLE STATE MACHINE</span>
            <p className="text-slate-300 leading-relaxed">
              AI-generated problems and edits remain in draft state until quality checks (hidden tests, output limits) pass validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
