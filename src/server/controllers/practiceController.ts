import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { KitMongoModel, memoryKits } from '../models/KitModel';
import { PracticeEngine, ConfidenceRating, CardPracticeState } from '../../core/practice/practiceEngine';

function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export class PracticeController {
  /**
   * Records candidate's confidence rating on a flashcard
   */
  public static async recordCardReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { kitId } = req.params;
      const { cardId, rating } = req.body;

      if (!cardId || ![1, 2, 3].includes(Number(rating))) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'Valid cardId and rating (1: Low/Again, 2: Medium/Hard, 3: High/Good) are required.',
        });
        return;
      }

      const confRating = Number(rating) as ConfidenceRating;

      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOne({ _id: kitId, userId });
        if (!doc) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }

        const stateObj: Record<string, CardPracticeState> = doc.practiceStates || {};
        const stateMap = new Map<string, CardPracticeState>(Object.entries(stateObj));

        const updatedMap = PracticeEngine.recordReview(stateMap, cardId, confRating);
        const updatedObj = Object.fromEntries(updatedMap);

        doc.practiceStates = updatedObj as any;
        await doc.save();

        const progress = PracticeEngine.computeProgress(doc.kit.flashcards, updatedMap);

        res.json({
          message: 'Review recorded successfully.',
          progress,
          cardState: updatedObj[cardId],
        });
      } else {
        const item = memoryKits.get(kitId);
        if (!item || item.userId !== userId) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }

        const stateMap = new Map<string, CardPracticeState>(Object.entries(item.practiceStates || {}));
        const updatedMap = PracticeEngine.recordReview(stateMap, cardId, confRating);
        const updatedObj = Object.fromEntries(updatedMap);

        item.practiceStates = updatedObj;
        item.updatedAt = new Date().toISOString();

        const progress = PracticeEngine.computeProgress(item.kit.flashcards, updatedMap);

        res.json({
          message: 'Review recorded successfully.',
          progress,
          cardState: updatedObj[cardId],
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Retrieves flashcards ordered by lowest confidence (least confident first)
   */
  public static async getPracticeQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { kitId } = req.params;

      let flashcards: any[] = [];
      let practiceStates: Record<string, CardPracticeState> = {};

      if (isMongoConnected()) {
        const doc = await KitMongoModel.findOne({ _id: kitId, userId });
        if (!doc) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        flashcards = doc.kit.flashcards || [];
        practiceStates = doc.practiceStates || {};
      } else {
        const item = memoryKits.get(kitId);
        if (!item || item.userId !== userId) {
          res.status(404).json({ error: 'NOT_FOUND', message: 'Kit not found.' });
          return;
        }
        flashcards = item.kit.flashcards || [];
        practiceStates = item.practiceStates || {};
      }

      const stateMap = new Map<string, CardPracticeState>(Object.entries(practiceStates));
      const orderedQueue = PracticeEngine.getNextPracticeQueue(flashcards, stateMap);
      const progress = PracticeEngine.computeProgress(flashcards, stateMap);

      res.json({
        queue: orderedQueue,
        progress,
        states: practiceStates,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
}
