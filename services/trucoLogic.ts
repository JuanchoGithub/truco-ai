import { Card, Suit, Rank, Player } from '../types';

const SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const suitToCode: Record<Suit, string> = {
  espadas: 'E',
  bastos: 'B',
  oros: 'O',
  copas: 'C',
};

const codeToSuit: Record<string, Suit> = {
  E: 'espadas',
  B: 'bastos',
  O: 'oros',
  C: 'copas',
};

export const getCardCode = (card: Card): string => {
  const suitCode = suitToCode[card.suit];
  return `${suitCode}${card.rank}`;
};

export const decodeCardFromCode = (code: string): Card => {
  const suitCode = code.charAt(0);
  const rank = parseInt(code.substring(1), 10) as Rank;
  const suit = codeToSuit[suitCode];
  if (!suit || isNaN(rank)) {
    console.error(`Invalid card code provided: ${code}`);
    // Return a "safe" card to prevent crashes on corrupted data.
    return { rank: 4, suit: 'copas' };
  }
  return { rank, suit };
};

export const getCardName = (card: Card): string => {
  let rankName: string;
  switch (card.rank) {
    case 1: rankName = 'As'; break;
    case 10: rankName = 'Sota'; break;
    case 11: rankName = 'Caballo'; break;
    case 12: rankName = 'Rey'; break;
    default: rankName = String(card.rank);
  }
  const suitName = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
  return `${rankName} de ${suitName}`;
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
};

export const hasFlor = (hand: Card[]): boolean => {
  if (hand.length < 3) return false;
  const firstSuit = hand[0].suit;
  return hand.every(card => card.suit === firstSuit);
};

export const getFlorValue = (hand: Card[]): number => {
    if (!hasFlor(hand)) return 0;
    return 20 + hand.reduce((sum, card) => sum + (card.rank >= 10 ? 0 : card.rank), 0);
};

export const shuffleDeck = <T,>(array: T[]): T[] => {
  let currentIndex = array.length;
  let randomIndex: number;
  const newArray = [...array];

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }

  return newArray;
};

export const getCardHierarchy = (card: Card): number => {
    if (card.rank === 1 && card.suit === 'espadas') return 14;
    if (card.rank === 1 && card.suit === 'bastos') return 13;
    if (card.rank === 7 && card.suit === 'espadas') return 12;
    if (card.rank === 7 && card.suit === 'oros') return 11;
    if (card.rank === 3) return 10;
    if (card.rank === 2) return 9;
    if (card.rank === 1 && (card.suit === 'oros' || card.suit === 'copas')) return 8;
    if (card.rank === 12) return 7;
    if (card.rank === 11) return 6;
    if (card.rank === 10) return 5;
    if (card.rank === 7 && (card.suit === 'copas' || card.suit === 'bastos')) return 4;
    if (card.rank === 6) return 3;
    if (card.rank === 5) return 2;
    if (card.rank === 4) return 1;
    return 0;
};

export const calculateHandStrength = (hand: Card[]): number => {
    return hand.reduce((sum, card) => sum + getCardHierarchy(card), 0);
};

export const getEnvidoValue = (hand: Card[]): number => {
  const sameSuitCards: { [key in Suit]?: Card[] } = {};
  hand.forEach(card => {
    if (!sameSuitCards[card.suit]) {
      sameSuitCards[card.suit] = [];
    }
    sameSuitCards[card.suit]?.push(card);
  });

  let maxEnvido = 0;
  for (const suit in sameSuitCards) {
    const cards = sameSuitCards[suit as Suit]!;
    if (cards.length >= 2) {
      const sortedCards = cards.sort((a, b) => (b.rank >= 10 ? 0 : b.rank) - (a.rank >= 10 ? 0 : a.rank));
      const envido = 20 + (sortedCards[0].rank >= 10 ? 0 : sortedCards[0].rank) + (sortedCards[1].rank >= 10 ? 0 : sortedCards[1].rank);
      if (envido > maxEnvido) {
        maxEnvido = envido;
      }
    }
  }

  if (maxEnvido === 0) {
    maxEnvido = Math.max(...hand.map(c => c.rank >= 10 ? 0 : c.rank));
  }
  return maxEnvido;
};

export interface EnvidoDetails {
  value: number;
  reasoning: string;
}

