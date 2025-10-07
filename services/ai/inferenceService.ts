import { Card, OpponentHandProbabilities, Rank, Suit } from '../../types';
import { createDeck } from '../trucoLogic';

const FULL_DECK = createDeck();

/**
 * Initializes a uniform probability distribution over a set of unseen cards.
 * @param unseenCards The pool of cards the opponent might have.
 * @param impossibleCards Cards known to not be in opponent's hand (e.g., AI's own hand).
 * @returns An initial OpponentHandProbabilities object.
 */
export const initializeProbabilities = (unseenCards: Card[], impossibleCards: Card[]): OpponentHandProbabilities => {
  const possibleCards = unseenCards.filter(uc => 
    !impossibleCards.some(ic => ic.rank === uc.rank && ic.suit === uc.suit)
  );
  
  const total = possibleCards.length;
  if (total === 0) {
     return { suitDist: {}, rankProbs: {}, unseenCards: [] };
  }

  const rankProbs: Partial<Record<Rank, number>> = {};
  const suitDist: Partial<Record<Suit, number>> = {};

  for (const card of possibleCards) {
    rankProbs[card.rank] = (rankProbs[card.rank] || 0) + 1;
    suitDist[card.suit] = (suitDist[card.suit] || 0) + 1;
  }

  // Normalize to get probabilities
  for (const rank in rankProbs) {
    rankProbs[rank as unknown as Rank]! /= total;
  }
  for (const suit in suitDist) {
    suitDist[suit as Suit]! /= total;
  }

  return { suitDist, rankProbs, unseenCards: possibleCards };
};

/**
 * Updates probabilities based on a card the opponent played.
 * Removes the card from the pool of possibilities and renormalizes.
 * @param currentProbs The current probability distribution.
 * @param playedCard The card the opponent played.
 * @returns The updated OpponentHandProbabilities object.
 */
export const updateProbsOnPlay = (currentProbs: OpponentHandProbabilities, playedCard: Card): OpponentHandProbabilities => {
  const newUnseen = currentProbs.unseenCards.filter(c => c.rank !== playedCard.rank || c.suit !== playedCard.suit);
  // This is a simplified update. A full re-initialization ensures normalization.
  return initializeProbabilities(newUnseen, []); 
};

/**
 * Applies a Bayesian-style update to rank probabilities based on a revealed Envido score.
 * Higher scores make certain card combinations (e.g., a 7 and a face card) more likely.
 * @param currentProbs The current probability distribution.
 * @param envidoValue The opponent's revealed Envido score.
 * @param opponentIsMano Whether the opponent has the tie-breaker advantage.
 * @returns The updated OpponentHandProbabilities object.
 */
export const updateProbsOnEnvido = (currentProbs: OpponentHandProbabilities, envidoValue: number, opponentIsMano: boolean): OpponentHandProbabilities => {
    let multiplier: Partial<Record<Rank, number>> = {};

    // Define likelihoods based on envido value
    if (envidoValue >= 30) {
        // High envido strongly implies high non-face cards
        multiplier = { 7: 3.0, 6: 2.5, 5: 2.0, 4: 1.8 };
    } else if (envidoValue >= 27) {
        // 27+ implies a 7 + face card, or other high combos
        multiplier = { 7: 2.5, 6: 1.5, 10: 1.5, 11: 1.5, 12: 1.5 };
    } else if (envidoValue >= 24) {
        // Mid-range envido
        multiplier = { 7: 1.5, 6: 1.3, 5: 1.2, 4: 1.1 };
    } else {
        // Low envido, less information
        return currentProbs;
    }

    const updatedRankProbs = { ...currentProbs.rankProbs };
    let totalProbability = 0;

    // Apply multipliers
    for (const rankStr in updatedRankProbs) {
        const rank = parseInt(rankStr, 10) as Rank;
        if (multiplier[rank]) {
            updatedRankProbs[rank]! *= multiplier[rank]!;
        }
        totalProbability += updatedRankProbs[rank]!;
    }
    
    // Normalize probabilities
    if (totalProbability > 0) {
        for (const rankStr in updatedRankProbs) {
            const rank = parseInt(rankStr, 10) as Rank;
            updatedRankProbs[rank]! /= totalProbability;
        }
    }
    
    return {
        ...currentProbs,
        rankProbs: updatedRankProbs,
    };
};
