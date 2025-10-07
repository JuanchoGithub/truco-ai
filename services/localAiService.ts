// FIX: Updated AI service to provide reasoning along with actions, which is expected by App.tsx.
// This logic was misplaced in the original types.ts file.
import { GameState, Action, ActionType, Card, AiMove } from '../types';
import { getCardHierarchy, getCardName, getEnvidoDetails } from './trucoLogic';

interface PlayCardResult {
    index: number;
    reasoning: string[];
}

const findCardIndexByValue = (hand: Card[], type: 'min' | 'max'): number => {
    if (hand.length === 0) return -1;
    const sortedHand = [...hand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
    const cardToFind = type === 'min' ? sortedHand[0] : sortedHand[sortedHand.length - 1];
    return hand.findIndex(c => c.rank === cardToFind.rank && c.suit === cardToFind.suit);
}

const findBestCardToPlay = (state: GameState): PlayCardResult => {
    const { aiHand, playerTricks, currentTrick, trickWinners, mano } = state;
    if (aiHand.length === 0) return { index: 0, reasoning: ["No cards left to play."]};

    let reasoning: string[] = [`[Play Card Logic]`, `My hand: ${aiHand.map(getCardName).join(', ')}`];
    const playerCardOnBoard = playerTricks[currentTrick];

    // --- AI is leading the trick ---
    if (!playerCardOnBoard) {
        reasoning.push(`I am leading Trick ${currentTrick + 1}.`);
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
                    cardIndex = findCardIndexByValue(aiHand, 'min');
                    reasoning.push(`\nDecision: We tied the first trick. I'll play conservatively with my lowest card: ${getCardName(aiHand[cardIndex])}.`);
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

export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, aiHand, currentTurn, lastCaller, initialAiHand, currentTrick, playerScore, aiScore, trucoLevel, hasEnvidoBeenCalledThisRound, playerEnvidoFoldHistory } = state;
    let reasoning: string[] = [];

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push(`[Response Logic]`);
        reasoning.push(`Player called ${gamePhase.replace('_called', '').toUpperCase()}. I must respond.`);

        if (gamePhase.includes('envido')) {
            const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
            reasoning.push(aiEnvidoDetails.reasoning);
            const aiEnvido = aiEnvidoDetails.value;
            const randomFactor = Math.random();
            const aiPointsToWin = 15 - aiScore;

            // High strength hand
            if (aiEnvido >= 30) {
                // Near game end, be decisive
                if (aiPointsToWin <= 5) {
                     reasoning.push(`\nDecision: I have a monster hand (${aiEnvido}) and I'm close to winning. I'm going all in with FALTA ENVIDO.`);
                     return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: reasoning.join('\n') };
                }
                reasoning.push(`\nDecision: My envido is very high (${aiEnvido}). I will escalate with REAL ENVIDO.`);
                return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
            } 
            // Medium strength hand
            else if (aiEnvido >= 25) {
                reasoning.push(`My hand is solid (${aiEnvido}).`);
                // Unpredictable escalation
                if (randomFactor < 0.15) { // 15% chance to escalate
                     reasoning.push(`\nDecision: I feel confident. I'll apply pressure and escalate to REAL ENVIDO.`);
                     return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
                }
                reasoning.push(`\nDecision: A solid hand is worth accepting.`);
                return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
            } 
            // Weak hand
            else {
                reasoning.push(`My hand is weak (${aiEnvido}).`);
                // Bluff "hero call"
                if (randomFactor < 0.10) { // 10% chance to accept anyway
                     reasoning.push(`\nDecision: This might be a bluff from the player. I'll risk it and ACCEPT.`);
                     return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
                }
                reasoning.push(`\nDecision: It's not worth the risk. I will DECLINE.`);
                return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
            }
        }
        if (gamePhase.includes('truco')) {
            const strengthDetails = aiHand.map(card => `${getCardName(card)} (Value: ${getCardHierarchy(card)})`).join('; ');
            const handStrength = aiHand.reduce((sum, card) => sum + getCardHierarchy(card), 0);
            const avgStrength = aiHand.length > 0 ? handStrength / aiHand.length : 0;
            
            reasoning.push(`[Truco Strength Calculation]\nMy hand is: ${strengthDetails}.`);
            reasoning.push(`Total Strength: ${handStrength}. Average Strength: ${avgStrength.toFixed(2)}.`);
            
            if (trucoLevel === 1 && avgStrength > 10) {
                 reasoning.push(`\nDecision: My average strength is very high. I will escalate to RETRUCO.`);
                 return { action: { type: ActionType.CALL_RETRUCO }, reasoning: reasoning.join('\n') };
            }
            if (avgStrength > 7 || (playerScore > 12 || aiScore > 12)) {
                 reasoning.push(`\nDecision: This is a strong enough hand (or the game is ending). I will ACCEPT.`);
                 return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
            } else {
                 reasoning.push(`\nDecision: This is a weak hand. I will DECLINE.`);
                 return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
            }
        }
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        const canCallEnvido = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
        if (canCallEnvido) {
            const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
            const aiEnvido = aiEnvidoDetails.value;
            const randomFactor = Math.random();
            const playerPointsToWin = 15 - playerScore;
            const aiPointsToWin = 15 - aiScore;
            let envidoAction: AiMove | null = null;
            let reasonPrefix: string[] = [];
            
            // Opponent Modeling: Adjust bluffing based on player's history
            const recentHistory = playerEnvidoFoldHistory.slice(-5);
            const foldCount = recentHistory.filter(f => f).length;
            const playerFoldRate = recentHistory.length > 0 ? foldCount / recentHistory.length : 0.3; // Default 30%
            const baseBluffChance = 0.10; // 10% base chance
            const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.25)); // Increase bluff chance up to 40% if player folds a lot
            

            // High strength hand
            if (aiEnvido >= 30) {
                reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
                // Endgame Falta Envido
                if (aiPointsToWin <= 5 && randomFactor < 0.75) { // High chance to go for the win
                    envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: With a powerful hand (${aiEnvido}) and victory in sight, I call FALTA ENVIDO!` };
                } else {
                    envidoAction = { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: `\nDecision: With ${aiEnvido} points, I have a dominant hand. I will call REAL ENVIDO.` };
                }
            } 
            // Medium strength hand
            else if (aiEnvido >= 27) {
                reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
                // Defensive Falta Envido when player is close to winning
                if (playerPointsToWin <= 3 && aiEnvido >= 28) {
                     envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: Player is close to winning. A Falta Envido call is a low-risk defensive move with my hand (${aiEnvido}).` };
                } else {
                    envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My envido of ${aiEnvido} is strong. I will initiate with ENVIDO.` };
                }
            } 
            // Low strength hand - bluffing
            else if (aiEnvido < 22 && randomFactor < adjustedBluffChance) {
                reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
                reasonPrefix.push(`\n[Opponent Model]: Player's recent fold rate is ${(playerFoldRate * 100).toFixed(0)}%. My bluff chance is ${(adjustedBluffChance * 100).toFixed(0)}%.`);
                envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My hand is weak (${aiEnvido}), but I sense an opportunity. I will bluff and call ENVIDO.` };
            }

            if (envidoAction) {
                return { ...envidoAction, reasoning: [...reasonPrefix, envidoAction.reasoning].join('\n') };
            }
        }
        
        if (trucoLevel === 0) {
            const handStrength = aiHand.reduce((sum, card) => sum + getCardHierarchy(card), 0);
            const avgStrength = aiHand.length > 0 ? handStrength / aiHand.length : 0;
            if (currentTrick < 2 && avgStrength > 9.5) {
                 reasoning.push(`[Call Logic]`);
                 const strengthDetails = aiHand.map(card => `${getCardName(card)} (Value: ${getCardHierarchy(card)})`).join('; ');
                 reasoning.push(`[Truco Strength Calculation]\nMy hand is: ${strengthDetails}.`);
                 reasoning.push(`Total Strength: ${handStrength}. Average Strength: ${avgStrength.toFixed(2)}.`);
                 reasoning.push(`\nDecision: Since this is > 9.5, it's a very strong hand. I will CALL TRUCO.`);
                 return { action: { type: ActionType.CALL_TRUCO }, reasoning: reasoning.join('\n') };
            }
        }
    }


    // 3. Just PLAY A CARD
    const cardToPlayResult = findBestCardToPlay(state);
    reasoning.push(...cardToPlayResult.reasoning);
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: reasoning.join('\n')
    };
};