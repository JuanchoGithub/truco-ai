
import { GameState, Card, Suit, MessageObject, AiMove, ActionType } from '../../types';
import { getCardHierarchy, getCardName, getEnvidoValue, determineTrickWinner, determineRoundWinner, getEnvidoDetails, hasFlor, getEnvidoSuit, calculateHandStrength } from '../trucoLogic';
import i18nService from '../i18nService';
import { generateConstrainedOpponentHand } from './inferenceService';

const findCardIndexByValue = (hand: Card[], type: 'min' | 'max'): number => {
    if (hand.length === 0) return -1;
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const cardToFind = type === 'min' ? sortedHand[0] : sortedHand[sortedHand.length - 1];
    return hand.findIndex(c => c.rank === cardToFind.rank && c.suit === cardToFind.suit);
}

export const findBaitCard = (hand: Card[]): { index: number, card: Card, reasonKey: string, reason: MessageObject } => {
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const [lowest, middle, highest] = sortedHand;

    let baitCard = lowest;
    let reasonKey = 'probe_low_value';
    let baitReason: MessageObject = { key: 'ai_logic.bait_type_low' };

    // If there's a huge total power gap AND a significant gap between the top two cards, play the middle as a more convincing bait.
    if (hand.length === 3 && getCardHierarchy(highest) - getCardHierarchy(lowest) >= 8 && getCardHierarchy(highest) - getCardHierarchy(middle) >= 3) {
        baitCard = middle;
        reasonKey = 'probe_mid_value';
        baitReason = { key: 'ai_logic.bait_type_mid' };
    }

    const index = hand.findIndex(c => c.rank === baitCard.rank && c.suit === baitCard.suit);
    return { index, card: baitCard, reasonKey, reason: baitReason };
};

