import React from 'react';
import { Card as CardType, Player } from '../types';
import Card from './Card';

interface GameBoardProps {
  playerTricks: (CardType | null)[];
  aiTricks: (CardType | null)[];
  trickWinners: (Player | 'tie' | null)[];
  lastRoundWinner: Player | 'tie' | null;
}

const Crown = () => (
    <div className="absolute -top-2 -right-2 text-3xl md:-top-3 md:-right-3 md:text-4xl text-yellow-400 z-20" style={{ textShadow: '0 0 6px rgba(250, 204, 21, 0.9)' }}>
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
    const cardSizeClasses = "!w-28 !h-[174px] md:!w-32 md:!h-[198px]";

    return (
        <div className="relative w-full h-56 flex items-center justify-center">
            <p className="absolute -top-2 text-center text-sm md:text-base text-gray-300 font-bold tracking-wider">{label}</p>
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


const GameBoard: React.FC<GameBoardProps> = ({ playerTricks, aiTricks, trickWinners, lastRoundWinner }) => {
  const winnerText = lastRoundWinner === 'player' ? 'Ganaste la Ronda' : lastRoundWinner === 'ai' ? 'IA Gana la Ronda' : 'Ronda Empatada';
  return (
    <div className="relative w-full flex flex-row justify-around items-center space-x-2 md:space-x-4 p-4 bg-black/20 rounded-2xl shadow-inner shadow-black/50 min-h-[300px]">
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

      {lastRoundWinner && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 animate-fade-in-scale rounded-2xl">
          <div className="text-center p-4 rounded-lg bg-yellow-400/20 border-2 border-yellow-300 shadow-2xl shadow-black">
            <h3 className="text-xl md:text-3xl font-cinzel text-white font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              {winnerText}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;