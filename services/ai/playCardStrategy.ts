
import { GameState, Card, Suit, MessageObject } from '../../types';
import { getCardHierarchy, getCardName, getEnvidoValue, determineTrickWinner, determineRoundWinner, getEnvidoDetails, hasFlor, getEnvidoSuit } from '../trucoLogic';
import i18nService from '../i18nService';

export interface PlayCardResult {
    index: number;
    reasoning: (string | MessageObject)[];
    reasonKey?: string;
}

const findCardIndexByValue = (hand: Card[], type: 'min' | 'max'): number => {
    if (hand.length === 0) return -1;
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const cardToFind = type === 'min' ? sortedHand[0] : sortedHand[sortedHand.length - 1];
    return hand.findIndex(c => c.rank === cardToFind.rank && c.suit === cardToFind.suit);
}

export const findBestCardToPlay = (state: GameState): PlayCardResult => {
    const { t } = i18nService;
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, initialAiHand, playerEnvidoValue, roundHistory, round, trucoLevel, aiScore, playerScore, opponentModel } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: [t('ai_logic.no_cards_left')]};

    let reasoning: (string | MessageObject)[] = [t('ai_logic.play_card_logic'), t('ai_logic.my_hand', { hand: aiHand.map(getCardName).join(', ') })];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(t('ai_logic.leading_trick', { trickNumber: currentTrick + 1 }));

        let cardIndex = 0;
        switch (currentTrick) {
            case 0: // First trick
                // --- NEW PROBABILISTIC DECEPTION STRATEGY ---
                if (mano === 'ai' && aiHand.length === 3) {
                    const myEnvidoDetails = getEnvidoDetails(initialAiHand);
                    if (myEnvidoDetails.value >= 28) {
                        reasoning.push(t('ai_logic.probabilistic_deception_check', { envidoPoints: myEnvidoDetails.value }));
                        
                        const scoreDelta = aiScore - playerScore;
                        const playerContext = mano !== 'ai' ? 'mano' : 'pie';
                        const isOpponentAggressive = opponentModel.envidoBehavior[playerContext].callThreshold < 26.5 || opponentModel.envidoBehavior[playerContext].foldRate < 0.3;

                        let probability = 0.4; // Default probability
                        if (scoreDelta < -2) { // If AI is significantly losing
                            probability = 0.7;
                            reasoning.push(t('ai_logic.probabilistic_deception_score_losing', { scoreDelta }));
                        } else {
                            reasoning.push(t('ai_logic.probabilistic_deception_score_winning', { scoreDelta }));
                        }

                        if (isOpponentAggressive) {
                            probability = 0.4; // Reduce to 40% against aggressive players
                            reasoning.push(t('ai_logic.probabilistic_deception_opponent_aggro'));
                        }

                        const roll = Math.random();
                        reasoning.push(t('ai_logic.probabilistic_deception_roll', { roll: roll.toFixed(2), probability: probability.toFixed(2) }));

                        if (roll < probability) {
                            reasoning.push(t('ai_logic.probabilistic_deception_decision_execute'));
                            
                            const envidoSuit = getEnvidoSuit(initialAiHand);
                            const thirdCardIndex = envidoSuit ? aiHand.findIndex(c => c.suit !== envidoSuit) : -1;

                            if (hasFlor(initialAiHand)) {
                                // With Flor, always play the lowest to hide strength
                                const lowestCardIndex = findCardIndexByValue(aiHand, 'min');
                                reasoning.push(t('ai_logic.deceptive_play_flor_reason'));
                                reasoning.push(t('ai_logic.decision_play_deceptive', { cardName: getCardName(aiHand[lowestCardIndex]) }));
                                return { index: lowestCardIndex, reasoning, reasonKey: 'see_opponent' };
                            } else if (thirdCardIndex !== -1) {
                                // Weighted choice: 60% play third card, 40% sacrifice low of pair
                                const moveRoll = Math.random();
                                if (moveRoll < 0.6) {
                                    reasoning.push(t('ai_logic.deceptive_choice_third_card'));
                                    reasoning.push(t('ai_logic.decision_play_deceptive', { cardName: getCardName(aiHand[thirdCardIndex]) }));
                                    return { index: thirdCardIndex, reasoning, reasonKey: 'see_opponent' };
                                } else {
                                    const pairCards = aiHand.filter(c => c.suit === envidoSuit);
                                    const lowOfPair = pairCards.sort((a,b) => getCardHierarchy(a) - getCardHierarchy(b))[0];
                                    const lowOfPairIndex = aiHand.findIndex(c => c.rank === lowOfPair.rank && c.suit === lowOfPair.suit);
                                    reasoning.push(t('ai_logic.deceptive_choice_low_pair'));
                                    reasoning.push(t('ai_logic.decision_play_deceptive', { cardName: getCardName(aiHand[lowOfPairIndex]) }));
                                    return { index: lowOfPairIndex, reasoning, reasonKey: 'see_opponent' };
                                }
                            }
                        } else {
                            reasoning.push(t('ai_logic.probabilistic_deception_decision_skip'));
                        }
                    }
                }
                
                // "Sacrificial" Deceptive Play
                if (trucoLevel === 0 && mano === 'ai' && Math.random() < 0.4) {
                    const sortedHand = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
                    const hasAsDeEspadas = sortedHand.length > 0 && getCardHierarchy(sortedHand[0]) === 14;
                    const hasSecondTopTier = sortedHand.length > 1 && getCardHierarchy(sortedHand[1]) >= 11;

                    if (hasAsDeEspadas && hasSecondTopTier) {
                        const secondBestCard = sortedHand[1];
                        const sacrificialIndex = aiHand.findIndex(c => c.rank === secondBestCard.rank && c.suit === secondBestCard.suit);
                        
                        reasoning.push(t('ai_logic.advanced_tactic_sacrifice'));
                        reasoning.push(t('ai_logic.advanced_tactic_sacrifice_body', { card1: getCardName(sortedHand[0]), card2: getCardName(secondBestCard) }));
                        reasoning.push(t('ai_logic.decision_play_bait', { cardName: getCardName(secondBestCard) }));
                        return { index: sacrificialIndex, reasoning, reasonKey: 'see_opponent' };
                    }
                }

                if (mano === 'ai') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_mano', { cardName: getCardName(aiHand[cardIndex]) }));
                    return { index: cardIndex, reasoning, reasonKey: 'secure_hand' };
                } else {
                    cardIndex = findCardIndexByValue(aiHand, 'min');
                    reasoning.push(t('ai_logic.decision_play_lowest_not_mano', { cardName: getCardName(aiHand[cardIndex]) }));
                    return { index: cardIndex, reasoning, reasonKey: 'see_opponent' };
                }
            case 1: // Second trick
                if (trickWinners[0] === 'ai') {
                    // We won the first trick, so we play to win the round.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_won_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                    return { index: cardIndex, reasoning, reasonKey: 'secure_hand' };
                } else if (trickWinners[0] === 'player') {
                    // We lost the first trick, so we must win this one to stay in.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_lost_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                    return { index: cardIndex, reasoning, reasonKey: 'secure_hand' };
                } else { // Tied first trick
                    // The first trick was a tie, this one is decisive. No risks. Play the strongest card to win.
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push(t('ai_logic.decision_play_highest_tied_trick1', { cardName: getCardName(aiHand[cardIndex]) }));
                    return { index: cardIndex, reasoning, reasonKey: 'secure_hand' };
                }
            case 2: // Third trick
                reasoning.push(t('ai_logic.decision_play_last_card', { cardName: getCardName(aiHand[0]) }));
                return { index: 0, reasoning, reasonKey: 'play_last_card' };
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
        return { index: bestPlay.index, reasoning, reasonKey: 'win_round_cheap' };
    }
    // --- END NEW ---

    // --- "Parda y Canto" (Tie and Call) Strategy ---
    if (currentTrick === 0 && aiHand.length > 1) {
        const aceInTheHole = aiHand.find(c => getCardHierarchy(c) >= 12); // 7 de espadas or better
        const tyingCards = aiHand.filter(c => getCardHierarchy(c) === playerCardValue);

        if (aceInTheHole && tyingCards.length > 0) {
            const isAceTheTyingCard = tyingCards.some(c => c.rank === aceInTheHole.rank && c.suit === aceInTheHole.suit);
            
            if (!isAceTheTyingCard && Math.random() < 0.80) {
                const tyingCard = tyingCards[0];
                const cardIndex = aiHand.findIndex(c => c.rank === tyingCard.rank && c.suit === tyingCard.suit);

                reasoning.push(t('ai_logic.strategic_play_parda_canto'));
                reasoning.push(t('ai_logic.parda_canto_reason', { aceInHole: getCardName(aceInTheHole), tyingCard: getCardName(tyingCard) }));
                reasoning.push(t('ai_logic.decision_play_tie', { cardName: getCardName(tyingCard) }));
                return { index: cardIndex, reasoning, reasonKey: 'parda_y_canto' };
            }
        }
    }

    const winningCards = aiHand.filter(card => getCardHierarchy(card) > playerCardValue);
    if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
        const cardToPlay = winningCards[0];
        const cardIndex = aiHand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
        reasoning.push(t('ai_logic.decision_play_lowest_winning', { cardName: getCardName(cardToPlay), value: getCardHierarchy(cardToPlay) }));
        return { index: cardIndex, reasoning, reasonKey: 'win_round_cheap' };
    } 
    
    // Fix: Declare `cardIndex` with `const` to resolve a "Cannot find name" error.
    const cardIndex = findCardIndexByValue(aiHand, 'min');
    reasoning.push(t('ai_logic.decision_play_discard_lowest', { cardName: getCardName(aiHand[cardIndex]) }));
    return { index: cardIndex, reasoning, reasonKey: 'discard_low' };
}
