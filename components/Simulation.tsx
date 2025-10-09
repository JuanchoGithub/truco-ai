import React, { useState, useReducer, useEffect, useRef } from 'react';
import { useGameReducer, initialState } from '../hooks/useGameReducer';
import { getLocalAIMove } from '../services/localAiService';
import { getRandomizerMove } from '../services/randomizerAiService';
import { GameState, ActionType, Card as CardType, Action } from '../types';
import CardComponent from './Card';
import { getCardName } from '../services/trucoLogic';

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
const getActionDescription = (action: Action, state: GameState): string => {
    const player = (action as any)?.payload?.player || state.currentTurn;
    const playerName = player === 'ai' ? 'IA' : 'Randomizer';

    switch (action.type) {
        case ActionType.PLAY_CARD:
            const hand = player === 'ai' ? state.aiHand : state.playerHand;
            const card = hand[(action.payload as any).cardIndex];
            return `${playerName} juega ${getCardName(card)}.`;
        case ActionType.CALL_ENVIDO: return `${playerName} canta ENVIDO.`;
        case ActionType.CALL_REAL_ENVIDO: return `${playerName} canta REAL ENVIDO.`;
        case ActionType.CALL_FALTA_ENVIDO: return `${playerName} canta FALTA ENVIDO.`;
        case ActionType.DECLARE_FLOR: return `${playerName} canta FLOR.`;
        case ActionType.CALL_TRUCO: return `${playerName} canta TRUCO.`;
        case ActionType.CALL_RETRUCO: return `${playerName} canta RETRUCO.`;
        case ActionType.CALL_VALE_CUATRO: return `${playerName} canta VALE CUATRO.`;
        case ActionType.ACCEPT: return `${playerName} dice QUIERO.`;
        case ActionType.DECLINE: return `${playerName} dice NO QUIERO.`;
        default: return `${playerName} realiza la acción ${action.type}`;
    }
}

