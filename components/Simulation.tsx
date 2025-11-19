
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

// --- Shared UI Components ---

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
                        {state.currentTurn?.toUpperCase() || '-'}
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
                         <div className="text-stone-500 text-[10px] uppercase">{t('common.opponent')}</div>
                         <div className="text-green-400 font-bold text-lg leading-none">{state.playerScore}</div>
                     </div>
                 </div>
                 {state.winner && (
                     <div className="px-2 py-1 bg-yellow-600/20 border border-yellow-600/50 rounded text-yellow-400 text-xs font-bold animate-pulse">
                         WINNER: {state.winner.toUpperCase()}
                     </div>
                 )}
             </div>
        </div>
    );
};

const MiniCard: React.FC<{ card: CardType | null; onClick?: () => void; isClickable?: boolean }> = ({ card, onClick, isClickable }) => (
    <div 
        onClick={onClick} 
        className={`
            w-12 h-[78px] lg:w-16 lg:h-[104px] rounded border border-stone-600 bg-stone-800 shadow-lg flex items-center justify-center relative select-none
            ${isClickable ? 'cursor-pointer hover:-translate-y-1 hover:border-amber-500 transition-transform' : ''}
        `}
    >
        {card ? (
             <CardComponent card={card} size="small" className="!w-full !h-full" />
        ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <div className="w-4 h-6 border-2 border-dashed border-white/10 rounded-sm"></div>
            </div>
        )}
    </div>
);

const CompactHandDisplay: React.FC<{ 
    cards: (CardType | null)[]; 
    title: string; 
    labelSide?: 'top' | 'bottom';
    onCardClick?: (index: number) => void 
}> = ({ cards, title, labelSide = 'top', onCardClick }) => (
    <div className="flex flex-col items-center gap-1">
        {labelSide === 'top' && <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{title}</span>}
        <div className="flex gap-2">
            {cards.map((card, i) => (
                <MiniCard 
                    key={i} 
                    card={card} 
                    onClick={onCardClick ? () => onCardClick(i) : undefined} 
                    isClickable={!!onCardClick} 
                />
            ))}
        </div>
        {labelSide === 'bottom' && <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{title}</span>}
    </div>
);

// --- Helpers ---

const renderReasoning = (reasoningArray: (string | MessageObject)[], t: (key: string, options?: any) => string): string => {
    if (!reasoningArray) return "";
    return reasoningArray.map(reason => {
        if (typeof reason === 'string') return reason;
        const options: { [key: string]: any } = { ...reason.options };
        if (options.statusKey) options.status = t(`ai_logic.statuses.${options.statusKey}`);
        if (options.player) options.player = options.player === 'ai' ? t('common.ai') : t('common.randomizer');
        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                else if ('rank' in options[key] && 'suit' in options[key]) options[key] = getCardName(options[key] as CardType);
            } else if (key === 'suit' && typeof options[key] === 'string') options[key] = t(`common.card_suits.${options[key]}`);
        }
        return t(reason.key, options);
    }).join('\n');
};

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

