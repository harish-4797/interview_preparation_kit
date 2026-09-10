import { Role, Requirement, RequirementKind, RequirementPriority } from '../types/kit';
import { LLMClient } from '../llm/client';

export interface ExtractionResult {
  role: Role;
  isThinJd: boolean;
  notes: string[];
}

export class RequirementExtractor {
  constructor(private llm: LLMClient) {}

  public async extract(jdText: string): Promise<ExtractionResult> {
    const trimmed = jdText.trim();
    const lineCount = trimmed.split('\n').filter((l) => l.trim().length > 0).length;
    const charCount = trimmed.length;

    // Detect if this is a two-line stub / thin JD
    const isThinJd = lineCount <= 3 || charCount < 120;

    const prompt = `You are an exacting job description analyst.
Carefully parse the following Job Description (JD) text and extract the structured role details and requirements.

CRITICAL RULES:
1. STRICT TRUTH: Extract ONLY requirements that are genuinely present in or directly implied by the text.
2. ZERO FABRICATION: If the description is a 2-line stub with few details, do NOT invent or pad extra requirements. A thin posting MUST produce a thin list of requirements.
3. KIND: Every requirement must be categorized into one of:
   - "technical" (languages, frameworks, tools, algorithms, architectural patterns)
   - "behavioural" (communication, collaboration, mentorship, leadership, conflict resolution)
   - "domain" (industry specific knowledge, finance, healthcare, security regulations, compliance)
4. PRIORITY: Mark strictly based on wording in the text:
   - "must" (words like: required, must have, 3+ years, essential, qualifications, core, responsibilities)
   - "nice" (words like: nice to have, bonus, preferred, plus, good to have, optional)
5. STABLE IDS: Assign sequential IDs starting at "r1", "r2", "r3", etc.

=== JOB DESCRIPTION TEXT ===
${trimmed}
=== END OF JOB DESCRIPTION ===

Return ONLY valid JSON with this exact schema:
{
  "title": "...",
  "seniority": "...",
  "responsibilities": ["...", "..."],
  "requirements": [
    {
      "id": "r1",
      "text": "...",
      "kind": "technical",
      "priority": "must"
    }
  ]
}`;

    try {
      const response = await this.llm.complete(
        [
          { role: 'system', content: 'You are an exacting technical recruiter. Return only valid JSON without explanation.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.1, responseFormat: 'json' }
      );

      const parsed = this.llm.parseJSON<{
        title: string;
        seniority: string;
        responsibilities: string[];
        requirements: Array<{
          id?: string;
          text: string;
          kind: RequirementKind;
          priority: RequirementPriority;
        }>;
      }>(response);

      // Enforce sequential stable IDs r1, r2... and valid enums
      const validKinds: RequirementKind[] = ['technical', 'behavioural', 'domain'];
      const validPriorities: RequirementPriority[] = ['must', 'nice'];

      const sanitizedRequirements: Requirement[] = (parsed.requirements || []).map((req, idx) => {
        const kind: RequirementKind = validKinds.includes(req.kind) ? req.kind : 'technical';
        const priority: RequirementPriority = validPriorities.includes(req.priority) ? req.priority : 'must';

        return {
          id: `r${idx + 1}`,
          text: req.text.trim(),
          kind,
          priority,
        };
      });

      // If thin JD yielded 0 requirements, extract at least one basic requirement from the text itself
      if (sanitizedRequirements.length === 0) {
        sanitizedRequirements.push({
          id: 'r1',
          text: trimmed.substring(0, 100) || 'General role execution',
          kind: 'technical',
          priority: 'must',
        });
      }

      const role: Role = {
        title: parsed.title || 'Software Engineer',
        seniority: parsed.seniority || (isThinJd ? 'Not specified' : 'Mid-Level'),
        responsibilities: parsed.responsibilities && parsed.responsibilities.length > 0
          ? parsed.responsibilities
          : ['Execute responsibilities outlined in the job description.'],
        requirements: sanitizedRequirements,
      };

      const notes: string[] = [];
      if (isThinJd) {
        notes.push('Job description is brief/thin; requirements extracted strictly from the provided lines without padding.');
      }

      return {
        role,
        isThinJd,
        notes,
      };
    } catch (err: any) {
      // Deterministic rule-based fallback if LLM parsing fails
      const fallbackReqs: Requirement[] = [
        {
          id: 'r1',
          text: trimmed.split('\n')[0]?.substring(0, 120) || 'Core technical delivery',
          kind: 'technical',
          priority: 'must',
        },
      ];

      return {
        role: {
          title: 'Software Engineer',
          seniority: 'Mid-Level',
          responsibilities: ['Core responsibilities as per job posting'],
          requirements: fallbackReqs,
        },
        isThinJd: true,
        notes: [`Extracted using deterministic fallback: ${err.message}`],
      };
    }
  }
}
