import { GoogleGenAI, Type } from "@google/genai";
// Fix: Added 'Card' to the import list to resolve 'Cannot find name' errors.
import { GameState, Action, ActionType, AiMove, MessageObject, RoundSummary, AiReasoningEntry, Player, Card } from '../types';
// Fix: Imported 'decodeCardFromCode' to resolve 'Cannot find name' error.
import { getCardName, getCardHierarchy, decodeCardFromCode } from './trucoLogic';
import i18nService from './i18nService';

let ai: GoogleGenAI;

function getAi() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
}

function getValidActionsForGemini(state: GameState): string[] {
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, aiHasFlor, hasFlorBeenCalledThisRound, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence, playerHand, isFlorEnabled } = state;

    if (currentTurn !== 'player') return []; // Gemini is always 'player'

    const validActions: string[] = [];
    const hand = playerHand;
    const hasFlor = playerHasFlor;

    if (gamePhase.includes('_called') && lastCaller !== currentTurn) {
        // --- Flor/Contraflor responses ---
        if (gamePhase === 'flor_called') {
            if (hasFlor) {
                validActions.push('CALL_CONTRAFLOR');
            } else {
                validActions.push('ACKNOWLEDGE_FLOR');
            }
        } else if (gamePhase === 'contraflor_called') {
            validActions.push('ACCEPT_CONTRAFLOR');
            validActions.push('DECLINE_CONTRAFLOR');
        } 
        // --- Envido/Truco responses ---
        else {
            validActions.push('ACCEPT');
            validActions.push('DECLINE');

            if (gamePhase === 'envido_called') {
                if (isFlorEnabled && hasFlor) {
                    validActions.push('RESPOND_TO_ENVIDO_WITH_FLOR');
                } else {
                    if (envidoPointsOnOffer === 2) validActions.push('CALL_ENVIDO');
                    if (!hasRealEnvidoBeenCalledThisSequence) validActions.push('CALL_REAL_ENVIDO');
                    validActions.push('CALL_FALTA_ENVIDO');
                }
            } else if (gamePhase === 'truco_called') {
                if (currentTrick === 0 && !hasEnvidoBeenCalledThisRound) {
                     if (isFlorEnabled && hasFlor) {
                         validActions.push('DECLARE_FLOR');
                     } else if (!(isFlorEnabled && aiHasFlor)) { // if opponent (local AI) doesn't have flor
                         validActions.push('CALL_ENVIDO');
                     }
                }
                validActions.push('CALL_RETRUCO');
            } else if (gamePhase === 'retruco_called') {
                validActions.push('CALL_VALE_CUATRO');
            }
        }
    } else {
        if (playerTricks[currentTrick] === null) {
            hand.forEach((_, index) => {
                validActions.push(`PLAY_CARD_${index}`);
            });
        }

        if (currentTrick === 0 && !hasEnvidoBeenCalledThisRound) {
            if (isFlorEnabled && hasFlor) {
                validActions.push('DECLARE_FLOR');
            } else if (!(isFlorEnabled && aiHasFlor)) {
                validActions.push('CALL_ENVIDO');
                validActions.push('CALL_REAL_ENVIDO');
                validActions.push('CALL_FALTA_ENVIDO');
            }
        }
        
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            if (trucoLevel === 0) validActions.push('CALL_TRUCO');
            else if (trucoLevel === 1 && lastCaller !== currentTurn) validActions.push('CALL_RETRUCO');
            else if (trucoLevel === 2 && lastCaller !== currentTurn) validActions.push('CALL_VALE_CUATRO');
        }
    }
    
    return validActions.length > 0 ? validActions : ["NO_OP"];
}


