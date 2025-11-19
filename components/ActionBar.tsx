
import React from 'react';
import { GameState, Action, ActionType } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface ActionBarProps {
  dispatch: React.Dispatch<Action>;
  gameState: GameState;
  onPlayerAction: () => void;
}

const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode, className?: string, variant?: 'primary' | 'secondary' | 'danger' | 'special' }> = ({ onClick, disabled = false, children, className = '', variant = 'primary' }) => {
  
  // Default (Truco/Gold)
  let gradientClasses = "bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700 border-yellow-800 text-yellow-50 hover:from-yellow-400 hover:to-yellow-600";
  let shadowColor = "shadow-yellow-900/50";

  if (variant === 'secondary') { // Envido (Blue)
      gradientClasses = "bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 border-blue-900 text-blue-50 hover:from-blue-500 hover:to-blue-700";
      shadowColor = "shadow-blue-900/50";
  } else if (variant === 'danger') { // Decline (Red)
      gradientClasses = "bg-gradient-to-b from-red-600 via-red-700 to-red-800 border-red-900 text-red-50 hover:from-red-500 hover:to-red-700";
      shadowColor = "shadow-red-900/50";
  } else if (variant === 'special') { // Flor (Purple)
      gradientClasses = "bg-gradient-to-b from-purple-600 via-purple-700 to-purple-800 border-purple-900 text-purple-50 hover:from-purple-500 hover:to-purple-700";
      shadowColor = "shadow-purple-900/50";
  } else if (className.includes('green')) { // Accept (Green)
      gradientClasses = "bg-gradient-to-b from-green-600 via-green-700 to-green-800 border-green-900 text-green-50 hover:from-green-500 hover:to-green-700";
      shadowColor = "shadow-green-900/50";
  }
  
  const baseClasses = "w-full h-full min-h-[48px] lg:min-h-[44px] px-2 py-2 lg:px-4 lg:py-2 text-xs lg:text-sm font-bold uppercase tracking-wider rounded-lg shadow-md active:shadow-inner active:translate-y-[2px] transition-all border-b-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${gradientClasses} ${shadowColor} ${className}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
      {children}
    </button>
  );
};

