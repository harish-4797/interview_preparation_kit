export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';
export type QuestionDifficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: QuestionDifficulty;
  _meta?: {
    origin: 'generated' | 'manual';
    status: 'unmodified' | 'edited' | 'pinned';
    last_modified?: string;
  };
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _meta?: {
    origin: 'generated' | 'manual';
    status: 'unmodified' | 'edited' | 'pinned';
    last_modified?: string;
  };
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
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
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
  _meta?: {
    origin: 'generated' | 'manual';
    status: 'unmodified' | 'edited' | 'pinned';
    last_modified?: string;
  };
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Kit {
  source: Source;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

export interface CardPracticeState {
  card_id: string;
  last_rating: 1 | 2 | 3 | null;
  review_count: number;
  last_reviewed_at: string | null;
  priority_score: number;
}

export interface PracticeSessionProgress {
  total_cards: number;
  reviewed_cards: number;
  mastered_count: number;
  learning_count: number;
  unreviewed_count: number;
  coverage_percentage: number;
}
