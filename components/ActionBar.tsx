

import React from 'react';
import { GameState, Action, ActionType } from '../types';

interface ActionBarProps {
  dispatch: React.Dispatch<Action>;
  gameState: GameState;
  onPlayerAction: () => void;
}

const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode, className?: string }> = ({ onClick, disabled = false, children, className = '' }) => {
  const baseClasses = "px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-b-4";
  const enabledClasses = "bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600";
  const disabledClasses = "bg-gray-600 border-gray-800";
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses} ${className}`} style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
      {children}
    </button>
  );
};

const ActionBar: React.FC<ActionBarProps> = ({ dispatch, gameState, onPlayerAction }) => {
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, aiHasFlor, hasFlorBeenCalledThisRound, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence } = gameState;
    const isPlayerTurn = currentTurn === 'player';

    // --- Button Visibility Logic ---
    const canMakeCall = isPlayerTurn && currentTrick === 0 && !playerTricks[0];
    const envidoPhaseAvailable = !hasEnvidoBeenCalledThisRound;

    const canCallFlor = canMakeCall && playerHasFlor;
    const canCallEnvido = canMakeCall && envidoPhaseAvailable && !playerHasFlor && !aiHasFlor;
    const canCallTruco = isPlayerTurn && trucoLevel === 0 && !gamePhase.includes('envido') && !gamePhase.includes('flor');
    const canEscalateToRetruco = isPlayerTurn && trucoLevel === 1 && !gamePhase.includes('envido') && !gamePhase.includes('flor');
    const canEscalateToValeCuatro = isPlayerTurn && trucoLevel === 2 && !gamePhase.includes('envido') && !gamePhase.includes('flor');
    
    const isPlayerRespondingToCall = isPlayerTurn && (gamePhase.includes('_called'));

    const dispatchAction = (action: Action) => {
        onPlayerAction();
        dispatch(action);
    };

    // --- Render Logic ---
    if (gamePhase === 'round_end') {
      return (
        <div className="flex justify-center items-center">
            <ActionButton onClick={() => dispatchAction({ type: ActionType.PROCEED_TO_NEXT_ROUND })} className="font-cinzel tracking-wider text-base md:text-lg !px-5 md:!px-6">
                Siguiente Ronda
            </ActionButton>
        </div>
      )
    }

    // --- Flor Response Buttons ---
    if (isPlayerTurn && gamePhase === 'flor_called') {
        return (
            <>
                {playerHasFlor ? (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_CONTRAFLOR })} className="!from-purple-600 !to-purple-700 !border-purple-900 hover:!from-purple-500 hover:!to-purple-600">
                        ¡Contraflor al Resto!
                    </ActionButton>
                ) : (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.ACKNOWLEDGE_FLOR })} className="!from-green-600 !to-green-700 !border-green-900 hover:!from-green-500 hover:!to-green-600">
                        Ok (Son buenas)
                    </ActionButton>
                )}
            </>
        )
    }
    if (isPlayerTurn && gamePhase === 'contraflor_called') {
        return (
            <>
                <ActionButton onClick={() => dispatchAction({ type: ActionType.ACCEPT_CONTRAFLOR })} className="!from-green-600 !to-green-700 !border-green-900 hover:!from-green-500 hover:!to-green-600">
                    ¡Con Flor Quiero!
                </ActionButton>
                <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLINE_CONTRAFLOR })} className="!from-red-700 !to-red-800 !border-red-900 hover:!from-red-600 hover:!to-red-700">
                    Con Flor me achico
                </ActionButton>
            </>
        )
    }


    const renderResponseButtons = () => {
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && !playerTricks[0] && !aiTricks[0] && !playerHasFlor && !aiHasFlor && !hasEnvidoBeenCalledThisRound;
        const canDeclareFlorOnTruco = gamePhase === 'truco_called' && currentTrick === 0 && !playerTricks[0] && !aiTricks[0] && playerHasFlor && !hasFlorBeenCalledThisRound;
        
        // New: Player can respond to Envido with Flor
        if (gamePhase === 'envido_called' && playerHasFlor) {
             return (
                 <ActionButton onClick={() => dispatchAction({ type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR })} className="!from-purple-600 !to-purple-700 !border-purple-900 hover:!from-purple-500 hover:!to-purple-600">
                    ¡FLOR!
                </ActionButton>
             )
        }
        
        return (
          <>
            {canDeclareFlorOnTruco && (
                <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLARE_FLOR })} className="!from-purple-600 !to-purple-700 !border-purple-900 hover:!from-purple-500 hover:!to-purple-600">
                    ¡FLOR!
                </ActionButton>
            )}
            <ActionButton onClick={() => dispatchAction({ type: ActionType.ACCEPT })} className="!from-green-600 !to-green-700 !border-green-900 hover:!from-green-500 hover:!to-green-600">
                ¡Quiero!
            </ActionButton>
            <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLINE })} className="!from-red-700 !to-red-800 !border-red-900 hover:!from-red-600 hover:!to-red-700">
                No Quiero
            </ActionButton>
            {canCallEnvidoPrimero && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} className="!from-blue-600 !to-blue-700 !border-blue-900 hover:!from-blue-500 hover:!to-blue-600">Envido Primero</ActionButton>}
            {gamePhase === 'truco_called' && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_RETRUCO })}>Retruco</ActionButton>}
            {gamePhase === 'retruco_called' && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_VALE_CUATRO })}>Vale Cuatro</ActionButton>}
            
            {gamePhase === 'envido_called' && envidoPointsOnOffer === 2 && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} className="!from-blue-600 !to-blue-700 !border-blue-900 hover:!from-blue-500 hover:!to-blue-600">Envido</ActionButton>}
            {gamePhase === 'envido_called' && !hasRealEnvidoBeenCalledThisSequence && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_REAL_ENVIDO })} className="!from-sky-600 !to-sky-700 !border-sky-900 hover:!from-sky-500 hover:!to-sky-600">Real Envido</ActionButton>}
            {gamePhase === 'envido_called' && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_FALTA_ENVIDO })} className="!from-indigo-600 !to-indigo-700 !border-indigo-900 hover:!from-indigo-500 hover:!to-indigo-600">Falta Envido</ActionButton>}
          </>
        )
    }

    const renderActionButtons = () => {
        return (
            <>
                {canCallFlor && (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLARE_FLOR })} className="!from-purple-600 !to-purple-700 !border-purple-900 hover:!from-purple-500 hover:!to-purple-600">
                        ¡FLOR!
                    </ActionButton>
                )}
                {canCallEnvido || (canMakeCall && playerHasFlor) ? (
                    <>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} className="!from-blue-600 !to-blue-700 !border-blue-900 hover:!from-blue-500 hover:!to-blue-600">
                            Envido
                        </ActionButton>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_REAL_ENVIDO })} className="!from-sky-600 !to-sky-700 !border-sky-900 hover:!from-sky-500 hover:!to-sky-600">
                            Real Envido
                        </ActionButton>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_FALTA_ENVIDO })} className="!from-indigo-600 !to-indigo-700 !border-indigo-900 hover:!from-indigo-500 hover:!to-indigo-600">
                            Falta Envido
                        </ActionButton>
                    </>
                ) : null}
                { canCallTruco && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_TRUCO })}>Truco</ActionButton> }
                { lastCaller === 'ai' && canEscalateToRetruco && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_RETRUCO })}>Retruco</ActionButton> }
                { lastCaller === 'ai' && canEscalateToValeCuatro && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_VALE_CUATRO })}>Vale Cuatro</ActionButton> }
            </>
        )
    }

    return (
        <div className="flex flex-wrap justify-center items-center gap-2">
            {isPlayerRespondingToCall ? renderResponseButtons() : renderActionButtons()}
        </div>
    );
};

export default ActionBar;
