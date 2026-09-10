import { validateKit, validateBatchInput } from '../core/validator/kitValidator';

describe('Schema Validator (Appendix A & B)', () => {
  const validKit = {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.com',
      role: 'Full Stack Engineer',
      location: 'Remote',
      jd_chars: 520,
      researched_at: '2026-09-01T09:12:44Z',
      pages_used: ['https://acme.com', 'https://acme.com/about'],
    },
    company_brief: {
      summary: 'Acme develops cloud productivity software.',
      what_they_do: 'Enterprise SaaS collaboration tools.',
      sources: ['https://acme.com'],
    },
    role: {
      title: 'Full Stack Engineer',
      seniority: 'Senior',
      responsibilities: ['Build APIs', 'Maintain frontend components'],
      requirements: [
        { id: 'r1', text: '5+ years with React', kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Mentoring experience', kind: 'behavioural', priority: 'must' },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain React server components.',
        answer_outline: 'Zero-bundle-size server execution.',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'behavioural',
        prompt: 'Describe a mentoring challenge.',
        answer_outline: 'Coaching approach and growth metrics.',
        difficulty: 1,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is hydration in React?',
        back: 'Attaching event listeners to server-rendered HTML.',
        requirement_ids: ['r1'],
      },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: 'Technical Mastery', question_ids: ['q1'], minutes: 60 },
        { day: 2, focus: 'Behavioral & Leadership', question_ids: ['q2'], minutes: 45 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 2,
    },
  };

  test('validates a conformant Appendix A kit successfully', () => {
    const result = validateKit(validKit);
    expect(result.success).toBe(true);
  });

  test('rejects kit when days length does not match days_available', () => {
    const invalid = JSON.parse(JSON.stringify(validKit));
    invalid.schedule.days_available = 5; // mismatch: array length is 2, days_available is 5
    const result = validateKit(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('Schedule days count'))).toBe(true);
    }
  });

  test('rejects kit with non-integer minutes or float difficulty', () => {
    const invalid = JSON.parse(JSON.stringify(validKit));
    invalid.schedule.days[0].minutes = 45.5;
    invalid.questions[0].difficulty = 2.5;

    const result = validateKit(invalid);
    expect(result.success).toBe(false);
  });

  test('rejects kit when a schedule question_id does not exist', () => {
    const invalid = JSON.parse(JSON.stringify(validKit));
    invalid.schedule.days[0].question_ids = ['q_non_existent'];

    const result = validateKit(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('non-existent question ID'))).toBe(true);
    }
  });

  test('rejects kit when a must-have requirement is omitted from the schedule', () => {
    const invalid = JSON.parse(JSON.stringify(validKit));
    // Remove q2 from schedule day 2, leaving r2 unscheduled
    invalid.schedule.days[1].question_ids = ['q1'];

    const result = validateKit(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.includes('Must-have requirement "r2"'))).toBe(true);
    }
  });

  test('validates Appendix B batch input format', () => {
    const validInput = [
      {
        id: 'case-01',
        jd: 'Looking for a Senior Backend Engineer...',
        company_url: 'http://localhost:8099/acme/',
        days: 5,
      },
    ];

    const result = validateBatchInput(validInput);
    expect(result.success).toBe(true);
  });
});
