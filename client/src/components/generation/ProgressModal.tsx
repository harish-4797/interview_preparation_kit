'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export interface GenerationStep {
  step: number;
  name: string;
  detail: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

const DEFAULT_STEPS: Array<{ step: number; name: string; detail: string }> = [
  { step: 1, name: 'Ingesting Inputs', detail: 'Parsing JD text, company website URL, and days.' },
  { step: 2, name: 'Extracting Requirements', detail: 'Identifying must/nice technical, behavioural, and domain requirements.' },
  { step: 3, name: 'Crawling Company Website', detail: 'Discovering and ranking links, fetching company & career pages.' },
  { step: 4, name: 'Investigating Interview Process', detail: 'Searching hiring patterns and public interview discussions.' },
  { step: 5, name: 'Compiling Company Brief', detail: 'Synthesizing verified company summary and what they do.' },
  { step: 6, name: 'Finalizing Role Breakdown', detail: 'Structuring title, seniority, and responsibilities.' },
  { step: 7, name: 'Generating Category Questions', detail: 'Generating isolated technical, behavioural, and design questions.' },
  { step: 8, name: 'Generating Flashcards', detail: 'Creating high-yield review cards mapped to requirements.' },
  { step: 9, name: 'Deterministic Coverage Check', detail: 'Running code set-difference logic to detect coverage gaps.' },
  { step: 10, name: 'Second-Pass Gap Closing', detail: 'Generating targeted questions for any uncovered must-haves.' },
  { step: 11, name: 'Allocating Study Schedule', detail: 'Arithmetic distribution of topics and integer study minutes.' },
];

interface ProgressModalProps {
  isOpen: boolean;
  currentStep: number;
  error: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

export default function ProgressModal({
  isOpen,
  currentStep,
  error,
  onRetry,
  onCancel,
}: ProgressModalProps) {
  if (!isOpen) return null;

  const totalSteps = DEFAULT_STEPS.length;
  const progressPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            {error ? (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            ) : (
              <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {error ? 'Generation Encountered an Error' : 'Generating Interview Preparation Kit'}
            </h3>
            <p className="text-xs text-zinc-400">
              {error ? 'Please review the details below' : 'Autonomous research & sequential generation pipeline in progress'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {!error && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
              <span>Step {Math.min(currentStep, totalSteps)} of {totalSteps}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
            <p className="font-semibold mb-1">Failed to complete generation:</p>
            <p className="text-xs text-rose-400 break-words">{error}</p>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {DEFAULT_STEPS.map((s) => {
            const isCompleted = s.step < currentStep && !error;
            const isActive = s.step === currentStep && !error;
            const isPending = s.step > currentStep;

            return (
              <div
                key={s.step}
                className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-zinc-200'
                    : isCompleted
                    ? 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400'
                    : 'bg-transparent border-transparent text-zinc-600'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500">
                      {s.step}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">{s.name}</div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">{s.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions on failure */}
        {error && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-500/30 transition-all"
              >
                Retry Generation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
