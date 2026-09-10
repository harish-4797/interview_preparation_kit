import { Requirement, Question, Schedule, ScheduleDay } from '../types/kit';

export class DeterministicScheduler {
  /**
   * Allocates topics and questions across exactly `daysAvailable` days.
   * Pure deterministic application logic - NO LLM.
   */
  public static schedule(
    daysAvailable: number,
    questions: Question[],
    requirements: Requirement[]
  ): Schedule {
    // Sanitize daysAvailable (minimum 1)
    const N = Math.max(1, Math.round(daysAvailable));

    if (questions.length === 0) {
      // Edge case: no questions provided
      const emptyDays: ScheduleDay[] = [];
      for (let d = 1; d <= N; d++) {
        emptyDays.push({
          day: d,
          focus: d === N ? 'Final Review & Preparation' : 'Foundational Domain Study',
          question_ids: [],
          minutes: 45,
        });
      }
      return { days_available: N, days: emptyDays };
    }

    const mustReqIds = new Set(
      requirements.filter((r) => r.priority === 'must').map((r) => r.id)
    );

    // 1. Score and rank questions
    // Higher score = lands earlier
    const scoredQuestions = questions.map((q) => {
      let score = 0;

      // Must-have coverage boost
      const coversMust = q.requirement_ids.some((rid) => mustReqIds.has(rid));
      if (coversMust) score += 1000;

      // Difficulty boost: 3 > 2 > 1
      score += q.difficulty * 100;

      // Category cognitive load order: system-design -> technical -> behavioural -> company-fit
      if (q.category === 'system-design') score += 40;
      else if (q.category === 'technical') score += 30;
      else if (q.category === 'behavioural') score += 20;
      else if (q.category === 'company-fit') score += 10;

      return { question: q, score, coversMust };
    });

    // Sort descending by score (harder and must-have questions first)
    scoredQuestions.sort((a, b) => b.score - a.score);

    // 2. Guarantee that every must-have requirement appears in the schedule
    // Collect question IDs needed to cover every must-have
    const mustCoveredBySelected = new Set<string>();
    const essentialQuestionIds: string[] = [];

    for (const sq of scoredQuestions) {
      let addsMust = false;
      for (const rid of sq.question.requirement_ids) {
        if (mustReqIds.has(rid) && !mustCoveredBySelected.has(rid)) {
          mustCoveredBySelected.add(rid);
          addsMust = true;
        }
      }
      if (addsMust) {
        essentialQuestionIds.push(sq.question.id);
      }
    }

    // 3. Distribution across days
    const dayBuckets: string[][] = Array.from({ length: N }, () => []);

    if (N === 1) {
      // 1-Day Intensive Schedule
      // Put all essential questions and as many top questions as feasible
      const allQids = scoredQuestions.map((sq) => sq.question.id);
      dayBuckets[0] = allQids;
    } else if (N >= questions.length) {
      // Large schedule (e.g. 60 days, or days >= questions count)
      // First, place one question per day for the available questions
      scoredQuestions.forEach((sq, idx) => {
        dayBuckets[idx].push(sq.question.id);
      });

      // For the remaining days (e.g. review / spaced repetition days),
      // cycle high-priority and harder questions so every day has material
      let pointer = 0;
      for (let d = questions.length; d < N; d++) {
        const repeatQuestion = scoredQuestions[pointer % scoredQuestions.length];
        dayBuckets[d].push(repeatQuestion.question.id);
        pointer++;
      }
    } else {
      // Typical schedule (e.g. 2 to 14 days, with questions > days)
      // Distribute questions smoothly, front-loading harder & must-have questions
      scoredQuestions.forEach((sq, idx) => {
        // Place earlier sorted questions in earlier day buckets
        const targetDay = Math.min(N - 1, Math.floor((idx / scoredQuestions.length) * N));
        dayBuckets[targetDay].push(sq.question.id);
      });

      // Verify each day has at least 1 question
      for (let d = 0; d < N; d++) {
        if (dayBuckets[d].length === 0) {
          // Borrow or duplicate a high-yield question from an adjacent day
          const donorDay = d > 0 ? d - 1 : Math.min(d + 1, N - 1);
          if (dayBuckets[donorDay].length > 1) {
            const borrowed = dayBuckets[donorDay].pop()!;
            dayBuckets[d].push(borrowed);
          } else {
            dayBuckets[d].push(scoredQuestions[d % scoredQuestions.length].question.id);
          }
        }
      }
    }

    // 4. Double check every must-have requirement is scheduled
    const allScheduledQids = new Set(dayBuckets.flat());
    for (const essQid of essentialQuestionIds) {
      if (!allScheduledQids.has(essQid)) {
        // Force-insert into Day 1 or Day 2
        dayBuckets[0].unshift(essQid);
      }
    }

    // Question lookup map for focus and minutes computation
    const qMap = new Map(questions.map((q) => [q.id, q]));

    // 5. Construct days array with focus and integer minutes
    const days: ScheduleDay[] = dayBuckets.map((qids, idx) => {
      const dayNum = idx + 1;
      const dayQuestions = qids.map((id) => qMap.get(id)).filter(Boolean) as Question[];

      // Compute integer minutes:
      // difficulty 1 -> 15 mins, difficulty 2 -> 20 mins, difficulty 3 -> 30 mins
      // plus 15 mins structured review
      let totalMinutes = 15;
      for (const q of dayQuestions) {
        if (q.difficulty === 3) totalMinutes += 30;
        else if (q.difficulty === 2) totalMinutes += 20;
        else totalMinutes += 15;
      }
      // Cap per day between 45 and 180 integer minutes
      const integerMinutes = Math.min(180, Math.max(45, Math.round(totalMinutes)));

      // Generate context-aware focus label
      const focus = DeterministicScheduler.determineDailyFocus(dayNum, N, dayQuestions);

      return {
        day: dayNum,
        focus,
        question_ids: Array.from(new Set(qids)),
        minutes: integerMinutes,
      };
    });

    return {
      days_available: N,
      days,
    };
  }

  /**
   * Generates a clear, professional daily focus theme based on position and questions
   */
  private static determineDailyFocus(day: number, totalDays: number, questions: Question[]): string {
    if (totalDays === 1) {
      return 'Comprehensive Technical & Core Requirements Intensive';
    }

    if (day === totalDays) {
      return 'Final Polish, Company Fit & Mock Interview Review';
    }

    const categories = new Set(questions.map((q) => q.category));
    const hasSystemDesign = categories.has('system-design');
    const hasTechnical = categories.has('technical');
    const hasBehavioural = categories.has('behavioural');
    const hasCompanyFit = categories.has('company-fit');

    if (day === 1) {
      if (hasSystemDesign) return 'Core Architecture, System Design & High-Priority Technicals';
      return 'Foundational Technical Mastery & Must-Have Requirements';
    }

    if (hasSystemDesign && hasTechnical) {
      return 'Distributed Systems Architecture & Deep Technical Problem Solving';
    }

    if (hasTechnical && hasBehavioural) {
      return 'Technical Execution & Behavioral Leadership Competencies';
    }

    if (hasBehavioural && hasCompanyFit) {
      return 'STAR Behavioral Scenarios & Organizational Alignment';
    }

    if (hasBehavioural) {
      return 'Behavioral Competency Deep Dive & Leadership Principles';
    }

    if (hasTechnical) {
      return `Targeted Technical Mastery (Day ${day})`;
    }

    return `Structured Domain Review & Practice (Day ${day})`;
  }
}