function parseGeminiAction(actionString: string): Action | null {
    if (actionString.startsWith('PLAY_CARD_')) {
        const cardIndex = parseInt(actionString.split('_')[2], 10);
        return { type: ActionType.PLAY_CARD, payload: { player: 'player', cardIndex } };
    }

    const actionMap: { [key: string]: ActionType } = {
        'ACCEPT': ActionType.ACCEPT,
        'DECLINE': ActionType.DECLINE,
        'CALL_ENVIDO': ActionType.CALL_ENVIDO,
        'CALL_REAL_ENVIDO': ActionType.CALL_REAL_ENVIDO,
        'CALL_FALTA_ENVIDO': ActionType.CALL_FALTA_ENVIDO,
        'DECLARE_FLOR': ActionType.DECLARE_FLOR,
        'CALL_TRUCO': ActionType.CALL_TRUCO,
        'CALL_RETRUCO': ActionType.CALL_RETRUCO,
        'CALL_VALE_CUATRO': ActionType.CALL_VALE_CUATRO,
        'RESPOND_TO_ENVIDO_WITH_FLOR': ActionType.RESPOND_TO_ENVIDO_WITH_FLOR,
        'ACKNOWLEDGE_FLOR': ActionType.ACKNOWLEDGE_FLOR,
        'CALL_CONTRAFLOR': ActionType.CALL_CONTRAFLOR,
        'ACCEPT_CONTRAFLOR': ActionType.ACCEPT_CONTRAFLOR,
        'DECLINE_CONTRAFLOR': ActionType.DECLINE_CONTRAFLOR,
    };

    const actionType = actionMap[actionString];
    
    if (actionType) {
        const actionToPhraseKey: { [key: string]: string } = {
            'ACCEPT': 'quiero',
            'DECLINE': 'no_quiero',
            'CALL_ENVIDO': 'envido',
            'CALL_REAL_ENVIDO': 'real_envido',
            'CALL_FALTA_ENVIDO': 'falta_envido',
            'DECLARE_FLOR': 'flor',
            'CALL_TRUCO': 'truco',
            'CALL_RETRUCO': 'retruco',
            'CALL_VALE_CUATRO': 'vale_cuatro',
            'RESPOND_TO_ENVIDO_WITH_FLOR': 'flor',
            'ACKNOWLEDGE_FLOR': 'flor_ack_good',
            'CALL_CONTRAFLOR': 'contraflor',
            'ACCEPT_CONTRAFLOR': 'contraflor_quiero',
            'DECLINE_CONTRAFLOR': 'contraflor_no_quiero',
        };

        const phraseKey = actionToPhraseKey[actionString];
        const blurbText = phraseKey ? i18nService.t(`phrases.${phraseKey}`) : '';
        
        return { type: actionType, payload: { blurbText } } as Action;
    }
    return null;
}

function formatStateForGemini(state: GameState, validActions: string[]): string {
    const { t } = i18nService;
    const opponentName = t('common.ai');
    const yourName = t('common.gemini');

    const formatHand = (hand: Card[]) => hand.map(getCardName).join(', ');
    const formatTricks = (tricks: (Card | null)[]) => tricks.map(c => c ? getCardName(c) : '_').join(' | ');

    return `
## Game State
- Round: ${state.round}
- Your Score (${yourName}): ${state.playerScore}
- Opponent Score (${opponentName}): ${state.aiScore}
- Hand (Mano): ${state.mano === 'player' ? yourName : opponentName}
- Current Turn: ${state.currentTurn === 'player' ? yourName : opponentName}
- Game Phase: ${state.gamePhase}
- Your Hand: [${formatHand(state.playerHand)}]
- Truco Level: ${state.trucoLevel} (0=none, 1=Truco, 2=Retruco, 3=Vale Cuatro)
- Envido Status: ${state.hasEnvidoBeenCalledThisRound ? `Called (Pot: ${state.envidoPointsOnOffer})` : 'Not Called'}
- Flor Status: ${state.hasFlorBeenCalledThisRound ? 'Called' : 'Not Called'}

## Board
- Your Tricks: [${formatTricks(state.playerTricks)}]
- Opponent's Tricks: [${formatTricks(state.aiTricks)}]
- Trick Winners: [${state.trickWinners.join(', ')}]

## How to Calculate Envido
- If you have two cards of the same suit, your points are 20 plus the sum of their values. (Face cards: 10, 11, 12 are worth 0 points for this).
- If all cards are different suits, your points are the value of your highest non-face card.
- Example 1: [6 of Coins, 4 of Coins, 2 of Clubs] -> 20 + 6 + 4 = 30 points.
- Example 2: [7 of Swords, 3 of Clubs, 1 of Cups] -> 7 points.

## Valid Actions
You must choose one of the following actions:
- ${validActions.join('\n- ')}
`.trim();
}

