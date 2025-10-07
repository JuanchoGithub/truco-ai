import { Card, Suit, Rank, Player } from '../types';

const SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

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
  return `${rankName} of ${suitName}`;
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
    
    const reasoning = `[Envido Calculation]\nI have multiple '${bestSuit}' cards. Using ${getCardName(card1)} and ${getCardName(card2)}.\nMy points are 20 + ${card1.value} + ${card2.value} = ${maxEnvido}.`;
    return { value: maxEnvido, reasoning };
  }
  
  const valueCards = hand.map(c => ({...c, value: c.rank >= 10 ? 0 : c.rank}));
  const sortedHand = valueCards.sort((a,b) => b.value - a.value);
  const highestCard = sortedHand[0];

  const reasoning = `[Envido Calculation]\nMy cards are all different suits. My highest card is ${getCardName(highestCard)}, giving me ${highestCard.value} points.`;
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
