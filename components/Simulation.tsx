import React, { useState, useReducer, useEffect, useRef } from 'react';
import { useGameReducer, initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { getRandomizerMove } from '../services/randomizerAiService';
import { GameState, ActionType, Card as CardType, Action } from '../types';
import CardComponent from './Card';
import { getCardName } from '../services/trucoLogic';
import BatchAnalyzer from './BatchAnalyzer';
import { useLocalization } from '../context/LocalizationContext';

// A simple card row display
const HandDisplay: React.FC<{ cards: CardType[], title: string }> = ({ cards, title }) => (
    <div>
        <h3 className="text-lg font-bold text-yellow-200 mb-2">{title}</h3>
        <div className="flex justify-center gap-2">
            {cards.map((card, index) => <CardComponent key={`${card.rank}-${card.suit}-${index}`} card={card} size="small" />)}
            {cards.length === 0 && <p className="text-gray-400">No quedan cartas.</p>}
        </div>
    </div>
);

// A helper to describe an action
const getActionDescription = (action: Action, state: GameState, t: (key: string, options?: any) => string): string => {
    const player = (action as any)?.payload?.player || state.currentTurn;
    const playerName = player === 'ai' ? t('common.ai') : t('common.randomizer');

    switch (action.type) {
        case ActionType.PLAY_CARD:
            const hand = player === 'ai' ? state.aiHand : state.playerHand;
            const card = hand[(action.payload as any).cardIndex];
            return t('simulation_actions.play_card', { playerName, cardName: getCardName(card) });
        case ActionType.CALL_ENVIDO: return t('simulation_actions.call_envido', { playerName });
        case ActionType.CALL_REAL_ENVIDO: return t('simulation_actions.call_real_envido', { playerName });
        case ActionType.CALL_FALTA_ENVIDO: return t('simulation_actions.call_falta_envido', { playerName });
        case ActionType.DECLARE_FLOR: return t('simulation_actions.declare_flor', { playerName });
        case ActionType.CALL_TRUCO: return t('simulation_actions.call_truco', { playerName });
        case ActionType.CALL_RETRUCO: return t('simulation_actions.call_retruco', { playerName });
        case ActionType.CALL_VALE_CUATRO: return t('simulation_actions.call_vale_cuatro', { playerName });
        case ActionType.ACCEPT: return t('simulation_actions.accept', { playerName });
        case ActionType.DECLINE: return t('simulation_actions.decline', { playerName });
        default: return t('simulation_actions.default', { playerName, actionType: action.type });
    }
}

const Simulation: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useLocalization();
    const simInitialState = { ...initialState, messageLog: [] };
    const [state, dispatch] = useReducer(useGameReducer, simInitialState);
    const [isRoundInProgress, setIsRoundInProgress] = useState(false);
    const [eventLog, setEventLog] = useState<string[]>([t('simulation.log_start_message')]);
    const [copyButtonText, setCopyButtonText] = useState(t('simulation.button_copy'));
    const eventLogRef = useRef<HTMLDivElement>(null);
    const previousRoundRef = useRef<number>(0);
    const [showAnalyzer, setShowAnalyzer] = useState(false);

    // Auto-scroll the event log
    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [eventLog]);

    // This effect handles re-initialization when the language changes.
    useEffect(() => {
        if (!isRoundInProgress && (state.round === 0 || state.winner)) {
            setEventLog([t('simulation.log_start_message')]);
        }
        setCopyButtonText(t('simulation.button_copy'));
    }, [t, isRoundInProgress, state.round, state.winner]);

    // Effect to log the start of a round with initial hands
    useEffect(() => {
        // This should only run when the round number actually changes
        if (state.round > 0 && state.round !== previousRoundRef.current) {
            const aiHandStr = state.initialAiHand.map(getCardName).join(', ');
            const randHandStr = state.initialPlayerHand.map(getCardName).join(', ');
            const manoStr = state.mano.toUpperCase();
            
            setEventLog(prevLog => {
                // If it's the very first round (round 1 from 0)
                if (state.round === 1) {
                    const isNewGame = prevLog.length <= 1;
                     return [
                        ...(isNewGame ? [t('simulation.log_new_simulation')] : prevLog),
                        t('simulation.log_round_start', { round: state.round }),
                        t('simulation.log_ai_hand', { hand: aiHandStr }),
                        t('simulation.log_randomizer_hand', { hand: randHandStr }),
                        t('simulation.log_mano', { player: manoStr }),
                    ];
                }
                // For subsequent rounds (2, 3, etc.)
                return [
                    ...prevLog,
                    t('simulation.log_round_start', { round: state.round }),
                    t('simulation.log_ai_hand', { hand: aiHandStr }),
                    t('simulation.log_randomizer_hand', { hand: randHandStr }),
                    t('simulation.log_mano', { player: manoStr }),
                ];
            });
            previousRoundRef.current = state.round;
        }
    }, [state.round, state.initialAiHand, state.initialPlayerHand, state.mano, t]);

    // Effect to handle delayed resolutions after a call is accepted/declined
    useEffect(() => {
        if (!isRoundInProgress) return;

        let resolutionAction: Action | null = null;
        switch (state.gamePhase) {
            case 'ENVIDO_ACCEPTED':
                resolutionAction = { type: ActionType.RESOLVE_ENVIDO_ACCEPT };
                break;
            case 'ENVIDO_DECLINED':
                resolutionAction = { type: ActionType.RESOLVE_ENVIDO_DECLINE };
                break;
            case 'TRUCO_DECLINED':
                resolutionAction = { type: ActionType.RESOLVE_TRUCO_DECLINE };
                break;
            case 'FLOR_SHOWDOWN':
                resolutionAction = { type: ActionType.RESOLVE_FLOR_SHOWDOWN };
                break;
            case 'CONTRAFLOR_DECLINED':
                resolutionAction = { type: ActionType.RESOLVE_CONTRAFLOR_DECLINE };
                break;
            default:
                break;
        }

        if (resolutionAction) {
            // Short delay for simulation to allow state to settle and be observable
            const timeoutId = setTimeout(() => {
                setEventLog(prev => [...prev, t('simulation.log_resolving', { phase: state.gamePhase })]);
                dispatch(resolutionAction!);
            }, 150);
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, isRoundInProgress, t]);

    // Effect to run the turn-by-turn simulation
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
            let playerName;
            let logicKey;
            if (state.currentTurn === 'ai') {
                move = getLocalAIMove(state);
                playerName = t('common.ai');
                logicKey = 'simulation.log_ai_logic';
            } else { // Randomizer is the 'player'
                move = getRandomizerMove(state);
                playerName = t('common.randomizer');
                logicKey = 'simulation.log_randomizer_logic';
            }
            
            if ((move.action as any).type === "NO_OP") {
                return;
            }

            const actionDesc = getActionDescription(move.action, state, t);
            // Reformat reasoning for better display in the log
            const formattedReasoning = move.reasoning
                .split('\n')
                .map(line => `  ${line}`) // Indent each line
                .join('\n');
            const reasoningLog = t(logicKey, { reasoning: formattedReasoning });

            setEventLog(prev => [...prev, actionDesc, reasoningLog]);
            dispatch(move.action);
        };
        
        const isResolving = state.gamePhase.includes('_ACCEPTED') || 
                            state.gamePhase.includes('_DECLINED') ||
                            state.gamePhase.includes('_SHOWDOWN');
        const delay = isResolving ? 600 : 300;
        const timerId = setTimeout(handleTurn, delay);
        return () => clearTimeout(timerId);

    }, [isRoundInProgress, state, t]);

    const handleNextRound = () => {
        if (state.winner) {
            setEventLog([t('simulation.log_new_simulation')]);
            previousRoundRef.current = 0; // Reset for the new game
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
            if (log.startsWith('---')) {
                return `\n${log}\n`;
            }
            if (log.startsWith('[Lógica') || log.startsWith('[AI Logic')) {
                // Un-indent the reasoning for cleaner copy
                return log.split('\n').map(line => line.trim()).join('\n');
            }
            return log;
        }).join('\n');

        navigator.clipboard.writeText(logText).then(() => {
            setCopyButtonText(t('simulation.button_copied'));
            setTimeout(() => setCopyButtonText(t('simulation.button_copy')), 2000);
        }, (err) => {
            console.error('Error copying text: ', err);
            setCopyButtonText(t('simulation.button_copy_error'));
            setTimeout(() => setCopyButtonText(t('simulation.button_copy')), 2000);
        });
    };

    return (
        <div className="h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 gap-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
            <div className="w-full max-w-6xl flex justify-between items-center flex-shrink-0">
                <h1 className="text-3xl font-cinzel text-cyan-300">{t('simulation.title')}</h1>
                <div className="flex gap-4">
                    <button onClick={handleNextRound} disabled={isRoundInProgress} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors">
                        {isRoundInProgress ? t('simulation.button_simulating') : (state.winner ? t('simulation.button_restart') : t('simulation.button_simulate_round'))}
                    </button>
                    <button onClick={() => setShowAnalyzer(true)} className="px-4 py-2 rounded-lg font-bold text-white bg-purple-600 border-b-4 border-purple-800 hover:bg-purple-500 transition-colors">
                        {t('simulation.button_batch_analyzer')}
                    </button>
                    <button onClick={handleCopy} className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors">
                        {copyButtonText}
                    </button>
                    <button onClick={onExit} className="px-4 py-2 rounded-lg font-bold text-white bg-red-700 border-b-4 border-red-900 hover:bg-red-600">{t('simulation.button_exit')}</button>
                </div>
            </div>

            <div className="w-full max-w-6xl bg-black/40 p-4 rounded-lg border-2 border-cyan-800/50 flex-grow grid grid-cols-3 gap-4 overflow-hidden">
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="bg-black/30 p-3 rounded-md">
                        <h2 className="text-xl font-bold text-cyan-200 mb-2">{t('simulation.scoreboard_title')}</h2>
                        <p>{t('common.ai')}: <span className="font-mono text-lg">{state.aiScore}</span></p>
                        <p>{t('common.randomizer')}: <span className="font-mono text-lg">{state.playerScore}</span></p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-md">
                         <h2 className="text-xl font-bold text-cyan-200 mb-2">{t('simulation.round_status_title', { round: state.round })}</h2>
                         <p>{t('simulation.phase')}: <span className="font-mono text-sm">{state.gamePhase}</span></p>
                         <p>{t('simulation.turn')}: <span className="font-mono text-sm">{state.currentTurn?.toUpperCase() ?? t('common.na')}</span></p>
                         <p>{t('simulation.mano')}: <span className="font-mono text-sm">{state.mano.toUpperCase()}</span></p>
                    </div>
                     <div className="bg-black/30 p-3 rounded-md flex-grow">
                        <HandDisplay cards={state.initialAiHand} title={t('simulation.initial_hand_ai')} />
                        <hr className="my-4 border-cyan-700/50"/>
                        <HandDisplay cards={state.initialPlayerHand} title={t('simulation.initial_hand_randomizer')} />
                    </div>
                </div>

                <div ref={eventLogRef} className="col-span-2 bg-black/50 p-4 rounded-md overflow-y-auto font-mono text-sm border border-cyan-700/50">
                    {eventLog.map((log, index) => {
                        if (log.startsWith('---')) {
                            return <p key={index} className="whitespace-pre-wrap text-yellow-300 my-2 font-bold">{log}</p>;
                        }
                        if (log.startsWith('[Lógica') || log.startsWith('[AI Logic')) {
                            return <p key={index} className="whitespace-pre-wrap text-gray-400 mt-1 mb-3 pl-2 border-l-2 border-gray-600">{log}</p>;
                        }
                        return <p key={index} className="whitespace-pre-wrap text-cyan-200">{log}</p>;
                    })}
                </div>
            </div>
            {showAnalyzer && <BatchAnalyzer onExit={() => setShowAnalyzer(false)} />}
        </div>
    );
};

export default Simulation;