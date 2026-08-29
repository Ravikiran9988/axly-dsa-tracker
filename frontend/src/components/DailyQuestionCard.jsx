import React from 'react';
import { Calendar, Code2, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

export default function DailyQuestionCard({ dailyQuestion, dailyData, onOpenInPlatform }) {
  const todayUtc = new Date().toISOString().split('T')[0];
  const question = dailyQuestion || dailyData?.data || dailyData;
  const solved = question?.submission_status === 'solved';

  const diffCls = {
    easy:   'badge-easy',
    medium: 'badge-medium',
    hard:   'badge-hard',
  }[String(question?.difficulty).toLowerCase()] || 'badge-neutral';

  if (!question) {
    return (
      <div className="card p-8 text-center space-y-2">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-400">No daily challenge today</p>
        <p className="text-xs text-slate-600">Challenges are set by your admin each day.</p>
      </div>
    );
  }

  return (
    <div className={`card overflow-hidden border-l-2 ${solved ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={diffCls}>{question.difficulty}</span>
            {question.topic_name && (
              <span className="badge badge-neutral">{question.topic_name}</span>
            )}
            <span className="badge text-amber-400 bg-amber-500/10 border-amber-500/20">
              <Zap className="w-3 h-3" /> +100 pts
            </span>
            {solved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
          </div>
          <h3
            onClick={onOpenInPlatform}
            className="text-lg font-bold text-white hover:text-axly-300 transition-colors cursor-pointer truncate"
          >
            {question.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayUtc} UTC</span>
            <span className="mx-1">·</span>
            <span>One challenge for all students</span>
          </div>
        </div>
        <button
          id="btn-open-daily-challenge"
          onClick={onOpenInPlatform}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors ${
            solved
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          <Code2 className="w-4 h-4" />
          {solved ? 'Review Solution' : 'Solve Challenge'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
