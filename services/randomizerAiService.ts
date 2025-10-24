import { GameState, AiMove, Action, ActionType, Card } from '../types';

// Fix: The original function incorrectly added a `payload` object to every action,
// which is invalid for actions that do not have a payload property according to the `Action` union type.
// This version conditionally creates the action object with or without a payload, and uses a type assertion
// as TypeScript cannot verify the payload's shape against the specific action type within this generic function.
function createMove(type: ActionType, payload?: any): AiMove {
    return {
        action: (payload !== undefined ? { type, payload } : { type }) as Action,
        reasoning: [{ key: 'ai_logic.randomizer_logic.chose', options: { type } }]
    };
}

export const getRandomizerMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, hasFlorBeenCalledThisRound, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence, playerHand } = state;

    const validActions: AiMove[] = [];

    // --- 1. Response Phase ---
    if (gamePhase.includes('_called') && currentTurn === 'player' && lastCaller === 'ai') {
        validActions.push(createMove(ActionType.ACCEPT));
        validActions.push(createMove(ActionType.DECLINE));

        if (gamePhase === 'envido_called') {
            if (state.isFlorEnabled && playerHasFlor) {
                validActions.push(createMove(ActionType.RESPOND_TO_ENVIDO_WITH_FLOR));
            } else {
                if (envidoPointsOnOffer === 2) {
                    validActions.push(createMove(ActionType.CALL_ENVIDO));
                }
                if (!hasRealEnvidoBeenCalledThisSequence) {
                    validActions.push(createMove(ActionType.CALL_REAL_ENVIDO));
                }
                validActions.push(createMove(ActionType.CALL_FALTA_ENVIDO));
            }
        }

        if (gamePhase === 'truco_called') {
            const canCallEnvidoPrimero = currentTrick === 0 && !playerTricks[0] && !aiTricks[0] && !hasEnvidoBeenCalledThisRound;
            if (state.isFlorEnabled && playerHasFlor) {
                validActions.push(createMove(ActionType.DECLARE_FLOR));
            } else if (canCallEnvidoPrimero) {
                validActions.push(createMove(ActionType.CALL_ENVIDO));
            }
            validActions.push(createMove(ActionType.CALL_RETRUCO));
        }

        if (gamePhase === 'retruco_called') {
            validActions.push(createMove(ActionType.CALL_VALE_CUATRO));
        }
        
        if (gamePhase === 'flor_called') {
             if (playerHasFlor) {
                validActions.push(createMove(ActionType.CALL_CONTRAFLOR));
             } else {
                validActions.push(createMove(ActionType.ACKNOWLEDGE_FLOR));
             }
        }

        if (gamePhase === 'contraflor_called') {
            validActions.push(createMove(ActionType.ACCEPT_CONTRAFLOR));
            validActions.push(createMove(ActionType.DECLINE_CONTRAFLOR));
        }

    } else if (currentTurn === 'player') { // --- 2. Action Phase ---
        // Play card is always an option if it's your turn to play a card
        if (playerTricks[currentTrick] === null) {
            playerHand.forEach((_, index) => {
                validActions.push(createMove(ActionType.PLAY_CARD, { player: 'player', cardIndex: index }));
            });
        }

        // Calling options
        const canSing = currentTrick === 0 && !playerTricks[0] && !aiTricks[0];
        if (canSing) {
            if (state.isFlorEnabled && playerHasFlor) {
                validActions.push(createMove(ActionType.DECLARE_FLOR));
            } else if (!hasEnvidoBeenCalledThisRound && !hasFlorBeenCalledThisRound) {
                validActions.push(createMove(ActionType.CALL_ENVIDO));
                validActions.push(createMove(ActionType.CALL_REAL_ENVIDO));
                validActions.push(createMove(ActionType.CALL_FALTA_ENVIDO));
            }
        }
        
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            if (trucoLevel === 0) {
                validActions.push(createMove(ActionType.CALL_TRUCO));
            } else if (trucoLevel === 1 && lastCaller === 'ai') {
                validActions.push(createMove(ActionType.CALL_RETRUCO));
            } else if (trucoLevel === 2 && lastCaller === 'ai') {
                validActions.push(createMove(ActionType.CALL_VALE_CUATRO));
            }
        }
    }

    if (validActions.length === 0) {
        if (playerHand.length > 0 && playerTricks[currentTrick] === null) {
            return createMove(ActionType.PLAY_CARD, { player: 'player', cardIndex: 0 });
        }
        // This can happen if the AI is waiting for a response to an action, which is a valid state.
        // Returning a "NO_OP" ensures the simulation doesn't crash if it tries to get a move.
        // Fix: Changed reasoning from a string to an array of strings.
        return { action: { type: "NO_OP" as any }, reasoning: [{ key: 'ai_logic.randomizer_logic.no_op' }] };
    }

    const randomIndex = Math.floor(Math.random() * validActions.length);
    return validActions[randomIndex];
};