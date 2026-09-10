'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard, PracticeSessionProgress } from '../../types/kit';
import { api } from '../../lib/api';
import {
  X,
  RotateCw,
  Award,
  BookOpen,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface PracticeModalProps {
  kitId: string;
  initialCards: Flashcard[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PracticeModal({
  kitId,
  initialCards,
  isOpen,
  onClose,
}: PracticeModalProps) {
  const [queue, setQueue] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState<PracticeSessionProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Load confidence-weighted queue from backend
  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getPracticeQueue(kitId);
      if (data.queue && data.queue.length > 0) {
        setQueue(data.queue);
      }
      setProgress(data.progress);
    } catch {
      // fallback to initialCards
      setQueue(initialCards);
    }
  }, [kitId, initialCards]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionFinished(false);
      loadQueue();
    }
  }, [isOpen, loadQueue]);

  const currentCard = queue[currentIndex];

  const handleRate = async (rating: 1 | 2 | 3) => {
    if (!currentCard || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.recordCardReview(kitId, currentCard.id, rating);
      setProgress(res.progress);

      // Advance to next card or complete session
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setSessionFinished(true);
      }
    } catch (err: any) {
      console.error('Failed to record review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation: Space = flip, 1 = Low, 2 = Medium, 3 = High, Escape = exit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate(1);
        else if (e.key === '2') handleRate(2);
        else if (e.key === '3') handleRate(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlipped, currentIndex, queue, isSubmitting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[520px]">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Active Flashcard Practice</h2>
              <p className="text-[11px] text-zinc-400">
                Confidence-weighted spaced repetition session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress stats */}
            {progress && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
                <span className="text-emerald-400 font-semibold">{progress.mastered_count} Mastered</span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">{progress.learning_count} Learning</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {!sessionFinished && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1 font-medium">
              <span>Card {currentIndex + 1} of {queue.length}</span>
              <span>{Math.round(((currentIndex + 1) / queue.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Card Display Area */}
        <div className="flex-1 flex flex-col justify-center my-6">
          {sessionFinished ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Award className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Session Complete!</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                Great job! Your confidence ratings have been updated. Future sessions will prioritize any weaker cards.
              </p>

              {progress && (
                <div className="flex justify-center gap-4 pt-2">
                  <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 text-center">
                    <div className="text-xs text-zinc-500">Mastered</div>
                    <div className="text-lg font-bold text-emerald-400">{progress.mastered_count}</div>
                  </div>
                  <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 text-center">
                    <div className="text-xs text-zinc-500">Learning</div>
                    <div className="text-lg font-bold text-amber-400">{progress.learning_count}</div>
                  </div>
                  <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 text-center">
                    <div className="text-xs text-zinc-500">Coverage</div>
                    <div className="text-lg font-bold text-indigo-400">{progress.coverage_percentage}%</div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  Done Practicing
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <div
              onClick={() => setIsFlipped((prev) => !prev)}
              className="cursor-pointer bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-8 min-h-[260px] flex flex-col justify-between shadow-inner transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-mono font-bold uppercase">{currentCard.id}</span>
                <span className="text-indigo-400 flex items-center gap-1">
                  <RotateCw className="h-3.5 w-3.5" />
                  {isFlipped ? 'Click to show front' : 'Click to flip (Space)'}
                </span>
              </div>

              <div className="my-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  {isFlipped ? 'Answer' : 'Question Prompt'}
                </div>
                <p
                  className={`text-lg sm:text-xl font-medium leading-relaxed ${
                    isFlipped ? 'text-emerald-300' : 'text-zinc-100'
                  }`}
                >
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
              </div>

              <div className="flex justify-center gap-1 text-[11px] text-zinc-500">
                {currentCard.requirement_ids.map((rid) => (
                  <span key={rid} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    Req: {rid}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom Rating Controls */}
        {!sessionFinished && currentCard && (
          <div className="pt-4 border-t border-zinc-800">
            {isFlipped ? (
              <div>
                <p className="text-xs text-zinc-400 text-center mb-3">
                  How confident did you feel recalling this card? (Keys: 1, 2, 3)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleRate(1)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <span>1 • Again / Low</span>
                    <span className="text-[10px] text-rose-400 font-normal">Review sooner</span>
                  </button>

                  <button
                    onClick={() => handleRate(2)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <span>2 • Hard / Medium</span>
                    <span className="text-[10px] text-amber-400 font-normal">Review standard</span>
                  </button>

                  <button
                    onClick={() => handleRate(3)}
                    disabled={isSubmitting}
                    className="py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex flex-col items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <span>3 • Good / Mastered</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Prioritize less</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Reveal Answer (Press Spacebar)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
