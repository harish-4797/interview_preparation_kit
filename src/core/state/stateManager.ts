import {
  Kit,
  EnhancedKit,
  EnhancedQuestion,
  EnhancedFlashcard,
  EnhancedCompanyBrief,
  QuestionCategory,
  ItemMetadata,
  ItemStatus,
  Question,
  Flashcard,
  CompanyBrief,
} from '../types/kit';
import { QuestionGenerator } from '../generation/questionGenerator';
import { CompanyResearcher } from '../research/companyResearch';
import { CrawlResult } from '../crawler/crawler';
import { DeterministicScheduler } from '../scheduler/scheduler';
import { CoverageChecker } from '../coverage/coverageChecker';

export class StateManager {
  /**
   * Initializes an EnhancedKit from a standard Kit, tagging all items as initial 'generated'
   */
  public static fromKit(kit: Kit): EnhancedKit {
    const defaultMeta: ItemMetadata = {
      origin: 'generated',
      status: 'unmodified',
    };

    return {
      ...kit,
      company_brief: {
        ...kit.company_brief,
        _meta: { ...defaultMeta },
      },
      questions: kit.questions.map((q) => ({
        ...q,
        _meta: { ...defaultMeta },
      })),
      flashcards: kit.flashcards.map((f) => ({
        ...f,
        _meta: { ...defaultMeta },
      })),
    };
  }

  /**
   * Converts an EnhancedKit to an exact Appendix A Kit by stripping internal metadata
   */
  public static toCleanKit(enhanced: EnhancedKit): Kit {
    const cleanBrief: CompanyBrief = {
      summary: enhanced.company_brief.summary,
      what_they_do: enhanced.company_brief.what_they_do,
      sources: enhanced.company_brief.sources,
    };

    const cleanQuestions: Question[] = enhanced.questions.map((q) => ({
      id: q.id,
      requirement_ids: q.requirement_ids,
      category: q.category,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    }));

    const cleanFlashcards: Flashcard[] = enhanced.flashcards.map((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      requirement_ids: f.requirement_ids,
    }));

