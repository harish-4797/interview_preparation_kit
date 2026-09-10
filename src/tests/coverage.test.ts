import { CoverageChecker } from '../core/coverage/coverageChecker';
import { Requirement, Question, CompanyBrief } from '../core/types/kit';
import { QuestionGenerator } from '../core/generation/questionGenerator';
import { LLMClient } from '../core/llm/client';

describe('CoverageChecker', () => {
  const requirements: Requirement[] = [
    { id: 'r1', text: 'Proficiency with React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Experience with PostgreSQL', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Cross-functional communication', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'GraphQL experience', kind: 'technical', priority: 'nice' },
  ];

  test('correctly identifies uncovered requirements deterministically in code', () => {
    // Only q1 covers r1; r2, r3, r4 are missing
    const questions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'How do React hooks handle state updates?',
        answer_outline: 'Fiber reconciliation, batched updates.',
        difficulty: 2,
      },
    ];

    const analysis = CoverageChecker.analyze(requirements, questions);

    expect(analysis.isFullyCovered).toBe(false);
    expect(analysis.hasAllMustHavesCovered).toBe(false);
    expect(analysis.uncoveredRequirementIds).toEqual(['r2', 'r3', 'r4']);
    expect(analysis.uncoveredMustHaves.map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(analysis.uncoveredNiceToHaves.map((r) => r.id)).toEqual(['r4']);
    expect(analysis.coverageRatio).toBe(0.25);
  });

  test('reports fully covered when all requirements have at least one question', () => {
    const questions: Question[] = [
      { id: 'q1', requirement_ids: ['r1', 'r2'], category: 'technical', prompt: 'P1', answer_outline: 'A1', difficulty: 2 },
      { id: 'q2', requirement_ids: ['r3'], category: 'behavioural', prompt: 'P2', answer_outline: 'A2', difficulty: 1 },
      { id: 'q3', requirement_ids: ['r4'], category: 'technical', prompt: 'P3', answer_outline: 'A3', difficulty: 2 },
    ];

    const analysis = CoverageChecker.analyze(requirements, questions);
    expect(analysis.isFullyCovered).toBe(true);
    expect(analysis.hasAllMustHavesCovered).toBe(true);
    expect(analysis.uncoveredRequirementIds).toHaveLength(0);
    expect(analysis.coverageRatio).toBe(1.0);
  });

  test('second pass gap-closing loop closes uncovered must-haves', async () => {
    const initialQuestions: Question[] = [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain React reconciliation.',
        answer_outline: 'VDOM diffing algorithm.',
        difficulty: 2,
      },
    ];

    const brief: CompanyBrief = {
      summary: 'Tech company',
      what_they_do: 'Software solutions',
      sources: ['https://example.com'],
    };

    const mockLlm = new LLMClient();
    const generator = new QuestionGenerator(mockLlm);

    const result = await CoverageChecker.runCoverageLoop(
      requirements,
      initialQuestions,
      brief,
      generator,
      2 // 2 passes
    );

    expect(result.coverage.passes).toBeGreaterThanOrEqual(1);
    expect(result.questions.length).toBeGreaterThan(initialQuestions.length);

    // Verify after gap closing, r2 and r3 are addressed
    const finalCoveredIds = new Set(result.questions.flatMap((q) => q.requirement_ids));
    expect(finalCoveredIds.has('r2')).toBe(true);
    expect(finalCoveredIds.has('r3')).toBe(true);
  });
});
