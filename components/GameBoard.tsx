
import React from 'react';
import { Card as CardType, Player, GameState, Action, ActionType } from '../types';
import Card from './Card';

interface GameBoardProps {
  gameState: GameState;
  dispatch: React.Dispatch<Action>;
}

const Crown = () => (
    <div className="absolute -top-2 -right-2 text-3xl lg:-top-3 lg:-right-3 lg:text-4xl text-yellow-400 z-20" style={{ textShadow: '0 0 6px rgba(250, 204, 21, 0.9)' }}>
        👑
    </div>
);

interface CardPileProps {
    cards: (CardType | null)[];
    trickWinners: (Player | 'tie' | null)[];
    owner: Player;
    label: string;
}

const CardPile: React.FC<CardPileProps> = ({ cards, trickWinners, owner, label }) => {
    const playedCards = cards.map((card, index) => ({ card, index })).filter(item => item.card !== null);
    const renderPlaceholder = playedCards.length === 0;
    const cardSizeClasses = "!w-24 !h-[150px] lg:!w-28 lg:!h-[174px]";

    return (
        <div className="relative w-full h-56 flex items-center justify-center">
            <p className="absolute -top-2 text-center text-sm lg:text-base text-gray-300 font-bold tracking-wider">{label}</p>
            {renderPlaceholder && (
                 <div className={`rounded-lg border-2 border-dashed border-gray-400/30 bg-black/20 ${cardSizeClasses} flex items-center justify-center`}>
                    <span className="text-gray-400/50 text-xs">Pila Vacía</span>
                 </div>
            )}
            {playedCards.map(({ card, index }) => {
                if (!card) return null;
                const isWinner = trickWinners[index] === owner;
                
                // Deterministic "messy" transform based on card index to create a fanned pile
                const rotation = (index * 25) - 25; // -25deg, 0deg, 25deg
                const translateX = (index * 15) - 15; // -15px, 0px, 15px
                const translateY = Math.abs(index - 1) * -5; // creates a slight arc
                
                return (
                    <div 
                        key={`${owner}-card-${index}`} 
                        className="absolute transition-all duration-500"
                        style={{ 
                            transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                            zIndex: index 
                        }}
                    >
                        <div className="relative">
                            <Card card={card} className={cardSizeClasses} />
                            {isWinner && <Crown />}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const GameBoard: React.FC<GameBoardProps> = ({ gameState, dispatch }) => {
  const { playerTricks, aiTricks, trickWinners, lastRoundWinner, gamePhase, round, roundHistory, playerScore, aiScore } = gameState;
  const isRoundOver = gamePhase === 'round_end' && lastRoundWinner;

  const handleDismiss = () => {
    dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND });
  };

  const currentRoundSummary = roundHistory.find(r => r.round === round);
  const pointsData = currentRoundSummary?.pointsAwarded?.by;

  const renderRoundSummary = () => {
    if (!pointsData) {
        const winnerText = lastRoundWinner === 'player' ? 'Ganaste la Ronda' : lastRoundWinner === 'ai' ? 'Perdiste la Ronda' : 'Ronda Empatada';
        return (
            <h3 className="text-xl lg:text-3xl font-cinzel text-white font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {winnerText}
            </h3>
        );
    }
    
    return (
        <div className="text-white font-mono text-sm lg:text-base w-full max-w-sm">
            <h3 className="text-center text-xl lg:text-2xl font-cinzel text-yellow-300 font-bold tracking-wider mb-4">
                Ronda Terminada
            </h3>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-left mb-2 border-b border-yellow-300/30 pb-2">
                <span className="font-bold">Puntos</span>
                <span className="font-bold text-center w-16">Jugador</span>
                <span className="font-bold text-center w-16">IA</span>
            </div>
            <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>Flor</span>
                    <span className="text-center w-16">{pointsData.flor.player}</span>
                    <span className="text-center w-16">{pointsData.flor.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">({pointsData.flor.note})</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>Envido</span>
                    <span className="text-center w-16">{pointsData.envido.player}</span>
                    <span className="text-center w-16">{pointsData.envido.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">({pointsData.envido.note})</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center text-left">
                    <span>Truco</span>
                    <span className="text-center w-16">{pointsData.truco.player}</span>
                    <span className="text-center w-16">{pointsData.truco.ai}</span>
                    <span className="col-start-1 col-span-3 text-xs text-gray-400 italic pl-2">({pointsData.truco.note})</span>
                </div>
            </div>
            <div className="text-center mt-4 pt-2 border-t border-yellow-300/30 font-bold text-lg">
                La partida va {playerScore} a {aiScore}
            </div>
             <p className="text-center text-xs text-yellow-200/80 italic mt-4 animate-pulse">
                (Haz clic para continuar)
            </p>
        </div>
    );
  };
  
  return (
    <div className="relative w-full flex flex-row justify-around items-center space-x-2 lg:space-x-4 p-4 bg-black/20 rounded-2xl shadow-inner shadow-black/50 min-h-[280px]">
      <div className="w-1/2">
        <CardPile 
          cards={aiTricks}
          trickWinners={trickWinners}
          owner="ai"
          label="Cartas de la IA"
        />
      </div>
      <div className="self-stretch border-l-2 border-yellow-700/30"></div>
      <div className="w-1/2">
        <CardPile 
          cards={playerTricks}
          trickWinners={trickWinners}
          owner="player"
          label="Tus Cartas Jugadas"
        />
      </div>

      {isRoundOver && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-30 rounded-2xl bg-black/70 cursor-pointer animate-fade-in-scale"
          onClick={handleDismiss}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleDismiss()}
          role="button"
          tabIndex={0}
          aria-label={`Round over. Click to continue.`}
        >
          <div className="text-center p-4 lg:p-6 rounded-lg bg-yellow-400/30 border-2 border-yellow-300 shadow-2xl shadow-black">
            {renderRoundSummary()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