    return {
      source: enhanced.source,
      company_brief: cleanBrief,
      role: enhanced.role,
      questions: cleanQuestions,
      flashcards: cleanFlashcards,
      schedule: enhanced.schedule,
      coverage: enhanced.coverage,
    };
  }

  /**
   * Records a manual edit on a question, setting its status to 'edited'
   */
  public static editQuestion(
    kit: EnhancedKit,
    questionId: string,
    updates: Partial<Omit<EnhancedQuestion, 'id' | '_meta'>>
  ): EnhancedKit {
    const questions = kit.questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        ...updates,
        _meta: {
          origin: q._meta?.origin || 'generated',
          status: 'edited' as const,
          last_modified: new Date().toISOString(),
        },
      };
    });

    return { ...kit, questions };
  }

  /**
   * Toggles the pinned state of a question
   */
  public static togglePinQuestion(kit: EnhancedKit, questionId: string): EnhancedKit {
    const questions = kit.questions.map((q) => {
      if (q.id !== questionId) return q;
      const isPinned = q._meta?.status === 'pinned';
      return {
        ...q,
        _meta: {
          origin: q._meta?.origin || 'generated',
          status: (isPinned ? 'edited' : 'pinned') as ItemStatus,
          last_modified: new Date().toISOString(),
        },
      };
    });

    return { ...kit, questions };
  }

  /**
   * Adds a question manually
   */
  public static addManualQuestion(
    kit: EnhancedKit,
    newQuestion: Omit<Question, 'id'>
  ): EnhancedKit {
    const nextId = `q_manual_${Date.now()}`;
    const question: EnhancedQuestion = {
      ...newQuestion,
      id: nextId,
      _meta: {
        origin: 'manual',
        status: 'edited',
        last_modified: new Date().toISOString(),
      },
    };

    return {
      ...kit,
      questions: [...kit.questions, question],
    };
  }

  /**
   * Deletes a question
   */
  public static deleteQuestion(kit: EnhancedKit, questionId: string): EnhancedKit {
    const questions = kit.questions.filter((q) => q.id !== questionId);
    // Remove from schedule
    const days = kit.schedule.days.map((d) => ({
      ...d,
      question_ids: d.question_ids.filter((id) => id !== questionId),
    }));

    return {
      ...kit,
      questions,
      schedule: {
        ...kit.schedule,
        days,
      },
    };
  }

  /**
   * Regenerates a single question category while preserving edited, pinned, or manually added questions.
   * Other categories and sections are strictly preserved!
   */
  public static async regenerateCategory(
    kit: EnhancedKit,
    targetCategory: QuestionCategory,
    generator: QuestionGenerator,
    hiringNotes: string = ''
  ): Promise<EnhancedKit> {
    // 1. Separate preserved vs replaceable questions in this category
    const preservedInTarget: EnhancedQuestion[] = [];
    const otherCategoryQuestions: EnhancedQuestion[] = [];

    for (const q of kit.questions) {
      if (q.category === targetCategory) {
        const isPinned = q._meta?.status === 'pinned';
        const isEdited = q._meta?.status === 'edited';
        const isManual = q._meta?.origin === 'manual';

        if (isPinned || isEdited || isManual) {
          preservedInTarget.push(q);
        }
      } else {
        otherCategoryQuestions.push(q);
      }
    }

    // 2. Generate new draft questions for this category
    const maxExistingIndex = kit.questions.reduce((max, q) => {
      const match = q.id.match(/^q(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const newlyGenerated = await generator.generateQuestionsForCategory(
      targetCategory,
      kit.role.requirements,
      kit.company_brief,
      hiringNotes,
      maxExistingIndex
    );

    const enhancedNewQuestions: EnhancedQuestion[] = newlyGenerated.map((q) => ({
      ...q,
      _meta: {
        origin: 'generated',
        status: 'unmodified',
        last_modified: new Date().toISOString(),
      },
    }));

    // 3. Assemble unified question list (preserved kept first, followed by new)
    const updatedCategoryQuestions = [...preservedInTarget, ...enhancedNewQuestions];
    const allQuestions = [...otherCategoryQuestions, ...updatedCategoryQuestions];

    // 4. Re-calculate coverage to ensure must-haves are maintained
    const cleanQs = allQuestions.map((q) => ({
      id: q.id,
      requirement_ids: q.requirement_ids,
      category: q.category,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    }));

    const analysis = CoverageChecker.analyze(kit.role.requirements, cleanQs);

    // 5. Update schedule to reflect newly available/preserved question IDs
    const updatedSchedule = DeterministicScheduler.schedule(
      kit.schedule.days_available,
      cleanQs,
      kit.role.requirements
    );

    return {
      ...kit,
      questions: allQuestions,
      schedule: updatedSchedule,
      coverage: {
        uncovered_requirement_ids: analysis.uncoveredRequirementIds,
        passes: kit.coverage.passes,
      },
    };
  }

  /**
   * Regenerates only the Company Brief without touching role, questions, flashcards, or schedule
   */
  public static async regenerateCompanyBrief(
    kit: EnhancedKit,
    researcher: CompanyResearcher,
    crawlResult: CrawlResult
  ): Promise<EnhancedKit> {
    if (kit.company_brief._meta?.status === 'pinned') {
      return kit; // Pinned brief is locked
    }

    const research = await researcher.research(kit.source.company_url, crawlResult, kit.source.company);

    return {
      ...kit,
      company_brief: {
        ...research.brief,
        _meta: {
          origin: 'generated',
          status: 'unmodified',
          last_modified: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Regenerates only the Schedule based on the latest questions and requirements
   */
  public static regenerateSchedule(kit: EnhancedKit, daysAvailable?: number): EnhancedKit {
    const days = daysAvailable ?? kit.schedule.days_available;
    const cleanQuestions: Question[] = kit.questions.map((q) => ({
      id: q.id,
      requirement_ids: q.requirement_ids,
      category: q.category,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    }));

    const newSchedule = DeterministicScheduler.schedule(days, cleanQuestions, kit.role.requirements);

    return {
      ...kit,
      schedule: newSchedule,
    };
  }
}
