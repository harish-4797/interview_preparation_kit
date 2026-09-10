'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import { api } from '../lib/api';
import {
  Sparkles,
  PlusCircle,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface KitSummary {
  id: string;
  company: string;
  role: string;
  days: number;
  questionCount: number;
  flashcardCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadKits();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadKits = async () => {
    setLoading(true);
    try {
      const data = await api.listKits();
      setKits(data.kits || []);
    } catch (err) {
      console.error('Failed to load kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prep kit?')) return;

    setDeletingId(id);
    try {
      await api.deleteKit(id);
      setKits((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Failed to delete kit:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400">Loading your preparation kits...</span>
      </div>
    );
  }

  // Signed-out Hero landing view
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Full-Stack AI Interview Preparation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Turn Any Job Description Into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Personalized Interview Prep Kit
          </span>
        </h1>

        <p className="mt-4 text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Autonomous company site crawling, public interview discussion analysis, requirement extraction,
          guaranteed must-have question coverage, spaced-repetition flashcards, and day-by-day study scheduling.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>Get Started Free</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-800 transition-all"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-white mb-2">Autonomous Web Crawling</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Discovers hidden hiring and engineering pages without relying on hard-coded paths. Respects robots.txt and site terms.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400 font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-white mb-2">Deterministic Coverage Check</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculates requirement coverage in code, executing a second-pass loop until 100% of must-have requirements have targeted questions.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-white mb-2">Spaced Practice & Schedule</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Confidence-weighted flashcard review engine and arithmetic day-by-day study schedule front-loading difficult concepts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard View
  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interview Preparation Kits</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage, customize, and practice your tailored preparation kits
          </p>
        </div>

        <Link
          href="/new"
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 flex items-center gap-2 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create New Kit</span>
        </Link>
      </div>

      {/* Kit Grid or Empty State */}
      {kits.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-8">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Preparation Kits Yet</h3>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Paste in any job description and company URL, set your preparation timebox, and let the autonomous pipeline generate your structured kit.
          </p>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Your First Kit</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((k) => (
            <Link
              key={k.id}
              href={`/kit/${k.id}`}
              className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {k.role}
                    </h3>
                    <p className="text-xs font-semibold text-indigo-400 line-clamp-1">{k.company}</p>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, k.id)}
                    disabled={deletingId === k.id}
                    title="Delete Kit"
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    {deletingId === k.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                  <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center justify-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> Plan
                    </div>
                    <div className="font-bold text-zinc-200 mt-0.5">{k.days} Days</div>
                  </div>

                  <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center justify-center gap-1">
                      <HelpCircle className="h-2.5 w-2.5" /> Qs
                    </div>
                    <div className="font-bold text-zinc-200 mt-0.5">{k.questionCount}</div>
                  </div>

                  <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center justify-center gap-1">
                      <Layers className="h-2.5 w-2.5" /> Cards
                    </div>
                    <div className="font-bold text-zinc-200 mt-0.5">{k.flashcardCount}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Open Kit <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
