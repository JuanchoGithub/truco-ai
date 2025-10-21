import React, { useState, useReducer, useEffect, useRef, useCallback } from 'react';
import { useGameReducer, initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { getGeminiMove, getGeminiRoundAnalysis, getGeminiMatchAnalysis } from '../services/geminiAiService';
import { GameState, ActionType, Card as CardType, Action, AiMove, MessageObject, RoundSummary, AiReasoningEntry, Player } from '../types';
import CardComponent from './Card';
import { getCardName } from '../services/trucoLogic';
import { useLocalization } from '../context/LocalizationContext';

const HandDisplay: React.FC<{ cards: CardType[], title: string, isVisible: boolean }> = ({ cards, title, isVisible }) => (
    <div>
        <h3 className="text-lg font-bold text-yellow-200 mb-2">{title}</h3>
        <div className="flex justify-center min-h-[124px] items-center gap-2">
            {cards.map((card, index) => (
                <CardComponent key={index} card={card} size="small" isFaceDown={!isVisible} />
            ))}
        </div>
    </div>
);

type LogEntry = {
    type: 'info' | 'event' | 'prompt' | 'response' | 'analysis_prompt' | 'analysis_response';
    content: string;
};

// Helper to describe an action, now with customizable player names
const getActionDescription = (action: Action, state: Partial<GameState>, t: (key: string, options?: any) => string, playerNames: {ai: string, opponent: string}): string => {
    const actor = (action as any)?.payload?.player || state.currentTurn;
    const playerName = actor === 'ai' ? playerNames.ai : playerNames.opponent;

    switch (action.type) {
        case ActionType.PLAY_CARD:
            const hand = actor === 'ai' ? state.aiHand : state.playerHand;
            if (!hand) return t('simulation_actions.play_card_no_hand_data', { playerName });
            const card = hand[(action.payload as any).cardIndex];
            return t('simulation_actions.play_card', { playerName, cardName: card ? getCardName(card) : 'a card' });
        case ActionType.CALL_ENVIDO: return t('simulation_actions.call_envido', { playerName });
        case ActionType.CALL_REAL_ENVIDO: return t('simulation_actions.call_real_envido', { playerName });
        case ActionType.CALL_FALTA_ENVIDO: return t('simulation_actions.call_falta_envido', { playerName });
        case ActionType.DECLARE_FLOR: return t('simulation_actions.declare_flor', { playerName });
        case ActionType.CALL_TRUCO: return t('simulation_actions.call_truco', { playerName });
        case ActionType.CALL_RETRUCO: return t('simulation_actions.call_retruco', { playerName });
        case ActionType.CALL_VALE_CUATRO: return t('simulation_actions.call_vale_cuatro', { playerName });
        case ActionType.ACCEPT: return t('simulation_actions.accept', { playerName });
        case ActionType.DECLINE: return t('simulation_actions.decline', { playerName });
        case ActionType.RESPOND_TO_ENVIDO_WITH_FLOR: return t('simulation_actions.declare_flor', { playerName });
        case ActionType.ACKNOWLEDGE_FLOR: return t('simulation_actions.accept', { playerName });
        case ActionType.CALL_CONTRAFLOR: return t('simulation_actions.call_contraflor', {playerName});
        case ActionType.ACCEPT_CONTRAFLOR: return t('simulation_actions.accept_contraflor', {playerName});
        case ActionType.DECLINE_CONTRAFLOR: return t('simulation_actions.decline_contraflor', {playerName});
        default: return t('simulation_actions.default', { playerName, actionType: action.type });
    }
}


const GeminiSimulator: React.FC = () => {
    const { t } = useLocalization();
    const simInitialState = { ...initialState, messageLog: [] };
    const [state, dispatch] = useReducer(useGameReducer, simInitialState);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simMode, setSimMode] = useState<'round' | 'match'>('round');
    const [eventLog, setEventLog] = useState<LogEntry[]>([]);
    const [geminiThoughts, setGeminiThoughts] = useState<string>('');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<'gemini_move' | 'analysis' | null>(null);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const eventLogRef = useRef<HTMLDivElement>(null);
    const cancelSimRef = useRef(false);
    const [isQuotaPaused, setIsQuotaPaused] = useState(false);
    const [showRetryButton, setShowRetryButton] = useState(false);
    const hasAutoRetried = useRef(false);

    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [eventLog]);

    const addToLog = useCallback((content: string, type: LogEntry['type'] = 'event') => {
        setEventLog(prev => [...prev, { type, content }]);
    }, []);

    const handleStart = (mode: 'round' | 'match') => {
        cancelSimRef.current = false;
        setShowRetryButton(false);
        setIsQuotaPaused(false);
        hasAutoRetried.current = false;
        setSimMode(mode);
        setIsSimulating(true);
        setEventLog([{ type: 'info', content: t('simulation.log_new_simulation') }]);
        setAnalysis('');
        setGeminiThoughts('');
        dispatch({ type: ActionType.RESTART_GAME });
    };

    const handleStop = () => {
        cancelSimRef.current = true;
        setIsSimulating(false);
        setIsLoading(null);
    };

    const handleGetAnalysis = async () => {
        setIsLoading('analysis');
        try {
            let result: { analysis: string, prompt: string };
            if (simMode === 'round') {
                const roundSummary = state.roundHistory.find(r => r.round === state.round);
                const aiLog = state.aiReasoningLog.filter(l => l.round === state.round);
                if (!roundSummary) throw new Error("Round summary not found");
                result = await getGeminiRoundAnalysis(roundSummary, aiLog, eventLog.map(e => e.content));
            } else { // match
                result = await getGeminiMatchAnalysis(state.roundHistory, state.aiReasoningLog, eventLog.map(e => e.content), state.winner!);
            }
            setAnalysis(result.analysis);
            addToLog(result.prompt, 'analysis_prompt');
            addToLog(result.analysis, 'analysis_response');
        } catch (error) {
            console.error(error);
            setAnalysis(t('simulation.gemini.error_gemini_analysis'));
        } finally {
            setIsLoading(null);
        }
    };

    const handleTurn = useCallback(async () => {
        if (!isSimulating || !state.currentTurn || state.gamePhase.includes('ACCEPT') || state.gamePhase.includes('DECLINE') || cancelSimRef.current) return;
    
        let move: AiMove;
        const playerNames = { ai: t('common.ai'), opponent: t('common.gemini') };
    
        if (state.currentTurn === 'ai') { // Local AI
            move = getLocalAIMove(state);
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: move.reasoning } });
        } else { // Gemini AI
            setIsLoading('gemini_move');
            try {
                const geminiResult = await getGeminiMove(state);
                move = geminiResult.move;
                setGeminiThoughts(geminiResult.rawResponse);
                addToLog(geminiResult.prompt, 'prompt');
                addToLog(geminiResult.rawResponse, 'response');
                // Reset retry state on success
                hasAutoRetried.current = false;
                setShowRetryButton(false);
            } catch (error) {
                const errorMessage = (error as Error).message || '';
                console.error("Error getting Gemini move:", error);

                setIsLoading(null);

                if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
                    if (!hasAutoRetried.current) {
                        hasAutoRetried.current = true;
                        addToLog(t('simulation.gemini.error_quota_retry'), 'info');
                        setIsQuotaPaused(true);
                        setTimeout(() => {
                            if (!cancelSimRef.current) {
                                setIsQuotaPaused(false); // This will re-trigger the game loop
                            }
                        }, 30000);
                    } else {
                        addToLog(t('simulation.gemini.error_quota_manual'), 'info');
                        setShowRetryButton(true);
                    }
                } else {
                    addToLog(t('simulation.gemini.error_gemini_move'), 'info');
                    dispatch({ type: 'NO_OP' as any }); // Skip turn for other errors
                }
                return;
            }
            setIsLoading(null);
        }
    
        const actionDesc = getActionDescription(move.action, state, t, playerNames);
        addToLog(actionDesc);
        dispatch(move.action);
    }, [isSimulating, state, addToLog, t]);

    const handleManualRetry = () => {
        setShowRetryButton(false);
        hasAutoRetried.current = false; // Reset the auto-retry flag
        // The useEffect will pick up the change and re-trigger handleTurn
    };

    // Auto-resolve intermediate game phases
    useEffect(() => {
        if (!isSimulating) return;

        let resolutionAction: Action | null = null;
        switch (state.gamePhase) {
            case 'ENVIDO_ACCEPTED': resolutionAction = { type: ActionType.RESOLVE_ENVIDO_ACCEPT }; break;
            case 'ENVIDO_DECLINED': resolutionAction = { type: ActionType.RESOLVE_ENVIDO_DECLINE }; break;
            case 'TRUCO_DECLINED': resolutionAction = { type: ActionType.RESOLVE_TRUCO_DECLINE }; break;
            case 'FLOR_SHOWDOWN': resolutionAction = { type: ActionType.RESOLVE_FLOR_SHOWDOWN }; break;
            case 'CONTRAFLOR_DECLINED': resolutionAction = { type: ActionType.RESOLVE_CONTRAFLOR_DECLINE }; break;
        }

        if (resolutionAction) {
            const timeoutId = setTimeout(() => {
                if (cancelSimRef.current) return;
                addToLog(t('simulation.log_resolving', { phase: state.gamePhase }), 'info');
                dispatch(resolutionAction!);
            }, 300); // short delay for resolution
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, isSimulating, addToLog, t]);

    // Game Loop
    useEffect(() => {
        if (!isSimulating || state.winner || cancelSimRef.current || isQuotaPaused || showRetryButton || isLoading) {
            return;
        }
        
        const isResolving = state.gamePhase.includes('ACCEPT') || state.gamePhase.includes('DECLINE');
        if (isResolving) return;

        const timeoutId = setTimeout(handleTurn, 500);
        return () => {
            clearTimeout(timeoutId);
        };
    }, [isSimulating, state, isQuotaPaused, showRetryButton, isLoading, handleTurn]);
    
    // Handle game over
    useEffect(() => {
        if (isSimulating && state.winner) {
            const winnerLog = state.winner === 'ai' 
                ? t('simulation.log_game_winner_ai') 
                : t('simulation.gemini.log_game_winner_gemini');
            addToLog(winnerLog, 'info');
            setIsSimulating(false); // Unlock the UI
        }
    }, [isSimulating, state.winner, addToLog, t]);
    
    // Auto-proceed after round ends (but not game over)
    useEffect(() => {
        if (isSimulating && state.gamePhase === 'round_end' && !state.winner) {
            addToLog(t('simulation.log_round_end', { round: state.round }), 'info');
            addToLog(t('simulation.log_round_end_winner', { winner: state.lastRoundWinner?.toUpperCase() }), 'info');
            addToLog(t('simulation.log_round_end_score', { aiScore: state.aiScore, playerScore: state.playerScore }), 'info');

            if (simMode === 'round') {
                setIsSimulating(false);
            } else { // simMode === 'match'
                 setTimeout(() => {
                    if (cancelSimRef.current) return;
                    dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND });
                 }, 1500);
            }
        }
    }, [isSimulating, simMode, state.gamePhase, state.winner, state.round, state.lastRoundWinner, state.aiScore, state.playerScore, addToLog, t]);
    
    const LogModal = () => (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-stone-800/95 border-4 border-amber-700/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b-2 border-amber-700/30 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-amber-300">{t('simulation.manual.log_title')}</h3>
                    <button onClick={() => setIsLogModalOpen(false)} className="text-amber-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-4 flex-grow overflow-y-auto font-mono text-sm space-y-2">
                    {eventLog.map((entry, index) => {
                        let style = 'text-cyan-100';
                        let prefix = '> ';
                        if (entry.type === 'info') { style = 'text-yellow-400 font-bold mt-2 pt-2 border-t border-yellow-400/20'; prefix = ''; }
                        else if (entry.type === 'prompt') { style = 'text-purple-300'; prefix = '[MOVE PROMPT SENT TO GEMINI]\n---\n'; }
                        else if (entry.type === 'response') { style = 'text-green-300'; prefix = '[RAW MOVE RESPONSE FROM GEMINI]\n---\n'; }
                        else if (entry.type === 'analysis_prompt') { style = 'text-indigo-300'; prefix = '[ANALYSIS PROMPT SENT TO GEMINI]\n---\n'; }
                        else if (entry.type === 'analysis_response') { style = 'text-teal-300'; prefix = '[ANALYSIS RESPONSE FROM GEMINI]\n---\n'; }
                        return <pre key={index} className={`whitespace-pre-wrap ${style}`}>{prefix}{entry.content}</pre>
                    })}
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="w-full h-full flex flex-col gap-4 text-white overflow-y-auto">
            {isLogModalOpen && <LogModal />}
            <div className="flex-shrink-0 bg-black/30 p-4 rounded-lg border border-cyan-700/50 space-y-3">
                <h2 className="text-xl font-bold text-cyan-200">{t('simulation.gemini.title')}</h2>
                <p className="text-sm text-gray-300 max-w-3xl">{t('simulation.gemini.description')}</p>
                <div className="flex items-center gap-4">
                    {!isSimulating ? (
                        <>
                            <button onClick={() => handleStart('round')} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 transition-colors">{t('simulation.gemini.start_round_sim')}</button>
                            <button onClick={() => handleStart('match')} className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 transition-colors">{t('simulation.gemini.start_match_sim')}</button>
                        </>
                    ) : (
                        <button onClick={handleStop} className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 border-b-4 border-red-800 hover:bg-red-500 transition-colors">{t('simulation.gemini.stop_sim')}</button>
                    )}
                    {showRetryButton && (
                        <button onClick={handleManualRetry} className="px-4 py-2 rounded-lg font-bold text-white bg-yellow-600 border-b-4 border-yellow-800 hover:bg-yellow-500 transition-colors animate-pulse">
                            {t('simulation.gemini.retry_button')}
                        </button>
                    )}
                     <button onClick={() => setIsLogModalOpen(true)} className="px-4 py-2 rounded-lg font-bold text-white bg-gray-600 border-b-4 border-gray-800 hover:bg-gray-500 transition-colors">{t('simulation.manual.view_log')}</button>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                {/* Left Panel: Game State */}
                <div className="flex flex-col gap-4">
                    <div className="bg-black/30 p-3 rounded-md">
                        <h2 className="text-xl font-bold text-cyan-200 mb-2">{t('simulation.scoreboard_title')}</h2>
                        <p>{t('common.ai')}: <span className="font-mono text-lg">{state.aiScore}</span></p>
                        <p>{t('common.gemini')}: <span className="font-mono text-lg">{state.playerScore}</span></p>
                    </div>
                     <div className="bg-black/30 p-3 rounded-md">
                        <HandDisplay cards={state.initialAiHand} title={t('simulation.gemini.local_ai_hand')} isVisible={true} />
                        <hr className="my-4 border-cyan-700/50"/>
                        <HandDisplay cards={state.initialPlayerHand} title={t('simulation.gemini.gemini_hand')} isVisible={isSimulating} />
                    </div>
                </div>

                {/* Middle Panel: Log & Gemini Thoughts */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    <div ref={eventLogRef} className="flex-grow bg-black/50 p-4 rounded-md overflow-y-auto font-mono text-sm border border-cyan-700/50">
                        <h3 className="text-lg font-bold text-cyan-200 mb-2 sticky top-0 bg-black/50 backdrop-blur-sm">{t('simulation.gemini.game_log')}</h3>
                        {eventLog.filter(e => e.type === 'event' || e.type === 'info').map((log, index) => (
                            <p key={index} className={`whitespace-pre-wrap ${log.type === 'info' ? 'text-yellow-300 my-2 font-bold' : 'text-cyan-100'}`}>
                                {log.content}
                            </p>
                        ))}
                    </div>
                     <div className="flex-shrink-0 h-48 bg-black/50 p-4 rounded-md overflow-y-auto font-mono text-sm border border-purple-700/50">
                        <h3 className="text-lg font-bold text-purple-200 mb-2 sticky top-0 bg-black/50 backdrop-blur-sm">{t('simulation.gemini.gemini_thoughts')}</h3>
                        {isLoading === 'gemini_move' ? <p className="animate-pulse">{t('simulation.gemini.waiting_for_gemini')}</p> : <pre className="whitespace-pre-wrap text-purple-100">{geminiThoughts}</pre>}
                    </div>
                </div>

                {/* Right Panel: Analysis */}
                <div className="bg-black/50 p-4 rounded-md overflow-y-auto border border-green-700/50 flex flex-col">
                    <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <h3 className="text-lg font-bold text-green-200">{t('simulation.gemini.gemini_analysis')}</h3>
                        {((!isSimulating && simMode === 'round' && (state.gamePhase === 'round_end' || state.winner)) || (!isSimulating && state.winner)) && !analysis && (
                            <button onClick={handleGetAnalysis} disabled={isLoading === 'analysis'} className="px-3 py-1 text-sm rounded-lg font-bold text-white bg-green-600 border-b-2 border-green-800 hover:bg-green-500 disabled:bg-gray-500">{t('simulation.gemini.get_analysis')}</button>
                        )}
                    </div>
                    <div className="flex-grow overflow-y-auto prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-headings:text-green-300 prose-strong:text-white prose-pre:bg-black/30">
                        {isLoading === 'analysis' ? <p className="animate-pulse">{t('simulation.gemini.analyzing')}</p> : (analysis ? <pre className="whitespace-pre-wrap">{analysis}</pre> : <p className="text-gray-400">{t('simulation.gemini.analysis_prompt')}</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiSimulator;