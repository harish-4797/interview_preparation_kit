import { DeterministicScheduler } from '../core/scheduler/scheduler';
import { Question, Requirement } from '../core/types/kit';

describe('DeterministicScheduler', () => {
  const sampleRequirements: Requirement[] = [
    { id: 'r1', text: 'Proficiency in TypeScript and Node.js', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Experience designing distributed systems', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Mentoring junior developers and conducting reviews', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'Experience with Kubernetes', kind: 'technical', priority: 'nice' },
  ];

  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirement_ids: ['r1'],
      category: 'technical',
      prompt: 'Explain Node.js event loop and microtask scheduling.',
      answer_outline: 'Phases of libuv event loop, nextTick vs Promise resolution.',
      difficulty: 2,
    },
    {
      id: 'q2',
      requirement_ids: ['r2'],
      category: 'system-design',
      prompt: 'Design a distributed rate limiter.',
      answer_outline: 'Sliding window counters, Redis atomic scripts.',
      difficulty: 3,
    },
    {
      id: 'q3',
      requirement_ids: ['r3'],
      category: 'behavioural',
      prompt: 'Tell me about a time you gave constructive feedback.',
      answer_outline: 'STAR response with clear coaching outcome.',
      difficulty: 1,
    },
    {
      id: 'q4',
      requirement_ids: ['r4'],
      category: 'technical',
      prompt: 'How do Kubernetes readiness and liveness probes differ?',
      answer_outline: 'Service traffic routing vs pod restart policy.',
      difficulty: 2,
    },
  ];

  test('generates exactly the requested number of days for 5-day schedule', () => {
    const schedule = DeterministicScheduler.schedule(5, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days.length).toBe(5);
    expect(schedule.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  test('handles 1-day schedule edge case', () => {
    const schedule = DeterministicScheduler.schedule(1, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(1);
    expect(schedule.days.length).toBe(1);
    expect(schedule.days[0].day).toBe(1);
    expect(schedule.days[0].question_ids.length).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(schedule.days[0].minutes)).toBe(true);
  });

  test('handles 60-day schedule edge case without errors', () => {
    const schedule = DeterministicScheduler.schedule(60, sampleQuestions, sampleRequirements);
    expect(schedule.days_available).toBe(60);
    expect(schedule.days.length).toBe(60);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
      expect(day.minutes).toBeGreaterThan(0);
      expect(day.question_ids.length).toBeGreaterThan(0);
    }
  });

  test('ensures every must-have requirement appears somewhere in the schedule', () => {
    const schedule = DeterministicScheduler.schedule(3, sampleQuestions, sampleRequirements);
    const scheduledQids = new Set(schedule.days.flatMap((d) => d.question_ids));
    const scheduledReqIds = new Set<string>();

    for (const q of sampleQuestions) {
      if (scheduledQids.has(q.id)) {
        for (const rid of q.requirement_ids) {
          scheduledReqIds.add(rid);
        }
      }
    }

    const mustReqs = sampleRequirements.filter((r) => r.priority === 'must');
    for (const must of mustReqs) {
      expect(scheduledReqIds.has(must.id)).toBe(true);
    }
  });

  test('places harder and higher-priority material earlier in the schedule', () => {
    const schedule = DeterministicScheduler.schedule(3, sampleQuestions, sampleRequirements);
    const day1Qids = schedule.days[0].question_ids;
    // q2 is difficulty 3 and covers must-have requirement r2, so it should land on Day 1
    expect(day1Qids).toContain('q2');
  });

  test('all durations are strict integers', () => {
    const schedule = DeterministicScheduler.schedule(4, sampleQuestions, sampleRequirements);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });
});
