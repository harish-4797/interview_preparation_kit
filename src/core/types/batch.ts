import { Kit } from './kit';

/**
 * Appendix B - Batch Input Case
 */
export interface BatchInputCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchCaseError {
  code: string;
  message: string;
}

export type BatchCaseStatus = 'ok' | 'failed';

export interface BatchCaseResult {
  id: string;
  status: BatchCaseStatus;
  kit: Kit | null;
  error: BatchCaseError | null;
}

/**
 * Appendix B - Batch Output File Structure
 */
export interface BatchOutput {
  version: string; // "1.0"
  generated_at: string; // ISO 8601 string
  kits: BatchCaseResult[];
}
