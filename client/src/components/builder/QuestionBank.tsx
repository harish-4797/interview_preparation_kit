'use client';

import React, { useState } from 'react';
import { Question, QuestionCategory, QuestionDifficulty, Requirement } from '../../types/kit';
import QuestionItem from './QuestionItem';
import {
  Code,
  Users,
  Cpu,
  HeartHandshake,
  PlusCircle,
  RefreshCw,
  Info,
  Pin,
} from 'lucide-react';

interface QuestionBankProps {
  questions: Question[];
  requirements: Requirement[];
  onUpdateQuestions: (updated: Question[]) => void;
  onRegenerateCategory: (category: QuestionCategory) => Promise<void>;
  onOpenMockModal?: (question: Question) => void;
  isRegeneratingCategory?: boolean;
}

const CATEGORIES: Array<{ key: QuestionCategory; label: string; icon: any }> = [
  { key: 'technical', label: 'Technical', icon: Code },
  { key: 'behavioural', label: 'Behavioural', icon: Users },
  { key: 'system-design', label: 'System Design', icon: Cpu },
  { key: 'company-fit', label: 'Company Fit', icon: HeartHandshake },
];

export default function QuestionBank({
  questions,
  requirements,
  onUpdateQuestions,
  onRegenerateCategory,
  onOpenMockModal,
  isRegeneratingCategory = false,
}: QuestionBankProps) {
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>('technical');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Question form state
  const [newPrompt, setNewPrompt] = useState('');
  const [newAnswerOutline, setNewAnswerOutline] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<QuestionDifficulty>(2);
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>(
    requirements.length > 0 ? [requirements[0].id] : ['r1']
  );

  const categoryQuestions = questions.filter((q) => q.category === activeCategory);
  const pinnedCount = categoryQuestions.filter((q) => q._meta?.status === 'pinned').length;
  const editedCount = categoryQuestions.filter((q) => q._meta?.status === 'edited').length;

  const handleUpdateQuestion = (updated: Question) => {
    const updatedList = questions.map((q) => (q.id === updated.id ? updated : q));
    onUpdateQuestions(updatedList);
  };

  const handleDeleteQuestion = (id: string) => {
    onUpdateQuestions(questions.filter((q) => q.id !== id));
  };

  const handleMoveCategory = (id: string, newCategory: QuestionCategory) => {
    const updatedList = questions.map((q) => {
      if (q.id !== id) return q;
      return {
        ...q,
        category: newCategory,
        _meta: {
          origin: q._meta?.origin || 'generated',
          status: 'edited' as const,
          last_modified: new Date().toISOString(),
        },
      };
    });
    onUpdateQuestions(updatedList);
  };

  const handleMoveOrder = (catIndex: number, direction: 'up' | 'down') => {
    const targetCatIndex = direction === 'up' ? catIndex - 1 : catIndex + 1;
    if (targetCatIndex < 0 || targetCatIndex >= categoryQuestions.length) return;

    // Swap items inside the category
    const catItems = [...categoryQuestions];
    const temp = catItems[catIndex];
    catItems[catIndex] = catItems[targetCatIndex];
    catItems[targetCatIndex] = temp;

    // Merge back into main list
    const otherItems = questions.filter((q) => q.category !== activeCategory);
    onUpdateQuestions([...otherItems, ...catItems]);
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !newAnswerOutline.trim()) return;

    const newQ: Question = {
      id: `q_manual_${Date.now()}`,
      requirement_ids: selectedReqIds.length > 0 ? selectedReqIds : ['r1'],
      category: activeCategory,
      prompt: newPrompt.trim(),
      answer_outline: newAnswerOutline.trim(),
      difficulty: newDifficulty,
      _meta: {
        origin: 'manual',
        status: 'edited',
        last_modified: new Date().toISOString(),
      },
    };

    onUpdateQuestions([...questions, newQ]);
    setIsAddModalOpen(false);
    setNewPrompt('');
    setNewAnswerOutline('');
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs & Section Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = questions.filter((q) => q.category === cat.key).length;
            const isActive = activeCategory === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.label}</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-indigo-800 text-indigo-200' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Controls for Category */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Add Question</span>
          </button>

          <button
            onClick={() => onRegenerateCategory(activeCategory)}
            disabled={isRegeneratingCategory}
            title="Regenerate unpinned/unedited questions in this category"
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-50 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingCategory ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRegeneratingCategory ? 'Regenerating...' : `Regenerate ${activeCategory}`}</span>
          </button>
        </div>
      </div>

      {/* State Preservation Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400">
        <Info className="h-4 w-4 text-indigo-400 shrink-0" />
        <span>
          <strong>State Preservation:</strong> Regenerating will strictly preserve{' '}
          <span className="text-indigo-300 font-semibold">{pinnedCount} pinned</span> and{' '}
          <span className="text-amber-300 font-semibold">{editedCount} edited</span> questions in this category.
        </span>
      </div>

      {/* Question List */}
      {categoryQuestions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <p className="text-sm text-zinc-400 mb-3">No questions in the {activeCategory} category yet.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"
          >
            Add Your First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryQuestions.map((q, idx) => (
            <QuestionItem
              key={q.id}
              question={q}
              index={idx}
              totalInCat={categoryQuestions.length}
              allCategories={CATEGORIES.map((c) => c.key)}
              availableReqIds={requirements.map((r) => r.id)}
              onUpdate={handleUpdateQuestion}
              onDelete={handleDeleteQuestion}
              onMoveCategory={handleMoveCategory}
              onMoveOrder={handleMoveOrder}
              onOpenMockModal={onOpenMockModal}
            />
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Custom Question to {activeCategory}</h3>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={2}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g. How does garbage collection work in V8?"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Answer Outline & Rubric</label>
                <textarea
                  required
                  rows={4}
                  value={newAnswerOutline}
                  onChange={(e) => setNewAnswerOutline(e.target.value)}
                  placeholder="Explain generational collection (Scavenge vs Mark-Sweep-Compact), memory spaces..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(parseInt(e.target.value, 10) as QuestionDifficulty)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Level 1 (Foundational)</option>
                    <option value={2}>Level 2 (Applied)</option>
                    <option value={3}>Level 3 (Advanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Target Requirement ID</label>
                  <select
                    value={selectedReqIds[0] || 'r1'}
                    onChange={(e) => setSelectedReqIds([e.target.value])}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}: {r.text.substring(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-500/30 transition-all"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