const getValidActions = (state: GameState): Action[] => {
    // (Same logic as before, kept for ManualSimulator)
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
     // (Same mirroring logic as before)
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

const CardPickerModal: React.FC<{
    availableCards: CardType[];
    onSelect: (card: CardType) => void;
    onExit: () => void;
}> = ({ availableCards, onSelect, onExit }) => {
    const { t } = useLocalization();
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
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

// --- Sub-Tools ---

const AutoSimulator: React.FC = () => {
    const { t } = useLocalization();
    const simInitialState = { ...initialState, messageLog: [] };
    const [state, dispatch] = useReducer(useGameReducer, simInitialState);
    const [isRoundInProgress, setIsRoundInProgress] = useState(false);
    const [eventLog, setEventLog] = useState<string[]>([t('simulation.log_start_message')]);
    const eventLogRef = useRef<HTMLDivElement>(null);
    const previousRoundRef = useRef<number>(0);

    useEffect(() => {
        if (eventLogRef.current) eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }, [eventLog]);

    // ... (Keep existing AutoSimulator logic for useEffects: reset log, round start log, resolution actions, game loop) ...
     useEffect(() => {
        if (!isRoundInProgress && (state.round === 0 || state.winner)) {
            setEventLog([t('simulation.log_start_message')]);
        }
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

    return (
        <div className="flex flex-col h-full w-full bg-stone-900">
             <SimHeaderHUD state={state} />
             <div className="flex flex-grow overflow-hidden relative">
                 {/* Game Board Area */}
                 <div className="w-2/3 relative bg-[#0f5132] shadow-inner flex flex-col justify-between p-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
                      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                      
                      <div className="relative z-10 flex justify-center pt-4">
                          <CompactHandDisplay cards={state.aiHand} title={t('simulation.initial_hand_ai')} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center gap-12 opacity-90">
                           <CompactHandDisplay cards={state.aiTricks} title={t('simulation.manual.ai_tricks')} labelSide="bottom" />
                           <CompactHandDisplay cards={state.playerTricks} title={t('simulation.manual.opponent_tricks')} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center pb-4">
                          <CompactHandDisplay cards={state.playerHand} title={t('simulation.initial_hand_randomizer')} />
                      </div>
                 </div>

                 {/* Log & Controls */}
                 <div className="w-1/3 bg-stone-950 border-l border-stone-700 flex flex-col">
                     <div ref={eventLogRef} className="flex-grow overflow-y-auto p-3 font-vt323 text-sm text-stone-300 space-y-1 custom-scrollbar">
                         {eventLog.map((log, index) => {
                            if (log.startsWith('---')) return <p key={index} className="text-amber-400 font-bold mt-2 border-t border-white/10 pt-1">{log}</p>;
                            if (log.startsWith('[Lógica') || log.startsWith('[AI Logic')) return <pre key={index} className="whitespace-pre-wrap text-cyan-600/80 text-[10px] font-sans mb-1">{log}</pre>;
                            return <p key={index} className="whitespace-pre-wrap"><span className="text-stone-600">&gt;</span> {log}</p>;
                        })}
                     </div>
                     <div className="p-3 border-t border-white/10 bg-stone-900">
                        <button onClick={handleNextRound} disabled={isRoundInProgress} className="w-full py-3 rounded bg-green-700 hover:bg-green-600 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg">
                            {isRoundInProgress ? t('simulation.button_simulating') : (state.winner ? t('simulation.button_restart') : t('simulation.button_simulate_round'))}
                        </button>
                     </div>
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
    
    // Central message state
    const [localMessage, setLocalMessage] = useState<string | null>(null);
    const [isMessageVisible, setIsMessageVisible] = useState(false);
    const messageTimers = useRef<{ fadeOutTimerId?: number; clearTimerId?: number }>({});

    const [setupState, setSetupState] = useState({
        aiScore: 0,
        playerScore: 0,
        mano: 'player' as Player,
        aiHand: [null, null, null] as (CardType | null)[],
        playerHand: [null, null, null] as (CardType | null)[]
    });

    // ... (Keep existing ManualSimulator logic: useEffects for resolution, central message, available cards, picker handlers) ...
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
            const timeoutId = setTimeout(() => { dispatch(resolutionAction!); }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, simPhase, t]);

    const clearMessageState = () => { dispatch({ type: ActionType.CLEAR_CENTRAL_MESSAGE }); setLocalMessage(null); };
    const handleDismissMessage = () => {
        clearTimeout(messageTimers.current.fadeOutTimerId);
        clearTimeout(messageTimers.current.clearTimerId);
        setIsMessageVisible(false);
        messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 500);
    };

    useEffect(() => {
        if (simPhase !== 'play' || !state.centralMessage) return;
        const options = { ...state.centralMessage.options };
        if (options.winnerName) options.winnerName = translatePlayerName(options.winnerName);
        if (options.winner) options.winner = translatePlayerName(options.winner);
        const translatedMessage = t(state.centralMessage.key, options);
        setLocalMessage(translatedMessage);
        setIsMessageVisible(true);
        setManualEventLog(prev => [...prev, `--- ${t('simulation.manual.log_event')}: ${translatedMessage} ---`]);
        if (!state.isCentralMessagePersistent) {
            messageTimers.current.fadeOutTimerId = window.setTimeout(() => setIsMessageVisible(false), 1500);
            messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 2000);
        }
    }, [state.centralMessage, simPhase, t, translatePlayerName]);

    const availableCards = useMemo(() => {
        const selected = [...setupState.aiHand, ...setupState.playerHand].filter(c => c !== null);
        return FULL_DECK.filter(deckCard => !selected.some(sel => sel && sel.rank === deckCard.rank && sel.suit === deckCard.suit));
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
    const isSetupComplete = useMemo(() => setupState.aiHand.every(c => c !== null) && setupState.playerHand.every(c => c !== null), [setupState.aiHand, setupState.playerHand]);

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
            `${t('simulation.manual.scores_mano')}: AI ${setupState.aiScore} - OPP ${setupState.playerScore} | Mano: ${setupState.mano.toUpperCase()}`
        ]);
        setSimPhase('play');
        setAiSuggestion(null);
    };

    const validActions = useMemo(() => (simPhase === 'play' && !state.winner ? getValidActions(state) : []), [state, simPhase]);

    const handleActionClick = (action: Action) => {
        if (state.isCentralMessagePersistent) handleDismissMessage();
        setAiSuggestion(null);
        const actionDesc = getActionDescription(action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')});
        setManualEventLog(prev => [...prev, actionDesc]);
        dispatch(action);
    };

    const handleAskAi = () => {
        let suggestion: AiMove;
        let stateToSimulate = state;
        if (state.currentTurn === 'player') stateToSimulate = createMirroredState(state);
        suggestion = getLocalAIMove(stateToSimulate);
        if (state.currentTurn === 'player') {
             if (suggestion.action.type === ActionType.PLAY_CARD && suggestion.action.payload.player === 'ai') suggestion.action.payload.player = 'player';
            if (suggestion.action.type === ActionType.DECLARE_FLOR && suggestion.action.payload?.player === 'ai') suggestion.action.payload.player = 'player';
        }
        setAiSuggestion(suggestion);
        const actionDesc = getActionDescription(suggestion.action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')});
        const reasoningDesc = renderReasoning(suggestion.reasoning, t);
        setManualEventLog(prev => {
            const filteredLog = prev.filter(entry => !entry.startsWith('🤖'));
            return [...filteredLog, `🤖 AI Suggests: ${actionDesc}\n${reasoningDesc.split('\n').map(l => `  ${l}`).join('\n')}`];
        });
    };

    if (simPhase === 'setup') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-stone-900">
                <h2 className="text-xl font-bold text-cyan-400 font-cinzel tracking-widest mb-6 uppercase border-b border-cyan-900 pb-2">{t('simulation.manual.setup_title')}</h2>
                
                <div className="w-full max-w-4xl bg-stone-800 rounded-xl p-6 shadow-2xl border border-stone-700 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Config */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t('simulation.manual.scores_mano')}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[10px] text-stone-400 block uppercase">AI Score</label><input type="number" value={setupState.aiScore} onChange={e => setSetupState(s => ({...s, aiScore: parseInt(e.target.value)}))} className="w-full bg-black/30 border border-stone-600 rounded p-2 text-white"/></div>
                            <div><label className="text-[10px] text-stone-400 block uppercase">Opp Score</label><input type="number" value={setupState.playerScore} onChange={e => setSetupState(s => ({...s, playerScore: parseInt(e.target.value)}))} className="w-full bg-black/30 border border-stone-600 rounded p-2 text-white"/></div>
                        </div>
                        <div>
                            <label className="text-[10px] text-stone-400 block uppercase mb-1">{t('simulation.manual.mano')}</label>
                            <div className="flex bg-black/30 rounded border border-stone-600 overflow-hidden">
                                <button onClick={() => setSetupState(s => ({...s, mano: 'ai'}))} className={`flex-1 py-2 text-xs font-bold ${setupState.mano === 'ai' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}>{t('common.ai')}</button>
                                <button onClick={() => setSetupState(s => ({...s, mano: 'player'}))} className={`flex-1 py-2 text-xs font-bold ${setupState.mano === 'player' ? 'bg-amber-600 text-white' : 'text-stone-500 hover:text-stone-300'}`}>{t('common.opponent')}</button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Hands */}
                    <div className="bg-black/20 rounded-lg border border-white/5 p-4 flex flex-col justify-center items-center">
                         <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">{t('simulation.manual.ai_hand')}</h3>
                         <div className="flex gap-2">
                             {setupState.aiHand.map((c, i) => <MiniCard key={i} card={c} onClick={() => handleOpenPicker('ai', i)} isClickable />)}
                         </div>
                    </div>
                     <div className="bg-black/20 rounded-lg border border-white/5 p-4 flex flex-col justify-center items-center">
                         <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">{t('simulation.manual.opponent_hand')}</h3>
                         <div className="flex gap-2">
                             {setupState.playerHand.map((c, i) => <MiniCard key={i} card={c} onClick={() => handleOpenPicker('player', i)} isClickable />)}
                         </div>
                    </div>
                </div>

                <button onClick={handleStartRound} disabled={!isSetupComplete} className="mt-8 px-10 py-3 rounded bg-green-600 text-white font-bold uppercase tracking-wider shadow-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105">
                    {t('simulation.manual.start_round')}
                </button>
                
                {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
            </div>
        );
    }

    // Play Phase
    return (
        <div className="flex flex-col h-full w-full bg-stone-900 relative">
            <CentralMessage message={localMessage} isVisible={isMessageVisible} onDismiss={handleDismissMessage} />
            {isLogModalOpen && <ManualLogModal log={manualEventLog} onClose={() => setIsLogModalOpen(false)} />}
            
            <SimHeaderHUD state={state} />
            
            <div className="flex flex-grow overflow-hidden">
                {/* LEFT: Actions & Controls */}
                <div className="w-64 flex-shrink-0 bg-stone-950 border-r border-stone-700 flex flex-col">
                     <div className="p-3 border-b border-stone-800">
                         <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">{t('simulation.manual.valid_actions_for')} <span className="text-cyan-400">{state.currentTurn?.toUpperCase()}</span></h3>
                         <div className="grid grid-cols-2 gap-2">
                            {validActions.map((action, i) => (
                                <button key={i} onClick={() => handleActionClick(action)} className="px-2 py-3 bg-cyan-900/20 border border-cyan-700/30 hover:bg-cyan-800/40 hover:border-cyan-500 rounded text-cyan-100 text-[10px] font-medium leading-tight transition-all active:scale-95">
                                    {getActionDescription(action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')})}
                                </button>
                            ))}
                         </div>
                     </div>
                     
                     <div className="p-3 flex-grow flex flex-col overflow-hidden">
                         <h3 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-2">AI Brain</h3>
                         <button onClick={handleAskAi} className="w-full py-2 mb-3 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold uppercase rounded shadow-md transition-colors">
                             {t('simulation.manual.ask_ai')}
                         </button>
                         {aiSuggestion && (
                             <div className="flex-grow overflow-y-auto bg-black/30 rounded border border-purple-900/50 p-2 custom-scrollbar">
                                 <div className="text-xs text-purple-200 font-bold mb-1">{getActionDescription(aiSuggestion.action, state, t, {ai: t('common.ai'), opponent: t('common.opponent')})}</div>
                                 <pre className="text-[10px] text-purple-300/70 font-mono whitespace-pre-wrap leading-tight">{renderReasoning(aiSuggestion.reasoning, t)}</pre>
                             </div>
                         )}
                     </div>

                     <div className="p-3 border-t border-stone-800 flex gap-2">
                         <button onClick={() => setIsLogModalOpen(true)} className="flex-1 py-2 bg-stone-800 text-stone-400 hover:text-white text-[10px] font-bold uppercase rounded">{t('simulation.manual.view_log')}</button>
                         <button onClick={() => { setSimPhase('setup'); setManualEventLog([]); setAiSuggestion(null); }} className="flex-1 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 text-[10px] font-bold uppercase rounded">{t('simulation.manual.reset')}</button>
                     </div>
                </div>
                
                {/* RIGHT: Game Table */}
                <div className="flex-grow relative bg-[#0f5132] shadow-inner flex flex-col justify-between p-6" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')" }}>
                      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                      
                      <div className="relative z-10 flex justify-center">
                          <CompactHandDisplay cards={state.aiHand} title={t('simulation.manual.ai_hand')} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center gap-16 opacity-90">
                           <CompactHandDisplay cards={state.aiTricks} title={t('simulation.manual.ai_tricks')} labelSide="bottom" />
                           <CompactHandDisplay cards={state.playerTricks} title={t('simulation.manual.opponent_tricks')} labelSide="bottom" />
                      </div>

                      <div className="relative z-10 flex justify-center">
                          <CompactHandDisplay cards={state.playerHand} title={t('simulation.manual.opponent_hand')} />
                      </div>
                 </div>
            </div>
            
            {pickerState.open && <CardPickerModal availableCards={availableCards} onSelect={handleCardSelect} onExit={() => setPickerState({ ...pickerState, open: false })} />}
        </div>
    );
};

// --- Main Simulation Component ---

type SimTab = 'auto' | 'manual' | 'tester' | 'analyzer' | 'runner' | 'gemini';

const Simulation: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState<SimTab>('auto');

    const NavButton: React.FC<{ tab: SimTab, label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab 
                ? 'text-cyan-300 border-cyan-500 bg-white/5' 
                : 'text-stone-500 border-transparent hover:text-stone-300 hover:bg-white/5'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="h-screen bg-stone-950 text-white font-sans flex flex-col overflow-hidden">
             {/* Header */}
            <div className="flex-shrink-0 h-12 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 select-none z-20">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                    <span className="font-cinzel font-bold text-stone-200 tracking-widest text-sm">TRUCO SIMULATOR</span>
                </div>
                <div className="flex h-full">
                    <NavButton tab="auto" label={t('simulation.tab_auto_hand')} />
                    <NavButton tab="gemini" label={t('simulation.tab_gemini')} />
                    <NavButton tab="manual" label={t('simulation.tab_manual_hand')} />
                    <NavButton tab="tester" label={t('simulation.tab_scenario_test')} />
                    <NavButton tab="analyzer" label={t('simulation.tab_batch_analysis')} />
                    <NavButton tab="runner" label={t('simulation.tab_runner')} />
                </div>
                <button onClick={onExit} className="text-stone-500 hover:text-red-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Content Area */}
            <div className="flex-grow relative overflow-hidden bg-stone-900">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                 <div className="absolute inset-0 p-0">
                    {activeTab === 'auto' && <AutoSimulator />}
                    {activeTab === 'gemini' && <GeminiSimulator />}
                    {activeTab === 'manual' && <ManualSimulator />}
                    {activeTab === 'tester' && <ScenarioTester />}
                    {activeTab === 'analyzer' && <BatchAnalyzer />}
                    {activeTab === 'runner' && <ScenarioRunner />}
                 </div>
            </div>
        </div>
    );
};

export default Simulation;
