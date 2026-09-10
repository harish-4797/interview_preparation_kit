import { Requirement, Question, Flashcard, QuestionCategory, QuestionDifficulty, CompanyBrief } from '../types/kit';
import { LLMClient } from '../llm/client';

export class QuestionGenerator {
  constructor(private llm: LLMClient) {}

  /**
   * Generates questions for a single category with instructions tailored to that specific category
   */
  public async generateQuestionsForCategory(
    category: QuestionCategory,
    requirements: Requirement[],
    companyBrief: CompanyBrief,
    hiringNotes: string,
    existingQuestionCount: number = 0
  ): Promise<Question[]> {
    // Filter relevant requirements to feed into this category
    let targetReqs: Requirement[];
    if (category === 'technical') {
      targetReqs = requirements.filter((r) => r.kind === 'technical' || r.kind === 'domain');
    } else if (category === 'behavioural') {
      targetReqs = requirements.filter((r) => r.kind === 'behavioural');
    } else if (category === 'system-design') {
      targetReqs = requirements.filter((r) => r.kind === 'technical' || r.kind === 'domain');
    } else {
      // company-fit
      targetReqs = requirements;
    }

    if (targetReqs.length === 0) {
      targetReqs = requirements; // Fallback so we still generate questions referencing requirements
    }

    let categoryInstructions = '';
    if (category === 'technical') {
      categoryInstructions = `Focus on language nuances, framework lifecycles, debugging, concurrency, memory management, database internals, and performance optimization directly matching the requirements.`;
    } else if (category === 'behavioural') {
      categoryInstructions = `Focus on collaboration, code reviews, conflict resolution, mentoring, ambiguity handling, and cross-functional partnerships. Use STAR answering framework guidelines in the answer outline.`;
    } else if (category === 'system-design') {
      categoryInstructions = `Focus on distributed system architecture, scalability, trade-offs, data modeling, reliability, caching, and partitioning relevant to the domain.`;
    } else {
      // company-fit
      categoryInstructions = `Focus on why this company (${companyBrief.summary}), engineering culture, motivation, product mission alignment, and handling role responsibilities. Incorporate hiring context: ${hiringNotes}.`;
    }

    const prompt = `You are an elite interview coach preparing high-yield questions for an interview.

Target Category: "${category}"
Category Focus: ${categoryInstructions}

Company Context:
- Summary: ${companyBrief.summary}
- What they do: ${companyBrief.what_they_do}

Available Requirements to cover:
${targetReqs.map((r) => `[ID: ${r.id}] (${r.priority.toUpperCase()} - ${r.kind}): ${r.text}`).join('\n')}

INSTRUCTIONS:
1. Generate 1 to 3 challenging, high-signal questions for category "${category}".
2. EVERY question MUST include a non-empty array of "requirement_ids" choosing from the available requirement IDs above.
3. Every question must have an integer "difficulty" of strictly 1, 2, or 3 (1=Foundational, 2=Intermediate/Applied, 3=Advanced/Architecture).
4. Provide a thorough "answer_outline" detailing key points, trade-offs, and expectations.
5. Category MUST be strictly "${category}".

Return ONLY a valid JSON array of objects:
[
  {
    "requirement_ids": ["${targetReqs[0]?.id || 'r1'}"],
    "category": "${category}",
    "prompt": "...",
    "answer_outline": "...",
    "difficulty": 2
  }
]`;

    try {
      const response = await this.llm.complete(
        [
          { role: 'system', content: `You generate rigorous interview questions for category "${category}". Return only valid JSON.` },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, responseFormat: 'json' }
      );

      const parsed = this.llm.parseJSON<
        Array<{
          requirement_ids: string[];
          category?: string;
          prompt: string;
          answer_outline: string;
          difficulty: number;
        }>
      >(response);

      const questionsList = Array.isArray(parsed) ? parsed : [parsed];
      const validRids = new Set(requirements.map((r) => r.id));

      return questionsList.map((q, idx) => {
        // Enforce existing requirement IDs
        const rids = (q.requirement_ids || []).filter((id) => validRids.has(id));
        if (rids.length === 0) {
          rids.push(targetReqs[0]?.id || requirements[0]?.id || 'r1');
        }

        const diff: QuestionDifficulty = [1, 2, 3].includes(q.difficulty) ? (q.difficulty as QuestionDifficulty) : 2;

        return {
          id: `q${existingQuestionCount + idx + 1}`,
          requirement_ids: rids,
          category,
          prompt: q.prompt?.trim() || `Core ${category} interview assessment`,
          answer_outline: q.answer_outline?.trim() || 'Provide key principles, practical examples, and trade-off evaluation.',
          difficulty: diff,
        };
      });
    } catch {
      // Deterministic category fallback
      const fallbackRid = targetReqs[0]?.id || 'r1';
      return [
        {
          id: `q${existingQuestionCount + 1}`,
          requirement_ids: [fallbackRid],
          category,
          prompt: `Discuss your hands-on experience and best practices regarding: ${targetReqs[0]?.text || 'core role responsibilities'}.`,
          answer_outline: `Explain architecture patterns, real-world problems solved, edge cases encountered, and lessons learned.`,
          difficulty: 2,
        },
      ];
    }
  }

