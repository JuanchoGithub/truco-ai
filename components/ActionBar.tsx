
import React from 'react';
import { GameState, Action, ActionType } from '../types';

interface ActionBarProps {
  dispatch: React.Dispatch<Action>;
  gameState: GameState;
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

const ActionBar: React.FC<ActionBarProps> = ({ dispatch, gameState }) => {
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, aiHasFlor, hasFlorBeenCalledThisRound } = gameState;
    const isPlayerTurn = currentTurn === 'player';

    // --- Button Visibility Logic ---
    const canMakeCall = isPlayerTurn && currentTrick === 0 && !playerTricks[0];
    const envidoPhaseAvailable = !hasEnvidoBeenCalledThisRound && !hasFlorBeenCalledThisRound;

    const canCallFlor = canMakeCall && envidoPhaseAvailable && playerHasFlor;
    // Player can call envido if it's their turn in the first trick, it hasn't been called yet, AND NEITHER PLAYER HAS FLOR.
    const canCallEnvido = canMakeCall && envidoPhaseAvailable && !playerHasFlor && !aiHasFlor;
    const canCallTruco = isPlayerTurn && trucoLevel === 0 && !gamePhase.includes('envido');
    const canEscalateToRetruco = isPlayerTurn && trucoLevel === 1 && !gamePhase.includes('envido');
    const canEscalateToValeCuatro = isPlayerTurn && trucoLevel === 2 && !gamePhase.includes('envido');
    
    const isPlayerRespondingToCall = isPlayerTurn && gamePhase.includes('_called');

    // --- Render Logic ---
    if (gamePhase === 'round_end') {
      return (
        <div className="w-full flex justify-center p-4 h-16 md:h-20 items-center">
            <ActionButton onClick={() => dispatch({ type: ActionType.START_NEW_ROUND })} className="font-cinzel tracking-wider text-base md:text-lg !px-5 md:!px-6">
                Siguiente Ronda
            </ActionButton>
        </div>
      )
    }

    const renderResponseButtons = () => {
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && !playerTricks[0] && !aiTricks[0] && !playerHasFlor && !aiHasFlor && !hasEnvidoBeenCalledThisRound;
        return (
          <>
            <ActionButton onClick={() => dispatch({ type: ActionType.ACCEPT })} className="!from-green-600 !to-green-700 !border-green-900 hover:!from-green-500 hover:!to-green-600">
                ¡Quiero!
            </ActionButton>
            <ActionButton onClick={() => dispatch({ type: ActionType.DECLINE })} className="!from-red-700 !to-red-800 !border-red-900 hover:!from-red-600 hover:!to-red-700">
                No Quiero
            </ActionButton>
            {canCallEnvidoPrimero && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_ENVIDO })} className="!from-blue-600 !to-blue-700 !border-blue-900 hover:!from-blue-500 hover:!to-blue-600">Envido Primero</ActionButton>}
            {gamePhase === 'truco_called' && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_RETRUCO })}>Retruco</ActionButton>}
            {gamePhase === 'retruco_called' && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_VALE_CUATRO })}>Vale Cuatro</ActionButton>}
            {gamePhase === 'envido_called' && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_REAL_ENVIDO })}>Real Envido</ActionButton>}
            {gamePhase === 'envido_called' && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_FALTA_ENVIDO })}>Falta Envido</ActionButton>}
          </>
        )
    }

    const renderActionButtons = () => {
        if (canCallFlor) {
            return (
                 <ActionButton onClick={() => dispatch({ type: ActionType.DECLARE_FLOR })} className="!from-purple-600 !to-purple-700 !border-purple-900 hover:!from-purple-500 hover:!to-purple-600">
                    ¡FLOR!
                </ActionButton>
            )
        }
        return (
            <>
                <ActionButton onClick={() => dispatch({ type: ActionType.CALL_ENVIDO })} disabled={!canCallEnvido}>
                    Envido
                </ActionButton>
                { trucoLevel === 0 && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_TRUCO })} disabled={!canCallTruco}>Truco</ActionButton> }
                { lastCaller === 'ai' && canEscalateToRetruco && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_RETRUCO })}>Retruco</ActionButton> }
                { lastCaller === 'ai' && canEscalateToValeCuatro && <ActionButton onClick={() => dispatch({ type: ActionType.CALL_VALE_CUATRO })}>Vale Cuatro</ActionButton> }
            </>
        )
    }

    return (
        <div className="w-full flex flex-wrap justify-center items-center gap-2 p-2 h-16 md:h-20">
            {isPlayerRespondingToCall ? renderResponseButtons() : renderActionButtons()}
        </div>
    );
};

export default ActionBar;
