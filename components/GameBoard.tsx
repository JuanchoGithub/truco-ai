import React from 'react';
import { Card as CardType, Player } from '../types';
import Card from './Card';

interface GameBoardProps {
  playerTricks: (CardType | null)[];
  aiTricks: (CardType | null)[];
  currentTrick: number;
  trickWinners: (Player | 'tie' | null)[];
  mano: Player;
}

interface TrickSlotProps {
  playerCard: CardType | null;
  aiCard: CardType | null;
  trickNumber: number;
  isCurrent: boolean;
  winner: Player | 'tie' | null;
  starter: Player | null;
}

const TrickSlot: React.FC<TrickSlotProps> = ({ playerCard, aiCard, trickNumber, isCurrent, winner, starter }) => {
  const currentTrickClasses = isCurrent ? 'border-yellow-400/80 bg-black/30 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-black/20 bg-black/20';
  
  const Crown = () => (
      <div className="absolute -top-2 -right-2 text-3xl md:-top-3 md:-right-3 md:text-4xl text-yellow-400 z-20" style={{ textShadow: '0 0 6px rgba(250, 204, 21, 0.9)' }}>
          👑
      </div>
  );

  let firstCardPlayer: Player | null = null;
  // If one card is played, it's the first card
  if (playerCard && !aiCard) {
      firstCardPlayer = 'player';
  } else if (aiCard && !playerCard) {
      firstCardPlayer = 'ai';
  } else if (playerCard && aiCard) {
      firstCardPlayer = starter; // If both cards are played, the starter played first
  }

  let playerZ = 'z-0';
  let aiZ = 'z-0';
  
  // Only set stacking order when both cards are present. The second card played gets a higher z-index.
  if (playerCard && aiCard) {
    if (firstCardPlayer === 'player') {
      playerZ = 'z-0';
      aiZ = 'z-10';
    } else {
      playerZ = 'z-10';
      aiZ = 'z-0';
    }
  }

  return (
    <div className={`p-2 md:p-3 rounded-lg border-2 transition-all duration-300 ${currentTrickClasses} flex flex-col items-center`}>
        <p className="text-center text-xs md:text-sm text-gray-300 mb-1 md:mb-2 font-bold tracking-wider">MANO {trickNumber}</p>
        <div className="relative w-24 md:w-32 h-56 md:h-64"> {/* Container for stacking */}
            
            {/* Render a placeholder if no cards are played */}
            {!playerCard && !aiCard && <Card card={null} className="!w-24 !h-36 md:!w-32 !h-44" />}

            {/* AI's Card - Always on top of the slot */}
            {aiCard && (
                <div className={`absolute left-0 top-0 transition-all duration-300 ${aiZ}`}>
                    <div className="relative">
                        <Card card={aiCard} className="!w-24 !h-36 md:!w-32 !h-44" />
                        {winner === 'ai' && <Crown />}
                    </div>
                </div>
            )}

            {/* Player's Card - Always on bottom of the slot */}
            {playerCard && (
                <div className={`absolute left-0 top-16 md:top-20 transition-all duration-300 ${playerZ}`}>
                    <div className="relative">
                        <Card card={playerCard} className="!w-24 !h-36 md:!w-32 !h-44" />
                        {winner === 'player' && <Crown />}
                    </div>
                </div>
            )}
        </div>
    </div>
  )
}

const GameBoard: React.FC<GameBoardProps> = ({ playerTricks, aiTricks, currentTrick, trickWinners, mano }) => {
  const getTrickStarter = (trickIndex: number): Player | null => {
    if (trickIndex === 0) {
      return mano;
    }
    const previousTrickWinner = trickWinners[trickIndex - 1];
    if (previousTrickWinner === 'tie') {
      return mano;
    }
    return previousTrickWinner;
  };

  return (
    <div className="w-full flex flex-row justify-center items-center space-x-2 md:space-x-4 p-2 md:p-4 bg-black/20 rounded-2xl shadow-inner shadow-black/50">
      <TrickSlot 
        playerCard={playerTricks[0]} 
        aiCard={aiTricks[0]} 
        trickNumber={1} 
        isCurrent={currentTrick === 0} 
        winner={trickWinners[0]} 
        starter={getTrickStarter(0)}
      />
      <TrickSlot 
        playerCard={playerTricks[1]} 
        aiCard={aiTricks[1]} 
        trickNumber={2} 
        isCurrent={currentTrick === 1} 
        winner={trickWinners[1]}
        starter={getTrickStarter(1)}
      />
      <TrickSlot 
        playerCard={playerTricks[2]} 
        aiCard={aiTricks[2]} 
        trickNumber={3} 
        isCurrent={currentTrick === 2} 
        winner={trickWinners[2]}
        starter={getTrickStarter(2)}
      />
    </div>
  );
};

export default GameBoard;