  /**
   * Generates targeted questions specifically addressing uncovered requirements (Second Pass)
   */
  public async generateGapClosingQuestions(
    uncoveredRequirements: Requirement[],
    companyBrief: CompanyBrief,
    startIndex: number
  ): Promise<Question[]> {
    if (uncoveredRequirements.length === 0) return [];

    const prompt = `You are closing coverage gaps in an interview preparation kit.
The following critical requirements have NO corresponding interview questions yet:

${uncoveredRequirements.map((r) => `[ID: ${r.id}] (${r.priority.toUpperCase()} - ${r.kind}): ${r.text}`).join('\n')}

TASK:
For EACH uncovered requirement above, generate exactly one dedicated question that thoroughly assesses it.
- Assign the exact matching requirement ID in "requirement_ids" (e.g. ["${uncoveredRequirements[0].id}"]).
- Choose the most appropriate category: "technical" | "behavioural" | "system-design" | "company-fit".
- Difficulty must be 1, 2, or 3.
- Provide a clear, actionable "answer_outline".

Return ONLY a valid JSON array:
[
  {
    "requirement_ids": ["${uncoveredRequirements[0].id}"],
    "category": "technical",
    "prompt": "...",
    "answer_outline": "...",
    "difficulty": 2
  }
]`;

    try {
      const response = await this.llm.complete(
        [
          { role: 'system', content: 'You generate targeted gap-closing interview questions. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.1, responseFormat: 'json' }
      );

      const parsed = this.llm.parseJSON<
        Array<{
          requirement_ids: string[];
          category: QuestionCategory;
          prompt: string;
          answer_outline: string;
          difficulty: number;
        }>
      >(response);

      const items = Array.isArray(parsed) ? parsed : [parsed];
      const validCategories: QuestionCategory[] = ['technical', 'behavioural', 'system-design', 'company-fit'];

      return uncoveredRequirements.map((req, idx) => {
        const item = items[idx] || items[0];
        const cat = validCategories.includes(item?.category)
          ? item.category
          : req.kind === 'behavioural'
          ? 'behavioural'
          : 'technical';
        const diff: QuestionDifficulty = [1, 2, 3].includes(item?.difficulty)
          ? (item.difficulty as QuestionDifficulty)
          : 2;

        return {
          id: `q${startIndex + idx + 1}`,
          requirement_ids: [req.id],
          category: cat,
          prompt: item?.prompt || `How do you apply ${req.text} in production?`,
          answer_outline: item?.answer_outline || 'Explain practical methodology, key challenges, and demonstrable results.',
          difficulty: diff,
        };
      });
    } catch {
      // Deterministic gap fallback
      return uncoveredRequirements.map((req, idx) => ({
        id: `q${startIndex + idx + 1}`,
        requirement_ids: [req.id],
        category: req.kind === 'behavioural' ? 'behavioural' : 'technical',
        prompt: `How have you demonstrated ${req.text} in previous technical projects?`,
        answer_outline: `Walk through concrete past experience, architectural choices, and measurable impact.`,
        difficulty: 2,
      }));
    }
  }

  /**
   * Generates flashcards linked to requirement IDs
   */
  public async generateFlashcards(requirements: Requirement[], questions: Question[]): Promise<Flashcard[]> {
    const prompt = `Generate 4 to 8 high-impact interview flashcards based on the following requirements and questions.

Requirements:
${requirements.map((r) => `[${r.id}]: ${r.text}`).join('\n')}

Selected Questions:
${questions.slice(0, 5).map((q) => `[${q.id}]: ${q.prompt}`).join('\n')}

INSTRUCTIONS:
1. "front": A quick conceptual question, acronym, or scenario prompt (e.g. "What is the CAP Theorem and which pair does MongoDB default to?").
2. "back": A crisp, bullet-pointed or concise mental model answer to recall during quick practice.
3. "requirement_ids": Array of requirement IDs that this flashcard reinforces (e.g. ["r1"]).

Return ONLY a valid JSON array:
[
  {
    "front": "...",
    "back": "...",
    "requirement_ids": ["r1"]
  }
]`;

    try {
      const response = await this.llm.complete(
        [
          { role: 'system', content: 'You generate high-yield interview revision flashcards. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, responseFormat: 'json' }
      );

      const parsed = this.llm.parseJSON<
        Array<{
          front: string;
          back: string;
          requirement_ids: string[];
        }>
      >(response);

      const items = Array.isArray(parsed) ? parsed : [parsed];
      const validRids = new Set(requirements.map((r) => r.id));

      return items.map((fc, idx) => {
        const rids = (fc.requirement_ids || []).filter((rid) => validRids.has(rid));
        if (rids.length === 0) rids.push(requirements[0]?.id || 'r1');

        return {
          id: `f${idx + 1}`,
          front: fc.front?.trim() || `Flashcard on ${requirements[idx % requirements.length]?.text}`,
          back: fc.back?.trim() || 'Core concept and definition overview.',
          requirement_ids: rids,
        };
      });
    } catch {
      // Deterministic flashcard fallback
      return requirements.slice(0, 4).map((req, idx) => ({
        id: `f${idx + 1}`,
        front: `Key principles and definition of: ${req.text}`,
        back: `Core operational definitions, standard patterns, and implementation considerations for ${req.text}.`,
        requirement_ids: [req.id],
      }));
    }
  }
}
