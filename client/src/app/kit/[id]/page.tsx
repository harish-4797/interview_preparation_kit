'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/authContext';
import { api } from '../../../lib/api';
import { Kit, Question, Flashcard, CompanyBrief, QuestionCategory } from '../../../types/kit';
import CompanyBriefCard from '../../../components/builder/CompanyBriefCard';
import RoleCard from '../../../components/builder/RoleCard';
import QuestionBank from '../../../components/builder/QuestionBank';
import FlashcardDeck from '../../../components/builder/FlashcardDeck';
import ScheduleView from '../../../components/builder/ScheduleView';
import CoverageMatrix from '../../../components/builder/CoverageMatrix';
import PracticeModal from '../../../components/practice/PracticeModal';
import MockInterviewModal from '../../../components/mock/MockInterviewModal';

import {
  Sparkles,
  Building,
  HelpCircle,
  Layers,
  Calendar,
  ShieldCheck,
  Play,
  Download,
  Loader2,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface KitPageProps {
  params: Promise<{ id: string }>;
}

export default function KitDetailPage({ params }: KitPageProps) {
  const resolvedParams = use(params);
  const kitId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'flashcards' | 'schedule' | 'coverage'>('questions');

  // Modal states
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [mockQuestion, setMockQuestion] = useState<Question | null>(null);
  const [isMockOpen, setIsMockOpen] = useState(false);

  // Regeneration state
  const [isRegeneratingBrief, setIsRegeneratingBrief] = useState(false);
  const [isRegeneratingCategory, setIsRegeneratingCategory] = useState(false);
  const [isRegeneratingSchedule, setIsRegeneratingSchedule] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (user && kitId) {
      loadKit();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, kitId]);

  const loadKit = async () => {
    setLoading(true);
    try {
      const data = await api.getKit(kitId);
      setKit(data.kit);
    } catch (err: any) {
      console.error('Failed to load kit:', err);
      showToast(err.message || 'Failed to load preparation kit.');
    } finally {
      setLoading(false);
    }
  };

  const persistKit = async (updatedKit: Kit) => {
    setKit(updatedKit);
    try {
      await api.updateKit(kitId, updatedKit);
    } catch (err) {
      console.error('Failed to auto-save kit edits:', err);
    }
  };

  // Brief update
  const handleUpdateBrief = (updatedBrief: CompanyBrief) => {
    if (!kit) return;
    persistKit({ ...kit, company_brief: updatedBrief });
    showToast('Company brief saved.');
  };

  const handleRegenerateBrief = async () => {
    if (!kit) return;
    setIsRegeneratingBrief(true);
    try {
      const res = await api.regenerateSection(kitId, 'company_brief');
      setKit(res.kit);
      showToast('Company brief regenerated from live research.');
    } catch (err: any) {
      showToast(err.message || 'Brief regeneration failed.');
    } finally {
      setIsRegeneratingBrief(false);
    }
  };

  // Questions update
  const handleUpdateQuestions = (updatedQuestions: Question[]) => {
    if (!kit) return;
    persistKit({ ...kit, questions: updatedQuestions });
  };

  const handleRegenerateCategory = async (category: QuestionCategory) => {
    if (!kit) return;
    setIsRegeneratingCategory(true);
    try {
      const res = await api.regenerateSection(kitId, category);
      setKit(res.kit);
      showToast(`Category "${category}" regenerated while preserving your edits & pins!`);
    } catch (err: any) {
      showToast(err.message || 'Category regeneration failed.');
    } finally {
      setIsRegeneratingCategory(false);
    }
  };

  // Flashcards update
  const handleUpdateFlashcards = (updatedCards: Flashcard[]) => {
    if (!kit) return;
    persistKit({ ...kit, flashcards: updatedCards });
  };

  // Schedule update
  const handleRegenerateSchedule = async (days?: number) => {
    if (!kit) return;
    setIsRegeneratingSchedule(true);
    try {
      const res = await api.regenerateSection(kitId, 'schedule');
      setKit(res.kit);
      showToast('Study schedule rebalanced.');
    } catch (err: any) {
      showToast(err.message || 'Schedule regeneration failed.');
    } finally {
      setIsRegeneratingSchedule(false);
    }
  };

  // Export Clean Appendix A JSON
  const handleExportJson = () => {
    if (!kit) return;
    // Strip internal _meta tags for clean export conforming strictly to Appendix A
    const cleanKit = {
      source: kit.source,
      company_brief: {
        summary: kit.company_brief.summary,
        what_they_do: kit.company_brief.what_they_do,
        sources: kit.company_brief.sources,
      },
      role: kit.role,
      questions: kit.questions.map((q) => ({
        id: q.id,
        requirement_ids: q.requirement_ids,
        category: q.category,
        prompt: q.prompt,
        answer_outline: q.answer_outline,
        difficulty: q.difficulty,
      })),
      flashcards: kit.flashcards.map((f) => ({
        id: f.id,
        front: f.front,
        back: f.back,
        requirement_ids: f.requirement_ids,
      })),
      schedule: kit.schedule,
      coverage: kit.coverage,
    };

    const blob = new Blob([JSON.stringify(cleanKit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-prep-kit-${kit.source.company.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenMockModal = (q: Question) => {
    setMockQuestion(q);
    setIsMockOpen(true);
  };

  if (loading || !kit) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400">Loading interview kit workspace...</span>
      </div>
    );
  }

  const tabs = [
    { key: 'questions', label: 'Questions', icon: HelpCircle, count: kit.questions.length },
    { key: 'flashcards', label: 'Flashcards', icon: Layers, count: kit.flashcards.length },
    { key: 'schedule', label: 'Schedule', icon: Calendar, count: `${kit.schedule.days_available}d` },
    { key: 'overview', label: 'Company & Role', icon: Building },
    { key: 'coverage', label: 'Coverage Matrix', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs animate-fade-in">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Kit Workspace Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Kits</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {kit.role.title}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {kit.source.company}
            </span>
          </div>

          <p className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
            <span>{kit.source.location}</span>
            <span>•</span>
            <span>{kit.schedule.days_available}-Day Prep Box</span>
            <span>•</span>
            <span>{kit.role.requirements.length} Requirements Verified</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsPracticeOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Practice Flashcards</span>
          </button>

          <button
            onClick={handleExportJson}
            title="Export clean Appendix A JSON"
            className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-zinc-800 pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-950 text-zinc-400 border border-zinc-800">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Views */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <CompanyBriefCard
              brief={kit.company_brief}
              onUpdate={handleUpdateBrief}
              onRegenerate={handleRegenerateBrief}
              isRegenerating={isRegeneratingBrief}
            />
            <RoleCard role={kit.role} />
          </div>
        )}

        {activeTab === 'questions' && (
          <QuestionBank
            questions={kit.questions}
            requirements={kit.role.requirements}
            onUpdateQuestions={handleUpdateQuestions}
            onRegenerateCategory={handleRegenerateCategory}
            onOpenMockModal={handleOpenMockModal}
            isRegeneratingCategory={isRegeneratingCategory}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardDeck
            flashcards={kit.flashcards}
            requirements={kit.role.requirements}
            onUpdateFlashcards={handleUpdateFlashcards}
            onLaunchPractice={() => setIsPracticeOpen(true)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            schedule={kit.schedule}
            questions={kit.questions}
            onRegenerateSchedule={handleRegenerateSchedule}
            isRegenerating={isRegeneratingSchedule}
          />
        )}

        {activeTab === 'coverage' && (
          <CoverageMatrix
            coverage={kit.coverage}
            requirements={kit.role.requirements}
            questions={kit.questions}
          />
        )}
      </div>

      {/* Flashcard Practice Modal */}
      <PracticeModal
        kitId={kitId}
        initialCards={kit.flashcards}
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
      />

      {/* AI Mock Interview Simulator Modal */}
      <MockInterviewModal
        kitId={kitId}
        question={mockQuestion}
        isOpen={isMockOpen}
        onClose={() => {
          setIsMockOpen(false);
          setMockQuestion(null);
        }}
      />
    </div>
  );
}