export const getEnvidoDetails = (hand: Card[]): EnvidoDetails => {
  const sameSuitCards: { [key in Suit]?: Card[] } = {};
  hand.forEach(card => {
    if (!sameSuitCards[card.suit]) {
      sameSuitCards[card.suit] = [];
    }
    sameSuitCards[card.suit]?.push(card);
  });

  let maxEnvido = 0;
  let bestSuit: Suit | null = null;

  for (const suit in sameSuitCards) {
    const cards = sameSuitCards[suit as Suit]!;
    if (cards.length >= 2) {
      const valueCards = cards.map(c => ({...c, value: c.rank >= 10 ? 0 : c.rank}));
      const sortedCards = valueCards.sort((a, b) => b.value - a.value);
      const envido = 20 + sortedCards[0].value + sortedCards[1].value;
      
      if (envido > maxEnvido) {
        maxEnvido = envido;
        bestSuit = suit as Suit;
      }
    }
  }

  if (bestSuit) {
    const cards = sameSuitCards[bestSuit]!;
    const valueCards = cards.map(c => ({...c, value: c.rank >= 10 ? 0 : c.rank}));
    const sortedCards = valueCards.sort((a, b) => b.value - a.value);
    
    const card1 = sortedCards[0];
    const card2 = sortedCards[1];
    
    const reasoning = `[Cálculo de Envido]\n- Tengo múltiples cartas de '${bestSuit}'. Usando ${getCardName(card1)} y ${getCardName(card2)}.\n- Mis puntos son 20 + ${card1.value} + ${card2.value} = ${maxEnvido}.`;
    return { value: maxEnvido, reasoning };
  }
  
  const valueCards = hand.map(c => ({...c, value: c.rank >= 10 ? 0 : c.rank}));
  const sortedHand = valueCards.sort((a,b) => b.value - a.value);
  const highestCard = sortedHand[0];

  const reasoning = `[Cálculo de Envido]\n- Mis cartas son de diferentes palos. Mi carta más alta es ${getCardName(highestCard)}, dándome ${highestCard.value} puntos.`;
  return { value: highestCard.value, reasoning };
};

export const determineTrickWinner = (playerCard: Card, aiCard: Card): Player | 'tie' => {
  const playerValue = getCardHierarchy(playerCard);
  const aiValue = getCardHierarchy(aiCard);
  if (playerValue > aiValue) return 'player';
  if (aiValue > playerValue) return 'ai';
  return 'tie';
};

export const determineRoundWinner = (trickWinners: (Player | 'tie' | null)[], mano: Player): Player | 'tie' | null => {
  const playerWins = trickWinners.filter(w => w === 'player').length;
  const aiWins = trickWinners.filter(w => w === 'ai').length;

  // Simple case: win 2 tricks
  if (playerWins >= 2) return 'player';
  if (aiWins >= 2) return 'ai';

  const [t1, t2, t3] = trickWinners;

  // Round is not over if less than 2 tricks have been played, unless there's a tie.
  // After trick 2 is complete:
  if (t2 !== null) {
      // Tie in first trick, winner of second trick wins the round.
      if (t1 === 'tie' && t2 !== 'tie') {
          return t2;
      }
      // Win in first trick, tie in second trick. Winner of first trick wins the round.
      if (t1 !== 'tie' && t2 === 'tie') {
          return t1;
      }
  }

  // After trick 3 is complete:
  if (t3 !== null) {
      // Tie in third trick, winner of first trick wins.
      if (t3 === 'tie' && t1 !== 'tie') {
          return t1;
      }
      // First and second tricks tied, winner of third trick wins.
      if (t1 === 'tie' && t2 === 'tie' && t3 !== 'tie') {
          return t3;
      }
      // One win each, one tie. Winner of first trick wins.
      if (playerWins === 1 && aiWins === 1) { // Implies one tie
          if (t1 !== 'tie') {
              return t1;
          } else { // First trick was the tie, e.g., ['tie', 'player', 'ai']. Mano wins.
              return mano;
          }
      }
      // All three tricks tied. Mano wins.
      if (t1 === 'tie' && t2 === 'tie' && t3 === 'tie') {
          return mano;
      }
  }
  
  // If no conclusive winner, round is not over.
  return null;
};

// Based on simulation data for hand strength distribution.
export const HAND_STRENGTH_PERCENTILES = {
  90: 20, // Elite hand (e.g., 7 de Espada + 3 + high Ace)
  75: 16, // Strong hand (e.g., 3 + 7 de Oro + Ace)
  50: 11, // Median hand (e.g., a 3 or 2 plus other decent cards)
  25: 7,  // Weak-ish hand (e.g., a common card like a 12 and two low cards)
  10: 3,  // Very weak hand (e.g., 4, 5, 6)
} as const;

/**
 * Gets the approximate percentile of a given hand based on its calculated strength.
 * @param hand The hand to evaluate.
 * @returns The percentile (0-100).
 */
export const getHandPercentile = (hand: Card[]): number => {
  const strength = calculateHandStrength(hand);
  // Order from high to low to check against thresholds
  const percentiles = Object.entries(HAND_STRENGTH_PERCENTILES)
    .map(([p, s]) => [parseInt(p, 10), s] as [number, number])
    .sort((a, b) => b[0] - a[0]);

  for (const [percentile, strengthThreshold] of percentiles) {
    if (strength >= strengthThreshold) {
      return percentile;
    }
  }
  return 0; // Bottom tier
};