export const findBestCardToPlay = (state: GameState): AiMove => {
    const { t } = i18nService;
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, initialAiHand, playerEnvidoValue, roundHistory, round, trucoLevel, aiScore, playerScore, opponentModel, playerHand } = state;
    // FIX: Changed return type from PlayCardResult to AiMove and action to NO_OP for empty hand case.
    if (aiHand.length === 0) return { action: { type: 'NO_OP' as any }, reasoning: [{ key: 'ai_logic.no_cards_left' }]};

    let reasoning: (string | MessageObject)[] = [{ key: 'ai_logic.play_card_logic' }];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- High-priority scenario checks ---

    // 1. "Parda y Gano" (Tie and Win)
    if (currentTrick === 1 && trickWinners[0] === 'tie') {
        reasoning.push({ key: 'ai_logic.opportunity_logic_parda_gano' });
        const playerCard = playerTricks[1];
        if (playerCard) { // Responding
            const winningCards = aiHand.filter(c => getCardHierarchy(c) > getCardHierarchy(playerCard));
            if (winningCards.length > 0) {
                const bestPlay = winningCards.sort((a,b) => getCardHierarchy(a) - getCardHierarchy(b))[0];
                const cardIndex = aiHand.findIndex(c => c.rank === bestPlay.rank && c.suit === bestPlay.suit);
                reasoning.push({ key: 'ai_logic.decision_play_card_parda_y_gano', options: { cardName: getCardName(bestPlay) } });
                // FIX: Changed return type from PlayCardResult to AiMove.
                return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'play_card_parda_y_gano' };
            }
        } else { // Leading
            const myBestCard = [...aiHand].sort((a,b) => getCardHierarchy(b) - getCardHierarchy(a))[0];
            const unseenCards = state.opponentHandProbabilities?.unseenCards || [];
            const bestPossibleOpponentCard = unseenCards.length > 0 ? [...unseenCards].sort((a,b) => getCardHierarchy(b) - getCardHierarchy(a))[0] : null;

            if (bestPossibleOpponentCard && getCardHierarchy(myBestCard) > getCardHierarchy(bestPossibleOpponentCard)) {
                 const cardIndex = aiHand.findIndex(c => c.rank === myBestCard.rank && c.suit === myBestCard.suit);
                 reasoning.push({ key: 'ai_logic.decision_play_card_parda_y_gano', options: { cardName: getCardName(myBestCard) } });
                 // FIX: Changed return type from PlayCardResult to AiMove.
                 return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'play_card_parda_y_gano' };
            }
        }
    }

    // 2. "Final Trick Certainty"
    const isFinalTrickContext = (aiHand.length === 1 && playerHand.length === 1) || (aiHand.length === 1 && playerHand.length === 0 && playerTricks[currentTrick] !== null); 
    if (isFinalTrickContext) {
        reasoning.push({ key: 'ai_logic.opportunity_logic_certain_win' });
        const myCard = aiHand[0];
        let winIsCertain = false;

        if (playerHand.length === 0) {
            const opponentCard = playerTricks[currentTrick]!;
            const simTrickWinner = determineTrickWinner(opponentCard, myCard);
            const hypotheticalTrickWinners = [...trickWinners];
            hypotheticalTrickWinners[currentTrick] = simTrickWinner;
            if (determineRoundWinner(hypotheticalTrickWinners, state.mano) === 'ai') winIsCertain = true;
        } else {
             const opponentSamples = generateConstrainedOpponentHand(state, [], { strong: 1, medium: 1, weak: 1 });
             const possibleOpponentCards = [...opponentSamples.strong, ...opponentSamples.medium, ...opponentSamples.weak].flat();
             if (possibleOpponentCards.length > 0 && possibleOpponentCards.every(oppCard => getCardHierarchy(myCard) > getCardHierarchy(oppCard))) {
                winIsCertain = true;
             }
        }
        
        if (winIsCertain) {
            reasoning.push({ key: 'ai_logic.decision_play_card_certain_win', options: { cardName: getCardName(myCard) } });
            // FIX: Changed return type from PlayCardResult to AiMove.
            return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: 0 } }, reasoning, reasonKey: 'play_card_certain_win' };
        }
    }


    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push({ key: 'ai_logic.leading_trick', options: { trickNumber: currentTrick + 1 } });

        let cardIndex = 0;
        switch (currentTrick) {
            case 0: // First trick
                
                if (mano === 'ai') {
                    const myEnvido = getEnvidoValue(initialAiHand);
                    const trucoStrength = calculateHandStrength(initialAiHand);
                    if (myEnvido >= 30 && trucoStrength < 12 && trucoLevel === 0) {
                        reasoning.push({ key: 'ai_logic.lopsided_hand_check', options: { envidoPoints: myEnvido, trucoStrength } });
                        const baitChance = 0.9;
                        if (Math.random() < baitChance) {
                            const { index: baitCardIndex, card: baitCard } = findBaitCard(aiHand);
                            reasoning.push({ key: 'ai_logic.lopsided_hand_decision', options: { cardName: getCardName(baitCard) } });
                            // FIX: Changed return type from PlayCardResult to AiMove.
                            return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: baitCardIndex } }, reasoning, reasonKey: 'bait_lopsided_hand' };
                        }
                    }

                    const sortedHand = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
                    if (trucoLevel === 0 && sortedHand.length === 3 && getCardHierarchy(sortedHand[0]) >= 12 && getCardHierarchy(sortedHand[1]) <= 7) {
                        const baitChance = 0.75;
                        reasoning.push({ key: 'ai_logic.bait_tactic_check_title' });
                        reasoning.push({ key: 'ai_logic.bait_tactic_check_body', options: { strongest: getCardName(sortedHand[0]) } });
                        
                        if (Math.random() < baitChance) {
                            const { index: baitCardIndex, card: baitCard, reasonKey: baitReasonKey, reason: baitReason } = findBaitCard(aiHand);
                            reasoning.push(baitReason);
                            reasoning.push({ key: 'ai_logic.bait_tactic_decision', options: { cardName: getCardName(baitCard) } });
                            // FIX: Changed return type from PlayCardResult to AiMove.
                            return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: baitCardIndex } }, reasoning, reasonKey: baitReasonKey };
                        } else {
                            reasoning.push({ key: 'ai_logic.bait_tactic_skipped' });
                        }
                    }

                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push({ key: 'ai_logic.decision_play_highest_mano', options: { cardName: getCardName(aiHand[cardIndex]) } });
                    // FIX: Changed return type from PlayCardResult to AiMove.
                    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'secure_hand' };
                } else {
                    const { index: baitCardIndex, card: baitCard, reasonKey: baitReasonKey } = findBaitCard(aiHand);
                    reasoning.push({ key: 'ai_logic.decision_play_lowest_not_mano', options: { cardName: getCardName(baitCard) } });
                    // FIX: Changed return type from PlayCardResult to AiMove.
                    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: baitCardIndex } }, reasoning, reasonKey: baitReasonKey };
                }
            case 1: // Second trick
                if (trickWinners[0] === 'ai') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push({ key: 'ai_logic.decision_play_highest_won_trick1', options: { cardName: getCardName(aiHand[cardIndex]) } });
                    // FIX: Changed return type from PlayCardResult to AiMove.
                    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'secure_hand' };
                } else if (trickWinners[0] === 'player') {
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push({ key: 'ai_logic.decision_play_highest_lost_trick1', options: { cardName: getCardName(aiHand[cardIndex]) } });
                    // FIX: Changed return type from PlayCardResult to AiMove.
                    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'secure_hand' };
                } else { // Tied first trick
                    cardIndex = findCardIndexByValue(aiHand, 'max');
                    reasoning.push({ key: 'ai_logic.decision_play_highest_tied_trick1', options: { cardName: getCardName(aiHand[cardIndex]) } });
                    // FIX: Changed return type from PlayCardResult to AiMove.
                    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'secure_hand' };
                }
            case 2: // Third trick
                reasoning.push({ key: 'ai_logic.decision_play_last_card', options: { cardName: getCardName(aiHand[0]) } });
                // FIX: Changed return type from PlayCardResult to AiMove.
                return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: 0 } }, reasoning, reasonKey: 'play_last_card' };
        }
    }

    // --- AI is responding to a card ---
    const playerCard = playerTricks[currentTrick]!;
    const playerCardValue = getCardHierarchy(playerCard);
    reasoning.push({ key: 'ai_logic.responding_to_card', options: { cardName: getCardName(playerCard), value: playerCardValue } });
    
    // Full outcome analysis
    const outcomes = aiHand.map((card, index) => {
        const simTrickWinner = determineTrickWinner(playerCard, card);
        const hypotheticalTrickWinners = [...trickWinners];
        hypotheticalTrickWinners[currentTrick] = simTrickWinner;
        const simRoundWinner = determineRoundWinner(hypotheticalTrickWinners, mano);
        return { card, index, cardValue: getCardHierarchy(card), trickOutcome: simTrickWinner, roundOutcome: simRoundWinner };
    });

    const roundWinningPlays = outcomes.filter(o => o.roundOutcome === 'ai');
    if (roundWinningPlays.length > 0) {
        roundWinningPlays.sort((a, b) => a.cardValue - b.cardValue);
        const bestPlay = roundWinningPlays[0];
        reasoning.push({ key: 'ai_logic.round_analysis', options: { cardName: getCardName(bestPlay.card) } });
        reasoning.push({ key: 'ai_logic.decision_play_weakest_winner', options: { cardName: getCardName(bestPlay.card) } });
        // FIX: Changed return type from PlayCardResult to AiMove.
        return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: bestPlay.index } }, reasoning, reasonKey: 'win_round_cheap' };
    }

    if (currentTrick === 0 && aiHand.length > 1) {
        const aceInTheHole = aiHand.find(c => getCardHierarchy(c) >= 12);
        const tyingCards = aiHand.filter(c => getCardHierarchy(c) === playerCardValue);

        if (aceInTheHole && tyingCards.length > 0 && !(tyingCards.some(c => c.rank === aceInTheHole.rank && c.suit === aceInTheHole.suit)) && Math.random() < 0.80) {
            const tyingCard = tyingCards[0];
            const cardIndex = aiHand.findIndex(c => c.rank === tyingCard.rank && c.suit === tyingCard.suit);

            reasoning.push({ key: 'ai_logic.strategic_play_parda_canto' });
            reasoning.push({ key: 'ai_logic.parda_canto_reason', options: { aceInHole: getCardName(aceInTheHole), tyingCard: getCardName(tyingCard) } });
            reasoning.push({ key: 'ai_logic.decision_play_tie', options: { cardName: getCardName(tyingCard) } });
            // FIX: Changed return type from PlayCardResult to AiMove.
            return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'parda_y_canto' };
        }
    }

    const winningCards = aiHand.filter(card => getCardHierarchy(card) > playerCardValue);
    if (winningCards.length > 0) {
        winningCards.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
        const cardToPlay = winningCards[0];
        const cardIndex = aiHand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
        reasoning.push({ key: 'ai_logic.decision_play_lowest_winning', options: { cardName: getCardName(cardToPlay), value: getCardHierarchy(cardToPlay) } });
        // FIX: Changed return type from PlayCardResult to AiMove.
        return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'win_round_cheap' };
    } 
    
    const cardIndex = findCardIndexByValue(aiHand, 'min');
    reasoning.push({ key: 'ai_logic.decision_play_discard_lowest', options: { cardName: getCardName(aiHand[cardIndex]) } });
    // FIX: Changed return type from PlayCardResult to AiMove.
    return { action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex } }, reasoning, reasonKey: 'discard_low' };
}