const ActionBar: React.FC<ActionBarProps> = ({ dispatch, gameState, onPlayerAction }) => {
    const { t } = useLocalization();
    const { gamePhase, currentTurn, lastCaller, trucoLevel, hasEnvidoBeenCalledThisRound, playerTricks, aiTricks, currentTrick, playerHasFlor, aiHasFlor, hasFlorBeenCalledThisRound, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence, hasFaltaEnvidoBeenCalledThisSequence } = gameState;
    const isPlayerTurn = currentTurn === 'player';

    // --- Button Visibility Logic ---
    const isPlayersTurnToPlayCard = isPlayerTurn && playerTricks[currentTrick] === null;
    const envidoWindowIsOpen = currentTrick === 0 && !hasEnvidoBeenCalledThisRound;

    const canCallFlor = isPlayersTurnToPlayCard && envidoWindowIsOpen && playerHasFlor && !hasFlorBeenCalledThisRound;
    const canCallEnvido = isPlayersTurnToPlayCard && envidoWindowIsOpen && !playerHasFlor;
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
        <div className="flex justify-center items-center w-full">
            <ActionButton onClick={() => dispatchAction({ type: ActionType.PROCEED_TO_NEXT_ROUND })} className="font-cinzel tracking-wider text-base lg:text-lg !px-8 !py-3">
                {t('actionBar.next_round')}
            </ActionButton>
        </div>
      )
    }

    // New Responsive Grid Layout
    const ActionGrid: React.FC<{children: React.ReactNode}> = ({ children }) => (
        <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:justify-center md:gap-2">
            {children}
        </div>
    );

    // --- Flor Response Buttons ---
    if (isPlayerTurn && gamePhase === 'flor_called') {
        return (
            <ActionGrid>
                {playerHasFlor ? (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_CONTRAFLOR })} variant="special" className="col-span-2 md:col-span-1">
                        {t('actionBar.contraflor')}
                    </ActionButton>
                ) : (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.ACKNOWLEDGE_FLOR })} className="green col-span-2 md:col-span-1">
                        {t('actionBar.flor_ack')}
                    </ActionButton>
                )}
            </ActionGrid>
        )
    }
    if (isPlayerTurn && gamePhase === 'contraflor_called') {
        return (
            <ActionGrid>
                <ActionButton onClick={() => dispatchAction({ type: ActionType.ACCEPT_CONTRAFLOR })} className="green">
                    {t('actionBar.contraflor_quiero')}
                </ActionButton>
                <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLINE_CONTRAFLOR })} variant="danger">
                    {t('actionBar.contraflor_no_quiero')}
                </ActionButton>
            </ActionGrid>
        )
    }

    const renderResponseButtons = () => {
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && envidoWindowIsOpen && !playerHasFlor;
        const canDeclareFlorOnTruco = gamePhase === 'truco_called' && envidoWindowIsOpen && playerHasFlor;
        
        if (gamePhase === 'envido_called' && playerHasFlor) {
             return (
                <ActionGrid>
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR })} variant="special" className="col-span-2 md:w-auto">
                        {t('actionBar.flor')}
                    </ActionButton>
                 </ActionGrid>
             )
        }
        
        return (
          <ActionGrid>
            {canDeclareFlorOnTruco && (
                <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLARE_FLOR })} variant="special" className="col-span-2 md:col-span-1">
                    {t('actionBar.flor')}
                </ActionButton>
            )}
            {canCallEnvidoPrimero && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} variant="secondary" className="col-span-2 md:col-span-1">{t('actionBar.envido_primero')}</ActionButton>}
            
            <ActionButton onClick={() => dispatchAction({ type: ActionType.ACCEPT })} className="green">
                {t('actionBar.quiero')}
            </ActionButton>
            <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLINE })} variant="danger">
                {t('actionBar.no_quiero')}
            </ActionButton>

            {gamePhase === 'truco_called' && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_RETRUCO })} className="col-span-2 md:col-span-1">{t('actionBar.retruco')}</ActionButton>}
            {gamePhase === 'retruco_called' && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_VALE_CUATRO })} className="col-span-2 md:col-span-1">{t('actionBar.vale_cuatro')}</ActionButton>}
            
            {/* Envido Escalation - Grouped for cleaner mobile layout */}
            {gamePhase === 'envido_called' && (
                <>
                     {envidoPointsOnOffer === 2 && !hasFaltaEnvidoBeenCalledThisSequence && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} variant="secondary">{t('actionBar.envido')}</ActionButton>}
                     {!hasRealEnvidoBeenCalledThisSequence && !hasFaltaEnvidoBeenCalledThisSequence && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_REAL_ENVIDO })} variant="secondary">{t('actionBar.real_envido')}</ActionButton>}
                     {!hasFaltaEnvidoBeenCalledThisSequence && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_FALTA_ENVIDO })} variant="secondary" className="col-span-2 md:col-span-1">{t('actionBar.falta_envido')}</ActionButton>}
                </>
            )}
          </ActionGrid>
        )
    }

    const renderActionButtons = () => {
        return (
            <ActionGrid>
                {canCallFlor && (
                    <ActionButton onClick={() => dispatchAction({ type: ActionType.DECLARE_FLOR })} variant="special" className="col-span-2 md:w-auto">
                        {t('actionBar.flor')}
                    </ActionButton>
                )}
                
                {/* Truco Actions */}
                { canCallTruco && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_TRUCO })} className={canCallFlor || canCallEnvido ? "col-span-2 md:col-span-1" : "col-span-2 md:w-auto"}>{t('actionBar.truco')}</ActionButton> }
                { lastCaller === 'ai' && canEscalateToRetruco && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_RETRUCO })} className="col-span-2 md:w-auto">{t('actionBar.retruco')}</ActionButton> }
                { lastCaller === 'ai' && canEscalateToValeCuatro && <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_VALE_CUATRO })} className="col-span-2 md:w-auto">{t('actionBar.vale_cuatro')}</ActionButton> }
                
                {/* Envido Actions - Shown if possible */}
                {canCallEnvido && (
                    <>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_ENVIDO })} variant="secondary">
                            {t('actionBar.envido')}
                        </ActionButton>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_REAL_ENVIDO })} variant="secondary">
                            {t('actionBar.real_envido')}
                        </ActionButton>
                        <ActionButton onClick={() => dispatchAction({ type: ActionType.CALL_FALTA_ENVIDO })} variant="secondary" className="col-span-2 md:col-span-1">
                            {t('actionBar.falta_envido')}
                        </ActionButton>
                    </>
                )}
            </ActionGrid>
        )
    }

    return isPlayerRespondingToCall ? renderResponseButtons() : renderActionButtons();
};

export default ActionBar;