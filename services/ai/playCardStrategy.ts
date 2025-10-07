import { GameState, Card } from '../../types';
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

export const findBestCardToPlay = (state: GameState): PlayCardResult => {
    const { aiHand, playerTricks, currentTrick, trickWinners, mano, hasEnvidoBeenCalledThisRound, initialAiHand } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: ["No cards left to play."]};

    let reasoning: string[] = [`[Play Card Logic]`, `My hand: ${aiHand.map(getCardName).join(', ')}`];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(`I am leading Trick ${currentTrick + 1}.`);

        // Advanced Deceptive Play
        if (currentTrick === 0 && mano === 'ai' && hasEnvidoBeenCalledThisRound) {
            const myEnvido = getEnvidoValue(initialAiHand);
            if (myEnvido >= 28 && Math.random() < 0.5) { // 50% chance for deception
                const cardIndex = findCardIndexByValue(aiHand, 'min');
                reasoning.push(`[Deceptive Play]: I won the Envido showdown, so the player knows I have high cards. I will play my *lowest* card to feign weakness and bait them into a Truco call.`);
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