export const getGeminiMove = async (state: GameState): Promise<{ move: AiMove, prompt: string, rawResponse: string }> => {
    const MAX_RETRIES = 3;
    const gemini = getAi();
    const validActions = getValidActionsForGemini(state);
    const context = formatStateForGemini(state, validActions);
    const lang = i18nService.getCurrentLanguage() === 'es-AR' ? 'Argentinian Spanish' : 'English';

    let lastError: unknown = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        let prompt = '';
        try {
            prompt = `
You are an expert Argentinian Truco player named 'Gemini'. Your opponent is a computer AI.
Analyze the provided game state and choose the best possible action from the valid actions list.
Provide a very brief, one-sentence justification for your choice, in ${lang}.
${i > 0 ? `\n**IMPORTANT: Your previous response was invalid. You MUST choose one of the exact strings from the 'Valid Actions' list.**\n` : ''}
**Card Hierarchy (Strongest to Weakest):**
1. Ace of Swords
2. Ace of Clubs
3. 7 of Swords
4. 7 of Coins
5. Threes, Twos, False Aces (Coins/Cups), Kings, Knights, Jacks, False Sevens (Clubs/Cups), Sixes, Fives, Fours.

${context}
`.trim();

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    reasoning: {
                        type: Type.STRING,
                        description: `A very brief, one-sentence justification for the chosen action, in ${lang}.`
                    },
                    action: {
                        type: Type.STRING,
                        description: `The chosen action from the valid actions list.`
                    }
                }
            };

            const response = await gemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema,
                    maxOutputTokens: 512,
                    thinkingConfig: { thinkingBudget: 128 },
                }
            });
            
            let jsonString = response.text.trim();
            
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.substring(7);
                if (jsonString.endsWith('```')) {
                    jsonString = jsonString.slice(0, -3);
                }
                jsonString = jsonString.trim();
            }

            const result = JSON.parse(jsonString);

            // **VALIDATION STEP**
            if (!validActions.includes(result.action)) {
                throw new Error(`Invalid action chosen: '${result.action}'. It is not in the list of valid actions: [${validActions.join(', ')}]`);
            }

            const parsedAction = parseGeminiAction(result.action);
            if (!parsedAction) {
                // This should be caught by the check above, but as a fallback.
                throw new Error(`Could not parse the valid action: ${result.action}`);
            }

            return {
                move: {
                    action: parsedAction,
                    reasoning: [result.reasoning],
                },
                prompt,
                rawResponse: jsonString
            };
        } catch (error) {
            console.error(`Gemini move attempt ${i + 1} failed:`, error);
            lastError = error;
        }
    }

    // If all retries fail
    throw new Error(`Gemini failed to provide a valid move after ${MAX_RETRIES} attempts. Last error: ${lastError}`);
};

