import { Flashcard } from '../types/kit';

export type ConfidenceRating = 1 | 2 | 3; // 1 = Low/Again, 2 = Medium/Hard, 3 = High/Good

export interface CardReviewRecord {
  card_id: string;
  rating: ConfidenceRating;
  reviewed_at: string;
}

export interface CardPracticeState {
  card_id: string;
  last_rating: ConfidenceRating | null;
  review_count: number;
  last_reviewed_at: string | null;
  priority_score: number; // Higher means practice sooner
}

export interface PracticeSessionProgress {
  total_cards: number;
  reviewed_cards: number;
  mastered_count: number; // rating = 3
  learning_count: number; // rating = 1 or 2
  unreviewed_count: number;
  coverage_percentage: number;
}

export class PracticeEngine {
  /**
   * Updates or creates state for a reviewed flashcard
   */
  public static recordReview(
    currentState: Map<string, CardPracticeState>,
    cardId: string,
    rating: ConfidenceRating
  ): Map<string, CardPracticeState> {
    const updated = new Map(currentState);
    const existing = updated.get(cardId);
    const reviewCount = (existing?.review_count || 0) + 1;
    const now = new Date().toISOString();

    // Priority score: lower confidence gets much higher score
    // 1 -> score 100
    // 2 -> score 50
    // 3 -> score 10
    const baseScore = rating === 1 ? 100 : rating === 2 ? 50 : 10;
    const priorityScore = baseScore + Math.min(10, reviewCount);

    updated.set(cardId, {
      card_id: cardId,
      last_rating: rating,
      review_count: reviewCount,
      last_reviewed_at: now,
      priority_score: priorityScore,
    });

    return updated;
  }

  /**
   * Sorts flashcards for the next practice session.
   * Prioritizes unreviewed cards first, then cards with lowest confidence (least confident first),
   * then oldest reviewed cards.
   */
  public static getNextPracticeQueue(
    flashcards: Flashcard[],
    stateMap: Map<string, CardPracticeState>
  ): Flashcard[] {
    const cardsWithScore = flashcards.map((card) => {
      const state = stateMap.get(card.id);
      if (!state || state.last_rating === null) {
        // Unreviewed cards have highest priority to ensure 100% initial coverage
        return { card, score: 9999, lastReviewed: 0 };
      }

      // Confidence-weighted score: 1 -> 300, 2 -> 150, 3 -> 50
      let confidenceWeight = 50;
      if (state.last_rating === 1) confidenceWeight = 300;
      else if (state.last_rating === 2) confidenceWeight = 150;

      const timeElapsedSec = state.last_reviewed_at
        ? (Date.now() - new Date(state.last_reviewed_at).getTime()) / 1000
        : 0;

      // Spaced factor: cards reviewed longer ago bubble up
      const score = confidenceWeight + Math.min(50, timeElapsedSec / 60);

      return {
        card,
        score,
        lastReviewed: state.last_reviewed_at ? new Date(state.last_reviewed_at).getTime() : 0,
      };
    });

    // Sort descending by score (highest priority to review first)
    cardsWithScore.sort((a, b) => b.score - a.score);

    return cardsWithScore.map((item) => item.card);
  }

  /**
   * Computes overall practice session progress statistics
   */
  public static computeProgress(
    flashcards: Flashcard[],
    stateMap: Map<string, CardPracticeState>
  ): PracticeSessionProgress {
    const total_cards = flashcards.length;
    let reviewed_cards = 0;
    let mastered_count = 0;
    let learning_count = 0;
    let unreviewed_count = 0;

    for (const card of flashcards) {
      const state = stateMap.get(card.id);
      if (!state || state.last_rating === null) {
        unreviewed_count++;
      } else {
        reviewed_cards++;
        if (state.last_rating === 3) {
          mastered_count++;
        } else {
          learning_count++;
        }
      }
    }

    const coverage_percentage =
      total_cards > 0 ? Math.round((reviewed_cards / total_cards) * 100) : 0;

    return {
      total_cards,
      reviewed_cards,
      mastered_count,
      learning_count,
      unreviewed_count,
      coverage_percentage,
    };
  }
}
