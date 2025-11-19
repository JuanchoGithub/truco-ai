
import React, { useState, useReducer, useEffect, useRef, useMemo } from 'react';
import { useGameReducer, initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { getRandomizerMove } from '../services/randomizerAiService';
import { GameState, ActionType, Card as CardType, Action, Player, GamePhase, AiMove, MessageObject } from '../types';
import CardComponent from './Card';
import { createDeck, getCardName, hasFlor } from '../services/trucoLogic';
import BatchAnalyzer from './BatchAnalyzer';
import { useLocalization } from '../context/LocalizationContext';
import ScenarioTester from './ScenarioTester';
import CentralMessage from './CentralMessage';
import ScenarioRunner from './ScenarioRunner';
import GeminiSimulator from './GeminiSimulator';

const FULL_DECK = createDeck();

// Helper to render the AI's reasoning log
const renderReasoning = (reasoningArray: (string | MessageObject)[], t: (key: string, options?: any) => string): string => {
    if (!reasoningArray) return "";
    return reasoningArray.map(reason => {
        if (typeof reason === 'string') return reason;

        const options: { [key: string]: any } = { ...reason.options };

        if (options.statusKey) {
            options.status = t(`ai_logic.statuses.${options.statusKey}`);
        }
        if (options.player) {
            options.player = options.player === 'ai' ? t('common.ai') : t('common.randomizer');
        }

        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) {
                    options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                } else if ('rank' in options[key] && 'suit' in options[key]) {
                    options[key] = getCardName(options[key] as CardType);
                }
            } else if (key === 'suit' && typeof options[key] === 'string') {
                options[key] = t(`common.card_suits.${options[key]}`);
            }
        }

        return t(reason.key, options);
    }).join('\n');
};

// Helper to describe an action, now with customizable player names
const getActionDescription = (action: Action, state: Partial<GameState>, t: (key: string, options?: any) => string, playerNames: {ai: string, opponent: string}): string => {
    const playerInPayload = (action as any)?.payload?.player;
    const actor = playerInPayload || state.currentTurn;
    
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
        case ActionType.PROCEED_TO_NEXT_ROUND: return t('actionBar.next_round');
        case ActionType.RESTART_GAME: return t('simulation.button_restart');
        default: return t('simulation_actions.default', { playerName, actionType: action.type });
    }
}

// A simple card row display
const HandDisplay: React.FC<{ cards: (CardType | null)[], title: string, onCardClick?: (index: number) => void }> = ({ cards, title, onCardClick }) => (
    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">{title}</h3>
        <div className={`flex justify-center min-h-[124px] items-center ${onCardClick ? 'space-x-[-53px]' : 'gap-2'}`}>
            {cards.map((card, index) => (
                <button key={index} onClick={() => onCardClick && onCardClick(index)} disabled={!onCardClick} className={`disabled:cursor-default ${onCardClick ? 'transition-transform duration-200 ease-out hover:-translate-y-4 hover:z-20' : ''}`}>
                     <CardComponent card={card || undefined} size="small" />
                </button>
            ))}
        </div>
    </div>
);

