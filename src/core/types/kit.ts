/**
 * Appendix A - Exact Kit Structure
 * Field names, nesting, and enum literals match the Trao specification exactly.
 */

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string; // e.g. "r1", "r2"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';
export type QuestionDifficulty = 1 | 2 | 3;

export interface Question {
  id: string; // e.g. "q1", "q2"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: QuestionDifficulty;
}

export interface Flashcard {
  id: string; // e.g. "f1", "f2"
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number; // 1 to days_available
  focus: string;
  question_ids: string[];
  minutes: number; // integer
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface Source {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO 8601 string
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

/**
 * Exact Kit structure as prescribed in Appendix A
 */
export interface Kit {
  source: Source;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

/**
 * State Management metadata for Builder & Editing (Section 6)
 * Explicit state representation: generated, edited, pinned.
 */
export type ItemOrigin = 'generated' | 'manual';
export type ItemStatus = 'unmodified' | 'edited' | 'pinned';

export interface ItemMetadata {
  origin: ItemOrigin;
  status: ItemStatus;
  last_modified?: string;
}

export interface EnhancedQuestion extends Question {
  _meta?: ItemMetadata;
}

export interface EnhancedFlashcard extends Flashcard {
  _meta?: ItemMetadata;
}

export interface EnhancedCompanyBrief extends CompanyBrief {
  _meta?: ItemMetadata;
}

export interface EnhancedKit extends Kit {
  questions: EnhancedQuestion[];
  flashcards: EnhancedFlashcard[];
  company_brief: EnhancedCompanyBrief;
  custom_features?: {
    mock_interview_evaluations?: Array<{
      question_id: string;
      user_answer: string;
      feedback: string;
      score: number;
      created_at: string;
    }>;
  };
}
