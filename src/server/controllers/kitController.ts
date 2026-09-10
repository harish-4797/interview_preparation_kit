import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { GenerationPipeline } from '../../core/pipeline/generateKit';
import { StateManager } from '../../core/state/stateManager';
import { KitMongoModel, memoryKits, MemoryKit } from '../models/KitModel';
import { EnhancedKit, QuestionCategory } from '../../core/types/kit';
import { LLMClient } from '../../core/llm/client';
import { QuestionGenerator } from '../../core/generation/questionGenerator';
import { CompanyResearcher } from '../../core/research/companyResearch';
import { CompanyCrawler } from '../../core/crawler/crawler';

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export class KitController {
  /**
   * Generates a new interview preparation kit
   */
  public static async generateKit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { jd, company_url, days } = req.body;

      if (!jd || !company_url) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Job description text and company website URL are required.',
        });
        return;
      }

      const daysNum = Math.max(1, parseInt(days || '5', 10));
      const pipeline = new GenerationPipeline();

      const pipelineResult = await pipeline.run({
        jd,
        companyUrl: company_url,
        days: daysNum,
        allowLocalhost: process.env.NODE_ENV !== 'production',
      });

      // Wrap in EnhancedKit with initial generated state
      const enhancedKit = StateManager.fromKit(pipelineResult.kit);

      let savedId: string;

      if (isMongoConnected()) {
        const doc = await KitMongoModel.create({
          userId,
          kit: enhancedKit,
          practiceStates: {},
        });
        savedId = doc._id.toString();
      } else {
        savedId = `kit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const memKit: MemoryKit = {
          id: savedId,
          userId,
          kit: enhancedKit,
          practiceStates: {},
          createdAt: now,
          updatedAt: now,
        };
        memoryKits.set(savedId, memKit);
      }

      res.status(201).json({
        id: savedId,
        kit: enhancedKit,
        warnings: pipelineResult.warnings,
        executionTimeMs: pipelineResult.executionTimeMs,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'GENERATION_FAILED',
        message: err.message || 'Failed to generate interview preparation kit.',
      });
    }
  }

  /**
   * Lists all kits belonging to the authenticated user
   */
  public static async listKits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
      }

      if (isMongoConnected()) {
        const docs = await KitMongoModel.find({ userId }).sort({ createdAt: -1 });
        res.json({
          kits: docs.map((d) => ({
            id: d._id.toString(),
            company: d.kit.source.company,
            role: d.kit.role.title,
            days: d.kit.schedule.days_available,
            questionCount: d.kit.questions.length,
            flashcardCount: d.kit.flashcards.length,
            createdAt: d.createdAt,
          })),
        });
      } else {
        const userKits: any[] = [];
        for (const [id, item] of memoryKits.entries()) {
          if (item.userId === userId) {
            userKits.push({
              id,
              company: item.kit.source.company,
              role: item.kit.role.title,
              days: item.kit.schedule.days_available,
              questionCount: item.kit.questions.length,
              flashcardCount: item.kit.flashcards.length,
              createdAt: item.createdAt,
            });
          }
        }
        res.json({ kits: userKits.reverse() });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Fetches a single kit
   */
  public static async getKit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOne({ _id: id, userId });
        if (!doc) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found or access denied.' });
          return;
        }
        res.json({ id: doc._id.toString(), kit: doc.kit, practiceStates: doc.practiceStates });
      } else {
        const item = memoryKits.get(id);
        if (!item || item.userId !== userId) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found or access denied.' });
          return;
        }
        res.json({ id: item.id, kit: item.kit, practiceStates: item.practiceStates });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Updates an entire kit (manual edits, reordering, pin toggling)
   */
  public static async updateKit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { kit } = req.body;

      if (!kit) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'Kit payload required.' });
        return;
      }

      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOneAndUpdate(
          { _id: id, userId },
          { $set: { kit } },
          { new: true }
        );
        if (!doc) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        res.json({ id: doc._id.toString(), kit: doc.kit });
      } else {
        const item = memoryKits.get(id);
        if (!item || item.userId !== userId) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        item.kit = kit;
        item.updatedAt = new Date().toISOString();
        res.json({ id: item.id, kit: item.kit });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Regenerates a single section (brief, question category, schedule)
   * while STRICTLY preserving edited and pinned items elsewhere!
   */
  public static async regenerateSection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { section } = req.body; // 'company_brief' | 'schedule' | 'technical' | 'behavioural' | 'system-design' | 'company-fit'

      let currentKit: EnhancedKit;

      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOne({ _id: id, userId });
        if (!doc) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        currentKit = doc.kit;
      } else {
        const item = memoryKits.get(id);
        if (!item || item.userId !== userId) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        currentKit = item.kit;
      }

      const llm = new LLMClient();
      let updatedKit: EnhancedKit;

      if (section === 'company_brief') {
        const crawler = new CompanyCrawler();
        const crawl = await crawler.crawl(currentKit.source.company_url, { maxPages: 3, timeoutMs: 5000 });
        const researcher = new CompanyResearcher(llm);
        updatedKit = await StateManager.regenerateCompanyBrief(currentKit, researcher, crawl);
      } else if (section === 'schedule') {
        updatedKit = StateManager.regenerateSchedule(currentKit);
      } else if (['technical', 'behavioural', 'system-design', 'company-fit'].includes(section)) {
        const generator = new QuestionGenerator(llm);
        updatedKit = await StateManager.regenerateCategory(currentKit, section as QuestionCategory, generator);
      } else {
        res.status(400).json({ error: 'BAD_REQUEST', message: `Invalid section "${section}" for regeneration.` });
        return;
      }

      // Save updated kit
      if (isMongoConnected()) {
        await KitMongoModel.updateOne({ _id: id, userId }, { $set: { kit: updatedKit } });
      } else {
        const item = memoryKits.get(id)!;
        item.kit = updatedKit;
        item.updatedAt = new Date().toISOString();
      }

      res.json({
        id,
        kit: updatedKit,
        message: `Section "${section}" regenerated successfully while preserving user edits.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Deletes a kit
   */
  public static async deleteKit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (isMongoConnected()) {
        await KitMongoModel.deleteOne({ _id: id, userId });
      } else {
        memoryKits.delete(id);
      }

      res.json({ message: 'Kit deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Creative Feature: Mock Interview Q&A Practice Evaluator
   * Evaluates candidate's written or transcribed answer against the expected answer_outline and requirement.
   */
  public static async evaluateMockAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { questionId, userAnswer } = req.body;

      if (!questionId || !userAnswer?.trim()) {
        res.status(400).json({ error: 'BAD_REQUEST', message: 'questionId and userAnswer are required.' });
        return;
      }

      let kit: EnhancedKit | null = null;
      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOne({ _id: id, userId: req.user?.id });
        kit = doc?.kit || null;
      } else {
        kit = memoryKits.get(id)?.kit || null;
      }

      if (!kit) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
        return;
      }

      const targetQuestion = kit.questions.find((q) => q.id === questionId);
      if (!targetQuestion) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Question not found in kit.' });
        return;
      }

      const llm = new LLMClient();
      const prompt = `You are an elite interviewer reviewing a candidate's answer.

Interview Question: ${targetQuestion.prompt}
Category: ${targetQuestion.category}
Difficulty: ${targetQuestion.difficulty}/3
Expected Answer Outline: ${targetQuestion.answer_outline}

Candidate's Answer:
"${userAnswer}"

TASK:
1. Provide constructive, actionable feedback (2-3 paragraphs) highlighting strengths, missing technical nuances, and communication style.
2. Assign a score from 1 to 10 (10 = outstanding, 7 = hire benchmark, <5 = needs preparation).
3. Give 3 quick bullet tips for the candidate to elevate this answer.

Return ONLY valid JSON:
{
  "score": 8,
  "verdict": "Strong Hire" | "Hire" | "Borderline" | "Needs Improvement",
  "feedback": "...",
  "key_tips": ["...", "...", "..."]
}`;

      const response = await llm.complete(
        [
          { role: 'system', content: 'You are an objective interview evaluator. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.2, responseFormat: 'json' }
      );

      const parsed = llm.parseJSON<{
        score: number;
        verdict: string;
        feedback: string;
        key_tips: string[];
      }>(response);

      res.json({
        questionId,
        evaluation: parsed,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'EVALUATION_FAILED', message: err.message });
    }
  }
}
