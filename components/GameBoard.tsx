
import React from 'react';
import { Card as CardType, Player } from '../types';
import Card from './Card';

interface GameBoardProps {
  playerTricks: (CardType | null)[];
  aiTricks: (CardType | null)[];
  currentTrick: number;
  trickWinners: (Player | 'tie' | null)[];
}

const TrickSlot: React.FC<{ playerCard: CardType | null, aiCard: CardType | null, trickNumber: number, isCurrent: boolean, winner: Player | 'tie' | null }> = ({ playerCard, aiCard, trickNumber, isCurrent, winner }) => {
  const currentTrickClasses = isCurrent ? 'border-yellow-400/80 bg-black/30 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-black/20 bg-black/20';
  
  const Crown = () => (
      <div className="absolute -top-2 -right-2 text-3xl md:-top-3 md:-right-3 md:text-4xl text-yellow-400 z-10" style={{ textShadow: '0 0 6px rgba(250, 204, 21, 0.9)' }}>
          👑
      </div>
  );

  return (
    <div className={`p-2 md:p-3 rounded-lg border-2 transition-all duration-300 ${currentTrickClasses}`}>
        <p className="text-center text-xs md:text-sm text-gray-300 mb-1 md:mb-2 font-bold tracking-wider">TRICK {trickNumber}</p>
        <div className="flex items-center space-x-1 md:space-x-3">
            <div className="relative">
              <Card card={playerCard} className="!w-20 !h-28 md:!w-24 md:!h-36" />
              {winner === 'player' && <Crown />}
            </div>
            <div className="relative">
              <Card card={aiCard} className="!w-20 !h-28 md:!w-24 md:!h-36" />
              {winner === 'ai' && <Crown />}
            </div>
        </div>
    </div>
  )
}

const GameBoard: React.FC<GameBoardProps> = ({ playerTricks, aiTricks, currentTrick, trickWinners }) => {
  return (
    <div className="w-full h-full flex flex-row justify-center items-center space-x-2 md:space-x-4 p-2 md:p-4 bg-black/20 rounded-2xl shadow-inner shadow-black/50">
      <TrickSlot playerCard={playerTricks[0]} aiCard={aiTricks[0]} trickNumber={1} isCurrent={currentTrick === 0 && playerTricks.length < 4} winner={trickWinners[0]}/>
      <TrickSlot playerCard={playerTricks[1]} aiCard={aiTricks[1]} trickNumber={2} isCurrent={currentTrick === 1} winner={trickWinners[1]}/>
      <TrickSlot playerCard={playerTricks[2]} aiCard={aiTricks[2]} trickNumber={3} isCurrent={currentTrick === 2} winner={trickWinners[2]}/>
    </div>
  );
};

export default GameBoard;
