'use client';

import React, { useState } from 'react';
import { Question } from '../../types/kit';
import { api } from '../../lib/api';
import { X, Sparkles, Loader2, CheckCircle2, Award, Lightbulb } from 'lucide-react';

interface MockInterviewModalProps {
  kitId: string;
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MockInterviewModal({
  kitId,
  question,
  isOpen,
  onClose,
}: MockInterviewModalProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    verdict: string;
    feedback: string;
    key_tips: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !question) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.evaluateMockAnswer(kitId, question.id, userAnswer);
      setResult(data.evaluation);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate answer');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setUserAnswer('');
    setError(null);
  };

  const verdictColors: Record<string, string> = {
    'Strong Hire': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'Hire': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Borderline': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Needs Improvement': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Mock Interview Simulator</h2>
              <p className="text-[11px] text-zinc-400">
                Type your answer and receive instant rubric feedback and scoring
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question Prompt Display */}
        <div className="my-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
          <div className="flex items-center gap-2 mb-1.5 text-xs">
            <span className="font-mono font-bold text-zinc-400">{question.id}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 capitalize">
              {question.category}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-400 font-mono">
              Level {question.difficulty}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-100">{question.prompt}</p>
        </div>

        {/* Form or Evaluation Results */}
        <div className="flex-1 overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Your Answer
                </label>
                <textarea
                  required
                  rows={6}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Outline your approach, technical trade-offs, architecture decisions, and real-world examples..."
                  className="w-full rounded-2xl bg-zinc-950 border border-zinc-700 p-4 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !userAnswer.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl shadow-sm shadow-purple-500/20 flex items-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{loading ? 'Evaluating Response...' : 'Submit for Evaluation'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in text-xs">
              {/* Score card */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">Evaluation Score</div>
                  <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                    <span>{result.score}</span>
                    <span className="text-zinc-500 text-xs">/10</span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    verdictColors[result.verdict] || 'text-zinc-300 bg-zinc-800 border-zinc-700'
                  }`}
                >
                  {result.verdict}
                </span>
              </div>

              {/* Feedback text */}
              <div>
                <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-purple-400" />
                  Detailed Rubric Feedback
                </h4>
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80 text-zinc-300 leading-relaxed space-y-2">
                  <p>{result.feedback}</p>
                </div>
              </div>

              {/* Actionable Tips */}
              {result.key_tips && result.key_tips.length > 0 && (
                <div>
                  <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    Key Improvement Tips
                  </h4>
                  <ul className="space-y-2">
                    {result.key_tips.map((tip, i) => (
                      <li
                        key={i}
                        className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 flex items-start gap-2 text-zinc-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