const Simulation: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const simInitialState = { ...initialState, messageLog: [] };
    const [state, dispatch] = useReducer(useGameReducer, simInitialState);
    const [isRoundInProgress, setIsRoundInProgress] = useState(false);
    const [eventLog, setEventLog] = useState<string[]>(['Haz clic en "Simular Ronda" para empezar.']);
    const [copyButtonText, setCopyButtonText] = useState('Copiar Texto');
    const eventLogRef = useRef<HTMLDivElement>(null);
    const previousRoundRef = useRef<number>(0);

    // Auto-scroll the event log
    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [eventLog]);

    // Effect to log the start of a round with initial hands
    useEffect(() => {
        // This should only run when the round number actually changes
        if (state.round > 0 && state.round !== previousRoundRef.current) {
            const aiHandStr = `Mano IA: ${state.initialAiHand.map(getCardName).join(', ')}`;
            const randHandStr = `Mano Randomizer: ${state.initialPlayerHand.map(getCardName).join(', ')}`;
            const manoStr = `Mano (empieza): ${state.mano.toUpperCase()}`;
            
            setEventLog(prevLog => {
                // If it's the very first round (round 1 from 0)
                if (state.round === 1) {
                    const isNewGame = prevLog.length <= 1; // "Haz clic..." or "NUEVA SIM..."
                     return [
                        ...(isNewGame ? ['--- INICIO DE SIMULACIÓN ---'] : prevLog),
                        `--- RONDA ${state.round} ---`,
                        aiHandStr,
                        randHandStr,
                        manoStr,
                    ];
                }
                // For subsequent rounds (2, 3, etc.)
                return [
                    ...prevLog,
                    `--- RONDA ${state.round} ---`,
                    aiHandStr,
                    randHandStr,
                    manoStr,
                ];
            });
            previousRoundRef.current = state.round;
        }
    }, [state.round, state.initialAiHand, state.initialPlayerHand, state.mano]);

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
                setEventLog(prev => [...prev, `...Resolviendo ${state.gamePhase}...`]);
                dispatch(resolutionAction!);
            }, 150);
            return () => clearTimeout(timeoutId);
        }
    }, [state.gamePhase, isRoundInProgress]);

    // Effect to run the turn-by-turn simulation
    useEffect(() => {
        if (!isRoundInProgress || !state.currentTurn || state.winner || state.gamePhase === 'round_end') {
            if (isRoundInProgress) {
                setIsRoundInProgress(false);
                if (state.winner) {
                    setEventLog(prev => [...prev, `--- ${state.winner === 'ai' ? 'IA GANA EL JUEGO' : 'RANDOMIZER GANA EL JUEGO'} ---`]);
                } else if (state.gamePhase === 'round_end') {
                     setEventLog(prev => [...prev, `--- FIN DE LA RONDA ${state.round} ---`, `Ganador: ${state.lastRoundWinner?.toUpperCase()}`, `Marcador: IA ${state.aiScore} - Randomizer ${state.playerScore}`]);
                }
            }
            return;
        }

        const handleTurn = () => {
            let move;
            let playerName;
            if (state.currentTurn === 'ai') {
                move = getLocalAIMove(state);
                playerName = 'IA';
            } else { // Randomizer is the 'player'
                move = getRandomizerMove(state);
                playerName = 'Randomizer';
            }
            
            if ((move.action as any).type === "NO_OP") {
                return;
            }

            const actionDesc = getActionDescription(move.action, state);
            // Reformat reasoning for better display in the log
            const formattedReasoning = move.reasoning
                .split('\n')
                .map(line => `  ${line}`) // Indent each line
                .join('\n');
            const reasoningLog = `[Lógica de ${playerName}]:\n${formattedReasoning}`;

            setEventLog(prev => [...prev, actionDesc, reasoningLog]);
            dispatch(move.action);
        };
        
        const isResolving = state.gamePhase.includes('_ACCEPTED') || 
                            state.gamePhase.includes('_DECLINED') ||
                            state.gamePhase.includes('_SHOWDOWN');
        const delay = isResolving ? 600 : 300;
        const timerId = setTimeout(handleTurn, delay);
        return () => clearTimeout(timerId);

    }, [isRoundInProgress, state]);

    const handleNextRound = () => {
        if (state.winner) {
            setEventLog([`--- NUEVA SIMULACIÓN ---`]);
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
            if (log.startsWith('[Lógica')) {
                // Un-indent the reasoning for cleaner copy
                return log.split('\n').map(line => line.trim()).join('\n');
            }
            return log;
        }).join('\n');

        navigator.clipboard.writeText(logText).then(() => {
            setCopyButtonText('¡Copiado!');
            setTimeout(() => setCopyButtonText('Copiar Texto'), 2000);
        }, (err) => {
            console.error('Error al copiar texto: ', err);
            setCopyButtonText('Error');
            setTimeout(() => setCopyButtonText('Copiar Texto'), 2000);
        });
    };

    return (
        <div className="h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 gap-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
            <div className="w-full max-w-6xl flex justify-between items-center flex-shrink-0">
                <h1 className="text-3xl font-cinzel text-cyan-300">Modo Simulación</h1>
                <div className="flex gap-4">
                    <button onClick={handleNextRound} disabled={isRoundInProgress} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 border-b-4 border-green-800 hover:bg-green-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors">
                        {isRoundInProgress ? 'Simulando...' : (state.winner ? 'Reiniciar' : 'Simular Ronda')}
                    </button>
                    <button onClick={handleCopy} className="px-4 py-2 rounded-lg font-bold text-white bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 disabled:bg-gray-500 disabled:border-gray-700 transition-colors">
                        {copyButtonText}
                    </button>
                    <button onClick={onExit} className="px-4 py-2 rounded-lg font-bold text-white bg-red-700 border-b-4 border-red-900 hover:bg-red-600">Volver al Menú</button>
                </div>
            </div>

            <div className="w-full max-w-6xl bg-black/40 p-4 rounded-lg border-2 border-cyan-800/50 flex-grow grid grid-cols-3 gap-4 overflow-hidden">
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="bg-black/30 p-3 rounded-md">
                        <h2 className="text-xl font-bold text-cyan-200 mb-2">Marcador</h2>
                        <p>IA: <span className="font-mono text-lg">{state.aiScore}</span></p>
                        <p>Randomizer: <span className="font-mono text-lg">{state.playerScore}</span></p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-md">
                         <h2 className="text-xl font-bold text-cyan-200 mb-2">Estado Ronda {state.round}</h2>
                         <p>Fase: <span className="font-mono text-sm">{state.gamePhase}</span></p>
                         <p>Turno: <span className="font-mono text-sm">{state.currentTurn?.toUpperCase() ?? 'N/A'}</span></p>
                         <p>Mano: <span className="font-mono text-sm">{state.mano.toUpperCase()}</span></p>
                    </div>
                     <div className="bg-black/30 p-3 rounded-md flex-grow">
                        <HandDisplay cards={state.initialAiHand} title="Mano Inicial IA" />
                        <hr className="my-4 border-cyan-700/50"/>
                        <HandDisplay cards={state.initialPlayerHand} title="Mano Inicial Randomizer" />
                    </div>
                </div>

                <div ref={eventLogRef} className="col-span-2 bg-black/50 p-4 rounded-md overflow-y-auto font-mono text-sm border border-cyan-700/50">
                    {eventLog.map((log, index) => {
                        if (log.startsWith('---')) {
                            return <p key={index} className="whitespace-pre-wrap text-yellow-300 my-2 font-bold">{log}</p>;
                        }
                        if (log.startsWith('[Lógica')) {
                            return <p key={index} className="whitespace-pre-wrap text-gray-400 mt-1 mb-3 pl-2 border-l-2 border-gray-600">{log}</p>;
                        }
                        return <p key={index} className="whitespace-pre-wrap text-cyan-200">{log}</p>;
                    })}
                </div>
            </div>
        </div>
    );
};

export default Simulation;
