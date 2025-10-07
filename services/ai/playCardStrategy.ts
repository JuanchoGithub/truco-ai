import { GameState, Card, Suit } from '../../types';
import { getCardHierarchy, getCardName, getEnvidoValue } from '../trucoLogic';

export interface PlayCardResult {
    index: number;
    reasoning: string[];
}

const findCardIndexByValue = (hand: Card[], type: 'min' | 'max'): number => {
    if (hand.length === 0) return -1;
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const cardToFind = type === 'min' ? sortedHand[0] : sortedHand[sortedHand.length - 1];
    return hand.findIndex(c => c.rank === cardToFind.rank && c.suit === cardToFind.suit);
}

// Helper to find the suit that forms the basis of the Envido points.
const getEnvidoSuit = (hand: Card[]): Suit | null => {
  if (hand.length < 2) return null;
  const suitCounts: Partial<Record<Suit, number>> = {};
  hand.forEach(card => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  // Explicitly check in order of suits to be deterministic if there are multiple pairs (not possible with 3 cards)
  for (const suit of (['espadas', 'bastos', 'oros', 'copas'] as Suit[])) {
    if (suitCounts[suit]! >= 2) {
      return suit;
    }
  }
  return null;
};

export const findBestCardToPlay = (state: GameState): PlayCardResult => {
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, hasEnvidoBeenCalledThisRound, initialAiHand, playerEnvidoValue } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: ["No cards left to play."]};

    let reasoning: string[] = [`[Play Card Logic]`, `My hand: ${aiHand.map(getCardName).join(', ')}`];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(`I am leading Trick ${currentTrick + 1}.`);

        // Advanced Deceptive Play
        // Condition: AI won a high-value envido showdown, so player knows AI has good envido cards.
        if (currentTrick === 0 && mano === 'ai' && playerEnvidoValue !== null) {
            const myEnvido = getEnvidoValue(initialAiHand);
            if (myEnvido > playerEnvidoValue && myEnvido >= 28 && Math.random() < 0.6) { // 60% chance for deception
                const cardIndex = findCardIndexByValue(aiHand, 'min');
                reasoning.push(`[Deceptive Play]: I won the Envido showdown, so the player knows I have high cards. I will play my *lowest* card to feign weakness for tricks and bait them into a Truco call.`);
                reasoning.push(`\nDecision: Playing ${getCardName(aiHand[cardIndex])}.`);
                return { index: cardIndex, reasoning };
            }
        }


        let cardIndex = 0;
        switch (currentTrick) {
            case 0: // First trick
                if (mano === 'ai') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecision: I am mano, so I'll play my highest card to secure the lead: ${getCardName(aiHand[cardIndex])}.`);
                } else {
                    cardIndex = findCardIndexByValue(aiHand, 'min');
                    reasoning.push(`\nDecision: Player is mano, so I'll play my lowest card to see what they have: ${getCardName(aiHand[cardIndex])}.`);
                }
                return { index: cardIndex, reasoning };
            case 1: // Second trick
                if (trickWinners[0] === 'ai') {
                    // NEW: Deceptive "Suit-Led Misdirection" play.
                    const envidoSuit = getEnvidoSuit(initialAiHand);
                    const myEnvido = getEnvidoValue(initialAiHand);
                    
                    // Condition: AI won trick 1, has a strong envido pair that was likely revealed, and still has a card of that suit.
                    if (envidoSuit && myEnvido >= 27 && hasEnvidoBeenCalledThisRound) {
                        const matchingSuitCardIndex = aiHand.findIndex(c => c.suit === envidoSuit);
                        
                        if (matchingSuitCardIndex !== -1) {
                            // High probability to make this smart, deceptive play.
                            if (Math.random() < 0.75) {
                                reasoning.push(`[Deceptive Play]: My Envido call likely revealed my '${envidoSuit}' pair. Instead of my strongest overall card, I will lead my remaining '${envidoSuit}' card.`);
                                reasoning.push(`This creates uncertainty, making the opponent question if I have another high card of the same suit. It camouflages my hand's true remaining strength.`);
                                const cardToPlay = aiHand[matchingSuitCardIndex];
                                reasoning.push(`\nDecision: Playing the deceptive ${getCardName(cardToPlay)}.`);
                                return { index: matchingSuitCardIndex, reasoning };
                            } else {
                                reasoning.push(`[Deceptive Play Skipped]: I considered a deceptive suit-matched lead, but randomization led me to a standard play to remain unpredictable.`);
                            }
                        }
                    }

                    // Fallback to original logic if deceptive play isn't triggered.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecision: I won the first trick. Playing my highest card to win the round: ${getCardName(aiHand[cardIndex])}.`);
                } else if (trickWinners[0] === 'player') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecision: I lost the first trick. I must win this one. Playing my highest card: ${getCardName(aiHand[cardIndex])}.`);
                } else { // Tied first trick
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(`\nDecision: The first trick was a parda (tie). This makes the second trick the decisive one for the round. I must shift to an aggressive strategy and lead my strongest card to secure the win outright: ${getCardName(aiHand[cardIndex])}.`);
                }
                return { index: cardIndex, reasoning };
            case 2: // Third trick
                reasoning.push(`\nDecision: Only one card left. Playing ${getCardName(aiHand[0])}.`);
                return { index: 0, reasoning };
        }
    }

    // --- AI is responding to a card ---
    const playerCard = playerTricks[currentTrick]!;
    const playerCardValue = getCardHierarchy(playerCard);
    reasoning.push(`I am responding to Player's ${getCardName(playerCard)} (Value: ${playerCardValue}).`);
    
    const winningCards = aiHand.filter(card => getCardHierarchy(card) > playerCardValue);
    if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
        const cardToPlay = winningCards[0];
        const cardIndex = aiHand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
        reasoning.push(`\nDecision: I can win this trick. I'll use my lowest winning card to save better ones: ${getCardName(cardToPlay)} (Value: ${getCardHierarchy(cardToPlay)}).`);
        return { index: cardIndex, reasoning };
    } 
    
    const cardIndex = findCardIndexByValue(aiHand, 'min');
    reasoning.push(`\nDecision: I can't win this trick. I will throw away my lowest card: ${getCardName(aiHand[cardIndex])}.`);
    return { index: cardIndex, reasoning };
}