// Tab component for the main UI
const Tab: React.FC<{ title: string; isActive: boolean; onClick: () => void }> = ({ title, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-5 py-3 font-bold text-sm uppercase tracking-wider transition-all relative
            ${isActive 
                ? 'text-cyan-300 bg-stone-800 border-t-2 border-l-2 border-r-2 border-cyan-700/50 rounded-t-lg z-10' 
                : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 border-b-2 border-cyan-700/50'
            }
        `}
    >
        {title}
        {isActive && <div className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-stone-800"></div>}
    </button>
);

const CardPickerModal: React.FC<{
    availableCards: CardType[];
    onSelect: (card: CardType) => void;
    onExit: () => void;
}> = ({ availableCards, onSelect, onExit }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-amber-600/50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-amber-600/30 flex justify-between items-center bg-stone-950">
                    <h3 className="text-lg font-bold text-amber-400 font-cinzel">{t('card_picker.title')}</h3>
                    <button onClick={onExit} className="text-stone-400 hover:text-white transition-colors">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="flex flex-wrap gap-3 justify-center">
                        {availableCards.map(card => (
                            <button key={`${card.rank}-${card.suit}`} onClick={() => onSelect(card)} className="transform transition-transform hover:scale-110 hover:z-10">
                                <CardComponent card={card} size="small" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManualLogModal: React.FC<{ log: string[], onClose: () => void }> = ({ log, onClose }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-stone-900 border-2 border-cyan-600/50 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="p-4 border-b border-cyan-600/30 flex justify-between items-center bg-stone-950">
                    <h3 className="text-lg font-bold text-cyan-400 font-cinzel">{t('simulation.manual.log_title')}</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">&times;</button>
                </div>
                <div className="p-4 flex-grow overflow-y-auto font-vt323 text-lg space-y-1 bg-black/50 rounded-b-xl">
                    {log.map((entry, index) => {
                         if (entry.startsWith('---')) return <p key={index} className="text-yellow-400 font-bold mt-2 pt-2 border-t border-yellow-400/20">{entry}</p>
                         if (entry.startsWith('🤖')) return <pre key={index} className="whitespace-pre-wrap p-2 rounded bg-blue-900/20 text-blue-200 font-sans text-sm border-l-2 border-blue-500">{entry}</pre>
                         return <p key={index} className="text-stone-300 flex gap-2"><span className="text-stone-600">&gt;</span> {entry}</p>
                    })}
                </div>
            </div>
        </div>
    )
}


const getValidActions = (state: GameState): Action[] => {
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, aiHasFlor, hasFlorBeenCalledThisRound, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence, playerHand, aiHand, isFlorEnabled } = state;
    if (!currentTurn) {
         if (state.gamePhase === 'round_end') return [{ type: ActionType.PROCEED_TO_NEXT_ROUND }];
         if (state.winner) return [{ type: ActionType.RESTART_GAME }];
         return [];
    }

    const validActions: Action[] = [];
    const hand = currentTurn === 'player' ? playerHand : aiHand;
    const hasFlor = currentTurn === 'player' ? playerHasFlor : aiHasFlor;

    if (gamePhase.includes('_called') && lastCaller !== currentTurn) {
        validActions.push({ type: ActionType.ACCEPT });
        validActions.push({ type: ActionType.DECLINE });

        if (gamePhase === 'envido_called') {
            if (isFlorEnabled && hasFlor) validActions.push({ type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR });
            else {
                if (envidoPointsOnOffer === 2) validActions.push({ type: ActionType.CALL_ENVIDO });
                if (!hasRealEnvidoBeenCalledThisSequence) validActions.push({ type: ActionType.CALL_REAL_ENVIDO });
                validActions.push({ type: ActionType.CALL_FALTA_ENVIDO });
            }
        }
        if (gamePhase === 'truco_called') {
            const canCallEnvidoPrimero = currentTrick === 0 && !hasEnvidoBeenCalledThisRound;
            const opponentHasFlor = currentTurn === 'player' ? aiHasFlor : playerHasFlor;
            if (isFlorEnabled && hasFlor) validActions.push({ type: ActionType.DECLARE_FLOR });
            else if (canCallEnvidoPrimero && !(isFlorEnabled && opponentHasFlor)) validActions.push({ type: ActionType.CALL_ENVIDO });
            validActions.push({ type: ActionType.CALL_RETRUCO });
        }
        if (gamePhase === 'retruco_called') validActions.push({ type: ActionType.CALL_VALE_CUATRO });
        if (gamePhase === 'flor_called') {
             if (hasFlor) validActions.push({ type: ActionType.CALL_CONTRAFLOR });
             else validActions.push({ type: ActionType.ACKNOWLEDGE_FLOR });
        }
        if (gamePhase === 'contraflor_called') {
            validActions.push({ type: ActionType.ACCEPT_CONTRAFLOR });
            validActions.push({ type: ActionType.DECLINE_CONTRAFLOR });
        }
    } else {
        const tricks = currentTurn === 'player' ? playerTricks : aiTricks;
        if (tricks[currentTrick] === null) {
            hand.forEach((_, index) => {
                validActions.push({ type: ActionType.PLAY_CARD, payload: { player: currentTurn, cardIndex: index } });
            });
        }

        const canSing = currentTrick === 0;
        if (canSing) {
            if (isFlorEnabled && hasFlor) validActions.push({ type: ActionType.DECLARE_FLOR });
            else if (!hasEnvidoBeenCalledThisRound && !(isFlorEnabled && aiHasFlor) && !(isFlorEnabled && playerHasFlor)) {
                validActions.push({ type: ActionType.CALL_ENVIDO });
                validActions.push({ type: ActionType.CALL_REAL_ENVIDO });
                validActions.push({ type: ActionType.CALL_FALTA_ENVIDO });
            }
        }
        
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            if (trucoLevel === 0) validActions.push({ type: ActionType.CALL_TRUCO });
            else if (trucoLevel === 1 && lastCaller !== currentTurn) validActions.push({ type: ActionType.CALL_RETRUCO });
            else if (trucoLevel === 2 && lastCaller !== currentTurn) validActions.push({ type: ActionType.CALL_VALE_CUATRO });
        }
    }
    
    return validActions;
};

const createMirroredState = (currentState: GameState): GameState => {
    const mirroredTrickWinners = currentState.trickWinners.map(winner => {
        if (winner === 'player') return 'ai';
        if (winner === 'ai') return 'player';
        return winner;
    });

    return {
        ...currentState,
        playerHand: currentState.aiHand,
        aiHand: currentState.playerHand,
        initialPlayerHand: currentState.initialAiHand,
        initialAiHand: currentState.initialPlayerHand,
        playerTricks: currentState.aiTricks,
        aiTricks: currentState.playerTricks,
        trickWinners: mirroredTrickWinners,
        playerScore: currentState.aiScore,
        aiScore: currentState.playerScore,
        currentTurn: 'ai',
        playerHasFlor: currentState.aiHasFlor,
        aiHasFlor: currentState.playerHasFlor,
        mano: currentState.mano === 'player' ? 'ai' : 'player',
        lastRoundWinner: currentState.lastRoundWinner === 'player' ? 'ai' : currentState.lastRoundWinner === 'ai' ? 'player' : currentState.lastRoundWinner,
        lastCaller: currentState.lastCaller === 'player' ? 'ai' : (currentState.lastCaller === 'ai' ? 'player' : null),
        turnBeforeInterrupt: currentState.turnBeforeInterrupt === 'player' ? 'ai' : (currentState.turnBeforeInterrupt === 'ai' ? 'player' : null),
        pendingTrucoCaller: currentState.pendingTrucoCaller === 'player' ? 'ai' : (currentState.pendingTrucoCaller === 'ai' ? 'player' : null),
        playerEnvidoValue: currentState.aiEnvidoValue,
        aiEnvidoValue: currentState.playerEnvidoValue,
    };
};

// --- Child Components for Tabs ---

const AutoSimulator: React.FC = () => {
    const { t } = useLocalization();
    const simInitialState = { ...initialState, messageLog: [] };
    const [state, dispatch] = useReducer(useGameReducer, simInitialState);
    const [isRoundInProgress, setIsRoundInProgress] = useState(false);
    const [eventLog, setEventLog] = useState<string[]>([t('simulation.log_start_message')]);
    const [copyButtonText, setCopyButtonText] = useState(t('simulation.button_copy'));
    const eventLogRef = useRef<HTMLDivElement>(null);
    const previousRoundRef = useRef<number>(0);

    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [eventLog]);

    useEffect(() => {
        if (!isRoundInProgress && (state.round === 0 || state.winner)) {
            setEventLog([t('simulation.log_start_message')]);
        }
        setCopyButtonText(t('simulation.button_copy'));
    }, [t, isRoundInProgress, state.round, state.winner]);

    useEffect(() => {
        if (state.round > 0 && state.round !== previousRoundRef.current) {
            const aiHandStr = state.initialAiHand.map(getCardName).join(', ');
            const randHandStr = state.initialPlayerHand.map(getCardName).join(', ');
            const manoStr = state.mano.toUpperCase();
            
            setEventLog(prevLog => {
                const isNewGame = state.round === 1 && prevLog.length <= 1;
                const baseLog = isNewGame ? [t('simulation.log_new_simulation')] : prevLog;
                return [
                    ...baseLog,
                    t('simulation.log_round_start', { round: state.round }),
                    t('simulation.log_ai_hand', { hand: aiHandStr }),
                    t('simulation.log_randomizer_hand', { hand: randHandStr }),
                    t('simulation.log_mano', { player: manoStr }),
                ];
            });
            previousRoundRef.current = state.round;
        }
    }, [state.round, state.initialAiHand, state.initialPlayerHand, state.mano, t]);

    useEffect(() => {
        if (!isRoundInProgress) return;
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
                setEventLog(prev => [...prev, t('simulation.log_resolving', { phase: state.gamePhase })]);
                dispatch(resolutionAction!);
            }, 150);
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, isRoundInProgress, t]);

    useEffect(() => {
        if (!isRoundInProgress || !state.currentTurn || state.winner || state.gamePhase === 'round_end') {
            if (isRoundInProgress) {
                setIsRoundInProgress(false);
                if (state.winner) {
                    const winnerLog = state.winner === 'ai' ? t('simulation.log_game_winner_ai') : t('simulation.log_game_winner_randomizer');
                    setEventLog(prev => [...prev, winnerLog]);
                } else if (state.gamePhase === 'round_end') {
                     setEventLog(prev => [...prev,
                        t('simulation.log_round_end', { round: state.round }),
                        t('simulation.log_round_end_winner', { winner: state.lastRoundWinner?.toUpperCase() }),
                        t('simulation.log_round_end_score', { aiScore: state.aiScore, playerScore: state.playerScore })
                    ]);
                }
            }
            return;
        }
        const handleTurn = () => {
            let move;
            let logicKey;
            if (state.currentTurn === 'ai') {
                move = getLocalAIMove(state);
                logicKey = 'simulation.log_ai_logic';
            } else {
                move = getRandomizerMove(state);
                logicKey = 'simulation.log_randomizer_logic';
            }
            if ((move.action as any).type === "NO_OP") return;
            const actionDesc = getActionDescription(move.action, state, t, {ai: t('common.ai'), opponent: t('common.randomizer')});
            const formattedReasoning = move.reasoning.map(r => typeof r === 'string' ? r : t(r.key, r.options)).join('\n').split('\n').map(line => `  ${line}`).join('\n');
            const reasoningLog = t(logicKey, { reasoning: formattedReasoning });
            setEventLog(prev => [...prev, actionDesc, reasoningLog]);
            dispatch(move.action);
        };
        const isResolving = state.gamePhase.includes('_ACCEPTED') || state.gamePhase.includes('_DECLINED') || state.gamePhase.includes('_SHOWDOWN');
        const delay = isResolving ? 600 : 300;
        const timerId = setTimeout(handleTurn, delay);
        return () => clearTimeout(timerId);

    }, [isRoundInProgress, state, t]);

    const handleNextRound = () => {
        if (state.winner) {
            setEventLog([t('simulation.log_new_simulation')]);
            previousRoundRef.current = 0;
            dispatch({ type: ActionType.RESTART_GAME });
        } else if (state.round === 0) {
            dispatch({ type: ActionType.START_NEW_ROUND });
        } else {
            dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND });
        }
        setIsRoundInProgress(true);
    };

    const handleCopy = () => {
        const logText = eventLog.map(log => {
            if (log.startsWith('---')) return `\n${log}\n`;
            if (log.startsWith('[Lógica') || log.startsWith('[AI Logic')) return log.split('\n').map(line => line.trim()).join('\n');
            return log;
        }).join('\n');
        navigator.clipboard.writeText(logText).then(() => {
            setCopyButtonText(t('simulation.button_copied'));
            setTimeout(() => setCopyButtonText(t('simulation.button_copy')), 2000);
        });
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 animate-fade-in-scale">
            <div className="flex-shrink-0 flex gap-4 bg-stone-900/50 p-4 rounded-lg border border-cyan-800/30">
                <button onClick={handleNextRound} disabled={isRoundInProgress} className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-b from-green-600 to-green-700 border-b-4 border-green-900 hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
                    {isRoundInProgress ? t('simulation.button_simulating') : (state.winner ? t('simulation.button_restart') : t('simulation.button_simulate_round'))}
                </button>
                <button onClick={handleCopy} className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-b from-cyan-600 to-cyan-700 border-b-4 border-cyan-900 hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all">
                    {copyButtonText}
                </button>
            </div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                <div className="col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30">
                        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-800/50 pb-1">{t('simulation.scoreboard_title')}</h2>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-stone-300">{t('common.ai')}</span>
                            <span className="font-mono text-2xl text-amber-400">{state.aiScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-stone-300">{t('common.randomizer')}</span>
                            <span className="font-mono text-2xl text-stone-400">{state.playerScore}</span>
                        </div>
                    </div>
                    <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30">
                         <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-800/50 pb-1">{t('simulation.round_status_title', { round: state.round })}</h2>
                         <div className="grid grid-cols-2 gap-2 text-xs">
                            <p className="text-stone-400">{t('simulation.phase')}</p> <p className="text-right text-stone-200">{state.gamePhase}</p>
                            <p className="text-stone-400">{t('simulation.turn')}</p> <p className="text-right text-stone-200">{state.currentTurn?.toUpperCase() ?? t('common.na')}</p>
                            <p className="text-stone-400">{t('simulation.mano')}</p> <p className="text-right text-stone-200">{state.mano.toUpperCase()}</p>
                         </div>
                    </div>
                     <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30 space-y-4">
                        <HandDisplay cards={state.initialAiHand} title={t('simulation.initial_hand_ai')} />
                        <HandDisplay cards={state.initialPlayerHand} title={t('simulation.initial_hand_randomizer')} />
                    </div>
                </div>
                <div ref={eventLogRef} className="col-span-2 bg-black/80 p-4 rounded-lg overflow-y-auto font-vt323 text-lg border-2 border-cyan-900/50 shadow-inner">
                    {eventLog.map((log, index) => {
                        if (log.startsWith('---')) return <p key={index} className="text-yellow-400 font-bold mt-2 pt-2 border-t border-yellow-400/20">{log}</p>;
                        if (log.startsWith('[Lógica') || log.startsWith('[AI Logic')) return <pre key={index} className="whitespace-pre-wrap text-cyan-300 bg-cyan-900/10 p-2 rounded mt-1 mb-3 border-l-2 border-cyan-600 font-sans text-sm">{log}</pre>;
                        return <p key={index} className="whitespace-pre-wrap text-stone-300 flex gap-2"><span className="text-stone-600">&gt;</span> {log}</p>;
                    })}
                </div>
            </div>
        </div>
    );
};

const ManualSimulator: React.FC = () => {
    const { t, translatePlayerName } = useLocalization();
    const [state, dispatch] = useReducer(useGameReducer, initialState);
    const [simPhase, setSimPhase] = useState<'setup' | 'play'>('setup');
    const [pickerState, setPickerState] = useState<{ open: boolean, hand: 'ai' | 'player', index: number }>({ open: false, hand: 'ai', index: 0 });
    const [aiSuggestion, setAiSuggestion] = useState<AiMove | null>(null);
    const [manualEventLog, setManualEventLog] = useState<string[]>([]);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    // State for central message display
    const [localMessage, setLocalMessage] = useState<string | null>(null);
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const messageTimers = useRef<{ fadeOutTimerId?: number; clearTimerId?: number }>({});
    
    // New state for bulk simulation
    const [simulationResults, setSimulationResults] = useState<Record<string, number> | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const simulationCancelled = useRef(false);
    const [expandedResult, setExpandedResult] = useState<string | null>(null);

    const [setupState, setSetupState] = useState({
        aiScore: 0,
        playerScore: 0,
        mano: 'player' as Player,
        aiHand: [null, null, null] as (CardType | null)[],
        playerHand: [null, null, null] as (CardType | null)[]
    });

    // Automatically handle resolution phases like ENVIDO_ACCEPTED
    useEffect(() => {
        if (simPhase !== 'play') return;
        let resolutionAction: Action | null = null;
        switch (state.gamePhase) {
            case 'ENVIDO_ACCEPTED': resolutionAction = { type: ActionType.RESOLVE_ENVIDO_ACCEPT }; break;
            case 'ENVIDO_DECLINED': resolutionAction = { type: ActionType.RESOLVE_ENVIDO_DECLINE }; break;
            case 'TRUCO_DECLINED': resolutionAction = { type: ActionType.RESOLVE_TRUCO_DECLINE }; break;
            case 'FLOR_SHOWDOWN': resolutionAction = { type: ActionType.RESOLVE_FLOR_SHOWDOWN }; break;
            case 'CONTRAFLOR_DECLINED': resolutionAction = { type: ActionType.RESOLVE_CONTRAFLOR_DECLINE }; break;
        }

        if (resolutionAction) {
            const logMessage = `--- ${t('simulation.log_resolving', { phase: state.gamePhase })} ---`;
            setManualEventLog(prev => [...prev, logMessage]);
            const timeoutId = setTimeout(() => {
                dispatch(resolutionAction!);
            }, 300); // A short delay to make the resolution noticeable
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, simPhase, t]);

    // Handlers for central message
    const clearMessageState = () => {
        dispatch({ type: ActionType.CLEAR_CENTRAL_MESSAGE });
        setLocalMessage(null);
    };
    const handleDismissMessage = () => {
        clearTimeout(messageTimers.current.fadeOutTimerId);
        clearTimeout(messageTimers.current.clearTimerId);
        setIsMessageVisible(false);
        messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 500);
    };

    // Effect to display central messages (like Envido results)
    useEffect(() => {
        if (simPhase !== 'play' || !state.centralMessage) return;

        const options = { ...state.centralMessage.options };
        if (options.winnerName) options.winnerName = translatePlayerName(options.winnerName);
        if (options.winner) options.winner = translatePlayerName(options.winner);
        
        const translatedMessage = t(state.centralMessage.key, options);
        setLocalMessage(translatedMessage);
        setIsMessageVisible(true);

        const logMessage = `--- ${t('simulation.manual.log_event')}: ${translatedMessage} ---`;
        setManualEventLog(prev => [...prev, logMessage]);

        if (!state.isCentralMessagePersistent) {
            messageTimers.current.fadeOutTimerId = window.setTimeout(() => setIsMessageVisible(false), 1500);
            messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 2000);
        }
    }, [state.centralMessage, simPhase, t, translatePlayerName]);


    const availableCards = useMemo(() => {
        const selected = [...setupState.aiHand, ...setupState.playerHand].filter(c => c !== null);
        return FULL_DECK.filter(deckCard => 
            !selected.some(sel => sel && sel.rank === deckCard.rank && sel.suit === deckCard.suit)
        );
    }, [setupState.aiHand, setupState.playerHand]);

    const handleOpenPicker = (hand: 'ai' | 'player', index: number) => setPickerState({ open: true, hand, index });

    const handleCardSelect = (card: CardType) => {
        const { hand, index } = pickerState;
        setSetupState(prev => {
            const newHand = [...(hand === 'ai' ? prev.aiHand : prev.playerHand)];
            newHand[index] = card;
            return { ...prev, [hand === 'ai' ? 'aiHand' : 'playerHand']: newHand };
        });
        setPickerState({ open: false, hand: 'ai', index: 0 });
    };

    const isSetupComplete = useMemo(() => {
        return setupState.aiHand.every(c => c !== null) && setupState.playerHand.every(c => c !== null);
    }, [setupState.aiHand, setupState.playerHand]);

    const handleStartRound = () => {
        const aiHandCards = setupState.aiHand.filter(c => c) as CardType[];
        const playerHandCards = setupState.playerHand.filter(c => c) as CardType[];
        const partialState: Partial<GameState> = {
            round: 1,
            playerScore: setupState.playerScore,
            aiScore: setupState.aiScore,
            mano: setupState.mano,
            currentTurn: setupState.mano,
            gamePhase: 'trick_1',
            aiHand: aiHandCards,
            initialAiHand: aiHandCards,
            playerHand: playerHandCards,
            initialPlayerHand: playerHandCards,
            playerHasFlor: hasFlor(playerHandCards),
            aiHasFlor: hasFlor(aiHandCards)
        };
        dispatch({ type: ActionType.LOAD_PERSISTED_STATE, payload: partialState });
        setManualEventLog([
            `--- ${t('simulation.manual.log_round_start')} ---`,
            `${t('simulation.manual.log_initial_setup')}:`,
            `  ${t('simulation.manual.scores_mano')}: ${t('common.ai')} ${setupState.aiScore} - ${t('common.opponent')} ${setupState.playerScore}`,
            `  ${t('simulation.manual.mano')}: ${setupState.mano.toUpperCase()}`,
            `  ${t('simulation.manual.ai_hand')}: ${aiHandCards.map(getCardName).join(', ')}`,
            `  ${t('simulation.manual.opponent_hand')}: ${playerHandCards.map(getCardName).join(', ')}`
        ]);
        setSimPhase('play');
        setAiSuggestion(null);
        setSimulationResults(null);
    };

    const validActions = useMemo(() => {
        if (simPhase === 'play' && !state.winner) return getValidActions(state);
        return [];
    }, [state, simPhase]);

    const handleActionClick = (action: Action) => {
        if (state.isCentralMessagePersistent) handleDismissMessage();
        setAiSuggestion(null);
        setSimulationResults(null);
        const actionDesc = getActionDescription(action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')});
        setManualEventLog(prev => [...prev, actionDesc]);
        dispatch(action);
    };

    const handleAskAi = () => {
        let suggestion: AiMove;
        let stateToSimulate = state;
        if (state.currentTurn === 'player') {
            stateToSimulate = createMirroredState(state);
        }

        suggestion = getLocalAIMove(stateToSimulate);
        
        if (state.currentTurn === 'player') {
             if (suggestion.action.type === ActionType.PLAY_CARD && suggestion.action.payload.player === 'ai') {
                suggestion.action.payload.player = 'player';
            }
            if (suggestion.action.type === ActionType.DECLARE_FLOR && suggestion.action.payload?.player === 'ai') {
                suggestion.action.payload.player = 'player';
            }
        }
        setAiSuggestion(suggestion);
        setSimulationResults(null);
        
        const actionDesc = getActionDescription(suggestion.action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')});
        const reasoningDesc = renderReasoning(suggestion.reasoning, t);
        setManualEventLog(prev => {
            const filteredLog = prev.filter(entry => !entry.startsWith('🤖'));
            const suggestionLog = `🤖 ${t('simulation.manual.log_ai_suggestion_title')}:\n- ${t('simulation.manual.log_action')}: ${actionDesc}\n- ${t('scenario_tester.reasoning')}:\n${reasoningDesc.split('\n').map(l => `  ${l}`).join('\n')}`;
            return [...filteredLog, suggestionLog];
        });
    };

    const handleRunSimulations = () => {
        if (simPhase !== 'play') return;

        setIsSimulating(true);
        setSimulationProgress(0);
        setSimulationResults(null);
        setAiSuggestion(null);
        simulationCancelled.current = false;

        const results: Record<string, number> = {};
        const totalSims = 1000;
        const batchSize = 20;

        let stateToSimulate = state;
        if (state.currentTurn === 'player') {
            stateToSimulate = createMirroredState(state);
        }

        const processSimChunk = (i: number) => {
            if (i >= totalSims || simulationCancelled.current) {
                setIsSimulating(false);
                setSimulationResults(results);
                if (simulationCancelled.current) {
                    setSimulationResults(null);
                }
                return;
            }

            for (let j = 0; j < batchSize && i + j < totalSims; j++) {
                const aiMove = getLocalAIMove(stateToSimulate);
                const reason = aiMove.reasonKey || 'unknown_action';
                results[reason] = (results[reason] || 0) + 1;
            }
            
            setSimulationProgress(Math.round(((i + batchSize) / totalSims) * 100));
            setTimeout(() => processSimChunk(i + batchSize), 0);
        };

        processSimChunk(0);
    };

    const handleCancelSimulation = () => {
        simulationCancelled.current = true;
    };

    const sortedSimulationResults = useMemo(() => {
        if (!simulationResults) return null;
        return Object.entries(simulationResults).sort((a, b) => Number(b[1]) - Number(a[1]));
    }, [simulationResults]);
    
    const totalSimsRun = sortedSimulationResults ? sortedSimulationResults.reduce((sum, [, count]) => sum + Number(count), 0) : 0;

    const resetToSetup = () => {
        setSimPhase('setup');
        setAiSuggestion(null);
        setSimulationResults(null);
        setManualEventLog([]);
    };

    if (simPhase === 'setup') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4 animate-fade-in-scale">
                <h2 className="text-3xl font-bold text-cyan-300 font-cinzel tracking-widest drop-shadow-lg">{t('simulation.manual.setup_title')}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-5xl">
                    <div className="bg-stone-900/80 border border-amber-700/30 p-6 rounded-xl shadow-lg">
                        <h3 className="font-bold text-xl text-amber-500 mb-4 border-b border-amber-700/30 pb-2">{t('simulation.manual.scores_mano')}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t('simulation.manual.ai_score')}</label><input type="number" value={setupState.aiScore} onChange={e => setSetupState(s => ({...s, aiScore: parseInt(e.target.value)}))} className="w-full p-3 bg-black/30 border border-stone-600 rounded-lg text-white focus:border-amber-500 outline-none transition-colors"/></div>
                            <div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t('simulation.manual.opponent_score')}</label><input type="number" value={setupState.playerScore} onChange={e => setSetupState(s => ({...s, playerScore: parseInt(e.target.value)}))} className="w-full p-3 bg-black/30 border border-stone-600 rounded-lg text-white focus:border-amber-500 outline-none transition-colors"/></div>
                            <div><label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{t('simulation.manual.mano')}</label><select value={setupState.mano} onChange={e => setSetupState(s => ({...s, mano: e.target.value as Player}))} className="w-full p-3 bg-black/30 border border-stone-600 rounded-lg text-white focus:border-amber-500 outline-none transition-colors"><option value="player">{t('common.opponent')}</option><option value="ai">{t('common.ai')}</option></select></div>
                        </div>
                    </div>
                     <div className="bg-stone-900/80 border border-amber-700/30 p-6 rounded-xl shadow-lg flex flex-col justify-center"><HandDisplay title={t('simulation.manual.ai_hand')} cards={setupState.aiHand} onCardClick={(i) => handleOpenPicker('ai', i)} /></div>
                     <div className="bg-stone-900/80 border border-amber-700/30 p-6 rounded-xl shadow-lg flex flex-col justify-center"><HandDisplay title={t('simulation.manual.opponent_hand')} cards={setupState.playerHand} onCardClick={(i) => handleOpenPicker('player', i)} /></div>
                </div>
                <button onClick={handleStartRound} disabled={!isSetupComplete} className="px-8 py-4 rounded-lg font-bold text-white bg-gradient-to-b from-green-600 to-green-700 border-b-4 border-green-900 hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition-all text-xl uppercase tracking-wider">{t('simulation.manual.start_round')}</button>
                {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
            </div>
        );
    }
    
    // Play Phase
    const actionDesc = aiSuggestion ? getActionDescription(aiSuggestion.action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')}) : "";
    const reasoningDesc = aiSuggestion ? renderReasoning(aiSuggestion.reasoning, t) : "";

    return (
        <div className="w-full h-full flex flex-col gap-4 relative animate-fade-in-scale">
            <CentralMessage message={localMessage} isVisible={isMessageVisible} onDismiss={handleDismissMessage} />
            {isLogModalOpen && <ManualLogModal log={manualEventLog} onClose={() => setIsLogModalOpen(false)} />}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Left Panel: Actions & AI Suggestion */}
                <div className="col-span-1 lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30">
                        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-800/50 pb-1">{t('simulation.manual.valid_actions_for')} {(state.currentTurn ?? '').toUpperCase()}</h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {validActions.map((action, i) => (
                                <button key={i} onClick={() => handleActionClick(action)} className="w-full text-left px-4 py-3 bg-cyan-900/20 border border-cyan-700/30 hover:bg-cyan-800/40 hover:border-cyan-500 rounded-md text-cyan-100 transition-all text-sm font-medium">
                                    {getActionDescription(action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')})}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="bg-stone-900/80 p-4 rounded-lg border border-purple-800/30 flex-grow flex flex-col">
                        <div className="flex-shrink-0">
                            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3 border-b border-purple-800/50 pb-1">{t('simulation.manual.ai_suggestion')}</h2>
                            <div className="flex gap-2 mb-3">
                                <button onClick={handleAskAi} disabled={isSimulating} className="flex-1 px-3 py-2 text-sm rounded-md font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 transition-colors shadow-md">{t('simulation.manual.ask_ai')}</button>
                                {!isSimulating ? (
                                    <button onClick={handleRunSimulations} className="flex-1 px-3 py-2 text-sm rounded-md font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md">{t('scenario_tester.run_simulations')}</button>
                                ) : (
                                    <button onClick={handleCancelSimulation} className="flex-1 px-3 py-2 text-sm rounded-md font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md">{t('scenario_tester.cancel')}</button>
                                )}
                            </div>
                            {isSimulating && (
                                <div className="w-full bg-gray-800 rounded-full h-2 relative overflow-hidden my-2">
                                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${simulationProgress}%`, transition: 'width 0.1s' }}></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {aiSuggestion ? (
                                <div className="space-y-3 bg-black/30 p-3 rounded-md border border-white/5">
                                    <p className="font-mono text-lg text-yellow-300">{actionDesc}</p>
                                    <details className="text-xs">
                                        <summary className="cursor-pointer font-semibold text-gray-400 hover:text-white transition-colors">{t('scenario_tester.reasoning')}</summary>
                                        <pre className="mt-2 p-2 bg-black/50 rounded border border-white/10 text-cyan-200 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{reasoningDesc}</pre>
                                    </details>
                                </div>
                            ) : !simulationResults && !isSimulating && <p className="text-sm text-gray-500 italic text-center py-4">{t('simulation.manual.ask_ai_prompt')}</p>}

                            {sortedSimulationResults && (
                                <div className="flex flex-col flex-grow overflow-hidden mt-2">
                                    <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                        <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">{t('scenario_tester.simulation_results', { count: totalSimsRun })}</h3>
                                        <button onClick={() => setSimulationResults(null)} className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300">{t('scenario_tester.clear_results')}</button>
                                    </div>
                                    <div className="flex-grow overflow-y-auto space-y-1 pr-2">
                                        {sortedSimulationResults.map(([reason, count]) => {
                                            const percentage = totalSimsRun > 0 ? (count / totalSimsRun) * 100 : 0;
                                            const reasonText = t(`ai_reason_keys.${reason}`, { defaultValue: reason });
                                            const isExpanded = expandedResult === reason;
                                            return (
                                                <div key={reason}>
                                                    <button onClick={() => setExpandedResult(isExpanded ? null : reason)} className="w-full flex items-center gap-2 text-xs p-2 rounded hover:bg-purple-900/30 transition-colors group">
                                                        <div className="flex-grow relative h-6 bg-black/40 rounded overflow-hidden">
                                                            <div className="absolute top-0 left-0 h-full bg-purple-600/40 group-hover:bg-purple-600/60 transition-colors" style={{ width: `${percentage}%` }}></div>
                                                            <div className="absolute inset-0 flex items-center justify-between px-2">
                                                                <span className="truncate text-gray-200 z-10">{reasonText}</span>
                                                                <span className="font-mono text-white z-10">{percentage.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="p-3 mt-1 bg-black/40 rounded border-l-2 border-purple-500 animate-fade-in-scale">
                                                            <p className="text-xs text-gray-300 font-sans">{t(`scenario_tester.explanations.${reason}`, { defaultValue: "No explanation available." })}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Game State */}
                 <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30">
                            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-800/50 pb-1">{t('simulation.scoreboard_title')}</h2>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-stone-300">{t('common.ai')}</span>
                                <span className="font-mono text-2xl text-amber-400">{state.aiScore}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-stone-300">{t('common.opponent')}</span>
                                <span className="font-mono text-2xl text-stone-400">{state.playerScore}</span>
                            </div>
                        </div>
                         <div className="bg-stone-900/80 p-4 rounded-lg border border-cyan-800/30 relative">
                             <div className="absolute top-4 right-4 flex gap-2">
                                 <button onClick={() => setIsLogModalOpen(true)} className="text-xs font-bold uppercase text-cyan-400 hover:text-cyan-200 border border-cyan-400/50 px-2 py-1 rounded hover:bg-cyan-900/20 transition-colors">{t('simulation.manual.view_log')}</button>
                                 <button onClick={resetToSetup} className="text-xs font-bold uppercase text-yellow-400 hover:text-yellow-200 border border-yellow-400/50 px-2 py-1 rounded hover:bg-yellow-900/20 transition-colors">{t('simulation.manual.reset')}</button>
                            </div>
                             <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-3 border-b border-cyan-800/50 pb-1">{t('simulation.round_status_title', { round: state.round })}</h2>
                             <div className="grid grid-cols-2 gap-2 text-xs">
                                <p className="text-stone-400">{t('simulation.phase')}</p> <p className="text-right text-stone-200">{state.gamePhase}</p>
                                <p className="text-stone-400">{t('simulation.turn')}</p> <p className="text-right text-stone-200">{state.currentTurn?.toUpperCase() ?? t('common.na')}</p>
                                <p className="text-stone-400">{t('simulation.mano')}</p> <p className="text-right text-stone-200">{state.mano.toUpperCase()}</p>
                             </div>
                        </div>
                     </div>
                    <div className="space-y-4 bg-stone-900/50 p-4 rounded-xl border border-white/5">
                        <HandDisplay title={t('simulation.manual.ai_hand')} cards={[...state.aiHand, null, null, null].slice(0,3)} />
                        <div className="grid grid-cols-2 gap-4 items-center px-2">
                            <HandDisplay title={t('simulation.manual.ai_tricks')} cards={state.aiTricks} />
                            <HandDisplay title={t('simulation.manual.opponent_tricks')} cards={state.playerTricks} />
                        </div>
                        <HandDisplay title={t('simulation.manual.opponent_hand')} cards={[...state.playerHand, null, null, null].slice(0,3)} />
                    </div>
                </div>
            </div>
        </div>
    );
};


type SimTab = 'auto' | 'manual' | 'tester' | 'analyzer' | 'runner' | 'gemini';

const Simulation: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState<SimTab>('auto');

    return (
        <div className="h-screen bg-stone-950 text-white font-sans flex flex-col items-center relative overflow-hidden">
             {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900/80 via-stone-900/50 to-stone-950 z-0"></div>

            <div className="w-full max-w-[1600px] flex justify-between items-center p-4 z-10 border-b border-cyan-900/30 bg-stone-900/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🧪</span>
                    <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 tracking-widest shadow-cyan-500/50 drop-shadow-sm">
                        {t('simulation.title')}
                    </h1>
                </div>
                <button onClick={onExit} className="px-4 py-2 rounded text-sm font-bold uppercase tracking-wider text-stone-400 hover:text-white border border-stone-700 hover:border-stone-500 hover:bg-stone-800 transition-all">
                    {t('simulation.button_exit')}
                </button>
            </div>
            
            <div className="w-full max-w-[1600px] flex-grow flex flex-col min-h-0 z-10 p-4">
                {/* Tab Bar */}
                <div className="flex-shrink-0 flex gap-1 overflow-x-auto custom-scrollbar pb-0 mb-[-2px]">
                    <Tab title={t('simulation.tab_auto_hand')} isActive={activeTab === 'auto'} onClick={() => setActiveTab('auto')} />
                    <Tab title={t('simulation.tab_gemini')} isActive={activeTab === 'gemini'} onClick={() => setActiveTab('gemini')} />
                    <Tab title={t('simulation.tab_manual_hand')} isActive={activeTab === 'manual'} onClick={() => setActiveTab('manual')} />
                    <Tab title={t('simulation.tab_scenario_test')} isActive={activeTab === 'tester'} onClick={() => setActiveTab('tester')} />
                    <Tab title={t('simulation.tab_batch_analysis')} isActive={activeTab === 'analyzer'} onClick={() => setActiveTab('analyzer')} />
                    <Tab title={t('simulation.tab_runner')} isActive={activeTab === 'runner'} onClick={() => setActiveTab('runner')} />
                </div>

                {/* Content Area */}
                <div className="w-full flex-grow bg-stone-800 border-2 border-cyan-700/50 rounded-b-xl rounded-tr-xl shadow-2xl overflow-hidden relative">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-10 pointer-events-none"></div>
                     <div className="absolute inset-0 p-6 overflow-y-auto">
                        {activeTab === 'auto' && <AutoSimulator />}
                        {activeTab === 'gemini' && <GeminiSimulator />}
                        {activeTab === 'manual' && <ManualSimulator />}
                        {activeTab === 'tester' && <ScenarioTester />}
                        {activeTab === 'analyzer' && <BatchAnalyzer />}
                        {activeTab === 'runner' && <ScenarioRunner />}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Simulation;
