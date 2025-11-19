
import React, { useState, useReducer, useEffect, useRef, useCallback } from 'react';
import { useGameReducer, initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { getGeminiMove, getGeminiRoundAnalysis, getGeminiMatchAnalysis } from '../services/geminiAiService';
import { GameState, ActionType, Card as CardType, Action, AiMove, MessageObject, RoundSummary, AiReasoningEntry, Player } from '../types';
import CardComponent from './Card';
import { getCardName } from '../services/trucoLogic';
import { useLocalization } from '../context/LocalizationContext';

// Reuse mini components from Simulation via copy (or common component extraction in future refactor)
const MiniCard: React.FC<{ card: CardType | null; isVisible?: boolean }> = ({ card, isVisible = true }) => (
    <div className="w-12 h-[78px] lg:w-16 lg:h-[104px] rounded border border-stone-600 bg-stone-800 shadow-lg flex items-center justify-center relative select-none">
        {card ? (
             <CardComponent card={card} size="small" className="!w-full !h-full" isFaceDown={!isVisible} />
        ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <div className="w-4 h-6 border-2 border-dashed border-white/10 rounded-sm"></div>
            </div>
        )}
    </div>
);

const CompactHandDisplay: React.FC<{ cards: (CardType | null)[]; title: string; isVisible?: boolean; labelSide?: 'top' | 'bottom' }> = ({ cards, title, isVisible = true, labelSide = 'top' }) => (
    <div className="flex flex-col items-center gap-1">
        {labelSide === 'top' && <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{title}</span>}
        <div className="flex gap-2">
            {cards.map((card, i) => (
                <MiniCard key={i} card={card} isVisible={isVisible} />
            ))}
        </div>
        {labelSide === 'bottom' && <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{title}</span>}
    </div>
);

const SimHeaderHUD: React.FC<{ state: GameState }> = ({ state }) => {
    const { t } = useLocalization();
    return (
        <div className="bg-black/60 backdrop-blur-sm border-b border-white/10 p-2 flex justify-between items-center text-xs lg:text-sm font-mono shadow-md">
             <div className="flex items-center gap-4">
                <div className="flex flex-col leading-none">
                    <span className="text-stone-500 uppercase text-[10px]">{t('simulation.round')}</span>
                    <span className="text-amber-400 font-bold">{state.round}</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex flex-col leading-none">
                    <span className="text-stone-500 uppercase text-[10px]">{t('simulation.phase')}</span>
                    <span className="text-stone-300">{state.gamePhase}</span>
                </div>
                 <div className="w-px h-6 bg-white/10"></div>
                <div className="flex flex-col leading-none">
                    <span className="text-stone-500 uppercase text-[10px]">{t('simulation.turn')}</span>
                    <span className={`font-bold ${state.currentTurn === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                        {state.currentTurn === 'player' ? 'GEMINI' : 'LOCAL AI'}
                    </span>
                </div>
             </div>
             
             <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                     <div className="text-right">
                         <div className="text-stone-500 text-[10px] uppercase">{t('common.ai')}</div>
                         <div className="text-red-400 font-bold text-lg leading-none">{state.aiScore}</div>
                     </div>
                     <div className="text-stone-600 font-bold">vs</div>
                     <div>
                         <div className="text-stone-500 text-[10px] uppercase">{t('common.gemini')}</div>
                         <div className="text-green-400 font-bold text-lg leading-none">{state.playerScore}</div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

type LogEntry = {
    type: 'info' | 'event' | 'prompt' | 'response' | 'analysis_prompt' | 'analysis_response';
    content: string;
};

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
                
                const confidencePercent = geminiResult.confidence ? Math.round(geminiResult.confidence * 100) : '?';
                const thoughtDisplay = `Action: ${move.action.type}\nConfidence: ${confidencePercent}%\nRisk: ${geminiResult.risk || 'Unknown'}\nReasoning: ${move.reasoning[0]}`;
                
                setGeminiThoughts(thoughtDisplay);
                addToLog(geminiResult.prompt, 'prompt');
                addToLog(geminiResult.rawResponse, 'response');
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
                        setTimeout(() => { if (!cancelSimRef.current) setIsQuotaPaused(false); }, 30000);
                    } else {
                        addToLog(t('simulation.gemini.error_quota_manual'), 'info');
                        setShowRetryButton(true);
                    }
                } else {
                    addToLog(t('simulation.gemini.error_gemini_move'), 'info');
                    dispatch({ type: 'NO_OP' as any });
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
        hasAutoRetried.current = false;
    };

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
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, isSimulating, addToLog, t]);

    useEffect(() => {
        if (!isSimulating || state.winner || cancelSimRef.current || isQuotaPaused || showRetryButton || isLoading) return;
        const isResolving = state.gamePhase.includes('ACCEPT') || state.gamePhase.includes('DECLINE');
        if (isResolving) return;
        const timeoutId = setTimeout(handleTurn, 500);
        return () => clearTimeout(timeoutId);
    }, [isSimulating, state, isQuotaPaused, showRetryButton, isLoading, handleTurn]);
    
    useEffect(() => {
        if (isSimulating && state.winner) {
            const winnerLog = state.winner === 'ai' ? t('simulation.log_game_winner_ai') : t('simulation.gemini.log_game_winner_gemini');
            addToLog(winnerLog, 'info');
            setIsSimulating(false);
        }
    }, [isSimulating, state.winner, addToLog, t]);
    
    useEffect(() => {
        if (isSimulating && state.gamePhase === 'round_end' && !state.winner) {
            addToLog(t('simulation.log_round_end', { round: state.round }), 'info');
            addToLog(t('simulation.log_round_end_winner', { winner: state.lastRoundWinner?.toUpperCase() }), 'info');
            addToLog(t('simulation.log_round_end_score', { aiScore: state.aiScore, playerScore: state.playerScore }), 'info');

            if (simMode === 'round') {
                setIsSimulating(false);
            } else { 
                 setTimeout(() => { if (cancelSimRef.current) return; dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND }); }, 1500);
            }
        }
    }, [isSimulating, simMode, state.gamePhase, state.winner, state.round, state.lastRoundWinner, state.aiScore, state.playerScore, addToLog, t]);
    
    const LogModal = () => (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-amber-600/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-amber-600/30 flex justify-between items-center bg-stone-950">
                    <h3 className="text-lg font-bold text-amber-400 font-cinzel">{t('simulation.manual.log_title')}</h3>
                    <button onClick={() => setIsLogModalOpen(false)} className="text-stone-400 hover:text-white transition-colors">&times;</button>
                </div>
                <div className="p-4 flex-grow overflow-y-auto font-vt323 text-lg space-y-1 bg-black/50 rounded-b-xl">
                    {eventLog.map((entry, index) => {
                        let style = 'text-cyan-100';
                        let prefix = '> ';
                        if (entry.type === 'info') { style = 'text-yellow-400 font-bold mt-2 pt-2 border-t border-yellow-400/20'; prefix = ''; }
                        else if (entry.type === 'prompt') { style = 'text-purple-300'; prefix = '[PROMPT]\n'; }
                        else if (entry.type === 'response') { style = 'text-green-300'; prefix = '[RESPONSE]\n'; }
                        else if (entry.type === 'analysis_prompt') { style = 'text-indigo-300'; prefix = '[ANALYSIS PROMPT]\n'; }
                        else if (entry.type === 'analysis_response') { style = 'text-teal-300'; prefix = '[ANALYSIS]\n'; }
                        return <pre key={index} className={`whitespace-pre-wrap ${style} font-sans text-sm`}>{prefix}{entry.content}</pre>
                    })}
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="flex flex-col h-full w-full bg-stone-900">
            {isLogModalOpen && <LogModal />}
            
            <SimHeaderHUD state={state} />
            
            <div className="flex flex-grow overflow-hidden relative">
                 {/* Game Board Area */}
                 <div className="w-2/3 relative bg-[#0f5132] shadow-inner flex flex-col justify-between p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
                      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                      
                      <div className="relative z-10 flex justify-center pt-4">
                          <CompactHandDisplay cards={state.aiHand} title={t('simulation.gemini.local_ai_hand')} isVisible={true} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center gap-12 opacity-90">
                           <CompactHandDisplay cards={state.aiTricks} title={t('simulation.manual.ai_tricks')} labelSide="bottom" />
                           <CompactHandDisplay cards={state.playerTricks} title={t('simulation.manual.opponent_tricks')} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center pb-4">
                          <CompactHandDisplay cards={state.playerHand} title={t('simulation.gemini.gemini_hand')} isVisible={isSimulating} />
                      </div>
                 </div>

                 {/* Right Sidebar: Analysis & Controls */}
                 <div className="w-1/3 bg-stone-950 border-l border-stone-700 flex flex-col">
                     
                     {/* Tabs for Log vs Analysis vs Thoughts */}
                     <div className="flex-grow flex flex-col overflow-hidden">
                        <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-grow">
                            {/* Gemini Thoughts Panel */}
                            <div className="bg-purple-900/10 border border-purple-500/30 rounded p-2">
                                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">{t('simulation.gemini.gemini_thoughts')}</h3>
                                {isLoading === 'gemini_move' ? 
                                    <p className="animate-pulse text-purple-300 text-xs">{t('simulation.gemini.waiting_for_gemini')}</p> : 
                                    <pre className="whitespace-pre-wrap text-purple-200/80 text-[10px] font-mono">{geminiThoughts || "Waiting for turn..."}</pre>
                                }
                            </div>

                            {/* Gemini Analysis Panel (Only shows when analysis is available or requested) */}
                            <div className="bg-green-900/10 border border-green-500/30 rounded p-2">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-[10px] font-bold text-green-400 uppercase tracking-wider">{t('simulation.gemini.gemini_analysis')}</h3>
                                    {((!isSimulating && simMode === 'round' && (state.gamePhase === 'round_end' || state.winner)) || (!isSimulating && state.winner)) && !analysis && (
                                        <button onClick={handleGetAnalysis} disabled={isLoading === 'analysis'} className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-700 hover:bg-green-600 text-white disabled:opacity-50">Get</button>
                                    )}
                                </div>
                                {isLoading === 'analysis' ? (
                                    <p className="animate-pulse text-green-300 font-mono text-xs">{t('simulation.gemini.analyzing')}</p>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none prose-p:text-stone-300 prose-headings:text-green-300 prose-strong:text-white prose-pre:bg-black/30 prose-code:text-amber-200">
                                        <pre className="whitespace-pre-wrap font-sans text-[10px] max-h-40 overflow-y-auto">{analysis || t('simulation.gemini.analysis_prompt')}</pre>
                                    </div>
                                )}
                            </div>

                            {/* Event Log Stream */}
                            <div className="bg-black/30 border border-white/5 rounded p-2">
                                <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">{t('simulation.gemini.game_log')}</h3>
                                <div className="font-vt323 text-xs text-stone-300 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {eventLog.filter(e => e.type === 'event' || e.type === 'info').map((log, index) => (
                                        <p key={index} className={`whitespace-pre-wrap ${log.type === 'info' ? 'text-yellow-400 font-bold' : 'text-cyan-100'}`}>
                                            {log.content}
                                        </p>
                                    ))}
                                </div>
                                <button onClick={() => setIsLogModalOpen(true)} className="w-full mt-2 text-[10px] text-stone-500 hover:text-stone-300 uppercase text-center">View Full Debug Log</button>
                            </div>
                        </div>
                     </div>

                     {/* Footer Controls */}
                     <div className="p-3 border-t border-white/10 bg-stone-900">
                        {!isSimulating ? (
                            <div className="flex gap-2">
                                <button onClick={() => handleStart('round')} className="flex-1 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-bold text-xs uppercase shadow-md transition-colors">{t('simulation.gemini.start_round_sim')}</button>
                                <button onClick={() => handleStart('match')} className="flex-1 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs uppercase shadow-md transition-colors">{t('simulation.gemini.start_match_sim')}</button>
                            </div>
                        ) : (
                            <button onClick={handleStop} className="w-full py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-xs uppercase shadow-md animate-pulse">{t('simulation.gemini.stop_sim')}</button>
                        )}
                        {showRetryButton && (
                             <button onClick={handleManualRetry} className="w-full mt-2 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs uppercase animate-pulse">{t('simulation.gemini.retry_button')}</button>
                        )}
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default GeminiSimulator;
