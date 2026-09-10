'use client';

import React, { useState } from 'react';
import { Schedule, Question } from '../../types/kit';
import { Calendar, Clock, CheckSquare, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

interface ScheduleViewProps {
  schedule: Schedule;
  questions: Question[];
  onRegenerateSchedule: (days?: number) => Promise<void>;
  isRegenerating?: boolean;
}

export default function ScheduleView({
  schedule,
  questions,
  onRegenerateSchedule,
  isRegenerating = false,
}: ScheduleViewProps) {
  const [targetDays, setTargetDays] = useState(schedule.days_available);
  const qMap = new Map(questions.map((q) => [q.id, q]));

  const totalMinutes = schedule.days.reduce((acc, d) => acc + d.minutes, 0);

  return (
    <div className="space-y-6">
      {/* Schedule Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {schedule.days_available}-Day Interview Study Plan
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <Clock className="h-3 w-3" /> {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m total
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Deterministic priority scheduling: Harder topics & must-have requirements front-loaded
            </p>
          </div>
        </div>

        {/* Adjust days & Regenerate */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800 text-xs">
            <span className="text-zinc-400">Days:</span>
            <input
              type="number"
              min={1}
              max={60}
              value={targetDays}
              onChange={(e) => setTargetDays(Math.max(1, parseInt(e.target.value || '1', 10)))}
              className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => onRegenerateSchedule(targetDays)}
            disabled={isRegenerating}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRegenerating ? 'Recalculating...' : 'Rebalance Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Days Timeline */}
      <div className="space-y-4">
        {schedule.days.map((day) => {
          const dayQuestions = day.question_ids.map((id) => qMap.get(id)).filter(Boolean) as Question[];

          return (
            <div
              key={day.day}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-zinc-700 transition-colors"
            >
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <span className="h-7 px-2.5 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    Day {day.day}
                  </span>
                  <h3 className="font-semibold text-sm text-zinc-100">{day.focus}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    <strong>{day.minutes}</strong> minutes
                  </span>
                  <span className="text-zinc-500">
                    ({dayQuestions.length} {dayQuestions.length === 1 ? 'question' : 'questions'})
                  </span>
                </div>
              </div>

              {/* Question list for this day */}
              <div className="mt-3 space-y-2">
                {dayQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 flex items-start gap-3 text-xs"
                  >
                    <CheckSquare className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-zinc-400">{q.id}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 capitalize">
                          {q.category}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 font-mono">
                          Level {q.difficulty}
                        </span>
                      </div>
                      <p className="text-zinc-200 font-medium">{q.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
