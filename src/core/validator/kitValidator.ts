import { z } from 'zod';
import { Kit } from '../types/kit';
import { BatchInputCase, BatchOutput } from '../types/batch';

export const RequirementKindSchema = z.enum(['technical', 'behavioural', 'domain']);
export const RequirementPrioritySchema = z.enum(['must', 'nice']);

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});

export const QuestionCategorySchema = z.enum(['technical', 'behavioural', 'system-design', 'company-fit']);
export const QuestionDifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: QuestionCategorySchema,
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: QuestionDifficultySchema,
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(1),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(1),
});

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

/**
 * Base Zod schema for Appendix A Kit
 */
export const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
}).superRefine((data, ctx) => {
  // 1. Verify schedule days count equals days_available
  if (data.schedule.days.length !== data.schedule.days_available) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Schedule days count (${data.schedule.days.length}) must equal days_available (${data.schedule.days_available})`,
      path: ['schedule', 'days'],
    });
  }

  // 2. Verify all question_ids in schedule refer to existing questions
  const questionIdSet = new Set(data.questions.map((q) => q.id));
  for (let i = 0; i < data.schedule.days.length; i++) {
    const day = data.schedule.days[i];
    for (const qid of day.question_ids) {
      if (!questionIdSet.has(qid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Schedule day ${day.day} refers to non-existent question ID "${qid}"`,
          path: ['schedule', 'days', i, 'question_ids'],
        });
      }
    }
  }

  // 3. Verify all requirement_ids in questions refer to existing requirements
  const requirementIdSet = new Set(data.role.requirements.map((r) => r.id));
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    for (const rid of q.requirement_ids) {
      if (!requirementIdSet.has(rid)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${q.id}" refers to non-existent requirement ID "${rid}"`,
          path: ['questions', i, 'requirement_ids'],
        });
      }
    }
  }

  // 4. Verify all must-have requirements appear in the schedule
  const scheduledQuestionIds = new Set(data.schedule.days.flatMap((d) => d.question_ids));
  const scheduledRequirementIds = new Set<string>();
  for (const q of data.questions) {
    if (scheduledQuestionIds.has(q.id)) {
      for (const rid of q.requirement_ids) {
        scheduledRequirementIds.add(rid);
      }
    }
  }

  const mustHaveReqs = data.role.requirements.filter((r) => r.priority === 'must');
  for (const mustReq of mustHaveReqs) {
    if (!scheduledRequirementIds.has(mustReq.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Must-have requirement "${mustReq.id}" (${mustReq.text}) is not covered in the schedule`,
        path: ['schedule'],
      });
    }
  }
});

/**
 * Validates an object against the exact Appendix A structure
 */
export function validateKit(obj: unknown): { success: true; data: Kit } | { success: false; errors: string[] } {
  const result = KitSchema.safeParse(obj);
  if (result.success) {
    return { success: true, data: result.data as Kit };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Appendix B Batch Input Validation Schema
 */
export const BatchInputCaseSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().min(1),
  days: z.number().int().min(1),
});

export const BatchInputSchema = z.array(BatchInputCaseSchema);

export function validateBatchInput(obj: unknown): { success: true; data: BatchInputCase[] } | { success: false; errors: string[] } {
  const result = BatchInputSchema.safeParse(obj);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Appendix B Batch Output Validation Schema
 */
export const BatchOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string(),
  kits: z.array(
    z.object({
      id: z.string(),
      status: z.enum(['ok', 'failed']),
      kit: z.record(z.any()).nullable(),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
        })
        .nullable(),
    })
  ),
});
