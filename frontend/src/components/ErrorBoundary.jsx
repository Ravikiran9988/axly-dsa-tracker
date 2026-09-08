import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Axly UI error:', error, info); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text1 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-theme-text2">The page encountered an unexpected error. Your data is safe.</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">Reload</button>
        </div>
      </div>
    );
  }
}
