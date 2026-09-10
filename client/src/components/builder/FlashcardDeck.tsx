'use client';

import React, { useState } from 'react';
import { Flashcard, Requirement } from '../../types/kit';
import {
  Layers,
  RotateCw,
  PlusCircle,
  Play,
  Trash2,
  Edit3,
  Check,
  Pin,
} from 'lucide-react';

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  requirements: Requirement[];
  onUpdateFlashcards: (updated: Flashcard[]) => void;
  onLaunchPractice: () => void;
}

export default function FlashcardDeck({
  flashcards,
  requirements,
  onUpdateFlashcards,
  onLaunchPractice,
}: FlashcardDeckProps) {
  const [flippedMap, setFlippedMap] = useState<Record<string, boolean>>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const toggleFlip = (id: string) => {
    setFlippedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (fc: Flashcard) => {
    setEditingCardId(fc.id);
    setEditFront(fc.front);
    setEditBack(fc.back);
  };

  const saveEdit = (id: string) => {
    const updated = flashcards.map((f) => {
      if (f.id !== id) return f;
      return {
        ...f,
        front: editFront.trim(),
        back: editBack.trim(),
        _meta: {
          origin: f._meta?.origin || 'generated',
          status: 'edited' as const,
          last_modified: new Date().toISOString(),
        },
      };
    });
    onUpdateFlashcards(updated);
    setEditingCardId(null);
  };

  const deleteCard = (id: string) => {
    onUpdateFlashcards(flashcards.filter((f) => f.id !== id));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: Flashcard = {
      id: `f_manual_${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      requirement_ids: requirements.length > 0 ? [requirements[0].id] : ['r1'],
      _meta: {
        origin: 'manual',
        status: 'edited',
        last_modified: new Date().toISOString(),
      },
    };

    onUpdateFlashcards([...flashcards, newCard]);
    setIsAddModalOpen(false);
    setNewFront('');
    setNewBack('');
  };

  return (
    <div className="space-y-6">
      {/* Header with practice launcher */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Layers className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Flashcards ({flashcards.length})</h2>
            <p className="text-xs text-zinc-400">High-yield recall cards linked directly to role requirements</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Add Card</span>
          </button>

          <button
            onClick={onLaunchPractice}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Start Practice Mode</span>
          </button>
        </div>
      </div>

      {/* Flashcard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {flashcards.map((fc) => {
          const isFlipped = !!flippedMap[fc.id];
          const isEditing = editingCardId === fc.id;

          return (
            <div
              key={fc.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between min-h-[220px] transition-all shadow-sm group"
            >
              {/* Card top bar */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-zinc-400 font-bold">{fc.id}</span>
                  {fc.requirement_ids.map((rid) => (
                    <span
                      key={rid}
                      className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-300 rounded"
                    >
                      {rid}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      onClick={() => saveEdit(fc.id)}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(fc)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
                      title="Edit Card"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteCard(fc.id)}
                    className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                    title="Delete Card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Card body */}
              <div className="my-4 flex-1">
                {isEditing ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-semibold mb-0.5">Front</label>
                      <textarea
                        rows={2}
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-2 text-zinc-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-semibold mb-0.5">Back</label>
                      <textarea
                        rows={3}
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-2 text-zinc-200 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => toggleFlip(fc.id)}
                    className="cursor-pointer h-full flex flex-col justify-center"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1 flex items-center justify-between">
                      <span>{isFlipped ? 'Answer (Back)' : 'Question (Front)'}</span>
                      <span className="text-indigo-400 flex items-center gap-1 font-normal lowercase">
                        <RotateCw className="h-3 w-3" /> flip
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isFlipped ? 'text-emerald-300 font-medium' : 'text-zinc-200'}`}>
                      {isFlipped ? fc.back : fc.front}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 text-[10px] text-zinc-500 text-center border-t border-zinc-800/40">
                Click card to reveal {isFlipped ? 'prompt' : 'answer'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Flashcard Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add New Flashcard</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Front (Prompt/Concept)</label>
                <textarea
                  required
                  rows={2}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. What is the difference between SQL and NoSQL databases?"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Back (Crisp Answer)</label>
                <textarea
                  required
                  rows={4}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="SQL uses structured relational tables with ACID transactions; NoSQL uses flexible documents/key-value with horizontal scalability..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                />
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
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm shadow-emerald-500/20 transition-all"
                >
                  Create Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
