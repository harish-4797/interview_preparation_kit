'use client';

import React, { useState } from 'react';
import { Question, QuestionCategory, QuestionDifficulty } from '../../types/kit';
import {
  Edit3,
  Check,
  Trash2,
  Pin,
  ChevronUp,
  ChevronDown,
  ArrowRightLeft,
  Sparkles,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

interface QuestionItemProps {
  question: Question;
  index: number;
  totalInCat: number;
  allCategories: QuestionCategory[];
  availableReqIds: string[];
  onUpdate: (updated: Question) => void;
  onDelete: (id: string) => void;
  onMoveCategory: (id: string, newCategory: QuestionCategory) => void;
  onMoveOrder: (index: number, direction: 'up' | 'down') => void;
  onOpenMockModal?: (question: Question) => void;
}

export default function QuestionItem({
  question,
  index,
  totalInCat,
  allCategories,
  availableReqIds,
  onUpdate,
  onDelete,
  onMoveCategory,
  onMoveOrder,
  onOpenMockModal,
}: QuestionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answer_outline);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question.difficulty);

  const isPinned = question._meta?.status === 'pinned';
  const isEdited = question._meta?.status === 'edited';
  const isManual = question._meta?.origin === 'manual';

  const handleSave = () => {
    onUpdate({
      ...question,
      prompt: prompt.trim(),
      answer_outline: answerOutline.trim(),
      difficulty,
      _meta: {
        origin: question._meta?.origin || 'generated',
        status: isPinned ? 'pinned' : 'edited',
        last_modified: new Date().toISOString(),
      },
    });
    setIsEditing(false);
  };

  const handleTogglePin = () => {
    onUpdate({
      ...question,
      _meta: {
        origin: question._meta?.origin || 'generated',
        status: isPinned ? 'edited' : 'pinned',
        last_modified: new Date().toISOString(),
      },
    });
  };

  const diffColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    2: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    3: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  };

  return (
    <div
      className={`rounded-2xl border transition-all p-5 shadow-sm ${
        isPinned
          ? 'bg-zinc-900/90 border-indigo-500/40 ring-1 ring-indigo-500/20'
          : isEdited
          ? 'bg-zinc-900 border-amber-500/30'
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700/80'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
            {question.id}
          </span>

          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
              diffColors[question.difficulty]?.bg
            } ${diffColors[question.difficulty]?.text} ${diffColors[question.difficulty]?.border}`}
          >
            Level {question.difficulty}
          </span>

          {/* Requirement tags */}
          <div className="flex items-center gap-1">
            {question.requirement_ids.map((rid) => (
              <span
                key={rid}
                className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded border border-zinc-700/60"
              >
                {rid}
              </span>
            ))}
          </div>

          {/* Status Badges */}
          {isPinned && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </span>
          )}
          {isEdited && !isPinned && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
              Edited
            </span>
          )}
          {isManual && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
              Manual
            </span>
          )}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          {/* Reordering */}
          <button
            onClick={() => onMoveOrder(index, 'up')}
            disabled={index === 0}
            title="Move Up"
            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-800 transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveOrder(index, 'down')}
            disabled={index === totalInCat - 1}
            title="Move Down"
            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 rounded hover:bg-zinc-800 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Move to another category */}
          <div className="relative group">
            <select
              value={question.category}
              onChange={(e) => onMoveCategory(question.id, e.target.value as QuestionCategory)}
              className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
              title="Move to another category"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  Move: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Pin */}
          <button
            onClick={handleTogglePin}
            title={isPinned ? 'Unpin question' : 'Pin question (preserves during category regeneration)'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isPinned
                ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>

          {/* Inline Edit Button */}
          {isEditing ? (
            <button
              onClick={handleSave}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              title="Save changes"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              title="Edit Question"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mock Interview Test Button */}
          {onOpenMockModal && (
            <button
              onClick={() => onOpenMockModal(question)}
              title="Practice Answering This Question (AI Evaluator)"
              className="px-2 py-1 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              <span>Simulate</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(question.id)}
            title="Delete Question"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3 text-sm">
        {/* Prompt */}
        <div>
          {isEditing ? (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Question Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div className="text-zinc-100 font-medium text-sm leading-relaxed flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>{question.prompt}</span>
            </div>
          )}
        </div>

        {/* Answer Outline */}
        <div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Answer Outline & Rubric
                </label>
                <textarea
                  value={answerOutline}
                  onChange={(e) => setAnswerOutline(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Difficulty (1 = Foundational, 2 = Applied, 3 = Advanced)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDifficulty(num as QuestionDifficulty)}
                      className={`px-3 py-1 text-xs rounded-lg border font-medium ${
                        difficulty === num
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Difficulty {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-zinc-400" />
                <span>Expected Answer Outline</span>
              </div>
              <p>{question.answer_outline}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
