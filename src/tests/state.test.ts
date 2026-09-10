import { StateManager } from '../core/state/stateManager';
import { Kit } from '../core/types/kit';
import { QuestionGenerator } from '../core/generation/questionGenerator';
import { LLMClient } from '../core/llm/client';

describe('StateManager (Builder & Regeneration Preservation)', () => {
  const baseKit: Kit = {
    source: {
      company: 'TechCorp',
      company_url: 'https://techcorp.example.com',
      role: 'Backend Engineer',
      location: 'Remote',
      jd_chars: 400,
      researched_at: '2026-09-01T09:00:00Z',
      pages_used: ['https://techcorp.example.com'],
    },
    company_brief: {
      summary: 'TechCorp builds cloud tools.',
      what_they_do: 'Distributed software systems.',
      sources: ['https://techcorp.example.com'],
    },
    role: {
      title: 'Backend Engineer',
      seniority: 'Senior',
      responsibilities: ['Build high throughput APIs'],
      requirements: [
        { id: 'r1', text: 'Proficiency in Node.js', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Distributed systems experience', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Leadership and mentoring', kind: 'behavioural', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Original Q1 Prompt',
        answer_outline: 'Original Answer Outline',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'Original Q2 Prompt',
        answer_outline: 'Original Q2 Outline',
        difficulty: 3,
      },
      {
        id: 'q3',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Original Q3 Behavioural',
        answer_outline: 'Original Q3 Outline',
        difficulty: 1,
      },
    ],
    flashcards: [
      { id: 'f1', front: 'Front 1', back: 'Back 1', requirement_ids: ['r1'] },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: 'Technicals', question_ids: ['q1', 'q2'], minutes: 60 },
        { day: 2, focus: 'Behavioural', question_ids: ['q3'], minutes: 45 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };

  test('initializes EnhancedKit with default generated/unmodified metadata', () => {
    const enhanced = StateManager.fromKit(baseKit);
    expect(enhanced.questions[0]._meta?.status).toBe('unmodified');
    expect(enhanced.questions[0]._meta?.origin).toBe('generated');
    expect(enhanced.company_brief._meta?.status).toBe('unmodified');
  });

  test('marks question as edited when modified', () => {
    const enhanced = StateManager.fromKit(baseKit);
    const updated = StateManager.editQuestion(enhanced, 'q1', {
      prompt: 'User Custom Edited Prompt for Q1',
    });

    const q1 = updated.questions.find((q) => q.id === 'q1')!;
    expect(q1.prompt).toBe('User Custom Edited Prompt for Q1');
    expect(q1._meta?.status).toBe('edited');
    expect(q1._meta?.last_modified).toBeDefined();
  });

  test('preserves edited and pinned questions when regenerating that category', async () => {
    let enhanced = StateManager.fromKit(baseKit);

    // 1. User edits q1 manually
    enhanced = StateManager.editQuestion(enhanced, 'q1', {
      prompt: 'MY CUSTOM PRESERVED QUESTION Q1',
    });

    // 2. User pins q2
    enhanced = StateManager.togglePinQuestion(enhanced, 'q2');
    expect(enhanced.questions.find((q) => q.id === 'q2')!._meta?.status).toBe('pinned');

    // 3. User regenerates technical category
    const mockLlm = new LLMClient();
    const generator = new QuestionGenerator(mockLlm);

    const regenerated = await StateManager.regenerateCategory(
      enhanced,
      'technical',
      generator
    );

    // Verify q1 and q2 SURVIVED regeneration
    const preservedQ1 = regenerated.questions.find((q) => q.id === 'q1');
    const preservedQ2 = regenerated.questions.find((q) => q.id === 'q2');

    expect(preservedQ1).toBeDefined();
    expect(preservedQ1?.prompt).toBe('MY CUSTOM PRESERVED QUESTION Q1');
    expect(preservedQ1?._meta?.status).toBe('edited');

    expect(preservedQ2).toBeDefined();
    expect(preservedQ2?._meta?.status).toBe('pinned');

    // Verify unrelated behavioural question q3 is completely untouched
    const q3 = regenerated.questions.find((q) => q.id === 'q3');
    expect(q3?.prompt).toBe('Original Q3 Behavioural');

    // Verify company brief, flashcards, etc. are untouched
    expect(regenerated.company_brief.summary).toBe(baseKit.company_brief.summary);
    expect(regenerated.flashcards.length).toBe(baseKit.flashcards.length);
  });

  test('converts enhanced kit to clean Appendix A kit by stripping _meta', () => {
    let enhanced = StateManager.fromKit(baseKit);
    enhanced = StateManager.editQuestion(enhanced, 'q1', { prompt: 'Edited Q1' });

    const clean = StateManager.toCleanKit(enhanced);
    expect((clean.questions[0] as any)._meta).toBeUndefined();
    expect((clean.company_brief as any)._meta).toBeUndefined();
    expect((clean.flashcards[0] as any)._meta).toBeUndefined();
    expect(clean.questions[0].prompt).toBe('Edited Q1');
  });
});
