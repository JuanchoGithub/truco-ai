import { GameState } from '../types';

export interface TraitObservation {
  titleKey: string;
  descriptionKey: string;
  confidence: number; // The calculated confidence for this observation
}

interface PlayerTrait {
  id: string;
  // Calculates a score (0-1) for a specific trait based on game state.
  scorer: (state: GameState) => number;
  // Maps scores to observable descriptions.
  observer: (score: number, state: GameState) => { titleKey: string; descriptionKey: string } | null;
}

const TRAITS: PlayerTrait[] = [
  // Envido Traits
  {
    id: 'envido_aggression',
    scorer: ({ opponentModel }) => {
      const manoThreshold = opponentModel.envidoBehavior.mano.callThreshold;
      const pieThreshold = opponentModel.envidoBehavior.pie.callThreshold;
      // Normalize: lower threshold = higher aggression. 25 is aggressive, 30 is conservative.
      const manoScore = Math.max(0, (30 - manoThreshold) / 5);
      const pieScore = Math.max(0, (30 - pieThreshold) / 5);
      return (manoScore + pieScore) / 2;
    },
    observer: (score) => {
      if (score > 0.8) return { titleKey: 'dataModal.traits.envido_aggressor.title', descriptionKey: 'dataModal.traits.envido_aggressor.high' };
      if (score > 0.6) return { titleKey: 'dataModal.traits.envido_aggressor.title', descriptionKey: 'dataModal.traits.envido_aggressor.medium' };
      if (score < 0.2) return { titleKey: 'dataModal.traits.envido_conservative.title', descriptionKey: 'dataModal.traits.envido_conservative.high' };
      return null;
    }
  },
  {
    id: 'envido_cautiousness',
    scorer: ({ opponentModel }) => {
        const manoFoldRate = opponentModel.envidoBehavior.mano.foldRate;
        const pieFoldRate = opponentModel.envidoBehavior.pie.foldRate;
        return (manoFoldRate + pieFoldRate) / 2;
    },
    observer: (score) => {
        if (score > 0.6) return { titleKey: 'dataModal.traits.envido_cautious.title', descriptionKey: 'dataModal.traits.envido_cautious.high' };
        if (score < 0.2) return { titleKey: 'dataModal.traits.envido_bold.title', descriptionKey: 'dataModal.traits.envido_bold.high' };
        return null;
    }
  },
  // Truco Traits
  {
    id: 'truco_bluffer',
    scorer: ({ roundHistory }) => {
      if (roundHistory.length < 5) return 0;
      const bluffs = roundHistory.filter(r => r.playerTrucoCall?.isBluff);
      // Bluff rate as a percentage of rounds played
      return Math.min(1, bluffs.length / (roundHistory.length / 2));
    },
    observer: (score, { roundHistory }) => {
       const bluffs = roundHistory.filter(r => r.playerTrucoCall?.isBluff);
       const successfulBluffs = bluffs.filter(r => r.roundWinner === 'player').length;
       const successRate = bluffs.length > 2 ? successfulBluffs / bluffs.length : 0;
       
       if (score > 0.5 && successRate > 0.6) return { titleKey: 'dataModal.traits.truco_effective_bluffer.title', descriptionKey: 'dataModal.traits.truco_effective_bluffer.high' };
       if (score > 0.5 && successRate < 0.3) return { titleKey: 'dataModal.traits.truco_readable_bluffer.title', descriptionKey: 'dataModal.traits.truco_readable_bluffer.high' };
       if (score > 0.5) return { titleKey: 'dataModal.traits.truco_frequent_bluffer.title', descriptionKey: 'dataModal.traits.truco_frequent_bluffer.high' };
       return null;
    }
  },
  {
    id: 'truco_conservative',
    scorer: ({ playerTrucoCallHistory }) => {
      if (playerTrucoCallHistory.length < 3) return 0;
      const avgStrength = playerTrucoCallHistory.reduce((sum, entry) => sum + entry.strength, 0) / playerTrucoCallHistory.length;
      // Normalize: 28 is very high, 20 is low.
      return Math.min(1, Math.max(0, (avgStrength - 20) / 10));
    },
    observer: (score) => {
      if (score > 0.8) return { titleKey: 'dataModal.traits.truco_conservative.title', descriptionKey: 'dataModal.traits.truco_conservative.high' };
      if (score < 0.3) return { titleKey: 'dataModal.traits.truco_aggressive.title', descriptionKey: 'dataModal.traits.truco_aggressive.high' };
      return null;
    }
  },
  // Card Play Traits
  {
      id: 'playstyle_predictable_lead',
      scorer: ({ opponentModel }) => opponentModel.playStyle.leadWithHighestRate,
      observer: (score) => {
          if (score > 0.9) return { titleKey: 'dataModal.traits.playstyle_predictable.title', descriptionKey: 'dataModal.traits.playstyle_predictable.high' };
          if (score < 0.4) return { titleKey: 'dataModal.traits.playstyle_unpredictable.title', descriptionKey: 'dataModal.traits.playstyle_unpredictable.high' };
          return null;
      }
  },
  {
    id: 'envido_primero_specialist',
    scorer: ({ opponentModel }) => opponentModel.playStyle.envidoPrimeroRate,
    observer: (score) => {
        if (score > 0.6) return { titleKey: 'dataModal.traits.envido_primero_specialist.title', descriptionKey: 'dataModal.traits.envido_primero_specialist.high' };
        return null;
    }
  },
  {
    id: 'counter_puncher',
    scorer: ({ opponentModel }) => opponentModel.playStyle.counterTendency,
    observer: (score) => {
      if (score > 0.6) return { titleKey: 'dataModal.traits.counter_puncher.title', descriptionKey: 'dataModal.traits.counter_puncher.high' };
      return null;
    }
  },
  {
    id: 'chain_bluffer',
    scorer: ({ opponentModel }) => opponentModel.playStyle.chainBluffRate,
    observer: (score) => {
        if (score > 0.4) return { titleKey: 'dataModal.traits.chain_bluffer.title', descriptionKey: 'dataModal.traits.chain_bluffer.high' };
        return null;
    }
  }
];

export const generateProfileAnalysis = (state: GameState): TraitObservation[] => {
  if (state.roundHistory.length < 3) {
    return [{
      titleKey: 'dataModal.traits.not_enough_data.title',
      descriptionKey: 'dataModal.traits.not_enough_data.description',
      confidence: 1
    }];
  }

  const observations: TraitObservation[] = [];

  for (const trait of TRAITS) {
    const score = trait.scorer(state);
    const observation = trait.observer(score, state);
    if (observation) {
      observations.push({ ...observation, confidence: score });
    }
  }

  // Sort by confidence to get the most certain observations
  observations.sort((a, b) => b.confidence - a.confidence);
  
  // Simple shuffle to add variety to the top picks if confidences are similar
  const shuffledTop = observations.slice(0, 7).sort(() => 0.5 - Math.random());

  return shuffledTop.slice(0, 5);
};