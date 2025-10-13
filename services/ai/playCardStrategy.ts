
import { GameState, Card, Suit } from '../../types';
import { getCardHierarchy, getCardName, getEnvidoValue, determineTrickWinner, determineRoundWinner, getEnvidoDetails } from '../trucoLogic';
import i18nService from '../i18nService';

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
    const { t } = i18nService;
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, initialAiHand, playerEnvidoValue, roundHistory, round, trucoLevel } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: [t('ai_logic.no_cards_left')]};

    let reasoning: string[] = [t('ai_logic.play_card_logic'), t('ai_logic.my_hand', { hand: aiHand.map(getCardName).join(', ') })];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(t('ai_logic.leading_trick', { trickNumber: currentTrick + 1 }));

        // Advanced Deceptive Play
        // Condition: AI won a high-value envido showdown, so player knows AI has good envido cards.
        if (currentTrick === 0 && mano === 'ai' && playerEnvidoValue !== null) {
            const myEnvido = getEnvidoValue(initialAiHand);
            if (myEnvido > playerEnvidoValue && myEnvido >= 28 && Math.random() < 0.6) { // 60% chance for deception
                const cardIndex = findCardIndexByValue(aiHand, 'min');
                reasoning.push(t('ai_logic.deceptive_play_envido_win'));
                reasoning.push(t('ai_logic.decision_play_card', { cardName: getCardName(aiHand[cardIndex]) }));
                return { index: cardIndex, reasoning };
            }
        }


        let cardIndex = 0;
        switch (currentTrick) {
            case 0: // First trick
                // NEW: "Sacrificial" Deceptive Play
                // If AI is mano, has a monster hand, and Truco hasn't been called, consider playing the 2nd best card to bait the opponent.
                if (trucoLevel === 0 && mano === 'ai' && Math.random() < 0.4) { // 40% chance to consider this play
                    const sortedHand = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
                    const hasAsDeEspadas = sortedHand.length > 0 && getCardHierarchy(sortedHand[0]) === 14;
                    const hasSecondTopTier = sortedHand.length > 1 && getCardHierarchy(sortedHand[1]) >= 11; // 7 de Oros or better

                    if (hasAsDeEspadas && hasSecondTopTier) {
                        const secondBestCard = sortedHand[1];
                        const sacrificialIndex = aiHand.findIndex(c => c.rank === secondBestCard.rank && c.suit === secondBestCard.suit);
                        
                        reasoning.push(t('ai_logic.advanced_tactic_sacrifice'));
                        reasoning.push(t('ai_logic.advanced_tactic_sacrifice_body', { card1: getCardName(sortedHand[0]), card2: getCardName(secondBestCard) }));
                        reasoning.push(t('ai_logic.decision_play_bait', { cardName: getCardName(secondBestCard) }));
                        return { index: sacrificialIndex, reasoning };
                    }
                }

                if (mano === 'ai') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_mano', { cardName: getCardName(aiHand[cardIndex]) }));
                } else {
                    cardIndex = findCardIndexByValue(aiHand, 'min');
                    reasoning.push(t('ai_logic.decision_play_lowest_not_mano', { cardName: getCardName(aiHand[cardIndex]) }));
                }
                return { index: cardIndex, reasoning };
            case 1: // Second trick
                if (trickWinners[0] === 'ai') {
                    // Deceptive "Suit-Led Misdirection" play.
                    const currentRoundSummary = roundHistory.find(r => r.round === round);
                    const envidoShowdownHappened = currentRoundSummary?.calls.some(c => c.toLowerCase().includes('envido')) &&
                                                   currentRoundSummary?.calls.some(c => c.toLowerCase().includes('quiero'));
                    
                    if (envidoShowdownHappened && playerEnvidoValue !== null) {
                        const envidoSuit = getEnvidoSuit(initialAiHand);
                        if (envidoSuit) { // Check if AI has a suit pair to make this play
                            const myEnvidoDetails = getEnvidoDetails(initialAiHand);
                            const myEnvidoPoints = myEnvidoDetails.value;
                            
                            let wonEnvido = false;
                            if (myEnvidoPoints > playerEnvidoValue) {
                                wonEnvido = true;
                            } else if (myEnvidoPoints === playerEnvidoValue && mano === 'ai') {
                                wonEnvido = true; // AI wins ties when mano
                            }

                            if (wonEnvido && myEnvidoPoints >= 27) {
                                const matchingSuitCardIndex = aiHand.findIndex(c => c.suit === envidoSuit);
                                if (matchingSuitCardIndex !== -1 && Math.random() < 0.75) {
                                    reasoning.push(t('ai_logic.deceptive_play_suit_led', { suit: envidoSuit }));
                                    reasoning.push(t('ai_logic.deceptive_play_suit_led_reason'));
                                    const cardToPlay = aiHand[matchingSuitCardIndex];
                                    reasoning.push(t('ai_logic.decision_play_deceptive', { cardName: getCardName(cardToPlay) }));
                                    return { index: matchingSuitCardIndex, reasoning };
                                }
                            }
                        }
                    }

                    // Fallback to standard logic if deceptive play isn't triggered.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_won_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                } else if (trickWinners[0] === 'player') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_lost_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                } else { // Tied first trick
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_tied_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                }
                return { index: cardIndex, reasoning };
            case 2: // Third trick
                reasoning.push(t('ai_logic.decision_play_last_card', { cardName: getCardName(aiHand[0]) }));
                return { index: 0, reasoning };
        }
    }

    // --- AI is responding to a card ---
    const playerCard = playerTricks[currentTrick]!;
    const playerCardValue = getCardHierarchy(playerCard);
    reasoning.push(t('ai_logic.responding_to_card', { cardName: getCardName(playerCard), value: playerCardValue }));
    
    // --- NEW: Full outcome analysis ---
    const outcomes = aiHand.map((card, index) => {
        const simTrickWinner = determineTrickWinner(playerCard, card);
        const hypotheticalTrickWinners = [...trickWinners];
        hypotheticalTrickWinners[currentTrick] = simTrickWinner;
        const simRoundWinner = determineRoundWinner(hypotheticalTrickWinners, mano);
        return {
            card,
            index,
            cardValue: getCardHierarchy(card),
            trickOutcome: simTrickWinner,
            roundOutcome: simRoundWinner
        };
    });

    const roundWinningPlays = outcomes.filter(o => o.roundOutcome === 'ai');
    if (roundWinningPlays.length > 0) {
        // If there are multiple ways to win the round, choose the one using the weakest card.
        roundWinningPlays.sort((a, b) => a.cardValue - b.cardValue);
        const bestPlay = roundWinningPlays[0];
        reasoning.push(t('ai_logic.round_analysis', { cardName: getCardName(bestPlay.card) }));
        reasoning.push(t('ai_logic.decision_play_weakest_winner', { cardName: getCardName(bestPlay.card) }));
        return { index: bestPlay.index, reasoning };
    }
    // --- END NEW ---

    // --- "Parda y Canto" (Tie and Call) Strategy ---
    // If it's the first trick, we have a monster card for later, and we can tie the current trick,
    // it's often a good strategy to tie, hide our strength, and then call Truco.
    if (currentTrick === 0 && aiHand.length > 1) {
        const aceInTheHole = aiHand.find(c => getCardHierarchy(c) >= 12); // 7 de espadas or better
        const tyingCards = aiHand.filter(c => getCardHierarchy(c) === playerCardValue);

        if (aceInTheHole && tyingCards.length > 0) {
            // Make sure our best card isn't the one we'd use to tie
            const isAceTheTyingCard = tyingCards.some(c => c.rank === aceInTheHole.rank && c.suit === aceInTheHole.suit);
            
            // 80% chance to execute this advanced strategy
            if (!isAceTheTyingCard && Math.random() < 0.80) {
                const tyingCard = tyingCards[0]; // Pick the first available tying card
                const cardIndex = aiHand.findIndex(c => c.rank === tyingCard.rank && c.suit === tyingCard.suit);

                reasoning.push(t('ai_logic.strategic_play_parda_canto'));
                reasoning.push(t('ai_logic.parda_canto_reason', { aceInHole: getCardName(aceInTheHole), tyingCard: getCardName(tyingCard) }));
                reasoning.push(t('ai_logic.decision_play_tie', { cardName: getCardName(tyingCard) }));
                return { index: cardIndex, reasoning };
            }
        }
    }

    const winningCards = aiHand.filter(card => getCardHierarchy(card) > playerCardValue);
    if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
        const cardToPlay = winningCards[0];
        const cardIndex = aiHand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
        reasoning.push(t('ai_logic.decision_play_lowest_winning', { cardName: getCardName(cardToPlay), value: getCardHierarchy(cardToPlay) }));
        return { index: cardIndex, reasoning };
    } 
    
    const cardIndex = findCardIndexByValue(aiHand, 'min');
    reasoning.push(t('ai_logic.decision_play_discard_lowest', { cardName: getCardName(aiHand[cardIndex]) }));
    return { index: cardIndex, reasoning };
}