export const getGeminiRoundAnalysis = async (roundSummary: RoundSummary, aiLog: AiReasoningEntry[], gameLog: string[]): Promise<{ analysis: string, prompt: string }> => {
    const gemini = getAi();
    const lang = i18nService.getCurrentLanguage() === 'es-AR' ? 'Argentinian Spanish' : 'English';
    const prompt = `
You are an expert AI developer specializing in game theory and agent-based systems. Analyze a single round played by a student AI (the 'Local AI') against you ('Gemini') and provide technical feedback for its developer in ${lang}.

**ROUND SUMMARY:**
- Round Number: ${roundSummary.round}
- Mano (Started): ${roundSummary.mano}
- Round Winner: ${roundSummary.roundWinner}
- Points Awarded: Player ${roundSummary.pointsAwarded.player}, AI ${roundSummary.pointsAwarded.ai}
- Initial Hands:
  - Local AI: [${roundSummary.aiInitialHand.map(decodeCardFromCode).map(getCardName).join(', ')}]
  - Gemini (Opponent): [${roundSummary.playerInitialHand.map(decodeCardFromCode).map(getCardName).join(', ')}]
- Game Log:
${gameLog.join('\n')}

**LOCAL AI'S THOUGHT PROCESS (LOG):**
${aiLog.map(log => `--- Turn ---\n${log.reasoning.map(r => typeof r === 'string' ? r : i18nService.t(r.key, r.options)).join('\n')}`).join('\n\n')}

**YOUR TASK:**
From an AI developer's perspective, analyze the Local AI's reasoning log.
- Did its heuristic calculations ('Game Pressure', 'Strength Evaluation', 'Equity') lead to the correct decision?
- Identify any potential bugs, flawed logic, or suboptimal parameter tuning in its decision-making process.
- Suggest specific improvements to the AI's code or model. For example, "The AI folded with a high 'equity'. This might indicate the folding threshold is too high in its \`getTrucoResponse\` function." or "The AI's 'heuristic strength' calculation seems to undervalue having two high-ranking cards. Consider increasing the weight for the second-best card in \`calculateTrucoStrength\`."
- Be concise and provide actionable, technical feedback in Markdown format. Your entire response must be in ${lang}.
`.trim();

    const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return { analysis: response.text, prompt };
};

export const getGeminiMatchAnalysis = async (roundHistory: RoundSummary[], aiLogs: AiReasoningEntry[], gameLog: string[], winner: Player): Promise<{ analysis: string, prompt: string }> => {
    const gemini = getAi();
    const lang = i18nService.getCurrentLanguage() === 'es-AR' ? 'Argentinian Spanish' : 'English';
    const prompt = `
You are an expert AI developer specializing in game theory and agent-based systems. Analyze a full match played by a student AI (the 'Local AI') and provide high-level technical feedback for its developer in ${lang}.

**MATCH SUMMARY:**
- Match Winner: ${winner}
- Final Score: AI ${roundHistory.reduce((sum, r) => sum + r.pointsAwarded.ai, 0)} - Gemini ${roundHistory.reduce((sum, r) => sum + r.pointsAwarded.player, 0)}
- Total Rounds: ${roundHistory.length}

**LOCAL AI'S THOUGHT PROCESS (FULL LOG):**
${aiLogs.map(log => `--- ROUND ${log.round} ---\n${log.reasoning.map(r => typeof r === 'string' ? r : i18nService.t(r.key, r.options)).join('\n')}`).join('\n\n')}

**YOUR TASK:**
From an AI developer's perspective, analyze the Local AI's decision patterns across the entire match.
- Identify recurring flaws in its logic. For example, "Across several rounds, the AI seems to consistently overvalue its 'mano' bonus, leading to poor Envido calls from a position of weakness."
- Did its 'Game Pressure' model behave as expected? Did it become appropriately more aggressive or cautious?
- Point out potential systemic issues in its opponent modeling or simulation strategies. For example, "The AI's bluffing frequency didn't seem to adapt to my high call rate, suggesting its opponent model for 'trucoFoldRate' is not being updated or weighted correctly."
- Suggest 2-3 key areas for algorithmic improvement (e.g., "Refine the 'gamePressure' calculation to be more exponential in the endgame," or "The simulation logic for opponent hands seems to be generating overly optimistic scenarios; consider adding more weight to stronger opponent hands.").
- Be concise and provide actionable, technical feedback in Markdown format. Your entire response must be in ${lang}.
`.trim();

    const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return { analysis: response.text, prompt };
};